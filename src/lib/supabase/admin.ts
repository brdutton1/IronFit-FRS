import type { Role } from '@/types/profile';
import { supabase } from './client';

/** A row of the owner's master user list (joins auth.users for email). */
export interface AdminUser {
  user_id: string;
  email: string;
  role: Role;
  display_name: string | null;
  trainer_id: string | null;
  is_owner: boolean;
  created_at: string;
}

/** Owner-only: every user with their email, role, and owner flag. */
export async function listUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminUser[];
}

/** Owner-only: promote/demote a user between trainer and client. */
export async function setRole(userId: string, role: Role): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ role }).eq('user_id', userId);
  return { error: error?.message ?? null };
}

/** Owner-only: grant or revoke the platform-owner flag. */
export async function setOwner(userId: string, value: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ is_owner: value }).eq('user_id', userId);
  return { error: error?.message ?? null };
}

/** Owner-only: move a client to another trainer. */
export async function transferClient(clientId: string, trainerId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ trainer_id: trainerId }).eq('user_id', clientId);
  return { error: error?.message ?? null };
}

/**
 * Reset another user's password via the guarded edge function (service-role).
 * Owner may reset anyone; a trainer may reset only their own clients.
 */
export async function resetPassword(userId: string, newPassword: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('admin-reset-password', {
    body: { user_id: userId, new_password: newPassword },
  });
  if (error) {
    // Edge function returns a JSON error body on non-2xx; surface it if present.
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      try {
        const j = await ctx.json();
        if (j?.error) return { error: j.error as string };
      } catch {
        /* fall through */
      }
    }
    return { error: error.message };
  }
  if (data?.error) return { error: data.error as string };
  return { error: null };
}
