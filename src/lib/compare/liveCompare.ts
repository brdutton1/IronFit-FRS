/**
 * Live comparison — the heart of the client side.
 *
 * v1 does NOT phase-match the client's tempo to Lee's. Instead we track the
 * client's OWN baseline (first valid frame) and running peak per joint, and
 * compare the achieved range to the reference range. A client moving at half
 * Lee's speed still gets honest feedback on whether they reach end range.
 *
 * `LiveSession` is stateful (it remembers baselines/peaks across frames). The
 * scoring functions it calls are pure and individually unit-tested.
 */

import type { ReferenceDataset } from '@/types/reference';
import { computeAngle } from '@/lib/pose/angles';
import { angleConfidence } from '@/lib/pose/confidence';
import type { AngleKey, PoseFrame } from '@/lib/pose/landmarks';
import type { Confidence } from '@/types/reference';
import {
  STILLNESS_DRIFT_DEG,
  STILLNESS_STILL_DEG,
  TARGET_GREEN_SHORTFALL,
  TARGET_YELLOW_SHORTFALL,
  ROM_PCT_DISPLAY_CAP,
  WRONG_DIRECTION_DEG,
} from './thresholds';

export type JointColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

export interface TargetEval {
  key: AngleKey;
  color: JointColor;
  current: number;
  runningPeakDelta: number;
  /** Achieved range as a % of the reference range (uncapped value recorded). */
  romPct: number;
  romPctDisplay: number;
  wrongDirection: boolean;
  confidence: Confidence;
  rotationLimited: boolean;
}

export interface StillnessEval {
  key: AngleKey;
  color: JointColor;
  current: number;
  deviation: number;
  compensating: boolean;
  confidence: Confidence;
  rotationLimited: boolean;
}

/**
 * Score a target joint given the reference range, the client's start angle, the
 * client's running peak excursion, and the current angle. Pure.
 */
export function scoreTarget(
  refRom: number,
  startAngle: number,
  runningPeakDelta: number,
  current: number,
  confidence: Confidence,
  rotationLimited: boolean,
  key: AngleKey,
): TargetEval {
  const currentDelta = current - startAngle;
  const wrongDirection = currentDelta < -WRONG_DIRECTION_DEG;

  // ROM% relative to reference range. Guard a ~zero-range reference.
  const frac = refRom > 1e-6 ? runningPeakDelta / refRom : 0;
  const romPct = Math.max(0, frac * 100);
  const shortfall = 1 - frac;

  let color: JointColor;
  if (confidence === 'low') {
    color = 'gray';
  } else if (wrongDirection) {
    color = 'red';
  } else if (shortfall <= TARGET_GREEN_SHORTFALL) {
    color = 'green';
  } else if (shortfall <= TARGET_YELLOW_SHORTFALL) {
    color = 'yellow';
  } else {
    color = 'red';
  }

  return {
    key,
    color,
    current,
    runningPeakDelta,
    romPct,
    romPctDisplay: Math.min(ROM_PCT_DISPLAY_CAP, Math.round(romPct)),
    wrongDirection,
    confidence,
    rotationLimited,
  };
}

/** Score a stillness joint by its drift from the client's baseline. Pure. */
export function scoreStillness(
  baseline: number,
  current: number,
  confidence: Confidence,
  rotationLimited: boolean,
  key: AngleKey,
): StillnessEval {
  const deviation = Math.abs(current - baseline);
  let color: JointColor;
  let compensating = false;
  if (confidence === 'low') {
    color = 'gray';
  } else if (deviation < STILLNESS_STILL_DEG) {
    color = 'blue';
  } else if (deviation <= STILLNESS_DRIFT_DEG) {
    color = 'yellow';
  } else {
    color = 'red';
    compensating = true;
  }
  return { key, color, current, deviation, compensating, confidence, rotationLimited };
}

export interface FrameResult {
  targets: TargetEval[];
  stillness: StillnessEval[];
  /** ROM% for the movement's primary joint, for the ROM meter. */
  primaryRomPct: number;
}

interface JointState {
  baseline: number | null;
  runningPeakDelta: number; // max positive excursion above baseline
}

export interface LiveSessionConfig {
  reference: ReferenceDataset;
  targetKeys: AngleKey[];
  stillnessKeys: AngleKey[];
  primaryKey: AngleKey;
  /** Rotation-limited flags per key (from camera-angle + axis). */
  rotationLimited: Record<string, boolean>;
}

export class LiveSession {
  private targetState = new Map<AngleKey, JointState>();
  private stillnessState = new Map<AngleKey, JointState>();

  constructor(private readonly cfg: LiveSessionConfig) {
    cfg.targetKeys.forEach((k) => this.targetState.set(k, { baseline: null, runningPeakDelta: 0 }));
    cfg.stillnessKeys.forEach((k) => this.stillnessState.set(k, { baseline: null, runningPeakDelta: 0 }));
  }

  /** Process one frame; updates internal state and returns this frame's eval. */
  update(frame: PoseFrame): FrameResult {
    const targets: TargetEval[] = [];
    for (const key of this.cfg.targetKeys) {
      const conf = angleConfidence(key, frame);
      const angle = computeAngle(key, frame);
      const state = this.targetState.get(key)!;
      // Lock baseline on the first non-low-confidence frame.
      if (state.baseline === null && conf !== 'low') state.baseline = angle;
      const start = state.baseline ?? angle;
      const delta = angle - start;
      if (delta > state.runningPeakDelta) state.runningPeakDelta = delta;
      const refRom = this.cfg.reference.target_joints[key]?.rom ?? 0;
      targets.push(
        scoreTarget(refRom, start, state.runningPeakDelta, angle, conf, !!this.cfg.rotationLimited[key], key),
      );
    }

    const stillness: StillnessEval[] = [];
    for (const key of this.cfg.stillnessKeys) {
      const conf = angleConfidence(key, frame);
      const angle = computeAngle(key, frame);
      const state = this.stillnessState.get(key)!;
      if (state.baseline === null && conf !== 'low') state.baseline = angle;
      const base = state.baseline ?? angle;
      stillness.push(scoreStillness(base, angle, conf, !!this.cfg.rotationLimited[key], key));
    }

    const primary = targets.find((t) => t.key === this.cfg.primaryKey);
    return { targets, stillness, primaryRomPct: primary?.romPct ?? 0 };
  }

  /** Final ROM% for the primary joint (running peak vs reference range). */
  finalPrimaryRomPct(): number {
    const state = this.targetState.get(this.cfg.primaryKey);
    const refRom = this.cfg.reference.target_joints[this.cfg.primaryKey]?.rom ?? 0;
    if (!state || refRom <= 1e-6) return 0;
    return Math.max(0, Math.round((state.runningPeakDelta / refRom) * 100));
  }
}
