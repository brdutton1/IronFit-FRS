/** Tiny inline ROM sparkline (0–100%). Pairs with a text value so it's never
 * the only signal (WCAG 1.4.1). */
export default function Sparkline({
  values,
  width = 96,
  height = 28,
  color = '#38bdf8',
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (values.length === 0) return null;
  if (values.length === 1) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <circle cx={width / 2} cy={height / 2} r="3" fill={color} />
      </svg>
    );
  }
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const pad = 3;
  const toX = (i: number) => pad + (i / (values.length - 1)) * (width - 2 * pad);
  const toY = (v: number) => height - pad - ((v - min) / span) * (height - 2 * pad);
  const points = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  return (
    <svg width={width} height={height} role="img" aria-label={`Trend: ${values.map((v) => Math.round(v)).join(', ')} percent`}>
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      <circle cx={toX(values.length - 1)} cy={toY(values[values.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}
