// Supabase Edge Function: POST /functions/v1/send-notifications
//
// Runs every 5 minutes (a pg_cron job calls it; see README "Notifications").
// Each run:
//   1. adds automatic notifications that are due to the outbox: "We're live",
//      service reminders, today's devotional, event reminders (each once, by key)
//   2. sends everything in the outbox that is due, through Expo's push service,
//      to the phones that follow that topic
//   3. forgets phones that have uninstalled the app
//
// Calling it more often is harmless: nothing is sent twice. It needs no secret
// of its own; it uses the service role key Supabase provides to Edge Functions.
// Optional secret: EXPO_ACCESS_TOKEN, if "enhanced push security" is on in Expo.

import { createClient } from 'npm:@supabase/supabase-js@2';

import { chunks, eat, plan } from './plan.ts';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';
const BATCH = 100;

type Outgoing = { id: string; title: string; body: string; topic: string; url: string | null };

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return Response.json({ error: 'Server is not configured' }, { status: 500 });
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date();
  const report = { planned: 0, sent: [] as { id: string; to: number }[], removedDevices: 0, errors: [] as string[] };

  // 1. Automatic notifications
  try {
    const today = eat(now).date;
    const [feedRes, services, devotional, events] = await Promise.all([
      fetch(`${url}/functions/v1/youtube-feed`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      db.from('services').select('id,name,weekday,start_time,livestreamed').eq('active', true),
      db
        .from('devotionals')
        .select('slug,title,scripture_ref,publish_on')
        .eq('status', 'published')
        .eq('publish_on', today)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('events')
        .select('id,title,starts_at,location_name')
        .eq('status', 'published')
        .eq('remind', true)
        .gt('starts_at', now.toISOString())
        .lt('starts_at', new Date(now.getTime() + 25 * 3600 * 1000).toISOString()),
    ]);
    const due = plan({
      now,
      live: feedRes?.live ? { id: feedRes.live.id, title: feedRes.live.title } : null,
      upcoming: (feedRes?.upcoming ?? []).map((u: { id: string; title: string; scheduledStart: string | null }) => ({
        id: u.id,
        title: u.title,
        scheduledStart: u.scheduledStart,
      })),
      services: services.data ?? [],
      devotional: devotional.data ?? null,
      events: events.data ?? [],
    });
    if (due.length) {
      const { error } = await db.from('notifications').upsert(
        due.map((d) => ({ ...d, send_at: now.toISOString(), created_by: null })),
        { onConflict: 'dedupe_key', ignoreDuplicates: true },
      );
      if (error) report.errors.push(`plan: ${error.message}`);
      report.planned = due.length;
    }
  } catch (err) {
    report.errors.push(`plan: ${String(err)}`);
  }

  // 2. Send what is due
  const { data: queued } = await db
    .from('notifications')
    .select('id')
    .eq('status', 'queued')
    .lte('send_at', now.toISOString())
    .order('send_at')
    .limit(10);

  for (const { id } of queued ?? []) {
    // Claim it, so an overlapping run can't send it too.
    const { data: claimed } = await db
      .from('notifications')
      .update({ status: 'sending' })
      .eq('id', id)
      .eq('status', 'queued')
      .select('id,title,body,topic,url')
      .maybeSingle();
    if (!claimed) continue;
    try {
      const result = await sendToTopic(db, claimed as Outgoing);
      report.removedDevices += result.removed;
      report.sent.push({ id, to: result.delivered });
      await db.from('notifications').update({ status: 'sent', sent_count: result.delivered, sent_at: new Date().toISOString(), error: result.error }).eq('id', id);
    } catch (err) {
      report.errors.push(`send ${id}: ${String(err)}`);
      await db.from('notifications').update({ status: 'failed', error: String(err).slice(0, 500) }).eq('id', id);
    }
  }

  return Response.json(report);
});

async function sendToTopic(db: ReturnType<typeof createClient>, n: Outgoing) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

  let delivered = 0;
  let removed = 0;
  let lastError: string | null = null;
  const pageSize = 1000;

  // Collect every phone first, so removing uninstalled ones doesn't shift the pages.
  const tokens: string[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data: devices, error } = await db
      .from('push_devices')
      .select('token')
      .contains('topics', [n.topic])
      .order('token')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    tokens.push(...(devices ?? []).map((d: { token: string }) => d.token));
    if ((devices ?? []).length < pageSize) break;
  }

  for (const batch of chunks(tokens, BATCH)) {
    const messages = batch.map((to) => ({
      to,
      title: n.title,
      body: n.body,
      data: n.url ? { url: n.url } : {},
      sound: 'default',
      channelId: 'default',
      priority: 'high',
    }));
    const res = await fetch(EXPO_PUSH, { method: 'POST', headers, body: JSON.stringify(messages) });
    if (!res.ok) {
      lastError = `Expo ${res.status}: ${(await res.text()).slice(0, 200)}`;
      continue;
    }
    const tickets = ((await res.json()).data ?? []) as { status: string; message?: string; details?: { error?: string } }[];
    const gone: string[] = [];
    tickets.forEach((t, i) => {
      if (t.status === 'ok') delivered++;
      else if (t.details?.error === 'DeviceNotRegistered') gone.push(batch[i]);
      else lastError = t.message ?? t.details?.error ?? 'Unknown push error';
    });
    if (gone.length) {
      await db.from('push_devices').delete().in('token', gone);
      removed += gone.length;
    }
  }
  return { delivered, removed, error: lastError };
}
