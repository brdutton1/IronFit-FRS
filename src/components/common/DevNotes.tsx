import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/session';
import { addDevNote, deleteDevNote, listDevNotes, setResolved } from '@/lib/supabase/devNotes';
import { exportNotesMarkdown } from '@/lib/devNotesExport';
import { relativeTime } from '@/lib/time';
import type { DevNote } from '@/types/devNote';

/**
 * Testing-only feedback log. Mounted once in AppShell, so it rides along on every
 * logged-in page. A note auto-tags the page, author, role, time, and device.
 */
export default function DevNotes({ pageTitle }: { pageTitle?: string }) {
  const { session, profile } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<DevNote[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setNotes(await listDevNotes());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  const onThisPage = useMemo(() => notes.filter((n) => n.page_path === pathname), [notes, pathname]);
  const openCount = useMemo(() => onThisPage.filter((n) => !n.resolved).length, [onThisPage]);
  const visible = showAll ? notes : onThisPage;

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!profile || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addDevNote({
        author_id: profile.user_id,
        author_name: profile.display_name,
        author_role: profile.role,
        page_path: pathname,
        page_title: pageTitle ?? null,
        body: body.trim(),
      });
      setBody('');
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleResolved(n: DevNote) {
    await setResolved(n.id, !n.resolved).catch((e) => setError((e as Error).message));
    await refresh();
  }
  async function remove(id: string) {
    await deleteDevNote(id).catch((e) => setError((e as Error).message));
    await refresh();
  }

  async function copy(scope: 'all' | 'page') {
    const md = exportNotesMarkdown(scope === 'all' ? notes : onThisPage);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(scope);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  if (!session) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-3 z-30 flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs font-medium text-slate-200 shadow-lg backdrop-blur hover:border-sky-600"
        aria-expanded={open}
        aria-label={`Testing notes${openCount ? `, ${openCount} open on this page` : ''}`}
      >
        <span aria-hidden>📝</span>
        Notes
        {openCount > 0 && (
          <span className="ml-0.5 rounded-full bg-amber-500/90 px-1.5 text-[10px] font-bold text-slate-950">{openCount}</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 bottom-32 z-30 mx-auto max-w-md rounded-2xl border border-slate-700 bg-slate-950/97 p-3 shadow-2xl backdrop-blur sm:left-auto sm:right-3 sm:w-96">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Testing notes</h2>
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1 text-slate-400">
                <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                All pages
              </label>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-100" aria-label="Close notes">
                ✕
              </button>
            </div>
          </div>

          <p className="mb-2 truncate text-xs text-slate-500">{showAll ? 'All pages' : pageTitle || pathname}</p>

          <form onSubmit={add} className="mb-3 flex flex-col gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="What did you notice on this page?"
              className="field-input text-sm"
            />
            <button type="submit" className="btn-primary self-end px-3 py-1.5 text-sm" disabled={busy || !body.trim()}>
              {busy ? 'Adding…' : 'Add note'}
            </button>
          </form>

          {error && <p role="alert" className="mb-2 text-xs text-red-300">{error}</p>}

          <div className="mb-2 flex gap-2 text-xs">
            <button type="button" onClick={() => void copy('page')} className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-sky-600">
              {copied === 'page' ? 'Copied ✓' : 'Copy this page'}
            </button>
            <button type="button" onClick={() => void copy('all')} className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-sky-600">
              {copied === 'all' ? 'Copied ✓' : 'Copy all'}
            </button>
          </div>

          <ul className="max-h-[40vh] divide-y divide-slate-800 overflow-auto">
            {visible.length === 0 ? (
              <li className="py-3 text-xs text-slate-500">No notes {showAll ? 'yet' : 'on this page yet'}.</li>
            ) : (
              visible.map((n) => (
                <li key={n.id} className="py-2 text-xs">
                  <p className={n.resolved ? 'text-slate-500 line-through' : 'text-slate-200'}>{n.body}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="truncate">
                      {n.author_name ?? 'someone'} · {relativeTime(n.created_at)}
                      {showAll && n.page_title ? ` · ${n.page_title}` : ''}
                    </span>
                    <span className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => void toggleResolved(n)} className="hover:text-emerald-300">
                        {n.resolved ? 'reopen' : 'resolve ✓'}
                      </button>
                      <button type="button" onClick={() => void remove(n.id)} className="hover:text-red-300">delete</button>
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </>
  );
}
