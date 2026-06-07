import { useEffect, useMemo, useState } from 'react';
import AppShell from '@/components/common/AppShell';
import VideoEmbed from '@/components/common/VideoEmbed';
import { useAuth } from '@/lib/session';
import { FOCUS_AREAS, focusAreaLabels } from '@/lib/intakeOptions';
import { matchStretches } from '@/lib/stretchMatch';
import { listStretches } from '@/lib/supabase/stretches';
import { listClientVideos } from '@/lib/supabase/videos';
import { logSoreness } from '@/lib/supabase/soreness';
import type { Stretch } from '@/types/stretch';
import type { Severity } from '@/types/soreness';
import type { Video } from '@/types/video';

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'strong', label: 'Strong' },
];

export default function StretchFinder() {
  const { profile } = useAuth();
  const [stretches, setStretches] = useState<Stretch[] | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [results, setResults] = useState<Stretch[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listStretches(), listClientVideos()])
      .then(([s, v]) => {
        setStretches(s);
        setVideos(v);
      })
      .catch((e) => setError(e.message));
  }, []);

  const videoById = useMemo(() => new Map(videos.map((v) => [v.id, v])), [videos]);

  const toggle = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  async function onFind() {
    if (!profile || selected.length === 0 || !stretches) return;
    setSaving(true);
    setError(null);
    try {
      // Log the soreness report for the trainer, then show matches.
      await logSoreness(profile.user_id, profile.trainer_id, { regions: selected, severity });
    } catch (e) {
      // Don't block the client from seeing stretches if logging fails.
      console.error('[IronFit] soreness log failed', e);
    } finally {
      setSaving(false);
    }
    setResults(matchStretches(stretches, selected));
  }

  return (
    <AppShell title="Stretch">
      <header className="mb-5">
        <h2 className="text-xl font-bold">Where are you sore?</h2>
        <p className="text-sm text-slate-400">
          Tap the areas that feel tight or sore and we’ll suggest some gentle stretches.
        </p>
      </header>

      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}

      <section className="card mb-4 flex flex-col gap-4">
        <div>
          <span className="field-label">Sore areas <span className="text-slate-500">(tap any that apply)</span></span>
          <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Sore areas">
            {FOCUS_AREAS.map((a) => {
              const on = selected.includes(a.key);
              return (
                <button
                  key={a.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(a.key)}
                  className={`chip border ${on ? 'border-sky-500 bg-sky-500/20 text-sky-200' : 'border-slate-700 text-slate-300'}`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="field-label">How sore? <span className="text-slate-500">(optional)</span></span>
          <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Soreness level">
            {SEVERITIES.map((s) => {
              const on = severity === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSeverity(on ? null : s.value)}
                  className={`chip border ${on ? 'border-amber-500 bg-amber-500/20 text-amber-200' : 'border-slate-700 text-slate-300'}`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          disabled={selected.length === 0 || saving || !stretches}
          onClick={() => void onFind()}
        >
          {saving ? 'Finding…' : 'Find stretches'}
        </button>
      </section>

      {results !== null && (
        <section className="flex flex-col gap-3">
          <p className="card border-amber-800 bg-amber-950/30 text-sm text-amber-200">
            These are gentle mobility suggestions, not medical advice. Ease into each one and never
            push into sharp pain. If pain is sharp, recent, or not improving, message your trainer or
            see a qualified professional.
          </p>

          {results.length === 0 ? (
            <p className="card text-slate-400">
              No stretches matched those areas yet. Try another area, or message your trainer.
            </p>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-slate-300">
                {results.length} stretch{results.length === 1 ? '' : 'es'} for {focusAreaLabels(selected).join(', ')}
              </h3>
              {results.map((s) => (
                <StretchCard key={s.id} stretch={s} video={s.video_id ? videoById.get(s.video_id) : undefined} />
              ))}
            </>
          )}
        </section>
      )}
    </AppShell>
  );
}

function StretchCard({ stretch, video }: { stretch: Stretch; video?: Video }) {
  const [open, setOpen] = useState(false);
  const regions = focusAreaLabels(stretch.regions);

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block font-medium">{stretch.name}</span>
          <span className="mt-0.5 block text-xs text-slate-400">
            {regions.join(' · ')}
            {stretch.hold_seconds ? ` · hold ${stretch.hold_seconds}s` : ''}
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-slate-500">{open ? '▾' : '›'}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {video && <VideoEmbed youtubeId={video.youtube_id} title={stretch.name} />}
          <p className="text-sm text-slate-200">{stretch.instructions}</p>
          {stretch.steps && stretch.steps.length > 0 && (
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">
              {stretch.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
