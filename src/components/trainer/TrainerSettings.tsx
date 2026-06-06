import { useEffect, useState, type FormEvent } from 'react';
import AppShell from '@/components/common/AppShell';
import InviteLink from '@/components/common/InviteLink';
import { updateOwnProfile } from '@/lib/supabase/auth';
import { useAuth } from '@/lib/session';

/** Trainer profile: contact info, the client-facing welcome note, and the
 * shareable intake link that recruits clients onto this trainer's roster. */
export default function TrainerSettings() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [welcome, setWelcome] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? '');
    setPhone(profile.phone ?? '');
    setBio(profile.bio ?? '');
    setWelcome(profile.welcome_message ?? '');
  }, [profile]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    const { error } = await updateOwnProfile(profile.user_id, {
      display_name: displayName.trim() || null,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
      welcome_message: welcome.trim() || null,
    });
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
        <h2 className="text-xl font-bold">Your profile</h2>
        <p className="text-sm text-slate-400">What your clients see, and how they reach you.</p>
      </header>

      <section className="card mb-5">
        <h3 className="mb-2 font-semibold">Your intake link</h3>
        <p className="mb-3 text-sm text-slate-300">
          Share this with a new client. They fill out a short intake and join your roster automatically.
        </p>
        <InviteLink code={profile?.invite_code ?? null} />
      </section>

      <form onSubmit={onSubmit} className="card flex flex-col gap-4">
        <div>
          <label htmlFor="displayName" className="field-label">Display name</label>
          <input id="displayName" className="field-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="phone" className="field-label">Phone <span className="text-slate-500">(shown to your clients)</span></label>
          <input id="phone" type="tel" inputMode="tel" className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bio" className="field-label">Short bio <span className="text-slate-500">(optional)</span></label>
          <textarea id="bio" rows={3} className="field-input" value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <label htmlFor="welcome" className="field-label">Welcome note for new clients</label>
          <textarea id="welcome" rows={4} className="field-input"
            placeholder="Shown on each new client's first login. e.g. Glad to have you — rehearse a little each day and message me any time."
            value={welcome} onChange={(e) => setWelcome(e.target.value)} />
        </div>

        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {saved && <p role="status" className="text-sm text-emerald-300">Saved.</p>}

        <button type="submit" className="btn-primary self-start" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </form>
    </AppShell>
  );
}
