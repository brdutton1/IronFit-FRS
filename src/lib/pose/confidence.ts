/**
 * Confidence handling. Turns raw landmark visibility into an honest label, and
 * decides when a rotation-axis angle should be marked "approximate".
 */

import type { CameraAngle } from '@/types/movement';
import type { Confidence } from '@/types/reference';
import {
  LOW_TRUST_ANGLES,
  REQUIRED_LANDMARKS,
  ROTATION_AXIS_ANGLES,
  type AngleKey,
  type PoseFrame,
} from './landmarks';

// Visibility thresholds (MediaPipe visibility is 0..1). See README "Thresholds".
export const VIS_HIGH = 0.7;
export const VIS_LOW = 0.5;

/** Minimum visibility across the landmarks an angle requires. */
export function minRequiredVisibility(key: AngleKey, frame: PoseFrame): number {
  const required = REQUIRED_LANDMARKS[key];
  let min = 1;
  for (const idx of required) {
    const v = frame[idx]?.visibility ?? 0;
    if (v < min) min = v;
  }
  return min;
}

/**
 * Confidence for a single angle measurement on a single frame.
 * - high:    all required landmarks ≥ 0.7
 * - reduced: all ≥ 0.5 but some in [0.5, 0.7)
 * - low:     any required landmark < 0.5
 * Foot-dependent angles (ankle) are capped at "reduced" — the landmarks are
 * structurally noisy even when MediaPipe reports them visible.
 */
export function angleConfidence(key: AngleKey, frame: PoseFrame): Confidence {
  const min = minRequiredVisibility(key, frame);
  let level: Confidence;
  if (min < VIS_LOW) level = 'low';
  else if (min < VIS_HIGH) level = 'reduced';
  else level = 'high';

  if (level === 'high' && LOW_TRUST_ANGLES.has(key)) level = 'reduced';
  return level;
}

/** Worst (most pessimistic) of two confidence levels. */
export function worstConfidence(a: Confidence, b: Confidence): Confidence {
  const rank: Record<Confidence, number> = { high: 2, reduced: 1, low: 0 };
  return rank[a] <= rank[b] ? a : b;
}

/** Aggregate confidence across a trajectory: the worst level seen on any frame. */
export function aggregateConfidence(perFrame: Confidence[]): Confidence {
  return perFrame.reduce<Confidence>((acc, c) => worstConfidence(acc, c), 'high');
}

/**
 * Whether this angle's axis is poorly observed from the given camera angle.
 * Rotation-about-long-axis joints are only well seen from the side (and hip
 * rotation, partially, from overhead). Everything else: trust the camera.
 */
export function isRotationLimited(key: AngleKey, cameraAngle: CameraAngle): boolean {
  if (!ROTATION_AXIS_ANGLES.has(key)) return false;
  if (cameraAngle === 'side') return false;
  if (cameraAngle === 'overhead' && (key === 'hip_rotation_left' || key === 'hip_rotation_right')) {
    return false;
  }
  return true;
}
