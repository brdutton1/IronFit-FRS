/**
 * Reference extraction — the heart of the trainer side.
 *
 * `extractReferenceDataset` is pure: it takes already-detected pose frames and
 * movement metadata and returns a ReferenceDataset. The browser/video glue
 * (`extractReferenceFromVideo`) decodes a video to frames and calls it, so all
 * the analysis logic is unit-testable without a real video or GPU.
 */

import type { CameraAngle } from '@/types/movement';
import type {
  Confidence,
  ReferenceDataset,
  StillnessJointReference,
  TargetJointReference,
} from '@/types/reference';
import { computeAngle } from '@/lib/pose/angles';
import { aggregateConfidence, angleConfidence, isRotationLimited } from '@/lib/pose/confidence';
import type { AngleKey, PoseFrame } from '@/lib/pose/landmarks';
import { countReps, type PeakOptions } from './cycleDetect';
import { smoothnessScore, variance } from './smoothing';

export interface ExtractionInput {
  movement_id: string;
  fps: number;
  frames: PoseFrame[];
  /** Angle keys that should move (per movement metadata). */
  targetAngles: AngleKey[];
  /** Angle keys that should stay still. */
  stillnessAngles: AngleKey[];
  /** Which target angle drives rep detection + ROM meter. */
  primaryAngle: AngleKey;
  cameraAngle: CameraAngle;
  multiRep: boolean;
  cues: string[];
  compensationPatterns: string[];
  peakOptions?: PeakOptions;
}

interface AnalyzedAngle {
  trajectory: number[];
  perFrameConfidence: Confidence[];
  aggregate: Confidence;
  /** Indices whose confidence is not 'low' — the trustworthy samples. */
  validIndices: number[];
}

function analyzeAngle(key: AngleKey, frames: PoseFrame[]): AnalyzedAngle {
  const trajectory: number[] = [];
  const perFrameConfidence: Confidence[] = [];
  const validIndices: number[] = [];
  frames.forEach((frame, i) => {
    trajectory.push(computeAngle(key, frame));
    const c = angleConfidence(key, frame);
    perFrameConfidence.push(c);
    if (c !== 'low') validIndices.push(i);
  });
  return {
    trajectory,
    perFrameConfidence,
    aggregate: aggregateConfidence(perFrameConfidence),
    validIndices,
  };
}

/** Values at the trustworthy frames, falling back to all when none qualify. */
function trustedValues(a: AnalyzedAngle): number[] {
  if (a.validIndices.length === 0) return a.trajectory.slice();
  return a.validIndices.map((i) => a.trajectory[i]);
}

function buildTarget(key: AngleKey, frames: PoseFrame[], cameraAngle: CameraAngle): TargetJointReference {
  const a = analyzeAngle(key, frames);
  const valid = trustedValues(a);
  const peak = valid.length ? Math.max(...valid) : 0;
  const min = valid.length ? Math.min(...valid) : 0;
  return {
    trajectory: a.trajectory,
    peak,
    rom: peak - min,
    smoothness_score: smoothnessScore(a.trajectory),
    confidence: a.aggregate,
    rotation_limited: isRotationLimited(key, cameraAngle),
  };
}

function buildStillness(key: AngleKey, frames: PoseFrame[], cameraAngle: CameraAngle): StillnessJointReference {
  const a = analyzeAngle(key, frames);
  const valid = trustedValues(a);
  // Baseline = median of the first quarter of trustworthy samples (robust to a
  // noisy first frame), or the first value if the clip is tiny.
  const baseline = robustBaseline(valid);
  const maxDeviation = valid.reduce((m, v) => Math.max(m, Math.abs(v - baseline)), 0);
  return {
    baseline_angle: baseline,
    max_deviation: maxDeviation,
    variance: variance(valid),
    confidence: a.aggregate,
    rotation_limited: isRotationLimited(key, cameraAngle),
  };
}

function robustBaseline(values: number[]): number {
  if (values.length === 0) return 0;
  const head = values.slice(0, Math.max(1, Math.floor(values.length / 4)));
  const sorted = [...head].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Roll up an overall reference quality: the worst confidence across all target
 * joints. (Stillness joints inform compensation but not "did we capture the
 * movement well", so quality keys off targets — matching the trainer spec.)
 */
export function referenceQuality(dataset: ReferenceDataset): Confidence {
  const confidences = Object.values(dataset.target_joints).map((t) => t.confidence);
  return aggregateConfidence(confidences.length ? confidences : ['low']);
}

/**
 * Minimal detector contract so the video path can be injected with the real
 * PoseDetector in the app, and a fake in tests — keeping @mediapipe out of the
 * unit-tested core.
 */
export interface FrameDetector {
  init(): Promise<void>;
  detect(video: HTMLVideoElement, timestampMs: number): PoseFrame | null;
}

export interface VideoExtractionMeta extends Omit<ExtractionInput, 'frames' | 'fps'> {
  /** Frames per second to sample the clip at. Default 30 (or native if lower). */
  sampleFps?: number;
  /** Optional progress callback 0..1, for the trainer upload UI. */
  onProgress?: (fraction: number) => void;
}

/** Seek a video to `timeSec` and resolve once the frame is ready. */
function seek(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      resolve();
    };
    video.addEventListener('seeked', onSeeked);
    video.currentTime = timeSec;
  });
}

/**
 * Decode a reference video frame-by-frame and produce a ReferenceDataset.
 * Frames with no detectable person are skipped. Runs entirely in the browser.
 */
export async function extractReferenceFromVideo(
  video: HTMLVideoElement,
  detector: FrameDetector,
  meta: VideoExtractionMeta,
): Promise<ReferenceDataset> {
  await detector.init();
  const fps = meta.sampleFps ?? 30;
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const frames: PoseFrame[] = [];

  const step = 1 / fps;
  for (let t = 0; t < duration; t += step) {
    await seek(video, t);
    const frame = detector.detect(video, t * 1000);
    if (frame) frames.push(frame);
    meta.onProgress?.(duration > 0 ? Math.min(1, t / duration) : 1);
  }
  meta.onProgress?.(1);

  return extractReferenceDataset({ ...meta, frames, fps });
}

export function extractReferenceDataset(input: ExtractionInput): ReferenceDataset {
  const { frames, fps, cameraAngle } = input;

  const target_joints: Record<string, TargetJointReference> = {};
  for (const key of input.targetAngles) {
    target_joints[key] = buildTarget(key, frames, cameraAngle);
  }

  const stillness_joints: Record<string, StillnessJointReference> = {};
  for (const key of input.stillnessAngles) {
    stillness_joints[key] = buildStillness(key, frames, cameraAngle);
  }

  const primaryTrajectory =
    target_joints[input.primaryAngle]?.trajectory ??
    (input.targetAngles.length ? target_joints[input.targetAngles[0]].trajectory : []);

  return {
    movement_id: input.movement_id,
    fps,
    duration_sec: frames.length / Math.max(1, fps),
    rep_count: countReps(primaryTrajectory, input.multiRep, input.peakOptions),
    target_joints,
    stillness_joints,
    cues: input.cues,
    compensation_patterns: input.compensationPatterns,
  };
}
