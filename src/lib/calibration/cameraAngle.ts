/**
 * Camera-angle estimation from body geometry.
 *
 * Heuristic: facing the camera, shoulder width is large relative to torso
 * height. Turned side-on, the shoulders foreshorten and that ratio collapses.
 * We map the ratio to an approximate yaw (0° = facing camera, 90° = side-on).
 *
 * HONEST LIMIT: this ratio cannot distinguish front from behind (shoulders look
 * the same width either way), and 'overhead' can't be judged from it at all.
 * We say so rather than guess.
 */

import type { CameraAngle } from '@/types/movement';
import type { PoseFrame } from '@/lib/pose/landmarks';
import { CAMERA_ANGLE_TOLERANCE_DEG } from '@/lib/compare/thresholds';
import { shoulderWidth, torsoHeight } from './bodyHeightNormalize';

/**
 * Shoulder-width : torso-height ratio when squarely facing the camera. Adult
 * biacromial width ≈ 0.6× torso (shoulder-to-hip) on average. Defensible
 * default; Lee can tune. See README "Thresholds".
 */
export const FRONT_RATIO = 0.6;

export interface CameraAngleEstimate {
  /** Approximate yaw from facing the camera, 0..90 degrees. */
  yawDeg: number;
  ratio: number;
  /** Closest categorical angle the yaw maps to (never 'behind'/'overhead'). */
  category: 'front' | '45' | 'side';
  /** False when landmarks are too poor to estimate. */
  reliable: boolean;
}

export function estimateCameraAngle(frame: PoseFrame): CameraAngleEstimate {
  const sw = shoulderWidth(frame);
  const th = torsoHeight(frame);
  const reliable =
    th > 1e-3 &&
    frame[11]?.visibility > 0.5 &&
    frame[12]?.visibility > 0.5 &&
    frame[23]?.visibility > 0.5 &&
    frame[24]?.visibility > 0.5;

  const ratio = th > 1e-6 ? sw / th : 0;
  // yaw = acos(ratio / front_ratio), clamped. Larger ratio → more front-on.
  const cos = Math.min(1, Math.max(0, ratio / FRONT_RATIO));
  const yawDeg = Math.acos(cos) * (180 / Math.PI);

  let category: CameraAngleEstimate['category'];
  if (yawDeg < 25) category = 'front';
  else if (yawDeg < 65) category = '45';
  else category = 'side';

  return { yawDeg, ratio, category, reliable };
}

/** Expected yaw (deg from front) for each recommended angle, where knowable. */
function expectedYaw(angle: CameraAngle): number | null {
  switch (angle) {
    case 'front':
      return 0;
    case '45':
      return 45;
    case 'side':
      return 90;
    case 'behind': // looks like 'front' to this heuristic — can't verify
    case 'overhead': // not observable from shoulder/torso ratio
      return null;
  }
}

export interface CameraAngleValidation {
  ok: boolean;
  estimate: CameraAngleEstimate;
  /** True when we genuinely can't verify (behind/overhead, or unreliable). */
  unverifiable: boolean;
  /** User-facing guidance, e.g. "Turn about 90° to your side." */
  message: string;
}

/**
 * Compare the live estimate to the recommended angle. Returns guidance and
 * whether it's within tolerance. Caller may allow override (flag the session
 * reduced confidence) regardless of `ok`.
 */
export function validateCameraAngle(
  frame: PoseFrame,
  recommended: CameraAngle,
): CameraAngleValidation {
  const estimate = estimateCameraAngle(frame);
  const target = expectedYaw(recommended);

  if (target === null || !estimate.reliable) {
    return {
      ok: true,
      estimate,
      unverifiable: true,
      message:
        recommended === 'behind'
          ? "Facing away: we can't verify this angle automatically. Position so your full body is in frame."
          : recommended === 'overhead'
            ? "Overhead angle can't be auto-checked. Make sure your full body is in frame."
            : 'Move so your full body is clearly in frame.',
    };
  }

  const diff = Math.abs(estimate.yawDeg - target);
  const ok = diff <= CAMERA_ANGLE_TOLERANCE_DEG;
  let message = 'Position looks good.';
  if (!ok) {
    if (estimate.yawDeg < target) message = `Turn about ${Math.round(target - estimate.yawDeg)}° toward your side.`;
    else message = `Turn about ${Math.round(estimate.yawDeg - target)}° to face the camera more.`;
  }
  return { ok, estimate, unverifiable: false, message };
}
