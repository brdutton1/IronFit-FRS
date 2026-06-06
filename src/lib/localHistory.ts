/**
 * Client-side attempt history in LocalStorage. Lean by design: only the last 10
 * attempts per movement, and only a timestamp + ROM%. No video, no pose data,
 * no biometrics — matches the privacy promise in the README/footer.
 */

import type { LocalAttempt } from '@/types/attempt';

const KEY_PREFIX = 'ironfit:history:';
const MAX_PER_MOVEMENT = 10;

function key(movementId: string): string {
  return `${KEY_PREFIX}${movementId}`;
}

function safeParse(raw: string | null): LocalAttempt[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalAttempt[]) : [];
  } catch {
    return [];
  }
}

export function getHistory(movementId: string): LocalAttempt[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse(localStorage.getItem(key(movementId)));
}

/** Prepend an attempt, keeping at most the last 10. Returns the trimmed list. */
export function addAttempt(movementId: string, romPct: number): LocalAttempt[] {
  if (typeof localStorage === 'undefined') return [];
  const entry: LocalAttempt = {
    movement_id: movementId,
    rom_achieved_pct: Math.round(romPct),
    attempted_at: new Date().toISOString(),
  };
  const next = [entry, ...getHistory(movementId)].slice(0, MAX_PER_MOVEMENT);
  localStorage.setItem(key(movementId), JSON.stringify(next));
  return next;
}

export function clearHistory(movementId: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(key(movementId));
}

/** Most recent attempt across all movements, for the dashboard greeting. */
export function mostRecentAttempt(): LocalAttempt | null {
  if (typeof localStorage === 'undefined') return null;
  let latest: LocalAttempt | null = null;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith(KEY_PREFIX)) continue;
    for (const a of safeParse(localStorage.getItem(k))) {
      if (!latest || a.attempted_at > latest.attempted_at) latest = a;
    }
  }
  return latest;
}
