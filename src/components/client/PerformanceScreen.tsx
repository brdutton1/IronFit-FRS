import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RomMeter from '@/components/overlay/RomMeter';
import CompensationBanner from '@/components/overlay/CompensationBanner';
import JointHighlight from '@/components/overlay/JointHighlight';
import ConfidenceIndicator from '@/components/overlay/ConfidenceIndicator';
import { drawSkeleton, type JointPaint } from '@/components/overlay/SkeletonOverlay';
import { targetColorLabel, stillnessColorLabel } from '@/components/overlay/colors';
import { PoseDetector } from '@/lib/pose/detector';
import type { AngleKey, PoseFrame } from '@/lib/pose/landmarks';
import { LiveSession } from '@/lib/compare/liveCompare';
import {
  CompensationDebouncer,
  detectCompensations,
  type ActiveCompensation,
} from '@/lib/compare/compensationDetect';
import { MIN_ACCEPTABLE_FPS } from '@/lib/compare/thresholds';
import { validateCameraAngle } from '@/lib/calibration/cameraAngle';
import { primaryAngleFor, rotationLimitedMap } from '@/lib/movementOptions';
import { worstConfidence } from '@/lib/pose/confidence';
import { getMovement } from '@/lib/supabase/movements';
import { recordAttempt } from '@/lib/supabase/attempts';
import { addAttempt } from '@/lib/localHistory';
import { useAuth } from '@/lib/session';
import type { Movement } from '@/types/movement';
import type { Confidence } from '@/types/reference';
import AppShell from '@/components/common/AppShell';
import type { FrameResult } from '@/lib/compare/liveCompare';

type Phase = 'loading' | 'positioning' | 'countdown' | 'live' | 'error';

