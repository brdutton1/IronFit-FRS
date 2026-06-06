export type Role = 'trainer' | 'client';

export interface Profile {
  user_id: string;
  role: Role;
  display_name: string | null;
  /** The trainer this client belongs to. Null for trainers. */
  trainer_id: string | null;
  created_at: string;
}
