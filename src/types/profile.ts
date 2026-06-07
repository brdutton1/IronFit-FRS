export type Role = 'trainer' | 'client';

export interface Profile {
  user_id: string;
  role: Role;
  display_name: string | null;
  /** The trainer this client belongs to. Null for trainers. */
  trainer_id: string | null;
  /** Shareable code in a trainer's intake link (e.g. "LEAH-421B"). Null for clients. */
  invite_code: string | null;
  /** Trainer contact + personalization (null for clients / when unset). */
  phone: string | null;
  bio: string | null;
  /** A trainer's personal note shown to their clients on first login. */
  welcome_message: string | null;
  avatar_url: string | null;
  /** Set the first time the user dismisses their welcome screen. */
  onboarded_at: string | null;
  created_at: string;
}

/** Background captured by a client's intake form. */
export interface ClientIntake {
  client_id: string;
  trainer_id: string | null;
  phone: string | null;
  goals: string | null;
  injuries: string | null;
  experience: string | null;
  emergency_contact: string | null;
  /** Body regions the client tapped (keys from FOCUS_AREAS). */
  focus_areas: string[] | null;
  /** Optional "anything a doctor told you to avoid?" note. */
  avoid_notes: string | null;
  consent_at: string | null;
  created_at: string;
}
