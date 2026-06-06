import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppShell from '@/components/common/AppShell';
import { useAuth } from '@/lib/session';
import { listClients } from '@/lib/supabase/clients';
import { listMyMessages } from '@/lib/supabase/messages';
import { relativeTime } from '@/lib/time';
import type { Profile } from '@/types/profile';
import type { ChatMessage } from '@/types/message';

/** Trainer's conversation list — one row per client, newest activity first. */
export default function MessagesScreen() {
  const { profile } = useAuth();
  const [clients, setClients] = useState<Profile[] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    Promise.all([listClients(profile.user_id), listMyMessages()])
      .then(([c, m]) => {
        setClients(c);
        setMessages(m);
      })
      .catch((e) => setError(e.message));
  }, [profile]);

  const rows = useMemo(() => {
    if (!clients || !profile) return [];
    return clients
      .map((client) => {
        const thread = messages.filter(
          (m) => m.sender_id === client.user_id || m.recipient_id === client.user_id,
        );
        const last = thread[thread.length - 1];
        const unread = thread.filter(
          (m) => m.recipient_id === profile.user_id && m.sender_id === client.user_id && !m.read_at,
        ).length;
        return { client, lastBody: last?.body ?? null, lastAt: last?.created_at ?? null, unread };
      })
      .sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
  }, [clients, messages, profile]);

  return (
    <AppShell title="Messages">
      <h2 className="mb-4 text-xl font-bold">Messages</h2>
      {error && <p role="alert" className="card mb-4 border-red-700 text-red-300">{error}</p>}

      {clients == null ? (
        <p className="text-slate-400">Loading…</p>
      ) : clients.length === 0 ? (
        <p className="card text-slate-400">No clients yet — conversations appear once clients join your roster.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ client, lastBody, lastAt, unread }) => (
            <li key={client.user_id}>
              <Link
                to={`/trainer/messages/${client.user_id}`}
                className="card flex items-center justify-between gap-3 hover:border-sky-700"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{client.display_name ?? 'Client'}</span>
                  <span className="block truncate text-sm text-slate-400">
                    {lastBody ?? 'No messages yet — tap to start'}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {lastAt && <span className="text-xs text-slate-500">{relativeTime(lastAt)}</span>}
                  {unread > 0 && (
                    <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs font-semibold text-slate-950">
                      {unread}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
