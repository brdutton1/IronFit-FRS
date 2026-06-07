import type { ReferenceDataset, Confidence } from './reference';

export type MovementType = 'car' | 'pails' | 'rails' | 'flow' | 'other';
export type Side = 'left' | 'right' | 'bilateral' | 'midline';
export type CameraAngle = 'front' | 'side' | '45' | 'overhead' | 'behind';
export type MovementStatus = 'draft' | 'live' | 'archived';

export type JointName =
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'hip'
  | 'knee'
  | 'ankle'
  | 'cervical'
  | 'thoracic'
  | 'lumbar';

/** A structured compensation pattern Lee wants the app to watch for. */
export interface CompensationPattern {
  /** Stillness joint whose drift triggers this pattern, e.g. 'lumbar'. */
  joint: string;
  /** Machine tag, e.g. 'lumbar_extension'. */
  tag: string;
  /** Human label shown in the banner, e.g. 'Lumbar extending'. */
  label: string;
  /** Lee's cue to fix it, e.g. 'Drop the ribs.' */
  cue: string;
}

export interface Movement {
  id: string;
  trainer_id: string;
  name: string;
  movement_type: MovementType;
  primary_joint: JointName;
  side: Side;
  recommended_camera_angle: CameraAngle;
  /** Joints that SHOULD move. Each maps to the measured axis, e.g. 'shoulder_flexion'. */
  target_joints: string[];
  /** Joints that should NOT move (compensation watch). */
  stillness_joints: string[];
  rom_expectation_deg: number | null;
  tempo_expectation: string | null;
  cues: string[];
  compensation_patterns: CompensationPattern[];
  reference_video_path: string | null;
  reference_dataset: ReferenceDataset | null;
  reference_quality: Confidence | null;
  /** Optional linked library video — a "watch & follow" demo (no AI scoring). */
  video_id: string | null;
  status: MovementStatus;
  created_at: string;
  updated_at: string;
}

/** Shape used by the editor form before an id/timestamps exist. */
export type MovementDraft = Omit<
  Movement,
  'id' | 'trainer_id' | 'created_at' | 'updated_at' | 'reference_dataset' | 'reference_quality'
>;
