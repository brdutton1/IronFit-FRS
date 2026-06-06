/**
 * Body-scale helpers. Distances in normalized image space depend on how far the
 * person stands from the camera; dividing by a body-scale metric makes the
 * camera-angle heuristic robust to that.
 */

import { midpoint } from '@/lib/pose/angles';
import { LM, type PoseFrame } from '@/lib/pose/landmarks';

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Euclidean shoulder width (LSh→RSh) in normalized units. */
export function shoulderWidth(frame: PoseFrame): number {
  return dist(frame[LM.LEFT_SHOULDER], frame[LM.RIGHT_SHOULDER]);
}

/** Torso length: shoulder-midpoint → hip-midpoint. */
export function torsoHeight(frame: PoseFrame): number {
  const sMid = midpoint(frame[LM.LEFT_SHOULDER], frame[LM.RIGHT_SHOULDER]);
  const hMid = midpoint(frame[LM.LEFT_HIP], frame[LM.RIGHT_HIP]);
  return dist(sMid, hMid);
}

/**
 * Approximate standing body height: nose → ankle-midpoint. Used as a scale
 * reference. Falls back to torso height if legs aren't visible.
 */
export function bodyHeight(frame: PoseFrame): number {
  const ankleMid = midpoint(frame[LM.LEFT_ANKLE], frame[LM.RIGHT_ANKLE]);
  const h = dist(frame[LM.NOSE], ankleMid);
  return h > 1e-3 ? h : torsoHeight(frame) * 4; // rough fallback
}
