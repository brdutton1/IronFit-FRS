import { describe, expect, it } from 'vitest';
import { exportNotesMarkdown } from '@/lib/devNotesExport';
import type { DevNote } from '@/types/devNote';

function note(p: Partial<DevNote>): DevNote {
  return {
    id: Math.random().toString(36),
    author_id: 'u',
    author_name: 'Leah',
    page_path: '/trainer',
    page_title: 'Clients',
    body: 'a note',
    author_role: 'trainer',
    user_agent: 'UA',
    viewport: '390x844',
    resolved: false,
    created_at: '2026-06-06T14:14:00.000Z',
    ...p,
  };
}

const NOW = new Date('2026-06-06T20:00:00Z');

describe('exportNotesMarkdown', () => {
  it('groups notes by page and renders status, author, and context', () => {
    const md = exportNotesMarkdown(
      [
        note({ page_path: '/trainer', page_title: 'Clients', body: 'roster slow', author_name: 'Lee' }),
        note({ page_path: '/client', page_title: 'Library', body: 'focus confusing', resolved: true }),
      ],
      NOW,
    );
    expect(md).toContain('# IronFit testing notes — exported 2026-06-06');
    expect(md).toContain('## Clients (/trainer)');
    expect(md).toContain('## Library (/client)');
    expect(md).toContain('- [open] Lee · 2026-06-06 14:14 · trainer · 390x844 — roster slow');
    expect(md).toContain('- [done] Leah');
  });

  it('orders notes within a page oldest → newest', () => {
    const md = exportNotesMarkdown(
      [
        note({ body: 'second', created_at: '2026-06-06T15:00:00.000Z' }),
        note({ body: 'first', created_at: '2026-06-06T09:00:00.000Z' }),
      ],
      NOW,
    );
    expect(md.indexOf('first')).toBeLessThan(md.indexOf('second'));
  });

  it('collapses newlines in a note body to a single line', () => {
    const md = exportNotesMarkdown([note({ body: 'line one\n\nline two' })], NOW);
    expect(md).toContain('line one line two');
  });

  it('handles an empty list', () => {
    expect(exportNotesMarkdown([], NOW)).toContain('_No notes yet._');
  });
});
