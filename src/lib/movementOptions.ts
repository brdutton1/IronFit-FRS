/**
 * Option lists and small mappers shared by the trainer editor and the client
 * performance screen. Keeps the angle-key vocabulary in one place.
 */

import type { CameraAngle, JointName, Movement, MovementType, Side } from '@/types/movement';
import { isRotationLimited } from '@/lib/pose/confidence';
import type { AngleKey } from '@/lib/pose/landmarks';

export const MOVEMENT_TYPES: { value: MovementType; label: string }[] = [
  { value: 'car', label: 'CAR (Controlled Articular Rotation)' },
  { value: 'pails', label: 'PAILs' },
  { value: 'rails', label: 'RAILs' },
  { value: 'flow', label: 'Kinstretch flow' },
  { value: 'other', label: 'Other' },
];

export const JOINTS: { value: JointName; label: string }[] = [
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'elbow', label: 'Elbow' },
  { value: 'wrist', label: 'Wrist' },
  { value: 'hip', label: 'Hip' },
  { value: 'knee', label: 'Knee' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'cervical', label: 'Cervical' },
  { value: 'thoracic', label: 'Thoracic' },
  { value: 'lumbar', label: 'Lumbar' },
];

export const SIDES: { value: Side; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'bilateral', label: 'Bilateral' },
  { value: 'midline', label: 'Midline' },
];

export const CAMERA_ANGLES: { value: CameraAngle; label: string }[] = [
  { value: 'front', label: 'Front-on' },
  { value: 'side', label: 'Side' },
  { value: '45', label: '45°' },
  { value: 'overhead', label: 'Overhead' },
  { value: 'behind', label: 'Behind' },
];

/** Every measurable angle, with a human label and the body joint it belongs to. */
export const ANGLE_OPTIONS: { key: AngleKey; label: string; joint: JointName }[] = [
  { key: 'shoulder_flexion_left', label: 'Left shoulder flexion', joint: 'shoulder' },
  { key: 'shoulder_flexion_right', label: 'Right shoulder flexion', joint: 'shoulder' },
  { key: 'shoulder_abduction_left', label: 'Left shoulder abduction', joint: 'shoulder' },
  { key: 'shoulder_abduction_right', label: 'Right shoulder abduction', joint: 'shoulder' },
  { key: 'shoulder_rotation_left', label: 'Left shoulder rotation (approx)', joint: 'shoulder' },
  { key: 'shoulder_rotation_right', label: 'Right shoulder rotation (approx)', joint: 'shoulder' },
  { key: 'elbow_flexion_left', label: 'Left elbow flexion', joint: 'elbow' },
  { key: 'elbow_flexion_right', label: 'Right elbow flexion', joint: 'elbow' },
  { key: 'hip_flexion_left', label: 'Left hip flexion', joint: 'hip' },
  { key: 'hip_flexion_right', label: 'Right hip flexion', joint: 'hip' },
  { key: 'hip_abduction_left', label: 'Left hip abduction', joint: 'hip' },
  { key: 'hip_abduction_right', label: 'Right hip abduction', joint: 'hip' },
  { key: 'hip_rotation_left', label: 'Left hip rotation (approx)', joint: 'hip' },
  { key: 'hip_rotation_right', label: 'Right hip rotation (approx)', joint: 'hip' },
  { key: 'knee_flexion_left', label: 'Left knee flexion', joint: 'knee' },
  { key: 'knee_flexion_right', label: 'Right knee flexion', joint: 'knee' },
  { key: 'ankle_dorsiflexion_left', label: 'Left ankle dorsiflexion', joint: 'ankle' },
  { key: 'ankle_dorsiflexion_right', label: 'Right ankle dorsiflexion', joint: 'ankle' },
  { key: 'cervical_flexion', label: 'Cervical flexion/extension', joint: 'cervical' },
  { key: 'cervical_rotation', label: 'Cervical rotation (approx)', joint: 'cervical' },
  { key: 'spinal_flexion', label: 'Spinal flexion/extension', joint: 'thoracic' },
  { key: 'spinal_rotation', label: 'Spinal rotation', joint: 'thoracic' },
];

export function angleLabel(key: string): string {
  return ANGLE_OPTIONS.find((a) => a.key === key)?.label ?? key;
}

export const COMPENSATION_TAGS = [
  { tag: 'lumbar_extension', joint: 'lumbar', label: 'Lumbar extending', cue: 'Drop the ribs.' },
  { tag: 'lumbar_lateral_flexion', joint: 'lumbar', label: 'Side-bending', cue: 'Stay tall through both sides.' },
  { tag: 'scapular_elevation', joint: 'shoulder', label: 'Shrugging', cue: 'Soften the traps, keep the shoulder down.' },
  { tag: 'thoracic_flexion', joint: 'thoracic', label: 'Rounding forward', cue: 'Lift the chest, stack the ribs.' },
  { tag: 'cervical_extension', joint: 'cervical', label: 'Head poking forward', cue: 'Tuck the chin lightly.' },
] as const;

/** Pick the angle that drives rep detection + the ROM meter. */
export function primaryAngleFor(movement: Pick<Movement, 'target_joints'>): AngleKey {
  return (movement.target_joints[0] as AngleKey) ?? 'shoulder_flexion_right';
}

/** Build the rotation-limited flag map for a movement at its camera angle. */
export function rotationLimitedMap(movement: Movement): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of [...movement.target_joints, ...movement.stillness_joints]) {
    out[key] = isRotationLimited(key as AngleKey, movement.recommended_camera_angle);
  }
  return out;
}
