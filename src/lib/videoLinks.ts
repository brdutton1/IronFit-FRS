/**
 * Video link helpers for the multi-provider library. We store a provider + the
 * provider's id (+ the canonical url) and derive embeds/thumbnails, so a trainer
 * can paste a YouTube, TikTok, or Vimeo link and we play it in-app.
 */

export type VideoProvider = 'youtube' | 'tiktok' | 'vimeo';

export interface ParsedVideoLink {
  provider: VideoProvider;
  externalId: string;
  url: string;
}

/** Parse a YouTube / TikTok / Vimeo link (or a bare YouTube id). */
export function parseVideoLink(input: string): ParsedVideoLink | null {
  const raw = input.trim();
  if (!raw) return null;

  // Bare YouTube id (11 chars) — convenience.
  if (/^[\w-]{11}$/.test(raw)) {
    return { provider: 'youtube', externalId: raw, url: `https://youtu.be/${raw}` };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');

  // ── YouTube ──
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1);
    return validYouTube(id) ? { provider: 'youtube', externalId: id, url: raw } : null;
  }
  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    let id: string | null = null;
    if (parsed.pathname === '/watch') {
      id = parsed.searchParams.get('v');
    } else {
      const m = parsed.pathname.match(/^\/(?:embed|shorts|v|live)\/([\w-]{11})/);
      id = m ? m[1] : null;
    }
    return id && validYouTube(id) ? { provider: 'youtube', externalId: id, url: raw } : null;
  }

  // ── TikTok ── (full URLs only; vm.tiktok.com short links can't be resolved client-side)
  if (host.endsWith('tiktok.com')) {
    const m = parsed.pathname.match(/\/video\/(\d+)/);
    return m ? { provider: 'tiktok', externalId: m[1], url: raw } : null;
  }

  // ── Vimeo ──
  if (host.endsWith('vimeo.com')) {
    const m = parsed.pathname.match(/(?:\/video)?\/(\d+)/);
    return m ? { provider: 'vimeo', externalId: m[1], url: raw } : null;
  }

  return null;
}

function validYouTube(id: string): boolean {
  return /^[\w-]{11}$/.test(id);
}

/** In-app embed URL for an <iframe>, per provider. */
export function embedUrl(provider: VideoProvider, externalId: string): string {
  switch (provider) {
    case 'youtube':
      return `https://www.youtube-nocookie.com/embed/${externalId}`;
    case 'tiktok':
      return `https://www.tiktok.com/embed/v2/${externalId}`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${externalId}`;
  }
}

/** Preview thumbnail. YouTube is derivable with no API call; others return null
 * (callers fall back to a stored thumbnail_url or a provider placeholder). */
export function thumbnailUrl(provider: VideoProvider, externalId: string): string | null {
  return provider === 'youtube' ? `https://img.youtube.com/vi/${externalId}/hqdefault.jpg` : null;
}

const OEMBED: Record<VideoProvider, ((url: string) => string) | null> = {
  youtube: null, // derivable, no fetch needed
  tiktok: (url) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
  vimeo: (url) => `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
};

/** Best-effort thumbnail via the provider's (CORS-friendly) oEmbed endpoint.
 * Returns null on any failure — callers treat the thumbnail as optional. */
export async function fetchOEmbedThumbnail(provider: VideoProvider, url: string): Promise<string | null> {
  const endpoint = OEMBED[provider]?.(url);
  if (!endpoint) return null;
  try {
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string };
    return data.thumbnail_url ?? null;
  } catch {
    return null;
  }
}
