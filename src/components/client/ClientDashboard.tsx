import { useEffect, useState } from 'react';
import AppShell from '@/components/common/AppShell';
import MovementLibrary from './MovementLibrary';
import ClientWelcome from './ClientWelcome';
import { useAuth } from '@/lib/session';
import { listLiveMovements } from '@/lib/supabase/movements';
import { listClientVideos } from '@/lib/supabase/videos';
import { listClientProgram } from '@/lib/supabase/programs';
import { mostRecentAttempt } from '@/lib/localHistory';
import type { Movement } from '@/types/movement';
import type { ProgramAssignment } from '@/types/program';
import type { LocalAttempt } from '@/types/attempt';
import type { Video } from '@/types/video';

export default function ClientDashboard() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [program, setProgram] = useState<ProgramAssignment[]>([]);
  const [videosById, setVideosById] = useState<Map<string, Video>>(new Map());
  const [recent, setRecent] = useState<LocalAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissedWelcome, setDismissedWelcome] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setRecent(mostRecentAttempt());
    Promise.all([listLiveMovements(), listClientProgram(profile.user_id), listClientVideos()])
      .then(([m, p, v]) => {
        setMovements(m);
        setProgram(p);
        setVideosById(new Map(v.map((vid) => [vid.id, vid])));
      })
      .catch((e) => setError(e.message));
  }, [profile]);

  // First login: show the personalized welcome until dismissed.
  if (profile && !profile.onboarded_at && !dismissedWelcome) {
    return <ClientWelcome onDone={() => setDismissedWelcome(true)} />;
  }

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
        <MovementLibrary movements={movements} program={program} videosById={videosById} />
      )}
    </AppShell>
  );
}
