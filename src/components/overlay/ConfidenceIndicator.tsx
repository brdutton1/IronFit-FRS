import type { Confidence } from '@/types/reference';

/**
 * Small honest badge for a joint's measurement confidence. Low confidence shows
 * a "?" because the app skips evaluation rather than fake a reading.
 */
export default function ConfidenceIndicator({
  confidence,
  rotationLimited,
}: {
  confidence: Confidence;
  rotationLimited?: boolean;
}) {
  const styles: Record<Confidence, string> = {
    high: 'border-emerald-700 text-emerald-300',
    reduced: 'border-amber-700 text-amber-300',
    low: 'border-slate-600 text-slate-400',
  };
  const label: Record<Confidence, string> = {
    high: 'High confidence',
    reduced: 'Reduced confidence',
    low: 'Low confidence — not assessed',
  };

  return (
    <span className={`chip border ${styles[confidence]} text-xs`}>
      {confidence === 'low' ? '? ' : ''}
      {label[confidence]}
      {rotationLimited && <span className="ml-1 text-slate-400">· rotation approx</span>}
    </span>
  );
}
