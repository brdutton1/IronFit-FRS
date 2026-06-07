export type Severity = 'mild' | 'moderate' | 'strong';

/** A client's report of where they're sore, visible to their trainer. */
export interface SorenessReport {
  id: string;
  client_id: string;
  trainer_id: string | null;
  /** FOCUS_AREAS keys the client reported sore. */
  regions: string[];
  severity: Severity | null;
  note: string | null;
  created_at: string;
}
