import { useState } from 'react';
import { embedUrl, thumbnailUrl, type VideoProvider } from '@/lib/videoLinks';

const PROVIDER_LABEL: Record<VideoProvider, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  vimeo: 'Vimeo',
};

/**
 * In-app video player for the library's providers (YouTube / TikTok / Vimeo).
 * Shows a preview poster until tapped, then swaps in the embedded iframe — so
 * lists don't eagerly load players, and clients stay inside IronFit.
 */
export default function VideoEmbed({
  provider,
  externalId,
  thumbnailUrl: poster,
  title,
}: {
  provider: VideoProvider;
  externalId: string;
  thumbnailUrl?: string | null;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  const previewSrc = thumbnailUrl(provider, externalId) ?? poster ?? null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`${embedUrl(provider, externalId)}${provider === 'youtube' ? '?autoplay=1&rel=0' : ''}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full"
          aria-label={`Play ${title}`}
        >
          {previewSrc ? (
            <img src={previewSrc} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-sm text-slate-400">
              {PROVIDER_LABEL[provider]} video
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/30 transition-colors group-hover:bg-slate-950/10">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/90 text-slate-950 shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
