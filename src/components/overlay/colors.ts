import type { JointColor } from '@/lib/compare/liveCompare';

/** Hex values mirror tailwind.config `joint.*`. AA-contrast on dark bg. */
export const JOINT_COLOR_HEX: Record<JointColor, string> = {
  green: '#16a34a',
  yellow: '#ca8a04',
  red: '#dc2626',
  blue: '#2563eb',
  gray: '#6b7280',
};

/** Text label so color is never the only signal (WCAG 1.4.1). */
export function targetColorLabel(color: JointColor): string {
  switch (color) {
    case 'green':
      return 'moving correctly';
    case 'yellow':
      return 'partial range';
    case 'red':
      return 'not reaching / wrong way';
    case 'gray':
      return 'not assessed (low confidence)';
    default:
      return '';
  }
}

export function stillnessColorLabel(color: JointColor): string {
  switch (color) {
    case 'blue':
      return 'held still';
    case 'yellow':
      return 'drifting';
    case 'red':
      return 'compensating';
    case 'gray':
      return 'not assessed (low confidence)';
    default:
      return '';
  }
}
