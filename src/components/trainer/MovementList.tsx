import { Link } from 'react-router-dom';
import type { Movement } from '@/types/movement';
import type { Confidence } from '@/types/reference';
import { JOINTS } from '@/lib/movementOptions';

function jointLabel(value: string): string {
  return JOINTS.find((j) => j.value === value)?.label ?? value;
}

const statusStyle: Record<Movement['status'], string> = {
  draft: 'border-slate-600 text-slate-300',
  live: 'border-emerald-700 text-emerald-300',
  archived: 'border-slate-700 text-slate-500',
};

const qualityStyle: Record<Confidence, string> = {
  high: 'text-emerald-400',
  reduced: 'text-amber-400',
  low: 'text-red-400',
};

export default function MovementList({ movements }: { movements: Movement[] }) {
  if (movements.length === 0) {
    return (
      <p className="card text-slate-400">
        No movements yet. Tap <strong>Add movement</strong> to record your first reference.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {movements.map((m) => (
        <li key={m.id}>
          <Link
            to={`/trainer/movements/${m.id}`}
            className="card flex items-center justify-between gap-3 hover:border-sky-700"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold">{m.name}</span>
              <span className="block text-sm text-slate-400">
                {jointLabel(m.primary_joint)} · {m.movement_type.toUpperCase()} · {m.side}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
              <span className={`chip border ${statusStyle[m.status]}`}>{m.status}</span>
              {m.reference_quality ? (
                <span className={qualityStyle[m.reference_quality]}>
                  reference: {m.reference_quality}
                </span>
              ) : (
                <span className="text-slate-500">no reference</span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
