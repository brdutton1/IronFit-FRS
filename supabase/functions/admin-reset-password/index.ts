// Owner / trainer password reset. Setting another user's password requires the
// service-role key, which must never reach the browser — so this guarded edge
// function does it. Authorization mirrors src/lib/adminAuth.ts `canResetPassword`:
// the owner may reset anyone; a trainer may reset only their own clients.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'server not configured' }, 500);

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) return json({ error: 'missing authorization' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Identify the caller from their JWT.
  const { data: caller, error: callerErr } = await admin.auth.getUser(jwt);
  if (callerErr || !caller.user) return json({ error: 'invalid session' }, 401);

  let body: { user_id?: string; new_password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }
  const { user_id, new_password } = body;
  if (!user_id || !new_password) return json({ error: 'user_id and new_password are required' }, 400);
  if (new_password.length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400);

  // Load caller's owner flag and the target's trainer, then apply the same
  // predicate as the app's adminAuth.canResetPassword.
  const [{ data: callerProfile }, { data: target }] = await Promise.all([
    admin.from('profiles').select('is_owner').eq('user_id', caller.user.id).single(),
    admin.from('profiles').select('trainer_id').eq('user_id', user_id).single(),
  ]);
  if (!target) return json({ error: 'user not found' }, 404);

  const callerIsOwner = !!callerProfile?.is_owner;
  const allowed = callerIsOwner || (target.trainer_id != null && target.trainer_id === caller.user.id);
  if (!allowed) return json({ error: 'not authorized to reset this user' }, 403);

  const { error: updateErr } = await admin.auth.admin.updateUserById(user_id, { password: new_password });
  if (updateErr) return json({ error: updateErr.message }, 400);

  return json({ ok: true });
});
