import { useEffect, useState } from 'react';
import AppShell from '@/components/common/AppShell';
import { markOnboarded } from '@/lib/supabase/auth';
import { getClientProfile } from '@/lib/supabase/clients';
import { useAuth } from '@/lib/session';
import type { Profile } from '@/types/profile';

/** First-login welcome for a client, personalized by their trainer. */
export default function ClientWelcome({ onDone }: { onDone: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [trainer, setTrainer] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile?.trainer_id) return;
    getClientProfile(profile.trainer_id)
      .then(setTrainer)
      .catch(() => setTrainer(null));
  }, [profile?.trainer_id]);

  async function start() {
    if (!profile) return;
    setBusy(true);
    await markOnboarded(profile.user_id);
    await refreshProfile();
    onDone();
  }

  const clientFirst = profile?.display_name?.includes('@')
    ? profile.display_name.split('@')[0]
    : profile?.display_name ?? 'there';
  const trainerName = trainer?.display_name?.includes('@')
    ? trainer.display_name.split('@')[0]
    : trainer?.display_name ?? 'your trainer';

  return (
    <AppShell title="Welcome">
      <div className="flex flex-col gap-5">
        <header>
          <h2 className="text-2xl font-bold">Welcome, {clientFirst} 👋</h2>
          <p className="mt-1 text-slate-400">{trainerName} set this up for you. Here’s how it works.</p>
        </header>

        {trainer?.welcome_message && (
          <section className="card border-sky-800 bg-sky-950/30">
            <h3 className="mb-1 text-sm font-semibold text-sky-300">A note from {trainerName}</h3>
            <p className="whitespace-pre-line text-sm text-slate-200">{trainer.welcome_message}</p>
          </section>
        )}

        <section className="card">
          <h3 className="mb-3 font-semibold">Three tabs</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><span className="font-semibold text-sky-300">Train</span> — pick a movement and rehearse it in front of your camera. You’ll see your range against the reference in real time.</li>
            <li><span className="font-semibold text-sky-300">Progress</span> — watch your range improve and see which faults keep showing up.</li>
            <li><span className="font-semibold text-sky-300">Messages</span> — reach {trainerName} any time.</li>
          </ul>
        </section>

        <section className="card">
          <h3 className="mb-2 font-semibold">What gets the most out of it</h3>
          <p className="text-sm text-slate-300">
            Rehearse between sessions — short and often beats long and rare. The feedback is a mirror, not a diagnosis:
            it shows what your body did so you and {trainerName} can work on it together. {trainerName} may pin a few
            movements as <span className="font-semibold">Your focus</span> at the top of your library.
          </p>
        </section>

        {(trainer?.phone || trainer?.bio) && (
          <section className="card">
            <h3 className="mb-2 font-semibold">Reaching {trainerName}</h3>
            {trainer?.bio && <p className="mb-1 text-sm text-slate-300">{trainer.bio}</p>}
            {trainer?.phone && <p className="text-sm text-slate-300">Phone: {trainer.phone}</p>}
            <p className="mt-1 text-sm text-slate-400">Or just use the Messages tab.</p>
          </section>
        )}

        <p className="text-xs text-slate-500">
          Your camera video never leaves your device — only your movement scores are shared with {trainerName}.
          Billing is handled by {trainerName} directly.
        </p>

        <button type="button" className="btn-primary" disabled={busy} onClick={() => void start()}>
          {busy ? 'One sec…' : 'Start training'}
        </button>
      </div>
    </AppShell>
  );
}
