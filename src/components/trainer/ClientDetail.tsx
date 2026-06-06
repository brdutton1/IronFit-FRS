import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import Sparkline from '@/components/common/Sparkline';
import { SignalChips } from './TrainerDashboard';
import { useAuth } from '@/lib/session';
import { getClientProfile } from '@/lib/supabase/clients';
import { listClientAttempts } from '@/lib/supabase/attempts';
import { listTrainerMovements } from '@/lib/supabase/movements';
import {
  attentionSignals,
  recurringCompensations,
  romTrendByMovement,
  type MovementMeta,
} from '@/lib/metrics';
import { relativeTime } from '@/lib/time';
import type { Profile } from '@/types/profile';
import type { Movement } from '@/types/movement';
import type { ClientAttempt } from '@/types/attempt';

const DIRECTION_LABEL: Record<string, string> = {
  improving: 'improving ↑',
  holding: 'holding →',
  declining: 'declining ↓',
  insufficient: 'not enough data',
};

export default function ClientDetail() {
  const { clientId } = useParams();
  const { profile } = useAuth();
  const [client, setClient] = useState<Profile | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [attempts, setAttempts] = useState<ClientAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !profile) return;
    Promise.all([getClientProfile(clientId), listTrainerMovements(profile.user_id), listClientAttempts(clientId)])
      .then(([c, m, a]) => {
        setClient(c);
        setMovements(m);
        setAttempts(a);
      })
      .catch((e) => setError(e.message));
  }, [clientId, profile]);

  const meta: MovementMeta[] = useMemo(
    () => movements.map((m) => ({ id: m.id, name: m.name, compensation_patterns: m.compensation_patterns })),
    [movements],
  );
  const movementsById = useMemo(() => Object.fromEntries(meta.map((m) => [m.id, m])), [meta]);
  const signals = useMemo(
    () => (clientId ? attentionSignals(clientId, attempts, meta) : null),
    [clientId, attempts, meta],
  );
  const trends = useMemo(() => romTrendByMovement(attempts, movementsById), [attempts, movementsById]);
  const recurring = useMemo(() => recurringCompensations(attempts, meta), [attempts, meta]);

  if (error) return <AppShell><p role="alert" className="card border-red-700 text-red-300">{error}</p></AppShell>;
  if (!client || !signals) return <AppShell><p className="text-slate-400">Loading…</p></AppShell>;

  return (
    <AppShell title={client.display_name ?? 'Client'}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{client.display_name ?? 'Client'}</h2>
          <p className="text-sm text-slate-400">
            {signals.attemptCount === 0
              ? 'No sessions yet'
              : `Last active ${relativeTime(signals.lastActiveAt)} · ${signals.attemptCount} session${signals.attemptCount === 1 ? '' : 's'}`}
          </p>
          <SignalChips signals={signals} />
        </div>
        <Link to={`/trainer/messages/${client.user_id}`} className="btn-primary shrink-0">
          Message
        </Link>
      </div>

      {recurring.length > 0 && (
        <section className="card mb-4">
          <h3 className="mb-2 font-semibold">What to coach</h3>
          <ul className="space-y-2">
            {recurring.map((c) => (
              <li key={c.tag} className="rounded-lg bg-slate-900/70 p-3">
                <p className="text-sm font-medium text-amber-200">
                  {c.label} — {Math.round(c.rate * 100)}% of recent sessions
                </p>
                {c.cue && <p className="text-sm text-slate-300">Cue: “{c.cue}”</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3 className="mb-2 font-semibold">Range of motion by movement</h3>
        {trends.length === 0 ? (
          <p className="text-sm text-slate-500">No completed movements yet.</p>
        ) : (
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
        )}
      </section>

      {signals.lowConfidence && (
        <p className="card mt-4 border-amber-700 bg-amber-950/30 text-sm text-amber-200">
          {Math.round(signals.lowConfidenceRate * 100)}% of recent sessions came back low-confidence — their camera
          setup is hurting feedback quality. Worth a quick note on framing and lighting.
        </p>
      )}
    </AppShell>
  );
}
