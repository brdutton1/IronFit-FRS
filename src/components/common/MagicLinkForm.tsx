import { useState, type FormEvent } from 'react';
import { sendLoginCode, verifyLoginCode } from '@/lib/supabase/auth';
import { useAuth } from '@/lib/session';

/**
 * Passwordless sign-in via a 6-digit emailed CODE (not a magic link). Codes
 * can't be pre-consumed by email security scanners and work on whatever device
 * you type them into — no redirect, no cross-device gotchas.
 */
export default function MagicLinkForm() {
  const { configured } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSendEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error } = await sendLoginCode(email.trim());
    setBusy(false);
    if (error) {
      setError(error);
    } else {
      setStep('code');
      setNotice(`We sent a 6-digit code to ${email.trim()}. Enter it below.`);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await verifyLoginCode(email.trim(), code);
    // On success the auth listener swaps this screen for the app automatically.
    if (error) {
      setError(error);
      setBusy(false);
    }
  }

  async function onResend() {
    setBusy(true);
    setError(null);
    const { error } = await sendLoginCode(email.trim());
    setBusy(false);
    setNotice(error ? null : 'New code sent.');
    if (error) setError(error);
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">IronFit Movement Mirror</h1>
        <p className="mt-2 text-slate-400">Sign in with a one-time code — no password needed.</p>
      </header>

      {!configured && (
        <div role="alert" className="card border-amber-700 bg-amber-950/40 text-amber-200">
          Supabase isn’t configured yet. Add your project URL and anon key, then reload.
        </div>
      )}

      {notice && (
        <div role="status" className="card border-emerald-700 bg-emerald-950/40 text-emerald-200">
          {notice}
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={onSendEmail} className="card flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="field-label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              className="field-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={busy || !configured}>
            {busy ? 'Sending…' : 'Email me a code'}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerify} className="card flex flex-col gap-4">
          <div>
            <label htmlFor="code" className="field-label">
              6-digit code
            </label>
            <input
              id="code"
              type="text"
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="field-input text-center text-2xl tracking-[0.5em]"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={busy || code.length < 6}>
            {busy ? 'Verifying…' : 'Verify & sign in'}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              className="text-slate-400 hover:text-slate-100"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
                setNotice(null);
              }}
            >
              ← Change email
            </button>
            <button type="button" className="text-sky-400 hover:text-sky-300" onClick={() => void onResend()} disabled={busy}>
              Resend code
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-xs text-slate-500">
        IronFit Movement Mirror is a coaching tool. It does not diagnose injury or replace in-person
        assessment by a qualified practitioner.
      </p>
    </main>
  );
}
