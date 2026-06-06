import { useEffect, useRef, useState, type FormEvent } from 'react';
import { listConversation, markRead, sendMessage, subscribeToMessages } from '@/lib/supabase/messages';
import type { ChatMessage } from '@/types/message';

/** A 1:1 chat thread between the signed-in user (`myId`) and `partnerId`,
 * live via Supabase Realtime. */
export default function ChatThread({
  myId,
  partnerId,
  partnerName,
}: {
  myId: string;
  partnerId: string;
  partnerName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    listConversation(myId, partnerId)
      .then((msgs) => {
        if (!active) return;
        setMessages(msgs);
        void markRead(myId, partnerId);
      })
      .catch((e) => setError(e.message));

    const unsub = subscribeToMessages(myId, (m) => {
      if (m.sender_id === partnerId) {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        void markRead(myId, partnerId);
      }
    });
    return () => {
      active = false;
      unsub();
    };
  }, [myId, partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    try {
      const msg = await sendMessage(partnerId, body);
      setMessages((prev) => [...prev, msg]);
      setText('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2" aria-live="polite">
        {messages.length === 0 ? (
          <p className="card text-sm text-slate-400">
            No messages yet. Say hi to {partnerName}.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === myId;
            return (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? 'self-end bg-sky-600 text-white' : 'self-start bg-slate-800 text-slate-100'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? 'text-sky-200' : 'text-slate-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} className="h-28" />
      </div>

      <form
        onSubmit={onSend}
        className="fixed inset-x-0 bottom-[58px] z-30 mx-auto flex max-w-3xl items-end gap-2 border-t border-slate-800 bg-slate-950/95 p-3 backdrop-blur"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message {partnerName}
        </label>
        <textarea
          id="chat-input"
          rows={1}
          className="field-input max-h-32 flex-1 resize-none"
          placeholder={`Message ${partnerName}…`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void onSend(e as unknown as FormEvent);
            }
          }}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={sending || !text.trim()}>
          Send
        </button>
      </form>

      {error && (
        <p role="alert" className="fixed inset-x-0 bottom-32 z-30 mx-auto max-w-3xl px-4 text-center text-sm text-red-300">
          {error}
        </p>
      )}
    </>
  );
}
