import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '@/types/profile';
import { useAuth } from '@/lib/session';

/**
 * Guards a route. Redirects to /auth when signed out, and enforces an optional
 * role. While auth state is resolving it shows a lightweight loader.
 */
export default function AuthGate({ role, children }: { role?: Role; children: ReactNode }) {
  const { loading, session, profile } = useAuth();

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex min-h-full items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;

  if (role && profile && profile.role !== role) {
    // Signed in but wrong role for this route — send them to their home.
    return <Navigate to={profile.role === 'trainer' ? '/trainer' : '/client'} replace />;
  }

  return <>{children}</>;
}
