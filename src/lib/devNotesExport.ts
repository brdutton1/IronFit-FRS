import type { DevNote } from '@/types/devNote';

/** UTC "YYYY-MM-DD HH:mm" — deterministic, locale-independent. */
function shortStamp(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ');
}

/**
 * Group notes by page and render a Markdown export (the "Copy all" / "Copy this
 * page" output). Pure and unit-tested. Pass a pre-filtered list to scope it.
 */
export function exportNotesMarkdown(notes: DevNote[], now: Date = new Date()): string {
  const header = `# IronFit testing notes — exported ${now.toISOString().slice(0, 10)}`;
  if (notes.length === 0) return `${header}\n\n_No notes yet._\n`;

  const groups = new Map<string, DevNote[]>();
  for (const n of notes) {
    (groups.get(n.page_path) ?? groups.set(n.page_path, []).get(n.page_path)!).push(n);
  }

  const lines: string[] = [header];
  for (const [path, list] of groups) {
    const title = list[0].page_title || path;
    lines.push('', `## ${title} (${path})`);
    const chrono = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const n of chrono) {
      const who = n.author_name || 'someone';
      const status = n.resolved ? 'done' : 'open';
      const ctx = [n.author_role, n.viewport].filter(Boolean).join(' · ');
      const body = n.body.replace(/\s*\n+\s*/g, ' ').trim();
      lines.push(`- [${status}] ${who} · ${shortStamp(n.created_at)}${ctx ? ` · ${ctx}` : ''} — ${body}`);
    }
  }
  return lines.join('\n') + '\n';
}
