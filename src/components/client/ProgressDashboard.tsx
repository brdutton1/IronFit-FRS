import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import Sparkline from '@/components/common/Sparkline';
import { useAuth } from '@/lib/session';
import { listLiveMovements } from '@/lib/supabase/movements';
import { listClientAttempts } from '@/lib/supabase/attempts';
import {
  attentionSignals,
  recurringCompensations,
  romTrendByMovement,
  type MovementMeta,
} from '@/lib/metrics';
import type { Movement } from '@/types/movement';
import type { ClientAttempt } from '@/types/attempt';

const DIRECTION_LABEL: Record<string, string> = {
  improving: 'improving ↑',
  holding: 'holding →',
  declining: 'needs work ↓',
  insufficient: 'just getting started',
};

export default function ProgressDashboard() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [attempts, setAttempts] = useState<ClientAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([listLiveMovements(), listClientAttempts(profile.user_id)])
      .then(([m, a]) => {
        setMovements(m);
        setAttempts(a);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [profile]);

  const meta: MovementMeta[] = useMemo(
    () => movements.map((m) => ({ id: m.id, name: m.name, compensation_patterns: m.compensation_patterns })),
    [movements],
  );
  const movementsById = useMemo(() => Object.fromEntries(meta.map((m) => [m.id, m])), [meta]);
  const trends = useMemo(() => romTrendByMovement(attempts, movementsById), [attempts, movementsById]);
  const recurring = useMemo(() => recurringCompensations(attempts, meta), [attempts, meta]);
  const signals = useMemo(
    () => (profile ? attentionSignals(profile.user_id, attempts, meta) : null),
    [profile, attempts, meta],
  );

  return (
    <AppShell title="Progress">
      <h2 className="mb-1 text-xl font-bold">Your progress</h2>
      <p className="mb-5 text-sm text-slate-400">
        Real range-of-motion and movement quality from your sessions — no points, no streaks.
      </p>

      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : attempts.length === 0 ? (
        <div className="card text-slate-400">
          No sessions yet. Head to <Link to="/client" className="text-sky-400">Train</Link>, pick a movement, and tap
          “Try it”. Your range and patterns will show up here.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {recurring.length > 0 && (
            <section className="card">
              <h3 className="mb-2 font-semibold">What to work on</h3>
              <ul className="space-y-2">
                {recurring.map((c) => (
                  <li key={c.tag} className="rounded-lg bg-slate-900/70 p-3">
                    <p className="text-sm font-medium text-amber-200">
                      {c.label} — showing up in {Math.round(c.rate * 100)}% of recent sessions
                    </p>
                    {c.cue && <p className="text-sm text-slate-300">Cue: “{c.cue}”</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card">
            <h3 className="mb-2 font-semibold">Range of motion by movement</h3>
            <ul className="divide-y divide-slate-800">
              {trends.map((t) => (
                <li key={t.movementId} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{t.movementName}</span>
                    <span className="block text-xs text-slate-400">
                      latest {Math.round(t.latest)}% · best {Math.round(t.best)}% · {DIRECTION_LABEL[t.direction]}
                    </span>
                  </span>
                  <Sparkline
                    values={t.series}
                    color={t.direction === 'declining' ? '#dc2626' : t.direction === 'improving' ? '#16a34a' : '#38bdf8'}
                  />
                </li>
              ))}
            </ul>
          </section>

          {signals?.lowConfidence && (
            <p className="card border-amber-700 bg-amber-950/30 text-sm text-amber-200">
              A lot of your recent sessions came back low-confidence. Try better lighting and getting your whole body in
              frame from the recommended angle — you’ll get more accurate feedback.
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}
