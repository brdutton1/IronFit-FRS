/** Confidence in a joint-angle measurement, derived from landmark visibility. */
export type Confidence = 'high' | 'reduced' | 'low';

export interface TargetJointReference {
  /** Angle (degrees) per analyzed frame. */
  trajectory: number[];
  /** Peak angle reached over the clip. */
  peak: number;
  /** Range of motion = max - min over the clip. */
  rom: number;
  /** 0..1, where 1 is perfectly smooth. Higher = less jitter from the smoothed curve. */
  smoothness_score: number;
  confidence: Confidence;
  /** True when this joint's axis is poorly observed from the chosen camera angle. */
  rotation_limited: boolean;
}

export interface StillnessJointReference {
  baseline_angle: number;
  max_deviation: number;
  variance: number;
  confidence: Confidence;
  rotation_limited: boolean;
}

export interface ReferenceDataset {
  movement_id: string;
  fps: number;
  duration_sec: number;
  rep_count: number;
  target_joints: Record<string, TargetJointReference>;
  stillness_joints: Record<string, StillnessJointReference>;
  cues: string[];
  compensation_patterns: string[];
}
