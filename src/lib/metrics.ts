/**
 * Coaching metrics — pure functions over recorded attempts. NO vanity metrics
 * (no streaks, points, totals-for-their-own-sake). Everything here answers a
 * coaching question: is range improving, what fault keeps recurring, who has
 * gone quiet, whose camera setup is undermining their feedback.
 *
 * Pure and unit-tested (tests/metrics/*). The Supabase helpers shape rows into
 * the `AttemptLike` / `MovementMeta` inputs below.
 */

import type { CompensationPattern } from '@/types/movement';
import type { Confidence } from '@/types/reference';
import { COMPENSATION_TAGS } from '@/lib/movementOptions';
import {
  INACTIVITY_DAYS,
  LOW_CONFIDENCE_MIN_RATE,
  LOW_CONFIDENCE_WINDOW,
  RECURRING_COMP_MIN_RATE,
  RECURRING_COMP_WINDOW,
  ROM_BELOW_TARGET_PCT,
  ROM_TREND_EPSILON_PCT,
  ROM_TREND_RECENT,
} from '@/lib/compare/thresholds';

export interface AttemptLike {
  client_id: string;
  movement_id: string;
  rom_achieved_pct: number | null;
  compensation_flags: string[];
  confidence: Confidence | null;
  attempted_at: string; // ISO
}

export interface MovementMeta {
  id: string;
  name: string;
  compensation_patterns: CompensationPattern[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Newest-first sort by attempted_at. */
function byNewest(a: AttemptLike, b: AttemptLike): number {
  return new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime();
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Resolve a compensation tag to its human label + cue, preferring the movement's
 * own tagging, then the shared presets, then the raw tag. */
export function describeCompTag(tag: string, movements: MovementMeta[]): { label: string; cue: string } {
  for (const m of movements) {
    const p = m.compensation_patterns.find((c) => c.tag === tag);
    if (p) return { label: p.label, cue: p.cue };
  }
  const preset = COMPENSATION_TAGS.find((c) => c.tag === tag);
  if (preset) return { label: preset.label, cue: preset.cue };
  return { label: tag.replace(/_/g, ' '), cue: '' };
}

export type TrendDirection = 'improving' | 'holding' | 'declining' | 'insufficient';

export interface RomTrend {
  movementId: string;
  movementName: string;
  /** Chronological ROM% (oldest → newest). */
  series: number[];
  latest: number;
  best: number;
  direction: TrendDirection;
}

/** Per-movement ROM trend for a single client's attempts. */
export function romTrendByMovement(attempts: AttemptLike[], movementsById: Record<string, MovementMeta>): RomTrend[] {
  const groups = new Map<string, AttemptLike[]>();
  for (const a of attempts) {
    if (a.rom_achieved_pct == null) continue;
    (groups.get(a.movement_id) ?? groups.set(a.movement_id, []).get(a.movement_id)!).push(a);
  }

  const out: RomTrend[] = [];
  for (const [movementId, list] of groups) {
    const chrono = [...list].sort((a, b) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime());
    const series = chrono.map((a) => a.rom_achieved_pct as number);
    const latest = series[series.length - 1];
    const best = Math.max(...series);

    let direction: TrendDirection = 'insufficient';
    if (series.length >= 2) {
      const recent = series.slice(-ROM_TREND_RECENT);
      const prior = series.slice(0, -recent.length);
      const recentAvg = mean(recent);
      const priorAvg = prior.length ? mean(prior) : mean(series.slice(0, 1));
      const delta = recentAvg - priorAvg;
      if (delta > ROM_TREND_EPSILON_PCT) direction = 'improving';
      else if (delta < -ROM_TREND_EPSILON_PCT) direction = 'declining';
      else direction = 'holding';
    }

    out.push({
      movementId,
      movementName: movementsById[movementId]?.name ?? 'Movement',
      series,
      latest,
      best,
      direction,
    });
  }
  return out.sort((a, b) => a.latest - b.latest); // worst ROM first
}

export interface CompCount {
  tag: string;
  label: string;
  cue: string;
  count: number;
  window: number;
  rate: number; // count / window
}

/** Compensation tags over the client's most recent `window` attempts, those at
 * or above the recurring threshold, worst first. */
export function recurringCompensations(
  attempts: AttemptLike[],
  movements: MovementMeta[],
  window = RECURRING_COMP_WINDOW,
  minRate = RECURRING_COMP_MIN_RATE,
): CompCount[] {
  const recent = [...attempts].sort(byNewest).slice(0, window);
  if (recent.length === 0) return [];
  const counts = new Map<string, number>();
  for (const a of recent) {
    for (const tag of new Set(a.compensation_flags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  const result: CompCount[] = [];
  for (const [tag, count] of counts) {
    const rate = count / recent.length;
    if (rate >= minRate) {
      const { label, cue } = describeCompTag(tag, movements);
      result.push({ tag, label, cue, count, window: recent.length, rate });
    }
  }
  return result.sort((a, b) => b.rate - a.rate || b.count - a.count);
}

export interface AttentionSignals {
  clientId: string;
  attemptCount: number;
  lastActiveAt: string | null;
  inactiveDays: number | null;
  inactive: boolean;
  recurringComp: CompCount | null;
  stalled: RomTrend | null;
  lowConfidenceRate: number;
  lowConfidence: boolean;
  needsAttention: boolean;
}

/** The four confirmed coaching signals for one client. */
export function attentionSignals(
  clientId: string,
  attempts: AttemptLike[],
  movements: MovementMeta[],
  now: number = Date.now(),
): AttentionSignals {
  const movementsById = Object.fromEntries(movements.map((m) => [m.id, m]));
  const sorted = [...attempts].sort(byNewest);
  const lastActiveAt = sorted[0]?.attempted_at ?? null;

  const inactiveDays = lastActiveAt ? Math.floor((now - new Date(lastActiveAt).getTime()) / DAY_MS) : null;
  const inactive = inactiveDays != null && inactiveDays >= INACTIVITY_DAYS;

  const recurring = recurringCompensations(attempts, movements);
  const recurringComp = recurring[0] ?? null;

  // Stalled = a movement that's declining, or whose best recent ROM is below target.
  const trends = romTrendByMovement(attempts, movementsById);
  const stalled =
    trends.find((t) => t.direction === 'declining') ??
    trends.find((t) => t.series.length >= 2 && Math.max(...t.series.slice(-ROM_TREND_RECENT)) < ROM_BELOW_TARGET_PCT) ??
    null;

  const recentForConf = sorted.slice(0, LOW_CONFIDENCE_WINDOW);
  const lowCount = recentForConf.filter((a) => a.confidence === 'low' || a.confidence === 'reduced').length;
  const lowConfidenceRate = recentForConf.length ? lowCount / recentForConf.length : 0;
  const lowConfidence = recentForConf.length > 0 && lowConfidenceRate >= LOW_CONFIDENCE_MIN_RATE;

  return {
    clientId,
    attemptCount: attempts.length,
    lastActiveAt,
    inactiveDays,
    inactive,
    recurringComp,
    stalled,
    lowConfidenceRate,
    lowConfidence,
    needsAttention: inactive || !!recurringComp || !!stalled || lowConfidence,
  };
}

/** Group a trainer's attempts by client_id. */
export function groupByClient<T extends AttemptLike>(attempts: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const a of attempts) {
    (m.get(a.client_id) ?? m.set(a.client_id, []).get(a.client_id)!).push(a);
  }
  return m;
}
