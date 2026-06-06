import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import TrajectoryPlot, { type Series } from '@/components/common/TrajectoryPlot';
import ConfidenceIndicator from '@/components/overlay/ConfidenceIndicator';
import { angleLabel } from '@/lib/movementOptions';
import { STILLNESS_DRIFT_DEG } from '@/lib/compare/thresholds';
import { getMovement } from '@/lib/supabase/movements';
import type { Movement } from '@/types/movement';
import type { Confidence } from '@/types/reference';

interface SummaryState {
  movementName: string;
  primaryKey: string;
  romPct: number;
  confidence: Confidence;
  clientTrajectory: number[];
  compensations: { tag: string; label: string }[];
  stillnessMax: { key: string; dev: number }[];
  overridden: boolean;
}

export default function SummaryScreen() {
  const { id } = useParams();
  const location = useLocation();
  const state = location.state as SummaryState | null;
  const [movement, setMovement] = useState<Movement | null>(null);

  useEffect(() => {
    if (id) getMovement(id).then(setMovement).catch(() => {});
  }, [id]);

  if (!state) {
    // Reached without performing (e.g. refresh) — send back to the movement.
    return (
      <AppShell title="Summary">
        <p className="card text-slate-400">No attempt to summarize.</p>
        <Link to={`/client/movements/${id}`} className="btn-secondary mt-4">
          Back to movement
        </Link>
      </AppShell>
    );
  }

  const ref = movement?.reference_dataset;
  const refTarget = ref?.target_joints[state.primaryKey];
  const refPeak = refTarget?.peak;
  const clientPeakDeg = refTarget ? (state.romPct / 100) * refTarget.rom : undefined;

  const series: Series[] = [];
  if (refTarget) series.push({ label: 'Lee’s reference', color: '#38bdf8', values: refTarget.trajectory });
  if (state.clientTrajectory.length) series.push({ label: 'You', color: '#34d399', values: state.clientTrajectory });

  const movedStillness = state.stillnessMax.filter((s) => s.dev > STILLNESS_DRIFT_DEG);
  const rotationLimited = ref
    ? [...Object.entries(ref.target_joints), ...Object.entries(ref.stillness_joints)]
        .filter(([, v]) => v.rotation_limited)
        .map(([k]) => k)
    : [];

  return (
    <AppShell title="Summary">
      <div className="flex flex-col gap-4">
        <header>
          <h2 className="text-xl font-bold">{state.movementName}</h2>
          <div className="mt-1">
            <ConfidenceIndicator confidence={state.confidence} />
          </div>
        </header>

        <div className="card text-center">
          <p className="text-sm text-slate-400">Range of motion achieved</p>
          <p className="text-4xl font-bold tabular-nums">{Math.round(state.romPct)}%</p>
          {refPeak != null && clientPeakDeg != null && (
            <p className="text-sm text-slate-400">
              ~{Math.round(clientPeakDeg)}° of Lee’s {Math.round(refTarget!.rom)}° range ({angleLabel(state.primaryKey)})
            </p>
          )}
        </div>

        <div className="card">
          <h3 className="mb-2 font-semibold">Your curve vs Lee’s</h3>
          {series.length ? (
            <TrajectoryPlot series={series} caption="Reference vs your joint angle" />
          ) : (
            <p className="text-sm text-slate-500">Not enough data captured to plot.</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Curves aren’t time-synced — we compare how far you moved, not your tempo.
          </p>
        </div>

        <div className="card">
          <h3 className="mb-2 font-semibold">Compensation patterns</h3>
          {state.compensations.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-red-200">
              {state.compensations.map((c) => (
                <li key={c.tag}>{c.label}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-300">None detected — nice and clean.</p>
          )}
        </div>

        {movedStillness.length > 0 && (
          <div className="card">
            <h3 className="mb-2 font-semibold">Joints that drifted (should’ve stayed still)</h3>
            <ul className="space-y-1 text-sm text-slate-200">
              {movedStillness.map((s) => (
                <li key={s.key} className="flex justify-between">
                  <span>{angleLabel(s.key)}</span>
                  <span className="tabular-nums">{Math.round(s.dev)}°</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(rotationLimited.length > 0 || state.overridden) && (
          <p className="card border-amber-700 bg-amber-950/30 text-sm text-amber-200">
            {rotationLimited.length > 0 && (
              <>
                {rotationLimited.map(angleLabel).join(', ')} were assessed approximately — a single camera can’t
                see rotation around a limb well. For best accuracy, also try this movement from a side angle.{' '}
              </>
            )}
            {state.overridden && 'You started before the camera angle was confirmed, so this session is marked approximate.'}
          </p>
        )}

        <div className="flex gap-3">
          <Link to={`/client/movements/${id}/perform`} className="btn-primary flex-1">
            Try again
          </Link>
          <Link to={`/client/movements/${id}`} className="btn-secondary flex-1">
            Done
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
