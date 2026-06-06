/**
 * Joint-angle geometry.
 *
 * All angles are computed in 2D image space (x, y) because that is what
 * MediaPipe gives us reliably. y grows downward (image convention), so "up" is
 * the vector (0, -1). Every angle is reported in degrees.
 *
 * Convention: where it is meaningful, each named angle reads "higher number =
 * more of the named motion" and ~0 at anatomical neutral, so live comparison
 * can reason about direction. Each formula documents its neutral value.
 *
 * IMPORTANT: the same formula is used by reference extraction and by live
 * comparison. As long as both sides agree, the absolute convention only needs
 * to be sensible, not clinically exact — and we never claim clinical accuracy.
 */

import { LM, type AngleKey, type Landmark, type PoseFrame } from './landmarks';

export interface Point2D {
  x: number;
  y: number;
}

const RAD2DEG = 180 / Math.PI;
const EPS = 1e-9;

function sub(a: Point2D, b: Point2D): Point2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

function mag(v: Point2D): number {
  return Math.hypot(v.x, v.y);
}

function dot(a: Point2D, b: Point2D): number {
  return a.x * b.x + a.y * b.y;
}

/** Midpoint of two points. */
export function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Angle (0..180°) between two free vectors. Degenerate vectors return 0. */
export function angleBetweenVectors(u: Point2D, v: Point2D): number {
  const m = mag(u) * mag(v);
  if (m < EPS) return 0;
  // Clamp guards against tiny FP overshoot beyond [-1, 1].
  const cos = Math.min(1, Math.max(-1, dot(u, v) / m));
  return Math.acos(cos) * RAD2DEG;
}

/**
 * Interior angle (0..180°) at vertex `b` formed by points a–b–c.
 * e.g. interiorAngle(shoulder, elbow, wrist) is the elbow's interior angle.
 */
export function interiorAngle(a: Point2D, b: Point2D, c: Point2D): number {
  return angleBetweenVectors(sub(a, b), sub(c, b));
}

/** Angle (0..180°) of a vector away from straight up (0, -1). */
export function angleFromVertical(v: Point2D): number {
  return angleBetweenVectors(v, { x: 0, y: -1 });
}

/** Signed deviation (degrees) of a line from horizontal, range (-90, 90]. */
export function lineAngleFromHorizontal(a: Point2D, b: Point2D): number {
  const v = sub(b, a);
  if (mag(v) < EPS) return 0;
  return Math.atan2(v.y, v.x) * RAD2DEG;
}

function pt(frame: PoseFrame, idx: number): Landmark {
  return frame[idx];
}

/**
 * Compute one named angle from a pose frame. Returns degrees. The caller pairs
 * this with confidence.ts to decide whether the value is trustworthy.
 */
