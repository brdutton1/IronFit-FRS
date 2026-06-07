import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import PasswordInput from '@/components/common/PasswordInput';
import { SignalChips } from '@/components/trainer/TrainerDashboard';
import {
  listUsers,
  setRole,
  setOwner,
  transferClient,
  resetPassword,
  type AdminUser,
} from '@/lib/supabase/admin';
import { listTrainerAttempts } from '@/lib/supabase/attempts';
import { listAllMovements } from '@/lib/supabase/movements';
import { attentionSignals, groupByClient, type MovementMeta } from '@/lib/metrics';
import { relativeTime } from '@/lib/time';
import { useAuth } from '@/lib/session';
import type { ClientAttempt } from '@/types/attempt';

const shortName = (u: AdminUser) =>
  u.display_name && !u.display_name.includes('@') ? u.display_name : u.email.split('@')[0];

/**
 * Owner-only super-admin console. The master user list (reset passwords, change
 * roles, grant owner, transfer clients) plus a practice-wide attention view.
 * Built to grow into the home for all future global controls.
 */
export default function ControlCenter() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [attempts, setAttempts] = useState<ClientAttempt[]>([]);
  const [meta, setMeta] = useState<MovementMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([listUsers(), listTrainerAttempts(), listAllMovements()])
      .then(([u, a, m]) => {
        setUsers(u);
        setAttempts(a);
        setMeta(m.map((mv) => ({ id: mv.id, name: mv.name, compensation_patterns: mv.compensation_patterns })));
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => load(), [load]);

  const trainers = useMemo(() => (users ?? []).filter((u) => u.role === 'trainer'), [users]);
  const clients = useMemo(() => (users ?? []).filter((u) => u.role === 'client'), [users]);

  const grouped = useMemo(() => groupByClient(attempts), [attempts]);

  return (
    <AppShell title="Control Center">
      <header className="mb-5">
        <h2 className="text-xl font-bold">Control Center</h2>
        <p className="text-sm text-slate-400">
          {users == null
            ? 'Loading…'
            : `${trainers.length} trainer${trainers.length === 1 ? '' : 's'} · ${clients.length} client${clients.length === 1 ? '' : 's'}`}
        </p>
      </header>

      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}

      {/* Master user list */}
      <section className="mb-6">
        <h3 className="mb-2 font-semibold">Trainers</h3>
        <ul className="flex flex-col gap-2">
          {trainers.map((u) => (
            <UserRow key={u.user_id} user={u} trainers={trainers} selfId={profile?.user_id} onChanged={load} onError={setError} />
          ))}
        </ul>

        <h3 className="mb-2 mt-5 font-semibold">Clients</h3>
        {clients.length === 0 ? (
          <p className="text-sm text-slate-500">No clients yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {clients.map((u) => (
              <UserRow key={u.user_id} user={u} trainers={trainers} selfId={profile?.user_id} onChanged={load} onError={setError} />
            ))}
          </ul>
        )}
      </section>

      {/* Practice-wide attention view */}
      <section>
        <h3 className="mb-2 font-semibold">Needs attention</h3>
        <div className="flex flex-col gap-4">
          {trainers.map((t) => {
            const roster = clients
              .filter((c) => c.trainer_id === t.user_id)
              .map((c) => ({ c, signals: attentionSignals(c.user_id, grouped.get(c.user_id) ?? [], meta) }))
              .sort((a, b) =>
                a.signals.needsAttention !== b.signals.needsAttention
                  ? a.signals.needsAttention ? -1 : 1
                  : (b.signals.lastActiveAt ?? '').localeCompare(a.signals.lastActiveAt ?? ''),
              );
            const attention = roster.filter((r) => r.signals.needsAttention).length;
            return (
              <div key={t.user_id} className="card">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h4 className="font-semibold">{shortName(t)}</h4>
                  <span className="text-xs text-slate-400">
                    {roster.length} client{roster.length === 1 ? '' : 's'}
                    {attention > 0 && <span className="text-amber-300"> · {attention} need attention</span>}
                  </span>
                </div>
                {roster.length === 0 ? (
                  <p className="text-sm text-slate-500">No clients yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {roster.map(({ c, signals }) => (
                      <li key={c.user_id} className={`rounded-xl border p-3 ${signals.needsAttention ? 'border-amber-800/70' : 'border-slate-800'}`}>
                        <Link to={`/trainer/clients/${c.user_id}`} className="block hover:text-sky-300">
                          <span className="font-medium">{c.display_name ?? c.email.split('@')[0]}</span>
                          <span className="ml-2 text-xs text-slate-400">
                            {signals.attemptCount === 0
                              ? 'No sessions yet'
                              : `Last active ${relativeTime(signals.lastActiveAt)} · ${signals.attemptCount} session${signals.attemptCount === 1 ? '' : 's'}`}
                          </span>
                        </Link>
                        <SignalChips signals={signals} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

/** One row of the master user list with its admin actions. */
function UserRow({
  user,
  trainers,
  selfId,
  onChanged,
  onError,
}: {
  user: AdminUser;
  trainers: AdminUser[];
  selfId: string | undefined;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [resetting, setResetting] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const isSelf = user.user_id === selfId;

  async function run<T extends { error: string | null }>(p: Promise<T>) {
    setBusy(true);
    const { error } = await p;
    setBusy(false);
    if (error) onError(error);
    else onChanged();
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    setDone(false);
    if (pw.length < 6) return onError('Password must be at least 6 characters.');
    if (pw !== confirm) return onError('Passwords don’t match.');
    setBusy(true);
    const { error } = await resetPassword(user.user_id, pw);
    setBusy(false);
    if (error) return onError(error);
    setDone(true);
    setPw('');
    setConfirm('');
    setResetting(false);
  }

  return (
    <li className="rounded-xl border border-slate-800 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate font-medium">{shortName(user)}</span>
          <span className="block truncate text-xs text-slate-400">{user.email}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {user.is_owner && <span className="chip border border-sky-700 bg-sky-950/50 text-sky-200">Owner</span>}
          {done && <span className="text-emerald-300">Password reset ✓</span>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {/* Role */}
        <label className="flex items-center gap-1 text-slate-400">
          Role
          <select
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 disabled:opacity-50"
            value={user.role}
            disabled={busy || isSelf}
            onChange={(e) => void run(setRole(user.user_id, e.target.value as AdminUser['role']))}
          >
            <option value="trainer">trainer</option>
            <option value="client">client</option>
          </select>
        </label>

        {/* Transfer (clients only) */}
        {user.role === 'client' && (
          <label className="flex items-center gap-1 text-slate-400">
            Trainer
            <select
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 disabled:opacity-50"
              value={user.trainer_id ?? ''}
              disabled={busy}
              onChange={(e) => e.target.value && void run(transferClient(user.user_id, e.target.value))}
            >
              <option value="" disabled>Assign to…</option>
              {trainers.map((t) => (
                <option key={t.user_id} value={t.user_id}>{shortName(t)}</option>
              ))}
            </select>
          </label>
        )}

        {/* Owner grant/revoke (trainers only; never yourself) */}
        {user.role === 'trainer' && !isSelf && (
          <button
            type="button"
            className="rounded-md border border-slate-700 px-2 py-1 text-slate-300 hover:text-slate-100 disabled:opacity-50"
            disabled={busy}
            onClick={() => void run(setOwner(user.user_id, !user.is_owner))}
          >
            {user.is_owner ? 'Revoke owner' : 'Make owner'}
          </button>
        )}

        {/* Reset password */}
        <button
          type="button"
          className="rounded-md border border-slate-700 px-2 py-1 text-slate-300 hover:text-slate-100 disabled:opacity-50"
          disabled={busy}
          onClick={() => setResetting((r) => !r)}
        >
          {resetting ? 'Cancel' : 'Reset password'}
        </button>
      </div>

      {resetting && (
        <form onSubmit={onReset} className="mt-3 flex flex-col gap-2 rounded-lg bg-slate-900/60 p-3">
          <PasswordInput aria-label="New password" autoComplete="new-password" required minLength={6}
            placeholder="New password (min 6)" value={pw} onChange={(e) => setPw(e.target.value)} />
          <PasswordInput aria-label="Confirm new password" autoComplete="new-password" required minLength={6}
            placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <button type="submit" className="btn-primary self-start text-sm" disabled={busy}>
            {busy ? 'Setting…' : `Set password for ${shortName(user)}`}
          </button>
        </form>
      )}
    </li>
  );
}
