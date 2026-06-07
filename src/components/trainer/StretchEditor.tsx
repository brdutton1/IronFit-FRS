import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import VideoEmbed from '@/components/common/VideoEmbed';
import { useAuth } from '@/lib/session';
import { FOCUS_AREAS } from '@/lib/intakeOptions';
import { createStretch, deleteStretch, getStretch, updateStretch } from '@/lib/supabase/stretches';
import { listTrainerVideos } from '@/lib/supabase/videos';
import type { Stretch, StretchDraft } from '@/types/stretch';
import type { Video } from '@/types/video';

const emptyDraft = (): StretchDraft => ({
  name: '',
  regions: [],
  instructions: '',
  steps: null,
  hold_seconds: null,
  video_id: null,
  sort_order: 0,
  status: 'live',
});

export default function StretchEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [form, setForm] = useState<StretchDraft>(emptyDraft());
  const [stepsText, setStepsText] = useState('');
  const [videos, setVideos] = useState<Video[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    listTrainerVideos(profile.user_id).then(setVideos).catch((e) => setError(e.message));
  }, [profile]);

  useEffect(() => {
    if (isNew) return;
    getStretch(id!)
      .then((s) => {
        if (!s) return;
        const { id: _id, trainer_id, created_at, updated_at, ...draft } = s;
        void _id; void trainer_id; void created_at; void updated_at;
        setForm(draft);
        setStepsText((s.steps ?? []).join('\n'));
      })
      .catch((e) => setError(e.message));
  }, [id, isNew]);

  const update = <K extends keyof StretchDraft>(key: K, value: StretchDraft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleRegion = (key: string) =>
    setForm((f) => ({
      ...f,
      regions: f.regions.includes(key) ? f.regions.filter((k) => k !== key) : [...f.regions, key],
    }));

  const selectedVideo = useMemo(
    () => videos.find((v) => v.id === form.video_id) ?? null,
    [videos, form.video_id],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (form.regions.length === 0) {
      setError('Tag at least one body area so clients can find this stretch.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const steps = stepsText.split('\n').map((s) => s.trim()).filter(Boolean);
    const payload: StretchDraft = { ...form, steps: steps.length > 0 ? steps : null };
    try {
      if (isNew) {
        const created = await createStretch(profile.user_id, payload);
        navigate(`/trainer/stretches/${created.id}`, { replace: true });
      } else {
        const updated = await updateStretch(id!, payload);
        setForm(stripDraft(updated));
        setNotice('Saved.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!id || isNew) return;
    if (!confirm('Delete this stretch?')) return;
    try {
      await deleteStretch(id);
      navigate('/trainer/stretches', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <AppShell title={isNew ? 'New stretch' : form.name || 'Edit stretch'}>
      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}
      {notice && <p role="status" className="card mb-4 border-emerald-700 text-emerald-300">{notice}</p>}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="card flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="field-label">Stretch name</label>
            <input
              id="name"
              className="field-input"
              required
              placeholder="Couch stretch"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>

          <div>
            <span className="field-label">Body areas <span className="text-slate-500">(tap any that apply)</span></span>
            <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Body areas">
              {FOCUS_AREAS.map((a) => {
                const on = form.regions.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleRegion(a.key)}
                    className={`chip border ${on ? 'border-sky-500 bg-sky-500/20 text-sky-200' : 'border-slate-700 text-slate-300'}`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="instructions" className="field-label">Instructions</label>
            <textarea
              id="instructions"
              rows={3}
              className="field-input"
              required
              placeholder="How to do it, what they should feel, and where."
              value={form.instructions}
              onChange={(e) => update('instructions', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="steps" className="field-label">
              Steps <span className="text-slate-500">(optional, one per line)</span>
            </label>
            <textarea
              id="steps"
              rows={3}
              className="field-input"
              placeholder={'Half-kneel with one knee down\nTuck the pelvis\nShift gently forward'}
              value={stepsText}
              onChange={(e) => setStepsText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="hold" className="field-label">Hold (seconds, optional)</label>
              <input
                id="hold"
                type="number"
                min={0}
                className="field-input"
                value={form.hold_seconds ?? ''}
                onChange={(e) => update('hold_seconds', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="status" className="field-label">Visibility</label>
              <select id="status" className="field-input" value={form.status} onChange={(e) => update('status', e.target.value as Stretch['status'])}>
                <option value="live">Live — clients can find it</option>
                <option value="draft">Draft — hidden</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="video" className="field-label">Video <span className="text-slate-500">(optional)</span></label>
            <select
              id="video"
              className="field-input"
              value={form.video_id ?? ''}
              onChange={(e) => update('video_id', e.target.value || null)}
            >
              <option value="">No video</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}{v.trainer_id === null ? ' (built-in)' : ''}
                </option>
              ))}
            </select>
            {videos.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Add a YouTube link in your Video library to attach one here.
              </p>
            )}
            {selectedVideo && (
              <div className="mt-3">
                <VideoEmbed
                  provider={selectedVideo.provider}
                  externalId={selectedVideo.external_id}
                  thumbnailUrl={selectedVideo.thumbnail_url}
                  title={selectedVideo.title}
                />
              </div>
            )}
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create stretch' : 'Save changes'}
        </button>
      </form>

      {!isNew && (
        <button type="button" onClick={() => void onDelete()} className="btn-danger mt-3 w-full">
          Delete stretch
        </button>
      )}
    </AppShell>
  );
}

function stripDraft(s: Stretch): StretchDraft {
  const { id, trainer_id, created_at, updated_at, ...draft } = s;
  void id; void trainer_id; void created_at; void updated_at;
  return draft;
}
