// Supabase Edge Function: POST /functions/v1/delete-account
//
// Deletes the signed-in member's account. Apple requires apps that let people
// create an account to let them delete it from inside the app.
//
// The caller is identified from their own sign-in token; the deletion itself
// needs the service role key, which Supabase provides to Edge Functions and
// which never leaves the server. The profile row is removed with the account
// (on delete cascade).

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign in first' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Server is not configured' }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Confirm who is asking from their token; never trust an id sent in the body.
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json({ error: 'Sign in again, then try once more' }, 401);

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) {
    console.error('delete-account', deleteError);
    return json({ error: 'Could not delete the account' }, 500);
  }
  return json({ deleted: true });
});
