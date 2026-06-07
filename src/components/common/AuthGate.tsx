import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '@/types/profile';
import { useAuth } from '@/lib/session';

/**
 * Guards a route. Redirects to /auth when signed out, enforces an optional role,
 * and an optional owner requirement (super-admin only). While auth state is
 * resolving it shows a lightweight loader.
 */
export default function AuthGate({
  role,
  owner,
  children,
}: {
  role?: Role;
  owner?: boolean;
  children: ReactNode;
}) {
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

  if (owner && profile && !profile.is_owner) {
    // Owner-only route but caller isn't the owner — send them home.
    return <Navigate to={profile.role === 'trainer' ? '/trainer' : '/client'} replace />;
  }

  return <>{children}</>;
}
