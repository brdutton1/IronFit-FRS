/**
 * Tiny dependency-free SVG line chart for joint-angle trajectories. Used by the
 * trainer reference review and the client summary (reference vs client curve).
 */

export interface Series {
  label: string;
  color: string;
  values: number[];
}

export default function TrajectoryPlot({
  series,
  height = 160,
  unit = '°',
  caption,
}: {
  series: Series[];
  height?: number;
  unit?: string;
  caption?: string;
}) {
  const width = 320;
  const pad = 24;
  const all = series.flatMap((s) => s.values);
  if (all.length === 0) return <p className="text-sm text-slate-500">No data to plot.</p>;
  const max = Math.max(...all, 1);
  const min = Math.min(...all, 0);
  const span = max - min || 1;
  const maxLen = Math.max(...series.map((s) => s.values.length), 1);

  const toX = (i: number) => pad + (i / Math.max(1, maxLen - 1)) * (width - 2 * pad);
  const toY = (v: number) => height - pad - ((v - min) / span) * (height - 2 * pad);

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={caption ?? `Line chart of ${series.map((s) => s.label).join(' versus ')}`}
      >
        {/* baseline + max gridlines */}
        <line x1={pad} y1={toY(min)} x2={width - pad} y2={toY(min)} stroke="#334155" strokeWidth="1" />
        <line x1={pad} y1={toY(max)} x2={width - pad} y2={toY(max)} stroke="#1e293b" strokeWidth="1" />
        <text x={pad} y={toY(max) - 4} fill="#64748b" fontSize="9">
          {Math.round(max)}
          {unit}
        </text>
        <text x={pad} y={toY(min) + 12} fill="#64748b" fontSize="9">
          {Math.round(min)}
          {unit}
        </text>
        {series.map((s) =>
          s.values.length > 1 ? (
            <polyline
              key={s.label}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              points={s.values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')}
            />
          ) : null,
        )}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            <span aria-hidden className="inline-block h-2 w-3 rounded" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
