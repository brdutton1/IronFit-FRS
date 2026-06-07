import { useState, type FormEvent } from 'react';
import PasswordInput from './PasswordInput';
import { changePassword } from '@/lib/supabase/auth';

/** Self-service "change my password" card used in trainer and client settings. */
export default function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (next.length < 6) return setError('New password must be at least 6 characters.');
    if (next !== confirm) return setError('New passwords don’t match.');

    setBusy(true);
    const { error } = await changePassword(current, next);
    setBusy(false);
    if (error) return setError(error);
    setSaved(true);
    setCurrent('');
    setNext('');
    setConfirm('');
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-4">
      <h3 className="font-semibold">Change password</h3>
      <div>
        <label htmlFor="cur-pw" className="field-label">Current password</label>
        <PasswordInput id="cur-pw" autoComplete="current-password" required value={current}
          onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <label htmlFor="new-pw" className="field-label">New password</label>
        <PasswordInput id="new-pw" autoComplete="new-password" required minLength={6}
          placeholder="At least 6 characters" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div>
        <label htmlFor="confirm-pw" className="field-label">Confirm new password</label>
        <PasswordInput id="confirm-pw" autoComplete="new-password" required minLength={6}
          value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {saved && <p role="status" className="text-sm text-emerald-300">Password updated.</p>}

      <button type="submit" className="btn-primary self-start" disabled={busy}>
        {busy ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
