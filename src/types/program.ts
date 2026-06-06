/** A movement a trainer has pinned as "Your focus" for a specific client. */
export interface ProgramAssignment {
  id: string;
  trainer_id: string;
  client_id: string;
  movement_id: string;
  note: string | null;
  sort_order: number;
  created_at: string;
}
