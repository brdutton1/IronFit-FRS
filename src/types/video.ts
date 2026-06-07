/** A YouTube link in the shared video library. trainer_id null = built-in. */
export interface Video {
  id: string;
  /** Owning trainer, or null for a platform-provided (built-in) video. */
  trainer_id: string | null;
  youtube_id: string;
  title: string;
  description: string | null;
  /** Optional FOCUS_AREAS keys, for filtering. */
  regions: string[];
  status: 'draft' | 'live' | 'archived';
  created_at: string;
  updated_at: string;
}

export type VideoDraft = Omit<Video, 'id' | 'trainer_id' | 'created_at' | 'updated_at'>;
