import type { ChatMessage } from '@/types/message';
import { supabase } from './client';

const TABLE = 'messages';

/** Every message the signed-in user has sent or received (RLS-scoped). */
export async function listMyMessages(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ChatMessage[];
}

/** The thread between the signed-in user and one partner, oldest → newest. */
export async function listConversation(myId: string, partnerId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .or(
      `and(sender_id.eq.${myId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${myId})`,
    )
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ChatMessage[];
}

export async function sendMessage(recipientId: string, body: string): Promise<ChatMessage> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ sender_id: user.id, recipient_id: recipientId, body: body.trim() })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as ChatMessage;
}

/** Mark messages received from `partnerId` as read. */
export async function markRead(myId: string, partnerId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', myId)
    .eq('sender_id', partnerId)
    .is('read_at', null);
  if (error) throw new Error(error.message);
}

/**
 * Live-subscribe to new messages addressed to `myId`. Returns an unsubscribe fn.
 * Realtime is enabled on the messages table (publication supabase_realtime).
 */
export function subscribeToMessages(myId: string, onInsert: (m: ChatMessage) => void): () => void {
  const channel = supabase
    .channel(`messages:${myId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLE, filter: `recipient_id=eq.${myId}` },
      (payload) => onInsert(payload.new as ChatMessage),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
