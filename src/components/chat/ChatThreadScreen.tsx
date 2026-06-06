import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import ChatThread from './ChatThread';
import { useAuth } from '@/lib/session';
import { getClientProfile } from '@/lib/supabase/clients';

/** Trainer's thread with one client (/trainer/messages/:partnerId). */
export default function ChatThreadScreen() {
  const { partnerId } = useParams();
  const { profile } = useAuth();
  const [partnerName, setPartnerName] = useState<string | null>(null);

  useEffect(() => {
    if (!partnerId) return;
    getClientProfile(partnerId)
      .then((p) => setPartnerName(p?.display_name ?? 'Client'))
      .catch(() => setPartnerName('Client'));
  }, [partnerId]);

  if (!profile || !partnerId) return null;

  return (
    <AppShell title={partnerName ?? 'Message'}>
      <div className="mb-3">
        <Link to="/trainer/messages" className="text-sm text-sky-400 hover:text-sky-300">
          ← All messages
        </Link>
      </div>
      <ChatThread myId={profile.user_id} partnerId={partnerId} partnerName={partnerName ?? 'your client'} />
    </AppShell>
  );
}
