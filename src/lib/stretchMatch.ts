import type { Stretch } from '@/types/stretch';

/**
 * Match stretches to the body areas a client reported sore. Keeps stretches that
 * cover at least one selected region, most-relevant first (greatest region
 * overlap), then by the library's sort order for a stable, sensible sequence.
 */
export function matchStretches(stretches: Stretch[], selectedRegions: string[]): Stretch[] {
  const wanted = new Set(selectedRegions);
  if (wanted.size === 0) return [];

  const overlap = (s: Stretch) => s.regions.reduce((n, r) => (wanted.has(r) ? n + 1 : n), 0);

  return stretches
    .map((s) => ({ s, score: overlap(s) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.s.sort_order - b.s.sort_order)
    .map((x) => x.s);
}
