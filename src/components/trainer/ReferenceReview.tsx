import { useEffect, useState } from 'react';
import TrajectoryPlot, { type Series } from '@/components/common/TrajectoryPlot';
import ConfidenceIndicator from '@/components/overlay/ConfidenceIndicator';
import { angleLabel } from '@/lib/movementOptions';
import { signedReferenceUrl } from '@/lib/supabase/storage';
import type { Movement } from '@/types/movement';

const SERIES_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#f472b6'];

export default function ReferenceReview({ movement }: { movement: Movement }) {
  const ref = movement.reference_dataset;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (movement.reference_video_path) {
      signedReferenceUrl(movement.reference_video_path)
        .then(setVideoUrl)
        .catch(() => setVideoUrl(null));
    }
  }, [movement.reference_video_path]);

  if (!ref) return null;

  const targetSeries: Series[] = Object.entries(ref.target_joints).map(([key, t], i) => ({
    label: angleLabel(key),
    color: SERIES_COLORS[i % SERIES_COLORS.length],
    values: t.trajectory,
  }));

  return (
    <div className="flex flex-col gap-4">
      {movement.reference_quality === 'low' && (
        <p role="alert" className="card border-red-700 bg-red-950/40 text-red-200">
          Reference quality is <strong>low</strong> — some target joints weren’t seen clearly. Consider
          re-shooting from the recommended angle with better lighting and full body in frame.
        </p>
      )}

      {videoUrl && (
        <video src={videoUrl} controls muted playsInline className="w-full rounded-xl border border-slate-800" />
      )}

      <div className="card">
        <h3 className="mb-2 font-semibold">Target joint trajectories</h3>
        <TrajectoryPlot series={targetSeries} caption="Extracted joint angles over the clip" />
        <dl className="mt-3 grid grid-cols-1 gap-2">
          {Object.entries(ref.target_joints).map(([key, t]) => (
            <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/70 px-3 py-2">
              <dt className="text-sm font-medium">{angleLabel(key)}</dt>
              <dd className="flex items-center gap-2 text-sm text-slate-300">
                <span>peak {Math.round(t.peak)}° · ROM {Math.round(t.rom)}°</span>
                <ConfidenceIndicator confidence={t.confidence} rotationLimited={t.rotation_limited} />
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {Object.keys(ref.stillness_joints).length > 0 && (
        <div className="card">
          <h3 className="mb-2 font-semibold">Stillness joints (should stay quiet)</h3>
          <dl className="grid grid-cols-1 gap-2">
            {Object.entries(ref.stillness_joints).map(([key, s]) => (
              <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-900/70 px-3 py-2">
                <dt className="text-sm font-medium">{angleLabel(key)}</dt>
                <dd className="flex items-center gap-2 text-sm text-slate-300">
                  <span>max drift {Math.round(s.max_deviation)}° · variance {s.variance.toFixed(1)}</span>
                  <ConfidenceIndicator confidence={s.confidence} rotationLimited={s.rotation_limited} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <p className="text-sm text-slate-400">
        Reps detected: <strong>{ref.rep_count}</strong> · Duration {ref.duration_sec.toFixed(1)}s · {ref.fps}fps
      </p>
    </div>
  );
}
