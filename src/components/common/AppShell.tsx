import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { signOut } from '@/lib/supabase/auth';
import { useAuth } from '@/lib/session';

interface Tab {
  to: string;
  label: string;
  icon: ReactNode;
}

const TRAINER_TABS: Tab[] = [
  { to: '/trainer', label: 'Clients', icon: <IconUsers /> },
  { to: '/trainer/movements', label: 'Movements', icon: <IconLibrary /> },
  { to: '/trainer/messages', label: 'Messages', icon: <IconChat /> },
];
const CLIENT_TABS: Tab[] = [
  { to: '/client', label: 'Train', icon: <IconLibrary /> },
  { to: '/client/progress', label: 'Progress', icon: <IconChart /> },
  { to: '/client/messages', label: 'Messages', icon: <IconChat /> },
];

export default function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { session, profile } = useAuth();
  const tabs = profile?.role === 'trainer' ? TRAINER_TABS : CLIENT_TABS;
  const home = profile?.role === 'trainer' ? '/trainer' : '/client';

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-sky-500 focus:px-3 focus:py-2 focus:text-slate-950"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to={home} className="font-bold tracking-tight">
            IronFit <span className="text-sky-400">Mirror</span>
          </Link>
          {title && <h1 className="truncate text-sm text-slate-300">{title}</h1>}
          {session && (
            <button type="button" onClick={() => void signOut()} className="text-sm text-slate-400 hover:text-slate-100">
              Sign out
            </button>
          )}
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-28">
        {children}
      </main>

      {session && profile && (
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 backdrop-blur"
        >
          <ul className="mx-auto flex max-w-3xl">
            {tabs.map((t) => (
              <li key={t.to} className="flex-1">
                <NavLink
                  to={t.to}
                  end={t.to === '/trainer' || t.to === '/client'}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 px-2 py-2.5 text-xs ${
                      isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
                    }`
                  }
                >
                  {t.icon}
                  <span>{t.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <footer className="border-t border-slate-800 px-4 pb-24 pt-4 text-center text-xs text-slate-500">
        IronFit Movement Mirror is a coaching tool. It does not diagnose injury or replace in-person
        assessment by a qualified practitioner.
      </footer>
    </div>
  );
}

/* — minimal inline icons (decorative; labels carry the meaning) — */
function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
      <path d="M16 11a3 3 0 1 0-2-5.2" />
      <path d="M21 20c0-2.5-2-4.3-4.5-4.8" />
    </svg>
  );
}
function IconLibrary() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4" width="7" height="7" rx="1" />
      <rect x="14" y="4" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="6" rx="1" />
      <rect x="14" y="14" width="7" height="6" rx="1" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7 16l4-5 3 3 5-7" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.8A8 8 0 1 1 21 12z" />
    </svg>
  );
}
