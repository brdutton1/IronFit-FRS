import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import VideoEmbed from '@/components/common/VideoEmbed';
import HistoryList from './HistoryList';
import { JOINTS, CAMERA_ANGLES } from '@/lib/movementOptions';
import { getMovement } from '@/lib/supabase/movements';
import { getVideo } from '@/lib/supabase/videos';
import { logFollowAlong } from '@/lib/supabase/attempts';
import { signedReferenceUrl } from '@/lib/supabase/storage';
import { canUseAIMirror } from '@/lib/entitlements';
import { useAuth } from '@/lib/session';
import type { Movement } from '@/types/movement';
import type { Video } from '@/types/video';

export default function MovementDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [movement, setMovement] = useState<Movement | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [linkedVideo, setLinkedVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneState, setDoneState] = useState<'idle' | 'saving' | 'done'>('idle');

  useEffect(() => {
    if (!id) return;
    getMovement(id)
      .then((m) => {
        setMovement(m);
        if (m?.reference_dataset && m.reference_video_path) {
          signedReferenceUrl(m.reference_video_path).then(setVideoUrl).catch(() => {});
        } else if (m?.video_id) {
          getVideo(m.video_id).then(setLinkedVideo).catch(() => {});
        }
      })
      .catch((e) => setError(e.message));
  }, [id]);

  async function onMarkDone() {
    if (!profile || !movement) return;
    setDoneState('saving');
    try {
      await logFollowAlong(profile.user_id, movement.id);
      setDoneState('done');
    } catch (e) {
      setError((e as Error).message);
      setDoneState('idle');
    }
  }

  if (error) return <AppShell><p role="alert" className="card border-red-700 text-red-300">{error}</p></AppShell>;
  if (!movement) return <AppShell><p className="text-slate-400">Loading…</p></AppShell>;

  const jointLabel = JOINTS.find((j) => j.value === movement.primary_joint)?.label ?? movement.primary_joint;
  const cameraLabel = CAMERA_ANGLES.find((c) => c.value === movement.recommended_camera_angle)?.label;
  const rotationApprox = Object.values(movement.reference_dataset?.target_joints ?? {}).some((t) => t.rotation_limited);

  const isCoached = !!movement.reference_dataset;
  const canScore = canUseAIMirror(profile);

  return (
    <AppShell title={movement.name}>
      <div className="flex flex-col gap-4">
        {/* Demonstration: coached → signed reference video; follow-along → in-app embed */}
        {isCoached ? (
          videoUrl ? (
            <video src={videoUrl} autoPlay muted loop playsInline controls className="w-full rounded-2xl border border-slate-800">
              <track kind="captions" />
            </video>
          ) : (
            <div className="card text-slate-400">Reference video unavailable.</div>
          )
        ) : linkedVideo ? (
          <VideoEmbed
            provider={linkedVideo.provider}
            externalId={linkedVideo.external_id}
            thumbnailUrl={linkedVideo.thumbnail_url}
            title={movement.name}
          />
        ) : (
          <div className="card text-slate-400">Demo video unavailable.</div>
        )}

        <div>
          <h2 className="text-xl font-bold">{movement.name}</h2>
          <p className="text-sm text-slate-400">
            {jointLabel} · {movement.movement_type.toUpperCase()} · {movement.side}
          </p>
        </div>

        {movement.cues.length > 0 && (
          <div className="card">
            <h3 className="mb-2 font-semibold">Coach’s cues</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
              {movement.cues.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {isCoached && rotationApprox && (
          <p className="card border-amber-700 bg-amber-950/30 text-sm text-amber-200">
            This movement involves rotation that a single camera can’t fully see. Feedback on the rotation
            axis is approximate — for best accuracy, also try it from a side angle.
          </p>
        )}

        {/* Action: coached + entitled → live scoring; otherwise watch & follow */}
        {isCoached && canScore ? (
          <>
            <Link to={`/client/movements/${movement.id}/perform`} className="btn-primary text-lg">
              Try it
            </Link>
            <p className="text-center text-xs text-slate-500">
              Recommended camera position: {cameraLabel}. Stand so your full body is in frame.
            </p>
          </>
        ) : (
          <>
            {isCoached && !canScore && (
              <div className="card border-sky-800 bg-sky-950/30">
                <p className="text-sm font-semibold text-sky-200">Unlock AI Mirror</p>
                <p className="mt-1 text-sm text-slate-300">
                  Have the app watch your reps and score your range &amp; form in real time. Premium feature —
                  unlock coming soon.
                </p>
              </div>
            )}
            {doneState === 'done' ? (
              <p className="card border-emerald-700 bg-emerald-950/30 text-center text-sm text-emerald-200">
                Nice work — logged for your trainer. ✓
              </p>
            ) : (
              <button type="button" className="btn-primary text-lg" disabled={doneState === 'saving'} onClick={() => void onMarkDone()}>
                {doneState === 'saving' ? 'Saving…' : 'Mark as done'}
              </button>
            )}
          </>
        )}

        {isCoached && <HistoryList movementId={movement.id} />}
      </div>
    </AppShell>
  );
}
