import { useState, type FormEvent } from 'react';
import PasswordInput from '@/components/common/PasswordInput';
import { signInWithPassword, signUpWithPassword } from '@/lib/supabase/auth';
import { useAuth } from '@/lib/session';

/**
 * Email + password sign-in / sign-up. No email is sent at login, so none of the
 * email-delivery failure modes (scanners, rate limits, sandbox restrictions)
 * can block access. On success the auth listener swaps this screen for the app.
 */
export default function MagicLinkForm() {
  const { configured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    if (mode === 'signup') {
      const { error, needsConfirm } = await signUpWithPassword(email, password);
      if (error) {
        setError(error);
      } else if (needsConfirm) {
        setNotice('Account created. Check your email to confirm, then sign in.');
        setMode('signin');
      }
      // Otherwise a session is set and the auth listener routes into the app.
    } else {
      const { error } = await signInWithPassword(email, password);
      if (error) setError(error);
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">IronFit Movement Mirror</h1>
        <p className="mt-2 text-slate-400">
          {mode === 'signin' ? 'Sign in to your account.' : 'Create your account.'}
        </p>
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

      <form onSubmit={onSubmit} className="card flex flex-col gap-4">
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
        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <PasswordInput
            id="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={busy || !configured}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400">
        {mode === 'signin' ? "Don’t have an account yet?" : 'Already have an account?'}{' '}
        <button
          type="button"
          className="font-semibold text-sky-400 hover:text-sky-300"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setNotice(null);
          }}
        >
          {mode === 'signin' ? 'Create one' : 'Sign in'}
        </button>
      </p>

      <p className="text-center text-xs text-slate-500">
        IronFit Movement Mirror is a coaching tool. It does not diagnose injury or replace in-person
        assessment by a qualified practitioner.
      </p>
    </main>
  );
}
