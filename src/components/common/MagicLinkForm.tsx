import { useState, type FormEvent } from 'react';
import { sendMagicLink } from '@/lib/supabase/auth';
import { useAuth } from '@/lib/session';

export default function MagicLinkForm() {
  const { configured } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    const { error } = await sendMagicLink(email.trim());
    if (error) {
      setError(error);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">IronFit Movement Mirror</h1>
        <p className="mt-2 text-slate-400">Sign in with a magic link — no password needed.</p>
      </header>

      {!configured && (
        <div role="alert" className="card border-amber-700 bg-amber-950/40 text-amber-200">
          Supabase isn’t configured yet. Copy <code>.env.example</code> to <code>.env</code> and add your
          project URL and anon key, then restart the dev server.
        </div>
      )}

      {status === 'sent' ? (
        <div role="status" className="card border-emerald-700 bg-emerald-950/40 text-emerald-200">
          Check <strong>{email}</strong> for your sign-in link. You can close this tab.
        </div>
      ) : (
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
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary" disabled={status === 'sending' || !configured}>
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}

      <p className="text-center text-xs text-slate-500">
        IronFit Movement Mirror is a coaching tool. It does not diagnose injury or replace in-person
        assessment by a qualified practitioner.
      </p>
    </main>
  );
}
