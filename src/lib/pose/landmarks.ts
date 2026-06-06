/**
 * MediaPipe Pose Landmarker emits 33 landmarks. We name the indices we use and
 * declare, per measured joint angle, which landmarks are required. Confidence
 * scoring (confidence.ts) reads those required sets directly.
 */

export interface Landmark {
  x: number; // normalized 0..1 (image space)
  y: number; // normalized 0..1
  z: number; // depth, relative to hips; less reliable than x/y
  visibility: number; // 0..1
}

export type PoseFrame = Landmark[]; // length 33

// Canonical indices (BlazePose 33-point topology).
export const LM = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/**
 * Measured angle keys. We name them <joint>_<plane/axis> so the same key flows
 * from movement metadata → reference extraction → live comparison unchanged.
 */
export type AngleKey =
  | 'shoulder_flexion_left'
  | 'shoulder_flexion_right'
  | 'shoulder_abduction_left'
  | 'shoulder_abduction_right'
  | 'shoulder_rotation_left'
  | 'shoulder_rotation_right'
  | 'elbow_flexion_left'
  | 'elbow_flexion_right'
  | 'hip_flexion_left'
  | 'hip_flexion_right'
  | 'hip_abduction_left'
  | 'hip_abduction_right'
  | 'hip_rotation_left'
  | 'hip_rotation_right'
  | 'knee_flexion_left'
  | 'knee_flexion_right'
  | 'ankle_dorsiflexion_left'
  | 'ankle_dorsiflexion_right'
  | 'cervical_flexion'
  | 'cervical_rotation'
  | 'spinal_flexion'
  | 'spinal_rotation';

/** Landmarks each angle needs visible to be trustworthy. */
export const REQUIRED_LANDMARKS: Record<AngleKey, number[]> = {
  shoulder_flexion_left: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_HIP],
  shoulder_flexion_right: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_HIP],
  shoulder_abduction_left: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_HIP],
  shoulder_abduction_right: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_HIP],
  shoulder_rotation_left: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
  shoulder_rotation_right: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  elbow_flexion_left: [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST],
  elbow_flexion_right: [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST],
  hip_flexion_left: [LM.LEFT_SHOULDER, LM.LEFT_HIP, LM.LEFT_KNEE],
  hip_flexion_right: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE],
  hip_abduction_left: [LM.LEFT_HIP, LM.RIGHT_HIP, LM.LEFT_KNEE],
  hip_abduction_right: [LM.RIGHT_HIP, LM.LEFT_HIP, LM.RIGHT_KNEE],
  hip_rotation_left: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
  hip_rotation_right: [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  knee_flexion_left: [LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE],
  knee_flexion_right: [LM.RIGHT_HIP, LM.RIGHT_KNEE, LM.RIGHT_ANKLE],
  ankle_dorsiflexion_left: [LM.LEFT_KNEE, LM.LEFT_ANKLE, LM.LEFT_FOOT_INDEX],
  ankle_dorsiflexion_right: [LM.RIGHT_KNEE, LM.RIGHT_ANKLE, LM.RIGHT_FOOT_INDEX],
  cervical_flexion: [LM.NOSE, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  cervical_rotation: [LM.LEFT_EAR, LM.RIGHT_EAR, LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER],
  spinal_flexion: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP],
  spinal_rotation: [LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_HIP, LM.RIGHT_HIP],
};

/**
 * Angles measured around a limb's long axis. 2D pose can't see these well; we
 * approximate and label them honestly (see CONSTRAINTS in README).
 */
export const ROTATION_AXIS_ANGLES: ReadonlySet<AngleKey> = new Set<AngleKey>([
  'shoulder_rotation_left',
  'shoulder_rotation_right',
  'hip_rotation_left',
  'hip_rotation_right',
]);

/** Foot landmarks are noisy; ankle confidence is capped (see confidence.ts). */
export const LOW_TRUST_ANGLES: ReadonlySet<AngleKey> = new Set<AngleKey>([
  'ankle_dorsiflexion_left',
  'ankle_dorsiflexion_right',
]);
