import { useState } from 'react';
import { embedUrl, thumbnailUrl } from '@/lib/youtube';

/**
 * In-app YouTube player. Shows the preview thumbnail until tapped, then swaps in
 * the privacy-friendly (youtube-nocookie) iframe — so lists don't eagerly load a
 * dozen players, and clients stay inside IronFit.
 */
export default function VideoEmbed({ youtubeId, title }: { youtubeId: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`${embedUrl(youtubeId)}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full"
          aria-label={`Play ${title}`}
        >
          <img
            src={thumbnailUrl(youtubeId)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
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
