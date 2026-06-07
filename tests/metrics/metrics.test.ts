import { describe, expect, it } from 'vitest';
import {
  attentionSignals,
  describeCompTag,
  groupByClient,
  recurringCompensations,
  romTrendByMovement,
  type AttemptLike,
  type MovementMeta,
} from '@/lib/metrics';
import type { CompensationPattern } from '@/types/movement';

const NOW = Date.parse('2026-06-06T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

function attempt(over: Partial<AttemptLike> = {}): AttemptLike {
  return {
    client_id: 'c1',
    movement_id: 'm1',
    rom_achieved_pct: 80,
    compensation_flags: [],
    confidence: 'high',
    attempted_at: daysAgo(0),
    ...over,
  };
}

const lumbarPattern: CompensationPattern = {
  joint: 'lumbar',
  tag: 'lumbar_extension',
  label: 'Lumbar extending',
  cue: 'Drop the ribs.',
};
const movement: MovementMeta = { id: 'm1', name: 'Shoulder CAR', compensation_patterns: [lumbarPattern] };
const movementsById = { m1: movement };

describe('follow-along (null ROM) logs', () => {
  it('count as activity but are excluded from ROM trends and stalled signals', () => {
    const attempts = [
      attempt({ rom_achieved_pct: null, confidence: null, attempted_at: daysAgo(0) }),
      attempt({ rom_achieved_pct: null, confidence: null, attempted_at: daysAgo(1) }),
    ];
    // No ROM trend produced from null-only attempts…
    expect(romTrendByMovement(attempts, movementsById)).toHaveLength(0);
    // …but they still register as recent activity (no false "declining"/"inactive").
    const s = attentionSignals('c1', attempts, [movement], NOW);
    expect(s.attemptCount).toBe(2);
    expect(s.lastActiveAt).toBe(daysAgo(0));
    expect(s.stalled).toBeNull();
    expect(s.needsAttention).toBe(false);
  });
});

describe('romTrendByMovement', () => {
  it('detects improving ROM', () => {
    const attempts = [50, 55, 60, 70, 80].map((rom, i) =>
      attempt({ rom_achieved_pct: rom, attempted_at: daysAgo(10 - i) }),
    );
    const [t] = romTrendByMovement(attempts, movementsById);
    expect(t.direction).toBe('improving');
    expect(t.latest).toBe(80);
    expect(t.best).toBe(80);
  });

  it('detects declining ROM', () => {
    const attempts = [80, 75, 60, 55, 50].map((rom, i) =>
      attempt({ rom_achieved_pct: rom, attempted_at: daysAgo(10 - i) }),
    );
    expect(romTrendByMovement(attempts, movementsById)[0].direction).toBe('declining');
  });

  it('detects holding ROM within the noise band', () => {
    const attempts = [70, 71, 69, 70, 71].map((rom, i) =>
      attempt({ rom_achieved_pct: rom, attempted_at: daysAgo(10 - i) }),
    );
    expect(romTrendByMovement(attempts, movementsById)[0].direction).toBe('holding');
  });

  it('reports insufficient with a single attempt and ignores null ROM', () => {
    const trends = romTrendByMovement(
      [attempt({ rom_achieved_pct: 60 }), attempt({ rom_achieved_pct: null })],
      movementsById,
    );
    expect(trends[0].direction).toBe('insufficient');
    expect(trends[0].series).toEqual([60]);
  });
});

describe('recurringCompensations', () => {
  it('flags a fault present in at least half of the last 5 attempts', () => {
    const attempts = [
      attempt({ compensation_flags: ['lumbar_extension'], attempted_at: daysAgo(1) }),
      attempt({ compensation_flags: ['lumbar_extension'], attempted_at: daysAgo(2) }),
      attempt({ compensation_flags: ['lumbar_extension'], attempted_at: daysAgo(3) }),
      attempt({ compensation_flags: ['scapular_elevation'], attempted_at: daysAgo(4) }),
      attempt({ compensation_flags: [], attempted_at: daysAgo(5) }),
    ];
    const recurring = recurringCompensations(attempts, [movement]);
    expect(recurring).toHaveLength(1);
    expect(recurring[0].tag).toBe('lumbar_extension');
    expect(recurring[0].rate).toBeCloseTo(0.6);
    expect(recurring[0].label).toBe('Lumbar extending');
    expect(recurring[0].cue).toBe('Drop the ribs.');
  });

  it('does not flag an occasional fault', () => {
    const attempts = [
      attempt({ compensation_flags: ['scapular_elevation'], attempted_at: daysAgo(1) }),
      attempt({ compensation_flags: [], attempted_at: daysAgo(2) }),
      attempt({ compensation_flags: [], attempted_at: daysAgo(3) }),
      attempt({ compensation_flags: [], attempted_at: daysAgo(4) }),
      attempt({ compensation_flags: [], attempted_at: daysAgo(5) }),
    ];
    expect(recurringCompensations(attempts, [movement])).toHaveLength(0);
  });
});

describe('describeCompTag', () => {
  it('prefers the movement tagging, then presets, then the raw tag', () => {
    expect(describeCompTag('lumbar_extension', [movement]).cue).toBe('Drop the ribs.');
    expect(describeCompTag('scapular_elevation', []).label).toBe('Shrugging'); // from COMPENSATION_TAGS preset
    expect(describeCompTag('totally_unknown_tag', []).label).toBe('totally unknown tag');
  });
});

describe('attentionSignals', () => {
  it('flags inactivity past the threshold', () => {
    const s = attentionSignals('c1', [attempt({ attempted_at: daysAgo(6) })], [movement], NOW);
    expect(s.inactive).toBe(true);
    expect(s.inactiveDays).toBe(6);
    expect(s.needsAttention).toBe(true);
  });

  it('does not flag a recently active, clean client', () => {
    const clean = [80, 82, 84].map((rom, i) =>
      attempt({ rom_achieved_pct: rom, attempted_at: daysAgo(2 - i), confidence: 'high', compensation_flags: [] }),
    );
    const s = attentionSignals('c1', clean, [movement], NOW);
    expect(s.needsAttention).toBe(false);
    expect(s.recurringComp).toBeNull();
    expect(s.stalled).toBeNull();
    expect(s.lowConfidence).toBe(false);
  });

  it('flags recurring compensation and low camera confidence', () => {
    const attempts = [0, 1, 2, 3, 4].map((i) =>
      attempt({
        attempted_at: daysAgo(i + 1),
        compensation_flags: i < 3 ? ['lumbar_extension'] : [],
        confidence: i < 3 ? 'reduced' : 'high',
      }),
    );
    const s = attentionSignals('c1', attempts, [movement], NOW);
    expect(s.recurringComp?.tag).toBe('lumbar_extension');
    expect(s.lowConfidence).toBe(true);
    expect(s.needsAttention).toBe(true);
  });

  it('flags a declining movement as stalled', () => {
    const attempts = [85, 80, 60, 55, 50].map((rom, i) =>
      attempt({ rom_achieved_pct: rom, attempted_at: daysAgo(6 - i) }),
    );
    const s = attentionSignals('c1', attempts, [movement], NOW);
    expect(s.stalled?.direction).toBe('declining');
  });

  it('handles a client with no attempts', () => {
    const s = attentionSignals('c1', [], [movement], NOW);
    expect(s.attemptCount).toBe(0);
    expect(s.lastActiveAt).toBeNull();
    expect(s.needsAttention).toBe(false);
  });
});

describe('groupByClient', () => {
  it('groups attempts by client_id', () => {
    const m = groupByClient([attempt({ client_id: 'a' }), attempt({ client_id: 'b' }), attempt({ client_id: 'a' })]);
    expect(m.get('a')).toHaveLength(2);
    expect(m.get('b')).toHaveLength(1);
  });
});
