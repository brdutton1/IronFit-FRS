import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import ReferenceUploader from './ReferenceUploader';
import ReferenceReview from './ReferenceReview';
import { useAuth } from '@/lib/session';
import {
  ANGLE_OPTIONS,
  CAMERA_ANGLES,
  COMPENSATION_TAGS,
  JOINTS,
  MOVEMENT_TYPES,
  SIDES,
} from '@/lib/movementOptions';
import {
  createMovement,
  getMovement,
  setMovementStatus,
  updateMovement,
} from '@/lib/supabase/movements';
import type { CompensationPattern, Movement, MovementDraft } from '@/types/movement';

const emptyDraft = (): MovementDraft => ({
  name: '',
  movement_type: 'car',
  primary_joint: 'shoulder',
  side: 'right',
  recommended_camera_angle: 'front',
  target_joints: [],
  stillness_joints: [],
  rom_expectation_deg: null,
  tempo_expectation: 'moderate',
  cues: [],
  compensation_patterns: [],
  reference_video_path: null,
  status: 'draft',
});

export default function MovementEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [movement, setMovement] = useState<Movement | null>(null);
  const [form, setForm] = useState<MovementDraft>(emptyDraft());
  const [cuesText, setCuesText] = useState('');
  const [multiRep, setMultiRep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    getMovement(id!)
      .then((m) => {
        if (!m) return;
        setMovement(m);
        const { id: _id, trainer_id, created_at, updated_at, reference_dataset, reference_quality, ...draft } = m;
        void _id; void trainer_id; void created_at; void updated_at; void reference_dataset; void reference_quality;
        setForm(draft);
        setCuesText(m.cues.join('\n'));
      })
      .catch((e) => setError(e.message));
  }, [id, isNew]);

  const update = <K extends keyof MovementDraft>(key: K, value: MovementDraft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (key: 'target_joints' | 'stillness_joints', value: string) =>
    setForm((f) => {
      const has = f[key].includes(value);
      return { ...f, [key]: has ? f[key].filter((v) => v !== value) : [...f[key], value] };
    });

  const compTagSelected = (tag: string) => form.compensation_patterns.some((p) => p.tag === tag);
  const toggleComp = (preset: (typeof COMPENSATION_TAGS)[number]) =>
    setForm((f) => {
      if (compTagSelected(preset.tag)) {
        return { ...f, compensation_patterns: f.compensation_patterns.filter((p) => p.tag !== preset.tag) };
      }
      const next: CompensationPattern = { joint: preset.joint, tag: preset.tag, label: preset.label, cue: preset.cue };
      return { ...f, compensation_patterns: [...f.compensation_patterns, next] };
    });
  const updateCompCue = (tag: string, cue: string) =>
    setForm((f) => ({
      ...f,
      compensation_patterns: f.compensation_patterns.map((p) => (p.tag === tag ? { ...p, cue } : p)),
    }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const payload: MovementDraft = {
      ...form,
      cues: cuesText.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (isNew) {
        const created = await createMovement(profile.user_id, payload);
        navigate(`/trainer/movements/${created.id}`, { replace: true });
      } else {
        const updated = await updateMovement(id!, payload);
        setMovement(updated);
        setNotice('Saved.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onToggleLive() {
    if (!movement) return;
    const next = movement.status === 'live' ? 'draft' : 'live';
    if (next === 'live' && !movement.reference_dataset) {
      setError('Add and approve a reference before going live.');
      return;
    }
    await setMovementStatus(movement.id, next);
    setMovement({ ...movement, status: next });
  }

  return (
    <AppShell title={isNew ? 'New movement' : form.name || 'Edit movement'}>
      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}
      {notice && <p role="status" className="card mb-4 border-emerald-700 text-emerald-300">{notice}</p>}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="card flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="field-label">Movement name</label>
            <input
              id="name"
              className="field-input"
              required
              placeholder="Shoulder CAR, right"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="type" className="field-label">Type</label>
              <select id="type" className="field-input" value={form.movement_type} onChange={(e) => update('movement_type', e.target.value as MovementDraft['movement_type'])}>
                {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="joint" className="field-label">Primary joint</label>
              <select id="joint" className="field-input" value={form.primary_joint} onChange={(e) => update('primary_joint', e.target.value as MovementDraft['primary_joint'])}>
                {JOINTS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="side" className="field-label">Side</label>
              <select id="side" className="field-input" value={form.side} onChange={(e) => update('side', e.target.value as MovementDraft['side'])}>
                {SIDES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="camera" className="field-label">Recommended camera angle</label>
              <select id="camera" className="field-input" value={form.recommended_camera_angle} onChange={(e) => update('recommended_camera_angle', e.target.value as MovementDraft['recommended_camera_angle'])}>
                {CAMERA_ANGLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <fieldset className="card">
          <legend className="field-label">Target joints — which joints should move</legend>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {ANGLE_OPTIONS.map((a) => (
              <label key={a.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.target_joints.includes(a.key)} onChange={() => toggle('target_joints', a.key)} />
                {a.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="card">
          <legend className="field-label">Stillness joints — which joints should NOT move</legend>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {ANGLE_OPTIONS.map((a) => (
              <label key={a.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.stillness_joints.includes(a.key)} onChange={() => toggle('stillness_joints', a.key)} />
                {a.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="card grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="rom" className="field-label">ROM expectation (° peak, optional)</label>
            <input id="rom" type="number" className="field-input" value={form.rom_expectation_deg ?? ''} onChange={(e) => update('rom_expectation_deg', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <label htmlFor="tempo" className="field-label">Tempo expectation</label>
            <input id="tempo" className="field-input" placeholder="slow / moderate / 3s per rep" value={form.tempo_expectation ?? ''} onChange={(e) => update('tempo_expectation', e.target.value)} />
          </div>
        </div>

        <div className="card">
          <label htmlFor="cues" className="field-label">Cues (one per line)</label>
          <textarea id="cues" rows={3} className="field-input" placeholder={'Drive the elbow forward\nKeep the ribcage down'} value={cuesText} onChange={(e) => setCuesText(e.target.value)} />
        </div>

        <fieldset className="card">
          <legend className="field-label">Compensation patterns to flag</legend>
          <div className="flex flex-col gap-2">
            {COMPENSATION_TAGS.map((preset) => {
              const selected = compTagSelected(preset.tag);
              const current = form.compensation_patterns.find((p) => p.tag === preset.tag);
              return (
                <div key={preset.tag} className="rounded-lg bg-slate-900/70 p-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={selected} onChange={() => toggleComp(preset)} />
                    {preset.label} <span className="text-xs text-slate-500">({preset.joint})</span>
                  </label>
                  {selected && (
                    <input
                      aria-label={`Cue for ${preset.label}`}
                      className="field-input mt-2 text-sm"
                      value={current?.cue ?? ''}
                      onChange={(e) => updateCompCue(preset.tag, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create movement' : 'Save changes'}
        </button>
      </form>

      {!isNew && movement && (
        <section className="mt-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Reference video</h2>
            <button type="button" className={movement.status === 'live' ? 'btn-secondary' : 'btn-primary'} onClick={() => void onToggleLive()}>
              {movement.status === 'live' ? 'Unpublish (set draft)' : 'Publish — go live'}
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={multiRep} onChange={(e) => setMultiRep(e.target.checked)} />
            This reference shows multiple reps (enable rep counting)
          </label>

          <ReferenceUploader
            movement={movement}
            multiRep={multiRep}
            onExtracted={(updated) => setMovement(updated)}
          />

          {movement.reference_dataset && <ReferenceReview movement={movement} />}
        </section>
      )}
    </AppShell>
  );
}