export default function PerformanceScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [movement, setMovement] = useState<Movement | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [cameraMsg, setCameraMsg] = useState('Getting your camera ready…');
  const [countdown, setCountdown] = useState(3);
  const [fps, setFps] = useState(0);
  const [frameResult, setFrameResult] = useState<FrameResult | null>(null);
  const [active, setActive] = useState<ActiveCompensation[]>([]);
  const [overridden, setOverridden] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);
  const debouncerRef = useRef(new CompensationDebouncer());
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<Phase>('loading');
  const pausedRef = useRef(false);

  // Accumulators for the summary.
  const clientTrajRef = useRef<number[]>([]);
  const worstConfRef = useRef<Confidence>('high');
  const compTagsRef = useRef<Map<string, string>>(new Map());
  const stillnessMaxRef = useRef<Map<string, number>>(new Map());
  const fpsWindow = useRef<number[]>([]);

  phaseRef.current = phase;

  // ── Load movement + camera + model ──
  useEffect(() => {
    if (!id) return;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        const m = await getMovement(id);
        if (!m) throw new Error('Movement not found.');
        if (!m.reference_dataset) throw new Error('This movement has no reference yet.');
        setMovement(m);

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const detector = new PoseDetector();
        await detector.init();
        detectorRef.current = detector;

        setCameraMsg('Position yourself so your full body is in frame.');
        setPhase('positioning');
      } catch (e) {
        setError((e as Error).message || 'Could not start the camera.');
        setPhase('error');
      }
    })();

    return () => {
      cancelAnimationFrame(rafRef.current);
      detectorRef.current?.close();
      detectorRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [id]);

  // Pause cleanly on tab hide / phone call (resume when visible again).
  useEffect(() => {
    const onVis = () => {
      pausedRef.current = document.hidden;
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const fitCanvas = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || canvas.clientWidth;
    canvas.height = video.videoHeight || canvas.clientHeight;
  }, []);

  // ── Positioning loop: validate camera angle, draw a faint skeleton ──
  useEffect(() => {
    if (phase !== 'positioning' || !movement) return;
    fitCanvas();
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const tick = () => {
      if (phaseRef.current !== 'positioning') return;
      const frame = detectorRef.current!.detect(video, performance.now());
      if (frame) {
        const v = validateCameraAngle(frame, movement.recommended_camera_angle);
        setCameraMsg(v.message);
        drawSkeleton(ctx, frame, {
          width: canvas.width,
          height: canvas.height,
          joints: [],
        });
      } else {
        setCameraMsg('No person detected — step back so your whole body is visible.');
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, movement, fitCanvas]);

  // ── Countdown → live ──
  function startCountdown() {
    setPhase('countdown');
    setCountdown(3);
    let n = 3;
    const iv = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) {
        clearInterval(iv);
        beginLive();
      }
    }, 1000);
  }

  function beginLive() {
    if (!movement?.reference_dataset) return;
    const targetKeys = movement.target_joints as AngleKey[];
    const stillnessKeys = movement.stillness_joints as AngleKey[];
    sessionRef.current = new LiveSession({
      reference: movement.reference_dataset,
      targetKeys,
      stillnessKeys,
      primaryKey: primaryAngleFor(movement),
      rotationLimited: rotationLimitedMap(movement),
    });
    debouncerRef.current = new CompensationDebouncer();
    clientTrajRef.current = [];
    worstConfRef.current = 'high';
    compTagsRef.current = new Map();
    stillnessMaxRef.current = new Map();
    setPhase('live');
  }

  // ── Live loop ──
  useEffect(() => {
    if (phase !== 'live' || !movement) return;
    fitCanvas();
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const primaryKey = primaryAngleFor(movement);
    let last = performance.now();

    const tick = () => {
      if (phaseRef.current !== 'live') return;
      if (pausedRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const now = performance.now();
      const frame: PoseFrame | null = detectorRef.current!.detect(video, now);

      // FPS (rolling average over last ~30 frames).
      const dt = now - last;
      last = now;
      if (dt > 0) {
        fpsWindow.current.push(1000 / dt);
        if (fpsWindow.current.length > 30) fpsWindow.current.shift();
        setFps(Math.round(fpsWindow.current.reduce((a, b) => a + b, 0) / fpsWindow.current.length));
      }

      if (frame) {
        const result = sessionRef.current!.update(frame);
        setFrameResult(result);

        // Capture primary trajectory + worst confidence + stillness drift.
        const primary = result.targets.find((t) => t.key === primaryKey);
        if (primary) clientTrajRef.current.push(primary.current);
        for (const t of result.targets) worstConfRef.current = worstConfidence(worstConfRef.current, t.confidence);
        for (const s of result.stillness) {
          stillnessMaxRef.current.set(s.key, Math.max(stillnessMaxRef.current.get(s.key) ?? 0, s.deviation));
        }

        const comps = detectCompensations(result.stillness, movement.compensation_patterns);
        const stable = debouncerRef.current.step(comps);
        for (const c of stable) compTagsRef.current.set(c.pattern.tag, c.pattern.label);
        setActive(stable);

        const joints: JointPaint[] = [
          ...result.targets.map((t) => ({ key: t.key, color: t.color, reduced: t.confidence === 'reduced' })),
          ...result.stillness.map((s) => ({ key: s.key, color: s.color, reduced: s.confidence === 'reduced' })),
        ];
        drawSkeleton(ctx, frame, { width: canvas.width, height: canvas.height, joints });
      } else {
        drawSkeleton(ctx, null, { width: canvas.width, height: canvas.height, joints: [] });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, movement, fitCanvas]);

  async function onDone() {
    if (!movement) return;
    cancelAnimationFrame(rafRef.current);
    const session = sessionRef.current;
    const romPct = session?.finalPrimaryRomPct() ?? 0;
    const confidence = overridden ? 'reduced' : worstConfRef.current;
    const compFlags = Array.from(compTagsRef.current.keys());

    addAttempt(movement.id, romPct);
    if (profile) {
      try {
        await recordAttempt(profile.user_id, {
          movement_id: movement.id,
          rom_achieved_pct: romPct,
          compensation_flags: compFlags,
          confidence,
        });
      } catch {
        /* offline / RLS — local history still saved */
      }
    }

    navigate(`/client/movements/${movement.id}/summary`, {
      state: {
        movementId: movement.id,
        movementName: movement.name,
        primaryKey: primaryAngleFor(movement),
        romPct,
        confidence,
        clientTrajectory: clientTrajRef.current,
        compensations: Array.from(compTagsRef.current.entries()).map(([tag, label]) => ({ tag, label })),
        stillnessMax: Array.from(stillnessMaxRef.current.entries()).map(([key, dev]) => ({ key, dev })),
        overridden,
      },
    });
  }

  if (phase === 'error') {
    return (
      <AppShell title="Camera">
        <div role="alert" className="card border-red-700 text-red-200">
          {error}
        </div>
        <button className="btn-secondary mt-4" onClick={() => navigate(-1)}>
          Go back
        </button>
      </AppShell>
    );
  }

  const ref = movement?.reference_dataset;
  const primaryKey = movement ? primaryAngleFor(movement) : undefined;
  const refPeak = primaryKey && ref ? ref.target_joints[primaryKey]?.peak : undefined;

  return (
    <div className="relative flex h-[100dvh] flex-col bg-black">
      {/* Camera + overlay */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />

        <CompensationBanner active={active} />

        {/* Positioning / countdown overlays */}
        {phase === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-center text-slate-200">
            {cameraMsg}
          </div>
        )}
        {phase === 'positioning' && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/80 to-transparent p-5">
            <p aria-live="polite" className="text-center text-slate-100">{cameraMsg}</p>
            <button className="btn-primary w-full max-w-sm" onClick={startCountdown}>
              I’m ready — start
            </button>
            <button
              className="text-xs text-slate-400 underline"
              onClick={() => {
                setOverridden(true);
                startCountdown();
              }}
            >
              Start anyway (mark as approximate)
            </button>
          </div>
        )}
        {phase === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-8xl font-bold text-white" aria-live="assertive">
              {countdown > 0 ? countdown : 'Go!'}
            </span>
          </div>
        )}

        {/* ROM meter + fps */}
        {phase === 'live' && (
          <>
            <div className="absolute left-3 top-3 rounded-xl bg-black/50 p-2">
              <RomMeter pct={frameResult?.primaryRomPct ?? 0} referencePeakDeg={refPeak} />
            </div>
            {fps > 0 && fps < MIN_ACCEPTABLE_FPS && (
              <p role="alert" className="absolute right-3 top-3 rounded bg-amber-950/80 px-2 py-1 text-xs text-amber-200">
                Performance is limited on this device ({fps}fps). Feedback may be delayed.
              </p>
            )}
          </>
        )}
      </div>

      {/* Side/bottom panel: text labels for every joint (color is never the only cue) */}
      {phase === 'live' && frameResult && (
        <div className="max-h-[38vh] overflow-y-auto bg-slate-950 p-3">
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {frameResult.targets.map((t) => (
              <JointHighlight
                key={t.key}
                jointKey={t.key}
                color={t.color}
                statusText={targetColorLabel(t.color)}
                detail={t.rotationLimited ? 'rotation approx' : `${Math.round(t.romPctDisplay)}%`}
              />
            ))}
            {frameResult.stillness.map((s) => (
              <JointHighlight
                key={s.key}
                jointKey={s.key}
                color={s.color}
                statusText={stillnessColorLabel(s.color)}
                detail={`${Math.round(s.deviation)}° drift`}
              />
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between gap-2">
            <ConfidenceIndicator confidence={worstConfRef.current} />
            <button className="btn-primary" onClick={() => void onDone()}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
