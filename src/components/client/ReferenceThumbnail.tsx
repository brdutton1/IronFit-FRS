import { useEffect, useState } from 'react';
import type { Movement } from '@/types/movement';
import type { Video } from '@/types/video';
import { signedThumbnailUrl } from '@/lib/supabase/storage';
import { thumbnailUrl } from '@/lib/videoLinks';

/** Lazy-loaded thumbnail: uploaded reference (signed) → linked-video preview →
 * a labelled gradient tile. */
export function ReferenceThumbnail({ movement, linkedVideo }: { movement: Movement; linkedVideo?: Video }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (movement.reference_video_path) {
      signedThumbnailUrl(`${movement.reference_video_path}.jpg`)
        .then((u) => active && setUrl(u))
        .catch(() => active && setUrl(null));
    } else {
      setUrl(null);
    }
    return () => {
      active = false;
    };
  }, [movement.reference_video_path]);

  const linkedThumb = linkedVideo
    ? thumbnailUrl(linkedVideo.provider, linkedVideo.external_id) ?? linkedVideo.thumbnail_url
    : null;
  const src = url ?? linkedThumb;

  if (src) {
    return (
      <img
        src={src}
        alt={`Thumbnail for ${movement.name}`}
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
