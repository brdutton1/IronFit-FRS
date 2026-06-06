import { useEffect, useState } from 'react';
import AppShell from '@/components/common/AppShell';
import ChatThread from './ChatThread';
import { useAuth } from '@/lib/session';
import { getClientProfile } from '@/lib/supabase/clients';

/** Client's single thread — with their trainer (/client/messages). */
export default function ClientChatScreen() {
  const { profile } = useAuth();
  const [trainerName, setTrainerName] = useState<string | null>(null);
  const trainerId = profile?.trainer_id ?? null;

  useEffect(() => {
    if (!trainerId) return;
    getClientProfile(trainerId)
      .then((p) => setTrainerName(p?.display_name ?? 'your trainer'))
      .catch(() => setTrainerName('your trainer'));
  }, [trainerId]);

  if (!profile) return null;

  if (!trainerId) {
    return (
      <AppShell title="Messages">
        <p className="card text-slate-400">
          You’re not linked to a trainer yet, so there’s no one to message. Once your trainer is set up, your
          conversation will appear here.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title={trainerName ?? 'Your trainer'}>
      <ChatThread myId={profile.user_id} partnerId={trainerId} partnerName={trainerName ?? 'your trainer'} />
    </AppShell>
  );
}
