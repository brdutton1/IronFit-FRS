import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { signOut } from '@/lib/supabase/auth';
import { useAuth } from '@/lib/session';

export default function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { session, profile } = useAuth();
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

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        {children}
      </main>

      <footer className="border-t border-slate-800 px-4 py-4 text-center text-xs text-slate-500">
        IronFit Movement Mirror is a coaching tool. It does not diagnose injury or replace in-person
        assessment by a qualified practitioner.
      </footer>
    </div>
  );
}
