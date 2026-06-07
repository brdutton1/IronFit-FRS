import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import TrainerWelcome from './TrainerWelcome';
import { useAuth } from '@/lib/session';
import { listClients } from '@/lib/supabase/clients';
import { listTrainerMovements } from '@/lib/supabase/movements';
import { listTrainerAttempts } from '@/lib/supabase/attempts';
import { listTrainerSoreness } from '@/lib/supabase/soreness';
import { attentionSignals, groupByClient, type AttentionSignals, type MovementMeta } from '@/lib/metrics';
import { relativeTime } from '@/lib/time';
import type { Profile } from '@/types/profile';
import type { Movement } from '@/types/movement';
import type { ClientAttempt } from '@/types/attempt';
import type { SorenessReport } from '@/types/soreness';

const SORENESS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface Row {
  client: Profile;
  signals: AttentionSignals;
  /** Soreness reports from this client in the last 7 days. */
  recentSoreness: number;
}

export default function TrainerDashboard() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Profile[] | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [attempts, setAttempts] = useState<ClientAttempt[]>([]);
  const [soreness, setSoreness] = useState<SorenessReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dismissedWelcome, setDismissedWelcome] = useState(false);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      listClients(profile.user_id),
      listTrainerMovements(profile.user_id),
      listTrainerAttempts(),
      listTrainerSoreness(),
    ])
      .then(([c, m, a, s]) => {
        setClients(c);
        setMovements(m);
        setAttempts(a);
        setSoreness(s);
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
    const cutoff = Date.now() - SORENESS_WINDOW_MS;
    const sorenessByClient = new Map<string, number>();
    for (const r of soreness) {
      if (new Date(r.created_at).getTime() >= cutoff) {
        sorenessByClient.set(r.client_id, (sorenessByClient.get(r.client_id) ?? 0) + 1);
      }
    }
    const out = clients.map((client) => ({
      client,
      signals: attentionSignals(client.user_id, byClient.get(client.user_id) ?? [], meta),
      recentSoreness: sorenessByClient.get(client.user_id) ?? 0,
    }));
    // Anything needing attention (low ROM, inactive, or recent soreness) first,
    // then most recently active.
    const needs = (r: Row) => r.signals.needsAttention || r.recentSoreness > 0;
    return out.sort((a, b) => {
      if (needs(a) !== needs(b)) return needs(a) ? -1 : 1;
      return (b.signals.lastActiveAt ?? '').localeCompare(a.signals.lastActiveAt ?? '');
    });
  }, [clients, movements, attempts, soreness]);

  const attentionCount = rows.filter((r) => r.signals.needsAttention || r.recentSoreness > 0).length;

  // First login: walk the trainer through the basics + their intake link.
  if (profile && !profile.onboarded_at && !dismissedWelcome) {
    return <TrainerWelcome onDone={() => setDismissedWelcome(true)} />;
  }

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
          No clients yet. Share your intake link from{' '}
          <Link to="/trainer/settings" className="font-semibold text-sky-300 hover:text-sky-200">Settings</Link> — anyone
          who fills out your intake form joins your roster automatically.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {rows.map(({ client, signals, recentSoreness }) => (
          <li key={client.user_id}>
            <Link
              to={`/trainer/clients/${client.user_id}`}
              className={`card flex items-center justify-between gap-3 hover:border-sky-700 ${
                signals.needsAttention || recentSoreness > 0 ? 'border-amber-800/70' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{client.display_name ?? 'Client'}</span>
                <span className="block text-xs text-slate-400">
                  {signals.attemptCount === 0
                    ? 'No sessions yet'
                    : `Last active ${relativeTime(signals.lastActiveAt)} · ${signals.attemptCount} session${signals.attemptCount === 1 ? '' : 's'}`}
                </span>
                <SignalChips signals={signals} extra={recentSoreness > 0 ? [`Sore ×${recentSoreness} (7d)`] : []} />
              </span>
              <span aria-hidden className="shrink-0 text-slate-500">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

export function SignalChips({ signals, extra = [] }: { signals: AttentionSignals; extra?: string[] }) {
  const chips: string[] = [];
  if (signals.recurringComp) chips.push(`Recurring: ${signals.recurringComp.label}`);
  if (signals.stalled) chips.push(signals.stalled.direction === 'declining' ? 'ROM declining' : 'ROM below target');
  if (signals.inactive) chips.push(`Inactive ${signals.inactiveDays}d`);
  if (signals.lowConfidence) chips.push('Low camera confidence');
  chips.push(...extra);
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
