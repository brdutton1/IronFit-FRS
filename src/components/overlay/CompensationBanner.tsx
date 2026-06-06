import type { ActiveCompensation } from '@/lib/compare/compensationDetect';

/**
 * Live alert banner for compensation patterns. Uses role="alert" + aria-live so
 * screen readers announce it; pairs the pattern label with Lee's cue text.
 */
export default function CompensationBanner({ active }: { active: ActiveCompensation[] }) {
  if (active.length === 0) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="pointer-events-none absolute inset-x-0 top-3 z-20 mx-auto flex max-w-md flex-col gap-2 px-3"
    >
      {active.map((a) => (
        <div
          key={a.pattern.tag}
          className="rounded-xl border border-red-500 bg-red-950/90 px-4 py-2 text-center shadow-lg backdrop-blur"
        >
          <p className="font-semibold text-red-100">{a.pattern.label}</p>
          {a.pattern.cue && <p className="text-sm text-red-200">{a.pattern.cue}</p>}
        </div>
      ))}
    </div>
  );
}
