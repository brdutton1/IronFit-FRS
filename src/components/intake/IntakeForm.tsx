import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { signUpClient } from '@/lib/supabase/auth';
import { saveIntake, trainerByCode, type TrainerRef } from '@/lib/supabase/intake';

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
  const [goals, setGoals] = useState('');
  const [injuries, setInjuries] = useState('');
  const [experience, setExperience] = useState(EXPERIENCE_OPTIONS[0]);
  const [emergency, setEmergency] = useState('');
  const [consent, setConsent] = useState(false);

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
      goals,
      injuries,
      experience,
      emergency_contact: emergency,
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

      <form onSubmit={onSubmit} className="card flex flex-col gap-4">
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
        <div>
          <label htmlFor="goals" className="field-label">What are your goals?</label>
          <textarea id="goals" rows={3} className="field-input" placeholder="e.g. less stiff hips, stronger overhead reach"
            value={goals} onChange={(e) => setGoals(e.target.value)} />
        </div>
        <div>
          <label htmlFor="injuries" className="field-label">
            Injuries or health history <span className="text-slate-500">your trainer should know</span>
          </label>
          <textarea id="injuries" rows={3} className="field-input" placeholder="e.g. left shoulder surgery 2022, low-back flare-ups"
            value={injuries} onChange={(e) => setInjuries(e.target.value)} />
        </div>
        <div>
          <label htmlFor="experience" className="field-label">Experience level</label>
          <select id="experience" className="field-input" value={experience} onChange={(e) => setExperience(e.target.value)}>
            {EXPERIENCE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="emergency" className="field-label">
            Emergency contact <span className="text-slate-500">(optional)</span>
          </label>
          <input id="emergency" className="field-input" placeholder="Name + phone" value={emergency}
            onChange={(e) => setEmergency(e.target.value)} />
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            I understand IronFit Movement Mirror is a coaching tool, not medical advice, and I’m clearing this kind of
            training with my own judgement (and a doctor if needed).
          </span>
        </label>

        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

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
