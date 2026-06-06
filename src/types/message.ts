import type { Confidence } from './reference';

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

/** A conversation summary for the trainer's message list. */
export interface Conversation {
  /** The other participant (a client for a trainer, the trainer for a client). */
  partnerId: string;
  partnerName: string;
  lastBody: string | null;
  lastAt: string | null;
  unread: number;
}

export type { Confidence };
