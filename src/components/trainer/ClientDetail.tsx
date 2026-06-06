import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import Sparkline from '@/components/common/Sparkline';
import { SignalChips } from './TrainerDashboard';
import { useAuth } from '@/lib/session';
import { getClientProfile } from '@/lib/supabase/clients';
import { getClientIntake } from '@/lib/supabase/intake';
import { listClientAttempts } from '@/lib/supabase/attempts';
import { listAllMovements } from '@/lib/supabase/movements';
import { assignMovement, listClientProgram, unassignMovement, updateAssignmentNote } from '@/lib/supabase/programs';
import {
  attentionSignals,
  recurringCompensations,
  romTrendByMovement,
  type MovementMeta,
} from '@/lib/metrics';
import { relativeTime } from '@/lib/time';
import type { ClientIntake, Profile } from '@/types/profile';
import type { Movement } from '@/types/movement';
import type { ProgramAssignment } from '@/types/program';
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
  const [intake, setIntake] = useState<ClientIntake | null>(null);
  const [program, setProgram] = useState<ProgramAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reloadProgram = useCallback(() => {
    if (!clientId) return;
    listClientProgram(clientId).then(setProgram).catch((e) => setError(e.message));
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !profile) return;
    Promise.all([
      getClientProfile(clientId),
      listAllMovements(),
      listClientAttempts(clientId),
      getClientIntake(clientId),
      listClientProgram(clientId),
    ])
      .then(([c, m, a, i, p]) => {
        setClient(c);
        setMovements(m);
        setAttempts(a);
        setIntake(i);
        setProgram(p);
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

  // Only the owning trainer can set this client's focus.
  const isOwner = !!client && client.trainer_id === profile?.user_id;
  const ownerLiveMovements = useMemo(
    () => movements.filter((m) => m.status === 'live' && m.trainer_id === client?.trainer_id),
    [movements, client?.trainer_id],
  );
  const assignedIds = useMemo(() => new Set(program.map((p) => p.movement_id)), [program]);
  const movementName = (id: string) => movementsById[id]?.name ?? 'Movement';

  async function onAssign(movementId: string) {
    if (!profile || !clientId || !movementId) return;
    const { error } = await assignMovement(profile.user_id, clientId, movementId, null, program.length);
    if (error) setError(error);
    else reloadProgram();
  }
  async function onRemove(id: string) {
    const { error } = await unassignMovement(id);
    if (error) setError(error);
    else reloadProgram();
  }
  async function onNote(id: string, note: string) {
    const { error } = await updateAssignmentNote(id, note);
    if (error) setError(error);
  }

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

      {intake && (intake.goals || intake.injuries || intake.experience || intake.phone || intake.emergency_contact) && (
        <section className="card mb-4">
          <h3 className="mb-2 font-semibold">Intake</h3>
          <dl className="space-y-2 text-sm">
            {intake.goals && (<div><dt className="text-slate-400">Goals</dt><dd className="text-slate-200">{intake.goals}</dd></div>)}
            {intake.injuries && (<div><dt className="text-slate-400">Injuries / history</dt><dd className="text-slate-200">{intake.injuries}</dd></div>)}
            {intake.experience && (<div><dt className="text-slate-400">Experience</dt><dd className="text-slate-200">{intake.experience}</dd></div>)}
            {intake.phone && (<div><dt className="text-slate-400">Phone</dt><dd className="text-slate-200">{intake.phone}</dd></div>)}
            {intake.emergency_contact && (<div><dt className="text-slate-400">Emergency contact</dt><dd className="text-slate-200">{intake.emergency_contact}</dd></div>)}
          </dl>
        </section>
      )}

      <section className="card mb-4">
        <h3 className="mb-2 font-semibold">Your focus</h3>
        {program.length === 0 ? (
          <p className="text-sm text-slate-500">No focus movements pinned yet.</p>
        ) : (
          <ul className="space-y-2">
            {program.map((p) => (
              <li key={p.id} className="rounded-lg bg-slate-900/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{movementName(p.movement_id)}</span>
                  {isOwner && (
                    <button type="button" onClick={() => void onRemove(p.id)} className="text-xs text-slate-400 hover:text-red-300">
                      Remove
                    </button>
                  )}
                </div>
                {isOwner ? (
                  <input
                    defaultValue={p.note ?? ''}
                    placeholder="Add a coaching note (optional)"
                    onBlur={(e) => void onNote(p.id, e.target.value)}
                    className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200"
                  />
                ) : (
                  p.note && <p className="mt-1 text-sm text-sky-200">“{p.note}”</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {isOwner && (
          <label className="mt-3 block">
            <span className="sr-only">Add a movement to focus</span>
            <select
              value=""
              onChange={(e) => void onAssign(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-slate-200"
            >
              <option value="" disabled>+ Add a movement to focus…</option>
              {ownerLiveMovements
                .filter((m) => !assignedIds.has(m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </select>
            {ownerLiveMovements.length === 0 && (
              <span className="mt-1 block text-xs text-slate-500">Publish a movement first to pin it here.</span>
            )}
          </label>
        )}
      </section>

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
