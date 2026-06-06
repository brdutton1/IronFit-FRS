import type { JointColor } from '@/lib/compare/liveCompare';
import { angleLabel } from '@/lib/movementOptions';
import { JOINT_COLOR_HEX } from './colors';

/**
 * One row in the live side panel. Color is ALWAYS paired with a text label so
 * color is never the only indicator (WCAG 2.1 AA, 1.4.1).
 */
export default function JointHighlight({
  jointKey,
  color,
  statusText,
  detail,
}: {
  jointKey: string;
  color: JointColor;
  statusText: string;
  detail?: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-slate-900/70 px-3 py-2">
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full ring-2 ring-slate-950"
        style={{ backgroundColor: JOINT_COLOR_HEX[color] }}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-100">{angleLabel(jointKey)}</span>
        <span className="block text-xs text-slate-400">
          {statusText}
          {detail ? ` · ${detail}` : ''}
        </span>
      </span>
    </li>
  );
}