export function computeAngle(key: AngleKey, frame: PoseFrame): number {
  switch (key) {
    // --- Shoulder elevation (flexion sagittal / abduction coronal) ---
    // Same in-image triangle (hip–shoulder–elbow); which one is meaningful
    // depends on camera angle. 0 = arm at side, 180 = overhead.
    case 'shoulder_flexion_left':
    case 'shoulder_abduction_left':
      return interiorAngle(pt(frame, LM.LEFT_HIP), pt(frame, LM.LEFT_SHOULDER), pt(frame, LM.LEFT_ELBOW));
    case 'shoulder_flexion_right':
    case 'shoulder_abduction_right':
      return interiorAngle(pt(frame, LM.RIGHT_HIP), pt(frame, LM.RIGHT_SHOULDER), pt(frame, LM.RIGHT_ELBOW));

    // --- Shoulder internal/external rotation (APPROXIMATE) ---
    // With the arm abducted, forearm orientation hints at rotation. We report
    // the elbow→wrist line's deviation from vertical. Honestly low-confidence
    // from a front view; flagged rotation-limited elsewhere.
    case 'shoulder_rotation_left':
      return angleFromVertical(sub(pt(frame, LM.LEFT_WRIST), pt(frame, LM.LEFT_ELBOW)));
    case 'shoulder_rotation_right':
      return angleFromVertical(sub(pt(frame, LM.RIGHT_WRIST), pt(frame, LM.RIGHT_ELBOW)));

    // --- Elbow flexion: 0 = straight, increases as it bends ---
    case 'elbow_flexion_left':
      return 180 - interiorAngle(pt(frame, LM.LEFT_SHOULDER), pt(frame, LM.LEFT_ELBOW), pt(frame, LM.LEFT_WRIST));
    case 'elbow_flexion_right':
      return 180 - interiorAngle(pt(frame, LM.RIGHT_SHOULDER), pt(frame, LM.RIGHT_ELBOW), pt(frame, LM.RIGHT_WRIST));

    // --- Hip flexion: 0 = standing tall, increases as the thigh rises ---
    case 'hip_flexion_left':
      return 180 - interiorAngle(pt(frame, LM.LEFT_SHOULDER), pt(frame, LM.LEFT_HIP), pt(frame, LM.LEFT_KNEE));
    case 'hip_flexion_right':
      return 180 - interiorAngle(pt(frame, LM.RIGHT_SHOULDER), pt(frame, LM.RIGHT_HIP), pt(frame, LM.RIGHT_KNEE));

    // --- Hip abduction: 0 = leg straight down, increases as leg lifts away ---
    case 'hip_abduction_left':
      return interiorAngle(pt(frame, LM.RIGHT_HIP), pt(frame, LM.LEFT_HIP), pt(frame, LM.LEFT_KNEE)) - 90;
    case 'hip_abduction_right':
      return interiorAngle(pt(frame, LM.LEFT_HIP), pt(frame, LM.RIGHT_HIP), pt(frame, LM.RIGHT_KNEE)) - 90;

    // --- Hip internal/external rotation (APPROXIMATE) ---
    // Tibia orientation hints at rotation when hip+knee flexed. Low-confidence
    // from a front view; flagged rotation-limited elsewhere.
    case 'hip_rotation_left':
      return angleFromVertical(sub(pt(frame, LM.LEFT_ANKLE), pt(frame, LM.LEFT_KNEE)));
    case 'hip_rotation_right':
      return angleFromVertical(sub(pt(frame, LM.RIGHT_ANKLE), pt(frame, LM.RIGHT_KNEE)));

    // --- Knee flexion: 0 = straight, increases as it bends ---
    case 'knee_flexion_left':
      return 180 - interiorAngle(pt(frame, LM.LEFT_HIP), pt(frame, LM.LEFT_KNEE), pt(frame, LM.LEFT_ANKLE));
    case 'knee_flexion_right':
      return 180 - interiorAngle(pt(frame, LM.RIGHT_HIP), pt(frame, LM.RIGHT_KNEE), pt(frame, LM.RIGHT_ANKLE));

    // --- Ankle dorsiflexion: 0 ~ plantigrade (90° shin-to-foot), + = toes up ---
    case 'ankle_dorsiflexion_left':
      return 90 - interiorAngle(pt(frame, LM.LEFT_KNEE), pt(frame, LM.LEFT_ANKLE), pt(frame, LM.LEFT_FOOT_INDEX));
    case 'ankle_dorsiflexion_right':
      return 90 - interiorAngle(pt(frame, LM.RIGHT_KNEE), pt(frame, LM.RIGHT_ANKLE), pt(frame, LM.RIGHT_FOOT_INDEX));

    // --- Cervical flexion: head vector vs vertical, 0 = upright ---
    case 'cervical_flexion': {
      const shoulderMid = midpoint(pt(frame, LM.LEFT_SHOULDER), pt(frame, LM.RIGHT_SHOULDER));
      return angleFromVertical(sub(pt(frame, LM.NOSE), shoulderMid));
    }

    // --- Cervical rotation (APPROXIMATE): ear line vs shoulder line ---
    case 'cervical_rotation': {
      const earVec = sub(pt(frame, LM.LEFT_EAR), pt(frame, LM.RIGHT_EAR));
      const shoulderVec = sub(pt(frame, LM.LEFT_SHOULDER), pt(frame, LM.RIGHT_SHOULDER));
      return angleBetweenVectors(earVec, shoulderVec);
    }

    // --- Spinal flexion proxy: trunk vector vs vertical, 0 = upright ---
    case 'spinal_flexion': {
      const shoulderMid = midpoint(pt(frame, LM.LEFT_SHOULDER), pt(frame, LM.RIGHT_SHOULDER));
      const hipMid = midpoint(pt(frame, LM.LEFT_HIP), pt(frame, LM.RIGHT_HIP));
      return angleFromVertical(sub(shoulderMid, hipMid));
    }

    // --- Spinal rotation proxy: shoulder line vs hip line difference ---
    case 'spinal_rotation': {
      const shoulderVec = sub(pt(frame, LM.LEFT_SHOULDER), pt(frame, LM.RIGHT_SHOULDER));
      const hipVec = sub(pt(frame, LM.LEFT_HIP), pt(frame, LM.RIGHT_HIP));
      return angleBetweenVectors(shoulderVec, hipVec);
    }
  }
}
