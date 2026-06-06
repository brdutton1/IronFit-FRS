/**
 * Synthetic pose-frame builders for tests. We place only the landmarks a given
 * angle needs and leave the rest at a neutral default, so we can assert exact
 * angles from known geometry.
 */

import { LM, type Landmark, type PoseFrame } from '@/lib/pose/landmarks';

const DEG2RAD = Math.PI / 180;

/** A 33-landmark frame; everything defaults to centre, fully visible. */
export function makeFrame(overrides: Partial<Record<number, Partial<Landmark>>> = {}): PoseFrame {
  const frame: PoseFrame = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
  }));
  for (const [idx, ov] of Object.entries(overrides)) {
    frame[Number(idx)] = { ...frame[Number(idx)], ...ov };
  }
  return frame;
}

function set(frame: PoseFrame, idx: number, x: number, y: number, visibility = 1): void {
  frame[idx] = { x, y, z: 0, visibility };
}

/** Rotate a 2D vector by `deg` (image space). */
function rotate(v: { x: number; y: number }, deg: number): { x: number; y: number } {
  const a = deg * DEG2RAD;
  return { x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) };
}

export interface PoseParams {
  /** Degrees of right-shoulder elevation (0 = arm at side, 180 = overhead). */
  shoulderFlexionRight?: number;
  /** Degrees of trunk lean from vertical (spinal flexion proxy). */
  spinalFlexion?: number;
  /** Lower visibility on specific landmark indices. */
  visibility?: Partial<Record<number, number>>;
}

/**
 * A standing pose with a controllable right-shoulder elevation and trunk lean.
 * Produces EXACT `shoulder_flexion_right` and `spinal_flexion` angles.
 */
export function makePose(params: PoseParams = {}): PoseFrame {
  const { shoulderFlexionRight = 0, spinalFlexion = 0 } = params;
  const frame = makeFrame();

  // Pelvis.
  const hipMid = { x: 0.5, y: 0.6 };
  set(frame, LM.LEFT_HIP, 0.6, 0.6);
  set(frame, LM.RIGHT_HIP, 0.4, 0.6);

  // Trunk leans by `spinalFlexion` from vertical; shoulder midpoint follows.
  const trunkLen = 0.25;
  const s = spinalFlexion * DEG2RAD;
  const shoulderMid = {
    x: hipMid.x + trunkLen * Math.sin(s),
    y: hipMid.y - trunkLen * Math.cos(s),
  };
  set(frame, LM.LEFT_SHOULDER, shoulderMid.x + 0.1, shoulderMid.y);
  set(frame, LM.RIGHT_SHOULDER, shoulderMid.x - 0.1, shoulderMid.y);

  // Right elbow placed so the hip–shoulder–elbow interior angle == flexion,
  // measured against the actual (possibly tilted) shoulder→hip direction.
  const rShoulder = { x: shoulderMid.x - 0.1, y: shoulderMid.y };
  const rHip = { x: 0.4, y: 0.6 };
  const down = { x: rHip.x - rShoulder.x, y: rHip.y - rShoulder.y };
  const downMag = Math.hypot(down.x, down.y) || 1;
  const downUnit = { x: down.x / downMag, y: down.y / downMag };
  const dir = rotate(downUnit, shoulderFlexionRight);
  set(frame, LM.RIGHT_ELBOW, rShoulder.x + 0.2 * dir.x, rShoulder.y + 0.2 * dir.y);

  if (params.visibility) {
    for (const [idx, v] of Object.entries(params.visibility)) {
      frame[Number(idx)] = { ...frame[Number(idx)], visibility: v };
    }
  }
  return frame;
}

/**
 * Build a trajectory of poses ramping shoulder flexion 0 → peak → 0. When
 * `spinalFlexionPeak` is given the trunk leans in step with the arm (0 at the
 * start, peak at the top), simulating a lumbar compensation.
 */
export function makeShoulderCarPerformance(
  peakDeg: number,
  frames = 30,
  spinalFlexionPeak = 0,
): PoseFrame[] {
  const out: PoseFrame[] = [];
  for (let i = 0; i < frames; i++) {
    // Triangle wave 0 → 1 → 0.
    const phase = i / (frames - 1);
    const tri = 1 - Math.abs(2 * phase - 1);
    out.push(makePose({ shoulderFlexionRight: peakDeg * tri, spinalFlexion: spinalFlexionPeak * tri }));
  }
  return out;
}
