import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import LibraryNav from './LibraryNav';
import { useAuth } from '@/lib/session';
import { listTrainerStretches } from '@/lib/supabase/stretches';
import { focusAreaLabels } from '@/lib/intakeOptions';
import type { Stretch } from '@/types/stretch';

/** The trainer's stretch library: built-in stretches plus their own, which they
 * can author with a linked video. Clients reach these through the soreness finder. */
export default function StretchesLibrary() {
  const { profile } = useAuth();
  const [stretches, setStretches] = useState<Stretch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    listTrainerStretches(profile.user_id)
      .then(setStretches)
      .catch((e) => setError(e.message));
  }, [profile]);

  const own = stretches?.filter((s) => s.trainer_id === profile?.user_id) ?? [];
  const builtIn = stretches?.filter((s) => s.trainer_id === null) ?? [];

  return (
    <AppShell title="Stretches">
      <LibraryNav />
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Stretch library</h2>
          <p className="text-sm text-slate-400">
            {stretches ? `${own.length} yours · ${builtIn.length} built-in` : 'Stretches clients can find'}
          </p>
        </div>
        <Link to="/trainer/stretches/new" className="btn-primary">
          + Add stretch
        </Link>
      </div>

      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}

      {stretches === null ? (
        <p className="text-slate-400">Loading stretches…</p>
      ) : (
        <>
          {own.length === 0 ? (
            <p className="card mb-6 text-slate-400">
              No custom stretches yet. Add one and attach a video from your library.
            </p>
          ) : (
            <ul className="mb-6 flex flex-col gap-2">
              {own.map((s) => (
                <li key={s.id}>
                  <StretchRow stretch={s} to={`/trainer/stretches/${s.id}`} />
                </li>
              ))}
            </ul>
          )}

          <h3 className="mb-2 text-sm font-semibold text-slate-300">Built-in library</h3>
          <ul className="flex flex-col gap-2">
            {builtIn.map((s) => (
              <li key={s.id}>
                <StretchRow stretch={s} />
              </li>
            ))}
          </ul>
        </>
      )}
    </AppShell>
  );
}

function StretchRow({ stretch, to }: { stretch: Stretch; to?: string }) {
  const regions = focusAreaLabels(stretch.regions);
  const body = (
    <div className="card flex items-center justify-between gap-3 hover:border-sky-700">
      <span className="min-w-0">
        <span className="block truncate font-medium">{stretch.name}</span>
        <span className="mt-0.5 block text-xs text-slate-400">
          {regions.join(' · ')}
          {to ? ` · ${stretch.status}` : ''}
          {stretch.video_id ? ' · 🎥' : ''}
        </span>
      </span>
      {to && <span aria-hidden className="shrink-0 text-slate-500">›</span>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}
