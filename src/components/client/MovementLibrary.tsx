import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { JointName, Movement, MovementType } from '@/types/movement';
import { ReferenceThumbnail } from './ReferenceThumbnail';

const JOINT_CHIPS: { label: string; joints: JointName[] }[] = [
  { label: 'Shoulder', joints: ['shoulder'] },
  { label: 'Elbow', joints: ['elbow', 'wrist'] },
  { label: 'Hip', joints: ['hip'] },
  { label: 'Knee', joints: ['knee'] },
  { label: 'Ankle', joints: ['ankle'] },
  { label: 'Spine', joints: ['thoracic', 'lumbar'] },
  { label: 'Cervical', joints: ['cervical'] },
];

const TYPE_CHIPS: { label: string; value: MovementType }[] = [
  { label: 'CAR', value: 'car' },
  { label: 'PAILs', value: 'pails' },
  { label: 'RAILs', value: 'rails' },
  { label: 'Flow', value: 'flow' },
];

export default function MovementLibrary({ movements }: { movements: Movement[] }) {
  const [jointFilter, setJointFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<MovementType | null>(null);

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const jointOk =
        !jointFilter || JOINT_CHIPS.find((c) => c.label === jointFilter)?.joints.includes(m.primary_joint);
      const typeOk = !typeFilter || m.movement_type === typeFilter;
      return jointOk && typeOk;
    });
  }, [movements, jointFilter, typeFilter]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter by joint">
        {JOINT_CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            aria-pressed={jointFilter === c.label}
            onClick={() => setJointFilter(jointFilter === c.label ? null : c.label)}
            className={`chip border ${jointFilter === c.label ? 'border-sky-500 bg-sky-500/20 text-sky-200' : 'border-slate-700 text-slate-300'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
        {TYPE_CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={typeFilter === c.value}
            onClick={() => setTypeFilter(typeFilter === c.value ? null : c.value)}
            className={`chip border ${typeFilter === c.value ? 'border-violet-500 bg-violet-500/20 text-violet-200' : 'border-slate-700 text-slate-300'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="card text-slate-400">No movements match these filters yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((m) => (
            <li key={m.id}>
              <Link to={`/client/movements/${m.id}`} className="group block overflow-hidden rounded-2xl border border-slate-800 hover:border-sky-700">
                <ReferenceThumbnail movement={m} />
                <span className="block p-3">
                  <span className="block truncate text-sm font-semibold">{m.name}</span>
                  <span className="block text-xs text-slate-400">{m.movement_type.toUpperCase()} · {m.side}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
