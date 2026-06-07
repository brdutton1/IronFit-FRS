/**
 * YouTube link helpers for the video library. We store only the 11-char video
 * id and derive everything else, so a trainer can paste any YouTube URL form.
 * Playback uses the privacy-friendly youtube-nocookie embed, kept in-app.
 */

/** Pull the video id out of any common YouTube URL (or accept a bare id). */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  // Already a bare id?
  if (/^[\w-]{11}$/.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = url.pathname.slice(1);
  } else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v');
    } else {
      // /embed/<id>, /shorts/<id>, /v/<id>, /live/<id>
      const m = url.pathname.match(/^\/(?:embed|shorts|v|live)\/([\w-]{11})/);
      id = m ? m[1] : null;
    }
  }

  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

/** Preview thumbnail (no API key needed). */
export function thumbnailUrl(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

/** In-app, privacy-friendly embed URL for an <iframe>. */
export function embedUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
}
