/**
 * Body regions a client can tap during intake. Keys align with the movement
 * library's joint groups (see MovementLibrary `JOINT_CHIPS`) so "filter the
 * library by a client's focus" is a trivial follow-up. Single source of truth
 * for both the intake form and the trainer's view.
 */
export interface FocusArea {
  key: string;
  label: string;
}

export const FOCUS_AREAS: FocusArea[] = [
  { key: 'shoulder', label: 'Shoulders' },
  { key: 'elbow', label: 'Elbows & wrists' },
  { key: 'hip', label: 'Hips' },
  { key: 'knee', label: 'Knees' },
  { key: 'ankle', label: 'Ankles & feet' },
  { key: 'spine', label: 'Spine & back' },
  { key: 'cervical', label: 'Neck' },
];

const LABELS: Record<string, string> = Object.fromEntries(FOCUS_AREAS.map((a) => [a.key, a.label]));

/** Map stored focus-area keys to their human labels; unknown keys are dropped. */
export function focusAreaLabels(keys: string[] | null | undefined): string[] {
  return (keys ?? []).map((k) => LABELS[k]).filter(Boolean);
}
