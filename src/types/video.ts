import type { VideoProvider } from '@/lib/videoLinks';

/** A video link in the shared library. trainer_id null = built-in. */
export interface Video {
  id: string;
  /** Owning trainer, or null for a platform-provided (built-in) video. */
  trainer_id: string | null;
  provider: VideoProvider;
  /** Provider's video id (YouTube 11-char id, TikTok/Vimeo numeric id). */
  external_id: string;
  /** Canonical link the trainer pasted (used for oEmbed / "open original"). */
  url: string | null;
  /** Cached preview image (mainly for TikTok/Vimeo; YouTube is derivable). */
  thumbnail_url: string | null;
  title: string;
  description: string | null;
  /** Optional FOCUS_AREAS keys, for filtering. */
  regions: string[];
  status: 'draft' | 'live' | 'archived';
  created_at: string;
  updated_at: string;
}

export type VideoDraft = Omit<Video, 'id' | 'trainer_id' | 'created_at' | 'updated_at'>;
