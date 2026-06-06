import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import MovementList from './MovementList';
import { useAuth } from '@/lib/session';
import { listTrainerMovements } from '@/lib/supabase/movements';
import type { Movement } from '@/types/movement';

export default function TrainerDashboard() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    listTrainerMovements(profile.user_id)
      .then(setMovements)
      .catch((e) => setError(e.message));
  }, [profile]);

  return (
    <AppShell title="Trainer">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Your movements</h2>
          <p className="text-sm text-slate-400">
            {profile?.display_name ? `Signed in as ${profile.display_name}` : 'Trainer dashboard'}
          </p>
        </div>
        <Link to="/trainer/movements/new" className="btn-primary">
          + Add movement
        </Link>
      </div>

      {error && (
        <p role="alert" className="card mb-4 border-red-700 text-red-300">
          {error}
        </p>
      )}

      {movements === null ? (
        <p className="text-slate-400">Loading movements…</p>
      ) : (
        <MovementList movements={movements} />
      )}
    </AppShell>
  );
}
