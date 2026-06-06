import { ROM_PCT_DISPLAY_CAP } from '@/lib/compare/thresholds';

/**
 * Arc meter for the primary joint: how much of the reference range the client
 * has reached. Text percentage is shown alongside the arc (not color-only).
 */
export default function RomMeter({
  pct,
  referencePeakDeg,
  label,
}: {
  pct: number;
  referencePeakDeg?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(ROM_PCT_DISPLAY_CAP, pct));
  const sweep = Math.min(100, clamped); // arc fills to 100% then holds
  const radius = 52;
  const circumference = Math.PI * radius; // semicircle
  const dash = (sweep / 100) * circumference;
  const color = clamped >= 85 ? '#16a34a' : clamped >= 70 ? '#ca8a04' : '#dc2626';

  return (
    <figure
      className="flex flex-col items-center"
      role="meter"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Range of motion ${Math.round(clamped)} percent of reference`}
    >
      <svg width="140" height="84" viewBox="0 0 140 84" aria-hidden="true">
        <path d="M 18 74 A 52 52 0 0 1 122 74" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
        <path
          d="M 18 74 A 52 52 0 0 1 122 74"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <figcaption className="-mt-6 text-center">
        <span className="block text-2xl font-bold tabular-nums">{Math.round(clamped)}%</span>
        <span className="block text-xs text-slate-400">
          {label ?? 'of reference range'}
          {referencePeakDeg != null && ` · ref peak ${Math.round(referencePeakDeg)}°`}
        </span>
      </figcaption>
    </figure>
  );
}
