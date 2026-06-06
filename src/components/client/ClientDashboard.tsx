import { useEffect, useState } from 'react';
import AppShell from '@/components/common/AppShell';
import MovementLibrary from './MovementLibrary';
import { useAuth } from '@/lib/session';
import { listLiveMovements } from '@/lib/supabase/movements';
import { mostRecentAttempt } from '@/lib/localHistory';
import type { Movement } from '@/types/movement';
import type { LocalAttempt } from '@/types/attempt';

export default function ClientDashboard() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [recent, setRecent] = useState<LocalAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRecent(mostRecentAttempt());
    listLiveMovements()
      .then(setMovements)
      .catch((e) => setError(e.message));
  }, []);

  const recentName = recent && movements?.find((m) => m.id === recent.movement_id)?.name;

  return (
    <AppShell title="Library">
      <header className="mb-5">
        <h2 className="text-xl font-bold">
          Hi{profile?.display_name ? `, ${profile.display_name}` : ''} 👋
        </h2>
        {recent ? (
          <p className="text-sm text-slate-400">
            Last completed: {recentName ?? 'a movement'} —{' '}
            {Math.round(recent.rom_achieved_pct)}% of reference range.
          </p>
        ) : (
          <p className="text-sm text-slate-400">Pick a movement and rehearse it in front of your camera.</p>
        )}
      </header>

      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}

      {movements === null ? (
        <p className="text-slate-400">Loading movements…</p>
      ) : (
        <MovementLibrary movements={movements} />
      )}
    </AppShell>
  );
}
