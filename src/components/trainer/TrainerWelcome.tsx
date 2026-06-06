import { useState } from 'react';
import AppShell from '@/components/common/AppShell';
import InviteLink from '@/components/common/InviteLink';
import { markOnboarded } from '@/lib/supabase/auth';
import { useAuth } from '@/lib/session';

/** First-login walkthrough for a trainer. Shown until dismissed. */
export default function TrainerWelcome({ onDone }: { onDone: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (!profile) return;
    setBusy(true);
    await markOnboarded(profile.user_id);
    await refreshProfile();
    onDone();
  }

  const first = profile?.display_name?.includes('@')
    ? profile.display_name.split('@')[0]
    : profile?.display_name ?? 'Coach';

  return (
    <AppShell title="Welcome">
      <div className="flex flex-col gap-5">
        <header>
          <h2 className="text-2xl font-bold">Welcome, {first} 👋</h2>
          <p className="mt-1 text-slate-400">
            IronFit Mirror is a movement-coaching mirror with a memory. Here’s how to get going.
          </p>
        </header>

        <section className="card">
          <h3 className="mb-3 font-semibold">Build a movement in three steps</h3>
          <ol className="space-y-2 text-sm text-slate-300">
            <li><span className="font-semibold text-sky-300">1. Add</span> — create a movement (CAR, PAILs, RAILs, flow) with its target joints and cues.</li>
            <li><span className="font-semibold text-sky-300">2. Upload</span> — record a clean reference rep; the app extracts the model range to compare against.</li>
            <li><span className="font-semibold text-sky-300">3. Publish</span> — set it live and it appears in your clients’ library.</li>
          </ol>
        </section>

        <section className="card">
          <h3 className="mb-2 font-semibold">Your Clients dashboard does the watching</h3>
          <p className="text-sm text-slate-300">
            As clients rehearse, their range and movement faults roll up here. It surfaces four things worth your
            attention: a <span className="text-amber-200">recurring compensation</span>, <span className="text-amber-200">range that’s stalled or
            declining</span>, someone who’s <span className="text-amber-200">gone quiet</span>, and a <span className="text-amber-200">camera setup</span> that’s
            hurting their feedback. Needs-attention clients sort to the top.
          </p>
        </section>

        <section className="card">
          <h3 className="mb-2 font-semibold">Add your clients with your intake link</h3>
          <p className="mb-3 text-sm text-slate-300">
            Share this link. Whoever fills out the short intake form joins <span className="font-semibold">your</span> roster automatically —
            and you’ll have their goals and history before the first session.
          </p>
          <InviteLink code={profile?.invite_code ?? null} />
        </section>

        <button type="button" className="btn-primary" disabled={busy} onClick={() => void start()}>
          {busy ? 'One sec…' : 'Got it — go to my dashboard'}
        </button>
      </div>
    </AppShell>
  );
}
