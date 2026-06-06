import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import { useAuth } from '@/lib/session';
import { listClients } from '@/lib/supabase/clients';
import { listTrainerMovements } from '@/lib/supabase/movements';
import { listTrainerAttempts } from '@/lib/supabase/attempts';
import { attentionSignals, groupByClient, type AttentionSignals, type MovementMeta } from '@/lib/metrics';
import { relativeTime } from '@/lib/time';
import type { Profile } from '@/types/profile';
import type { Movement } from '@/types/movement';
import type { ClientAttempt } from '@/types/attempt';

interface Row {
  client: Profile;
  signals: AttentionSignals;
}

export default function TrainerDashboard() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Profile[] | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [attempts, setAttempts] = useState<ClientAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    Promise.all([listClients(profile.user_id), listTrainerMovements(profile.user_id), listTrainerAttempts()])
      .then(([c, m, a]) => {
        setClients(c);
        setMovements(m);
        setAttempts(a);
      })
      .catch((e) => setError(e.message));
  }, [profile]);

  const rows: Row[] = useMemo(() => {
    if (!clients) return [];
    const meta: MovementMeta[] = movements.map((m) => ({
      id: m.id,
      name: m.name,
      compensation_patterns: m.compensation_patterns,
    }));
    const byClient = groupByClient(attempts);
    const out = clients.map((client) => ({
      client,
      signals: attentionSignals(client.user_id, byClient.get(client.user_id) ?? [], meta),
    }));
    // Needs-attention first, then most recently active.
    return out.sort((a, b) => {
      if (a.signals.needsAttention !== b.signals.needsAttention) return a.signals.needsAttention ? -1 : 1;
      return (b.signals.lastActiveAt ?? '').localeCompare(a.signals.lastActiveAt ?? '');
    });
  }, [clients, movements, attempts]);

  const attentionCount = rows.filter((r) => r.signals.needsAttention).length;

  return (
    <AppShell title="Clients">
      <header className="mb-5">
        <h2 className="text-xl font-bold">Your clients</h2>
        <p className="text-sm text-slate-400">
          {clients == null
            ? 'Loading…'
            : clients.length === 0
              ? 'No clients yet.'
              : `${clients.length} client${clients.length === 1 ? '' : 's'} · ${attentionCount} need${attentionCount === 1 ? 's' : ''} attention`}
        </p>
      </header>

      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}

      {clients && clients.length === 0 && (
        <p className="card text-slate-400">
          Clients appear here once they sign in. Share the app link — anyone who signs up joins your roster
          automatically.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map(({ client, signals }) => (
          <li key={client.user_id}>
            <Link
              to={`/trainer/clients/${client.user_id}`}
              className={`card flex items-center justify-between gap-3 hover:border-sky-700 ${
                signals.needsAttention ? 'border-amber-800/70' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{client.display_name ?? 'Client'}</span>
                <span className="block text-xs text-slate-400">
                  {signals.attemptCount === 0
                    ? 'No sessions yet'
                    : `Last active ${relativeTime(signals.lastActiveAt)} · ${signals.attemptCount} session${signals.attemptCount === 1 ? '' : 's'}`}
                </span>
                <SignalChips signals={signals} />
              </span>
              <span aria-hidden className="shrink-0 text-slate-500">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

export function SignalChips({ signals }: { signals: AttentionSignals }) {
  const chips: string[] = [];
  if (signals.recurringComp) chips.push(`Recurring: ${signals.recurringComp.label}`);
  if (signals.stalled) chips.push(signals.stalled.direction === 'declining' ? 'ROM declining' : 'ROM below target');
  if (signals.inactive) chips.push(`Inactive ${signals.inactiveDays}d`);
  if (signals.lowConfidence) chips.push('Low camera confidence');
  if (chips.length === 0) {
    if (signals.attemptCount === 0) return null;
    return <span className="mt-2 inline-block chip border border-emerald-800 text-xs text-emerald-300">On track</span>;
  }
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {chips.map((c) => (
        <span key={c} className="chip border border-amber-800 bg-amber-950/40 text-xs text-amber-200">
          {c}
        </span>
      ))}
    </span>
  );
}
