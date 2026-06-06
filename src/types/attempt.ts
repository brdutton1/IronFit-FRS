import type { Confidence } from './reference';

export interface ClientAttempt {
  id: string;
  client_id: string;
  movement_id: string;
  rom_achieved_pct: number;
  compensation_flags: string[];
  confidence: Confidence | null;
  attempted_at: string;
}

/** Lean local-only record kept in LocalStorage (last 10 per movement). */
export interface LocalAttempt {
  movement_id: string;
  rom_achieved_pct: number;
  attempted_at: string;
}
