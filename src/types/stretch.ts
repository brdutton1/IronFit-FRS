/** A stretch in the library. trainer_id null = built-in/platform-provided. */
export interface Stretch {
  id: string;
  trainer_id: string | null;
  name: string;
  /** FOCUS_AREAS keys this stretch helps with. */
  regions: string[];
  instructions: string;
  steps: string[] | null;
  hold_seconds: number | null;
  /** Optional linked library video. */
  video_id: string | null;
  sort_order: number;
  status: 'draft' | 'live' | 'archived';
  created_at: string;
  updated_at: string;
}

export type StretchDraft = Omit<Stretch, 'id' | 'trainer_id' | 'created_at' | 'updated_at'>;
