import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import LibraryNav from './LibraryNav';
import MovementList from './MovementList';
import { useAuth } from '@/lib/session';
import { listTrainerMovements } from '@/lib/supabase/movements';
import type { Movement } from '@/types/movement';

/** The trainer's movement library: record/upload references here, publish to
 * make them appear for clients. This is the answer to "where do I upload?". */
export default function MovementsLibrary() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    listTrainerMovements(profile.user_id)
      .then(setMovements)
      .catch((e) => setError(e.message));
  }, [profile]);

  const liveCount = movements?.filter((m) => m.status === 'live').length ?? 0;

  return (
    <AppShell title="Movements">
      <LibraryNav />
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Movement library</h2>
          <p className="text-sm text-slate-400">
            {movements ? `${liveCount} live · ${movements.length} total` : 'Your reference movements'}
          </p>
        </div>
        <Link to="/trainer/movements/new" className="btn-primary">
          + Add movement
        </Link>
      </div>

      <div className="card mb-4 border-slate-800 bg-slate-900/40 text-sm text-slate-300">
        <p className="font-medium text-slate-200">How it works</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-slate-400">
          <li>Add a movement and fill in the details.</li>
          <li>Upload a short reference video — the app extracts the joint data automatically.</li>
          <li>Review the curves, then <strong>Publish</strong> to make it available to your clients.</li>
        </ol>
      </div>

      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}

      {movements === null ? (
        <p className="text-slate-400">Loading movements…</p>
      ) : (
        <MovementList movements={movements} />
      )}
    </AppShell>
  );
}
