import { useEffect, useState, type FormEvent } from 'react';
import AppShell from '@/components/common/AppShell';
import ChangePasswordCard from '@/components/common/ChangePasswordCard';
import { updateOwnProfile } from '@/lib/supabase/auth';
import { useAuth } from '@/lib/session';

/** Client settings: their display name and a self-service password change. */
export default function ClientSettings() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name ?? '');
  }, [profile]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    const { error } = await updateOwnProfile(profile.user_id, { display_name: displayName.trim() || null });
    if (error) setError(error);
    else {
      await refreshProfile();
      setSaved(true);
    }
    setBusy(false);
  }

  return (
    <AppShell title="Settings">
      <header className="mb-5">
        <h2 className="text-xl font-bold">Your settings</h2>
        <p className="text-sm text-slate-400">Update your name and password.</p>
      </header>

      <form onSubmit={onSubmit} className="card mb-5 flex flex-col gap-4">
        <div>
          <label htmlFor="displayName" className="field-label">Display name</label>
          <input id="displayName" className="field-input" value={displayName}
            onChange={(e) => setDisplayName(e.target.value)} />
        </div>

        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {saved && <p role="status" className="text-sm text-emerald-300">Saved.</p>}

        <button type="submit" className="btn-primary self-start" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </form>

      <ChangePasswordCard />
    </AppShell>
  );
}
