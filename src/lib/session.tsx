import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/profile';
import { getProfile, onAuthChange } from './supabase/auth';
import { isSupabaseConfigured, supabase } from './supabase/client';

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  configured: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function loadProfile(s: Session | null) {
    if (!s) {
      setProfile(null);
      return;
    }
    setProfile(await getProfile(s.user.id));
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    return onAuthChange(async (s) => {
      setSession(s);
      await loadProfile(s);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      profile,
      configured: isSupabaseConfigured,
      refreshProfile: () => loadProfile(session),
    }),
    [loading, session, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
