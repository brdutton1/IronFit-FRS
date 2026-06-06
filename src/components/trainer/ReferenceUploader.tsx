import { useRef, useState } from 'react';
import { PoseDetector } from '@/lib/pose/detector';
import type { AngleKey } from '@/lib/pose/landmarks';
import { extractReferenceFromVideo, referenceQuality } from '@/lib/reference/extractor';
import { ANGLE_OPTIONS } from '@/lib/movementOptions';
import { saveReference } from '@/lib/supabase/movements';
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  generateThumbnail,
  uploadReferenceVideo,
  uploadThumbnail,
} from '@/lib/supabase/storage';
import { useAuth } from '@/lib/session';
import type { Movement } from '@/types/movement';

type Phase = 'idle' | 'validating' | 'extracting' | 'uploading' | 'saving' | 'done' | 'error';

/** Pick the angle that should drive rep detection + ROM meter. */
function primaryAngle(movement: Movement): AngleKey {
  const matchingJoint = movement.target_joints.find(
    (k) => ANGLE_OPTIONS.find((a) => a.key === k)?.joint === movement.primary_joint,
  );
  return (matchingJoint ?? movement.target_joints[0]) as AngleKey;
}

export default function ReferenceUploader({
  movement,
  multiRep,
  onExtracted,
}: {
  movement: Movement;
  multiRep: boolean;
  onExtracted: (m: Movement) => void;
}) {
  const { profile } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (movement.target_joints.length === 0) {
      setError('Add at least one target joint to this movement before uploading a reference.');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`Video is ${(file.size / 1e6).toFixed(0)}MB; the limit is 100MB.`);
      return;
    }

    setPhase('validating');
    const url = URL.createObjectURL(file);
    const video = videoRef.current!;
    video.src = url;
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error('Could not read the video file.'));
    }).catch((e) => setError((e as Error).message));

    if (video.duration > MAX_VIDEO_SECONDS + 0.5) {
      setError(`Video is ${video.duration.toFixed(0)}s; the limit is ${MAX_VIDEO_SECONDS}s.`);
      setPhase('error');
      URL.revokeObjectURL(url);
      return;
    }

    try {
      // 1. Extract reference in-browser with the same model the client uses.
      setPhase('extracting');
      const detector = new PoseDetector();
      const dataset = await extractReferenceFromVideo(video, detector, {
        movement_id: movement.id,
        targetAngles: movement.target_joints as AngleKey[],
        stillnessAngles: movement.stillness_joints as AngleKey[],
        primaryAngle: primaryAngle(movement),
        cameraAngle: movement.recommended_camera_angle,
        multiRep,
        cues: movement.cues,
        compensationPatterns: movement.compensation_patterns.map((p) => p.tag),
        sampleFps: Math.min(30, 30),
        onProgress: (f) => setProgress(Math.round(f * 100)),
      });
      detector.close();
      const quality = referenceQuality(dataset);

      // 2. Upload the original video (resumable) + a thumbnail.
      setPhase('uploading');
      setProgress(0);
      const path = await uploadReferenceVideo(profile!.user_id, movement.id, file, (f) =>
        setProgress(Math.round(f * 100)),
      );
      try {
        const thumb = await generateThumbnail(file);
        await uploadThumbnail(`${path}.jpg`, thumb);
      } catch {
        /* thumbnail is best-effort; ignore failures */
      }

      // 3. Persist.
      setPhase('saving');
      const updated = await saveReference(movement.id, dataset, quality, path);
      onExtracted(updated);
      setPhase('done');
    } catch (e) {
      setError((e as Error).message);
      setPhase('error');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const busy = phase === 'extracting' || phase === 'uploading' || phase === 'saving' || phase === 'validating';

  return (
    <div className="card flex flex-col gap-3">
      {/* Hidden worker video for frame-by-frame extraction. */}
      <video ref={videoRef} className="hidden" muted playsInline crossOrigin="anonymous" />

      <label htmlFor="ref-video" className="field-label">
        Upload reference video (mp4, ≤ 60s, ≤ 100MB)
      </label>
      <input
        id="ref-video"
        type="file"
        accept="video/mp4,video/*"
        disabled={busy}
        className="text-sm"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      {busy && (
        <div aria-live="polite">
          <p className="text-sm text-slate-300">
            {phase === 'validating' && 'Reading video…'}
            {phase === 'extracting' && `Analyzing pose frame by frame… ${progress}%`}
            {phase === 'uploading' && `Uploading video… ${progress}%`}
            {phase === 'saving' && 'Saving reference…'}
          </p>
          <div className="mt-1 h-2 w-full overflow-hidden rounded bg-slate-800">
            <div className="h-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {phase === 'done' && (
        <p role="status" className="text-sm text-emerald-300">
          Reference extracted and saved. Review the curves below, then publish.
        </p>
      )}
    </div>
  );
}
