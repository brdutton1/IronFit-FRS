/**
 * Who may reset another user's password. The owner may reset anyone; a trainer
 * may reset only their own clients (e.g. a locked-out client). Kept as a pure,
 * framework-free predicate so it can be unit-tested and mirrored exactly by the
 * `admin-reset-password` edge function.
 */
export interface ResetContext {
  /** Is the caller the platform owner? */
  callerIsOwner: boolean;
  /** The caller's user id. */
  callerId: string;
  /** The target user's trainer_id (null for trainers/owner targets). */
  targetTrainerId: string | null;
}

export function canResetPassword(c: ResetContext): boolean {
  if (c.callerIsOwner) return true;
  return c.targetTrainerId != null && c.targetTrainerId === c.callerId;
}
