import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { signUpClient } from '@/lib/supabase/auth';
import { saveIntake, trainerByCode, type TrainerRef } from '@/lib/supabase/intake';
import { FOCUS_AREAS } from '@/lib/intakeOptions';

const EXPERIENCE_OPTIONS = [
  'New to FRS / mobility training',
  'Some experience',
  'Experienced — train regularly',
];

/**
 * Public client intake. The trainer shares /intake/<their-code>; the client fills
 * this out, which creates their account, auto-assigns them to that trainer, and
 * stores their background. No auth required to view.
 */
export default function IntakeForm() {
  const { code = '' } = useParams();
  const navigate = useNavigate();

  const [trainer, setTrainer] = useState<TrainerRef | null>(null);
  const [resolving, setResolving] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [goals, setGoals] = useState('');
  const [experience, setExperience] = useState(EXPERIENCE_OPTIONS[0]);
  const [injuries, setInjuries] = useState('');
  const [avoidNotes, setAvoidNotes] = useState('');
  const [consent, setConsent] = useState(false);

  function toggleFocus(key: string) {
    setFocusAreas((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    trainerByCode(code)
      .then((t) => {
        if (active) setTrainer(t);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setResolving(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trainer) return;
    if (!consent) {
      setError('Please acknowledge the consent statement to continue.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);

    const { error: signErr, needsConfirm, userId } = await signUpClient(email, password, name, trainer.id);
    if (signErr) {
      setError(signErr);
      setBusy(false);
      return;
    }

    if (needsConfirm || !userId) {
      setNotice('Account created. Check your email to confirm, then sign in to finish.');
      setBusy(false);
      return;
    }

    // A session exists now — store the intake row, then enter the app.
    const { error: intakeErr } = await saveIntake(userId, {
      trainer_id: trainer.id,
      phone,
      focus_areas: focusAreas,
      goals,
      experience,
      injuries,
      avoid_notes: avoidNotes,
      consent,
    });
    if (intakeErr) {
      // The account exists; surface the issue but still let them in.
      console.error('[IronFit] intake save failed', intakeErr);
    }
    navigate('/client', { replace: true });
  }

  if (resolving) {
    return (
      <main className="mx-auto flex min-h-full max-w-md items-center justify-center p-6 text-slate-400">Loading…</main>
    );
  }

  if (!trainer) {
    return (
      <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">IronFit Movement Mirror</h1>
        <div role="alert" className="card border-amber-700 bg-amber-950/40 text-amber-200">
          This invite link isn’t valid. Ask your trainer to re-send their intake link.
        </div>
      </main>
    );
  }

  const trainerName = trainer.display_name?.includes('@')
    ? trainer.display_name.split('@')[0]
    : trainer.display_name ?? 'your trainer';

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-6 p-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Join {trainerName} on IronFit Mirror</h1>
        <p className="mt-2 text-slate-400">
          A quick intake so {trainerName} can tailor your training. Takes about a minute.
        </p>
      </header>

      {notice && (
        <div role="status" className="card border-emerald-700 bg-emerald-950/40 text-emerald-200">
          {notice}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {/* 1 — About you */}
        <fieldset className="card flex flex-col gap-4">
          <legend className="px-1 text-sm font-semibold text-sky-300">About you</legend>
          <div>
            <label htmlFor="name" className="field-label">Your name</label>
            <input id="name" required className="field-input" autoComplete="name" value={name}
              onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="email" className="field-label">Email address</label>
            <input id="email" type="email" required inputMode="email" autoComplete="email" className="field-input"
              placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="field-label">Create a password</label>
            <input id="password" type="password" required minLength={6} autoComplete="new-password" className="field-input"
              placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label htmlFor="phone" className="field-label">Phone <span className="text-slate-500">(optional)</span></label>
            <input id="phone" type="tel" inputMode="tel" autoComplete="tel" className="field-input" value={phone}
              onChange={(e) => setPhone(e.target.value)} />
          </div>
        </fieldset>

        {/* 2 — What you want to work on */}
        <fieldset className="card flex flex-col gap-4">
          <legend className="px-1 text-sm font-semibold text-sky-300">What you want to work on</legend>
          <div>
            <span className="field-label">Focus areas <span className="text-slate-500">(tap any that apply)</span></span>
            <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Focus areas">
              {FOCUS_AREAS.map((a) => {
                const on = focusAreas.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleFocus(a.key)}
                    className={`chip border ${on ? 'border-sky-500 bg-sky-500/20 text-sky-200' : 'border-slate-700 text-slate-300'}`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="goals" className="field-label">
              Anything specific? <span className="text-slate-500">(optional)</span>
            </label>
            <input id="goals" className="field-input" placeholder="e.g. overhead reach for climbing"
              value={goals} onChange={(e) => setGoals(e.target.value)} />
          </div>
        </fieldset>

        {/* 3 — A bit about you */}
        <fieldset className="card flex flex-col gap-4">
          <legend className="px-1 text-sm font-semibold text-sky-300">A bit about you</legend>
          <div>
            <label htmlFor="experience" className="field-label">How much mobility training have you done?</label>
            <select id="experience" className="field-input" value={experience} onChange={(e) => setExperience(e.target.value)}>
              {EXPERIENCE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
        </fieldset>

        {/* 4 — Health */}
        <fieldset className="card flex flex-col gap-4">
          <legend className="px-1 text-sm font-semibold text-sky-300">Health</legend>
          <div>
            <label htmlFor="injuries" className="field-label">
              Injuries or history <span className="text-slate-500">your trainer should know (optional)</span>
            </label>
            <textarea id="injuries" rows={2} className="field-input" placeholder="e.g. left shoulder surgery 2022, low-back flare-ups"
              value={injuries} onChange={(e) => setInjuries(e.target.value)} />
          </div>
          <div>
            <label htmlFor="avoid" className="field-label">
              Anything a doctor has told you to avoid? <span className="text-slate-500">(optional)</span>
            </label>
            <input id="avoid" className="field-input" placeholder="e.g. no deep squatting"
              value={avoidNotes} onChange={(e) => setAvoidNotes(e.target.value)} />
          </div>
        </fieldset>

        <label className="flex items-start gap-2 px-1 text-sm text-slate-300">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            I understand IronFit Movement Mirror is a coaching tool, not medical advice, and I’m clearing this kind of
            training with my own judgement (and a doctor if needed).
          </span>
        </label>

        {error && <p role="alert" className="px-1 text-sm text-red-300">{error}</p>}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Creating your account…' : 'Join & get started'}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500">
        Your camera video stays on your device — only movement scores are shared with your trainer.
      </p>
    </main>
  );
}
