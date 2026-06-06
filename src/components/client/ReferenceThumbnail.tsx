import { useEffect, useState } from 'react';
import type { Movement } from '@/types/movement';
import { signedThumbnailUrl } from '@/lib/supabase/storage';

/** Lazy-loaded signed thumbnail; falls back to a labelled gradient tile. */
export function ReferenceThumbnail({ movement }: { movement: Movement }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (movement.reference_video_path) {
      signedThumbnailUrl(`${movement.reference_video_path}.jpg`)
        .then((u) => active && setUrl(u))
        .catch(() => active && setUrl(null));
    }
    return () => {
      active = false;
    };
  }, [movement.reference_video_path]);

  if (url) {
    return (
      <img
        src={url}
        alt={`Reference thumbnail for ${movement.name}`}
        className="aspect-square w-full object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div
      className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-2 text-center text-xs text-slate-400"
      aria-hidden="true"
    >
      {movement.primary_joint}
    </div>
  );
}
