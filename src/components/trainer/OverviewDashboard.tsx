import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import { SignalChips } from './TrainerDashboard';
import { listAllClients, listTrainers, reassignClient } from '@/lib/supabase/clients';
import { listAllMovements } from '@/lib/supabase/movements';
import { listTrainerAttempts } from '@/lib/supabase/attempts';
import { attentionSignals, groupByClient, type AttentionSignals, type MovementMeta } from '@/lib/metrics';
import { relativeTime } from '@/lib/time';
import type { Profile } from '@/types/profile';
import type { ClientAttempt } from '@/types/attempt';

interface ClientRow {
  client: Profile;
  signals: AttentionSignals;
}

/** Practice-wide overview shared by all trainers: every roster, who needs
 * attention across the whole practice, and the ability to reassign clients. */
export default function OverviewDashboard() {
  const [trainers, setTrainers] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Profile[] | null>(null);
  const [attempts, setAttempts] = useState<ClientAttempt[]>([]);
  const [meta, setMeta] = useState<MovementMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([listTrainers(), listAllClients(), listTrainerAttempts(), listAllMovements()])
      .then(([t, c, a, m]) => {
        setTrainers(t);
        setClients(c);
        setAttempts(a);
        setMeta(m.map((mv) => ({ id: mv.id, name: mv.name, compensation_patterns: mv.compensation_patterns })));
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => load(), [load]);

  const byTrainer = useMemo(() => {
    const grouped = groupByClient(attempts);
    const rowsByTrainer = new Map<string, ClientRow[]>();
    for (const client of clients ?? []) {
      const row: ClientRow = {
        client,
        signals: attentionSignals(client.user_id, grouped.get(client.user_id) ?? [], meta),
      };
      const key = client.trainer_id ?? 'unassigned';
      (rowsByTrainer.get(key) ?? rowsByTrainer.set(key, []).get(key)!).push(row);
    }
    for (const rows of rowsByTrainer.values()) {
      rows.sort((a, b) => {
        if (a.signals.needsAttention !== b.signals.needsAttention) return a.signals.needsAttention ? -1 : 1;
        return (b.signals.lastActiveAt ?? '').localeCompare(a.signals.lastActiveAt ?? '');
      });
    }
    return rowsByTrainer;
  }, [clients, attempts, meta]);

  async function onReassign(clientId: string, trainerId: string) {
    const { error } = await reassignClient(clientId, trainerId);
    if (error) setError(error);
    else load();
  }

  const totalClients = clients?.length ?? 0;
  const totalAttention = useMemo(
    () => [...byTrainer.values()].flat().filter((r) => r.signals.needsAttention).length,
    [byTrainer],
  );

  return (
    <AppShell title="Overview">
      <header className="mb-5">
        <h2 className="text-xl font-bold">Practice overview</h2>
        <p className="text-sm text-slate-400">
          {clients == null
            ? 'Loading…'
            : `${trainers.length} trainers · ${totalClients} client${totalClients === 1 ? '' : 's'} · ${totalAttention} need${totalAttention === 1 ? 's' : ''} attention`}
        </p>
      </header>

      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}

      <div className="flex flex-col gap-5">
        {trainers.map((trainer) => {
          const rows = byTrainer.get(trainer.user_id) ?? [];
          const attention = rows.filter((r) => r.signals.needsAttention).length;
          const trainerName = trainer.display_name?.includes('@')
            ? trainer.display_name.split('@')[0]
            : trainer.display_name ?? 'Trainer';
          return (
            <section key={trainer.user_id} className="card">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h3 className="font-semibold">{trainerName}</h3>
                <span className="text-xs text-slate-400">
                  {rows.length} client{rows.length === 1 ? '' : 's'}
                  {attention > 0 && <span className="text-amber-300"> · {attention} need attention</span>}
                </span>
              </div>

              {rows.length === 0 ? (
                <p className="text-sm text-slate-500">No clients yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {rows.map(({ client, signals }) => (
                    <li key={client.user_id} className={`rounded-xl border p-3 ${signals.needsAttention ? 'border-amber-800/70' : 'border-slate-800'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <Link to={`/trainer/clients/${client.user_id}`} className="min-w-0 hover:text-sky-300">
                          <span className="block truncate font-medium">{client.display_name ?? 'Client'}</span>
                          <span className="block text-xs text-slate-400">
                            {signals.attemptCount === 0
                              ? 'No sessions yet'
                              : `Last active ${relativeTime(signals.lastActiveAt)} · ${signals.attemptCount} session${signals.attemptCount === 1 ? '' : 's'}`}
                          </span>
                        </Link>
                        <label className="shrink-0 text-xs text-slate-400">
                          <span className="sr-only">Reassign {client.display_name ?? 'client'} to trainer</span>
                          <select
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                            value={client.trainer_id ?? ''}
                            onChange={(e) => void onReassign(client.user_id, e.target.value)}
                          >
                            {trainers.map((t) => (
                              <option key={t.user_id} value={t.user_id}>
                                {t.display_name?.split('@')[0] ?? 'Trainer'}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <SignalChips signals={signals} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        {(byTrainer.get('unassigned')?.length ?? 0) > 0 && (
          <section className="card border-amber-800/70">
            <h3 className="mb-3 font-semibold text-amber-200">Unassigned</h3>
            <ul className="flex flex-col gap-2">
              {byTrainer.get('unassigned')!.map(({ client }) => (
                <li key={client.user_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 p-3">
                  <span className="min-w-0 truncate font-medium">{client.display_name ?? 'Client'}</span>
                  <select
                    className="shrink-0 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
                    defaultValue=""
                    onChange={(e) => e.target.value && void onReassign(client.user_id, e.target.value)}
                  >
                    <option value="" disabled>Assign to…</option>
                    {trainers.map((t) => (
                      <option key={t.user_id} value={t.user_id}>{t.display_name?.split('@')[0] ?? 'Trainer'}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
