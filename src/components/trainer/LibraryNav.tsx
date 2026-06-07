import { NavLink } from 'react-router-dom';

const LINKS = [
  { to: '/trainer/movements', label: 'Movements' },
  { to: '/trainer/videos', label: 'Videos' },
  { to: '/trainer/stretches', label: 'Stretches' },
];

/** Cross-navigation between the trainer's content libraries (keeps the bottom
 * nav uncluttered while making each library easy to reach from the others). */
export default function LibraryNav() {
  return (
    <nav aria-label="Content libraries" className="mb-4 flex gap-2">
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end
          className={({ isActive }) =>
            `chip border ${isActive ? 'border-sky-500 bg-sky-500/20 text-sky-200' : 'border-slate-700 text-slate-300 hover:text-slate-100'}`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
