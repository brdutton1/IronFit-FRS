import { describe, expect, it } from 'vitest';
import { matchStretches } from './stretchMatch';
import type { Stretch } from '@/types/stretch';

function stretch(id: string, regions: string[], sort_order: number): Stretch {
  return {
    id,
    trainer_id: null,
    name: id,
    regions,
    instructions: '',
    steps: null,
    hold_seconds: null,
    video_id: null,
    sort_order,
    status: 'live',
    created_at: '',
    updated_at: '',
  };
}

const library = [
  stretch('neck-a', ['cervical'], 20),
  stretch('neck-b', ['cervical'], 10),
  stretch('shoulder', ['shoulder'], 30),
  stretch('neck-shoulder', ['cervical', 'shoulder'], 40),
  stretch('hip', ['hip'], 50),
];

describe('matchStretches', () => {
  it('returns nothing when no regions are selected', () => {
    expect(matchStretches(library, [])).toEqual([]);
  });

  it('keeps only stretches that cover a selected region', () => {
    const ids = matchStretches(library, ['hip']).map((s) => s.id);
    expect(ids).toEqual(['hip']);
  });

  it('ranks greater region overlap first, then by sort order', () => {
    const ids = matchStretches(library, ['cervical', 'shoulder']).map((s) => s.id);
    // neck-shoulder overlaps 2; the rest overlap 1 and fall back to sort_order.
    expect(ids).toEqual(['neck-shoulder', 'neck-b', 'neck-a', 'shoulder']);
  });

  it('does not return duplicates or unrelated stretches', () => {
    const ids = matchStretches(library, ['cervical']).map((s) => s.id);
    expect(ids).toEqual(['neck-b', 'neck-a', 'neck-shoulder']);
  });
});
