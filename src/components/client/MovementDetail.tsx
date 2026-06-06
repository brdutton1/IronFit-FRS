import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import HistoryList from './HistoryList';
import { JOINTS, CAMERA_ANGLES } from '@/lib/movementOptions';
import { getMovement } from '@/lib/supabase/movements';
import { signedReferenceUrl } from '@/lib/supabase/storage';
import type { Movement } from '@/types/movement';

export default function MovementDetail() {
  const { id } = useParams();
  const [movement, setMovement] = useState<Movement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getMovement(id)
      .then((m) => {
        setMovement(m);
        if (m?.reference_video_path) signedReferenceUrl(m.reference_video_path).then(setVideoUrl).catch(() => {});
      })
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <AppShell><p role="alert" className="card border-red-700 text-red-300">{error}</p></AppShell>;
  if (!movement) return <AppShell><p className="text-slate-400">Loading…</p></AppShell>;

  const jointLabel = JOINTS.find((j) => j.value === movement.primary_joint)?.label ?? movement.primary_joint;
  const cameraLabel = CAMERA_ANGLES.find((c) => c.value === movement.recommended_camera_angle)?.label;
  const rotationApprox = Object.values(movement.reference_dataset?.target_joints ?? {}).some((t) => t.rotation_limited);

  return (
    <AppShell title={movement.name}>
      <div className="flex flex-col gap-4">
        {videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
            className="w-full rounded-2xl border border-slate-800"
          >
            <track kind="captions" />
          </video>
        ) : (
          <div className="card text-slate-400">Reference video unavailable.</div>
        )}

        <div>
          <h2 className="text-xl font-bold">{movement.name}</h2>
          <p className="text-sm text-slate-400">
            {jointLabel} · {movement.movement_type.toUpperCase()} · {movement.side}
          </p>
        </div>

        {movement.cues.length > 0 && (
          <div className="card">
            <h3 className="mb-2 font-semibold">Lee’s cues</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
              {movement.cues.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {rotationApprox && (
          <p className="card border-amber-700 bg-amber-950/30 text-sm text-amber-200">
            This movement involves rotation that a single camera can’t fully see. Feedback on the rotation
            axis is approximate — for best accuracy, also try it from a side angle.
          </p>
        )}

        <Link to={`/client/movements/${movement.id}/perform`} className="btn-primary text-lg">
          Try it
        </Link>
        <p className="text-center text-xs text-slate-500">
          Recommended camera position: {cameraLabel}. Stand so your full body is in frame.
        </p>

        <HistoryList movementId={movement.id} />
      </div>
    </AppShell>
  );
}
