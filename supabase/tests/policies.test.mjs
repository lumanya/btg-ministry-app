// Runs the migrations and seed in an in-memory Postgres (PGlite) with a small stand-in
// for Supabase's auth and storage schemas, then checks what guests, members, editors
// and admins can see and change.
//
//   npm run test:db

import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SUPABASE_STANDIN = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text unique,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  create schema storage;
  create table storage.buckets (
    id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text, owner uuid
  );
  alter table storage.objects enable row level security;

  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
  -- Supabase grants table access to the API roles by default; policies do the filtering.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

const ADMIN = '00000000-0000-0000-0000-00000000000a';
const EDITOR = '00000000-0000-0000-0000-00000000000e';
const MEMBER = '00000000-0000-0000-0000-000000000001';
const OTHER = '00000000-0000-0000-0000-000000000002';

let db;

/** Run `fn` as a guest (uid null) or a signed-in user, inside a transaction. */
async function as(uid, fn) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('role', $1, true)`, [uid ? 'authenticated' : 'anon']);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid ?? '']);
    return fn(tx);
  });
}

const rows = async (uid, sql, params) => (await as(uid, (tx) => tx.query(sql, params))).rows;

async function fails(uid, sql, params, pattern) {
  await assert.rejects(as(uid, (tx) => tx.query(sql, params)), pattern);
}

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STANDIN);
  for (const file of readdirSync(join(root, 'migrations')).sort()) {
    await db.exec(readFileSync(join(root, 'migrations', file), 'utf8'));
  }
  await db.exec(readFileSync(join(root, 'seed.sql'), 'utf8'));
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${ADMIN}', 'pastor@example.org', '{"full_name":"Pastor"}'),
      ('${EDITOR}', 'editor@example.org', '{"full_name":"Editor"}'),
      ('${MEMBER}', 'member@example.org', '{"full_name":"Member"}'),
      ('${OTHER}', 'other@example.org', '{}');
    insert into public.staff (user_id, role) values ('${ADMIN}', 'admin'), ('${EDITOR}', 'editor');
    insert into public.devotionals (slug, title, publish_on, status) values
      ('a-draft', 'A draft', public.ministry_today(), 'draft'),
      ('tomorrow', 'Tomorrow', public.ministry_today() + 1, 'published'),
      ('today', 'Today', public.ministry_today(), 'published');
  `);
});

after(async () => db?.close());

describe('content', () => {
  test('guests see published devotionals up to today, not drafts or future ones', async () => {
    const slugs = (await rows(null, 'select slug from public.devotionals')).map((r) => r.slug);
    assert.ok(slugs.includes('today'));
    assert.ok(slugs.includes('on-repentance'));
    assert.ok(!slugs.includes('a-draft'));
    assert.ok(!slugs.includes('tomorrow'));
    assert.equal(slugs.length, 10);
  });

  test('staff see drafts and scheduled devotionals', async () => {
    const slugs = (await rows(EDITOR, 'select slug from public.devotionals')).map((r) => r.slug);
    assert.ok(slugs.includes('a-draft') && slugs.includes('tomorrow'));
  });

  test('guests read series, services, giving and quotes', async () => {
    assert.equal((await rows(null, 'select * from public.series')).length, 3);
    assert.equal((await rows(null, 'select * from public.services')).length, 2);
    assert.equal((await rows(null, 'select * from public.giving_methods')).length, 2);
    assert.equal((await rows(null, 'select * from public.quotes')).length, 3);
  });

  test('guests and members cannot change content', async () => {
    await fails(null, `insert into public.devotionals (slug, title) values ('x', 'X')`, [], /row-level security|permission denied/);
    await fails(MEMBER, `insert into public.devotionals (slug, title) values ('x', 'X')`, [], /row-level security/);
    const changed = await rows(MEMBER, `update public.giving_methods set number = '000' returning id`);
    assert.equal(changed.length, 0);
    const deleted = await rows(MEMBER, `delete from public.devotionals returning id`);
    assert.equal(deleted.length, 0);
  });

  test('editors add, edit and publish devotionals, and edits are stamped', async () => {
    await rows(EDITOR, `insert into public.devotionals (slug, title, status) values ('new-word', 'New word', 'published')`);
    const [d] = await rows(EDITOR, `update public.devotionals set title = 'New word, revised' where slug = 'new-word' returning title, updated_by, created_by`);
    assert.equal(d.title, 'New word, revised');
    assert.equal(d.updated_by, EDITOR);
    assert.equal(d.created_by, EDITOR);
    assert.equal((await rows(null, `select 1 from public.devotionals where slug = 'new-word'`)).length, 1);
  });

  test('slugs must be simple lowercase words', async () => {
    await fails(EDITOR, `insert into public.devotionals (slug, title) values ('Bad Slug!', 'X')`, [], /check constraint/);
  });
});

describe('staff', () => {
  test('a member cannot make themselves staff', async () => {
    await fails(MEMBER, `insert into public.staff (user_id, role) values ($1, 'admin')`, [MEMBER], /row-level security/);
    await fails(MEMBER, `select public.add_staff('member@example.org', 'admin')`, [], /Only admins/);
  });

  test('editors cannot add staff; admins can, by email', async () => {
    await fails(EDITOR, `select public.add_staff('member@example.org')`, [], /Only admins/);
    await rows(ADMIN, `select public.add_staff('MEMBER@example.org ', 'editor')`);
    const [r] = await rows(MEMBER, `select public.my_staff_role() as role`);
    assert.equal(r.role, 'editor');
    await rows(ADMIN, `delete from public.staff where user_id = $1`, [MEMBER]);
  });

  test('adding an unknown email explains what to do', async () => {
    await fails(ADMIN, `select public.add_staff('nobody@example.org')`, [], /create an account in the app first/);
  });

  test('the last admin cannot be removed or demoted', async () => {
    await fails(ADMIN, `delete from public.staff where user_id = $1`, [ADMIN], /at least one admin/);
    await fails(ADMIN, `update public.staff set role = 'editor' where user_id = $1`, [ADMIN], /at least one admin/);
  });

  test('the staff list and overview are for staff only', async () => {
    await fails(null, `select public.admin_overview()`, [], /permission denied/);
    await fails(MEMBER, `select public.admin_overview()`, [], /Only staff/);
    const [{ admin_overview: o }] = await rows(EDITOR, `select public.admin_overview()`);
    assert.equal(o.members, 4);
    assert.equal(o.devotionals_drafts, 1);
    assert.equal(o.devotionals_scheduled, 1);
    const list = await rows(EDITOR, `select * from public.list_staff()`);
    assert.deepEqual(list.map((s) => s.email).sort(), ['editor@example.org', 'pastor@example.org']);
  });
});

describe('prayer requests', () => {
  test('guests can send one but not read any', async () => {
    await rows(null, `insert into public.prayer_requests (message, name) values ('Please pray for my family', 'Asha')`);
    assert.equal((await rows(null, `select * from public.prayer_requests`)).length, 0);
  });

  test('nobody can send one as someone else or pre-marked as prayed', async () => {
    await fails(MEMBER, `insert into public.prayer_requests (message, user_id) values ('Pray for me', $1)`, [OTHER], /row-level security/);
    await fails(null, `insert into public.prayer_requests (message, status) values ('Pray for me', 'prayed')`, [], /row-level security/);
    await fails(null, `insert into public.prayer_requests (message) values ('  ')`, [], /check constraint/);
  });

  test('members see only their own; staff see all and mark them prayed', async () => {
    await rows(MEMBER, `insert into public.prayer_requests (message) values ('Healing for my mother')`);
    const mine = await rows(MEMBER, `select user_id from public.prayer_requests`);
    assert.deepEqual(mine.map((r) => r.user_id), [MEMBER]);
    assert.equal((await rows(OTHER, `select * from public.prayer_requests`)).length, 0);

    const all = await rows(EDITOR, `select id from public.prayer_requests order by created_at`);
    assert.equal(all.length, 2);
    const [done] = await rows(EDITOR, `update public.prayer_requests set status = 'prayed' where id = $1 returning handled_by, handled_at`, [all[0].id]);
    assert.equal(done.handled_by, EDITOR);
    assert.ok(done.handled_at);
    assert.equal((await rows(MEMBER, `update public.prayer_requests set status = 'archived' returning id`)).length, 0);
  });

  test('a member can send at most 3 an hour', async () => {
    await rows(OTHER, `insert into public.prayer_requests (message) values ('One more time')`);
    await rows(OTHER, `insert into public.prayer_requests (message) values ('One more time')`);
    await rows(OTHER, `insert into public.prayer_requests (message) values ('One more time')`);
    await fails(OTHER, `insert into public.prayer_requests (message) values ('One more time')`, [], /several requests this hour/);
  });
});

describe('member data', () => {
  test('reading log and saved items are private to each member', async () => {
    await rows(MEMBER, `insert into public.reading_log (devotional_slug, read_on) values ('on-repentance', '2025-10-11')`);
    await rows(MEMBER, `insert into public.saved_items (kind, item_id, data) values ('video', 'abc', '{"title":"A sermon"}')`);
    assert.equal((await rows(MEMBER, `select * from public.reading_log`)).length, 1);
    assert.equal((await rows(OTHER, `select * from public.reading_log`)).length, 0);
    assert.equal((await rows(OTHER, `select * from public.saved_items`)).length, 0);
    assert.equal((await rows(EDITOR, `select * from public.saved_items`)).length, 0);
    await fails(OTHER, `insert into public.reading_log (user_id, devotional_slug, read_on) values ($1, 'x', '2025-10-11')`, [MEMBER], /row-level security/);
    assert.equal((await rows(null, `select * from public.reading_log`)).length, 0);
  });
});

describe('storage', () => {
  test('only staff upload to the media bucket', async () => {
    await fails(MEMBER, `insert into storage.objects (bucket_id, name) values ('media', 'a.mp3')`, [], /row-level security/);
    await fails(null, `insert into storage.objects (bucket_id, name) values ('media', 'a.mp3')`, [], /row-level security/);
    await rows(EDITOR, `insert into storage.objects (bucket_id, name) values ('media', 'devotionals/a.mp3')`);
  });
});

describe('notifications', () => {
  const TOKEN = 'ExponentPushToken[abc123]';

  test('anyone can register their phone, but nobody can read the device list', async () => {
    await rows(null, `select public.register_push_device($1, 'android', array['live','devotional'], 'sw')`, [TOKEN]);
    await fails(null, `select * from public.push_devices`, [], /permission denied/);
    await fails(MEMBER, `select * from public.push_devices`, [], /permission denied/);
    const [d] = await db.query(`select user_id, topics, locale from public.push_devices where token = $1`, [TOKEN]).then((r) => r.rows);
    assert.equal(d.user_id, null);
    assert.equal(d.locale, 'sw');
    assert.deepEqual(d.topics, ['live', 'devotional']);
  });

  test('registering again updates topics and links a signed-in member', async () => {
    await rows(MEMBER, `select public.register_push_device($1, 'android', array['announcements'])`, [TOKEN]);
    const [d] = (await db.query(`select user_id, topics from public.push_devices where token = $1`, [TOKEN])).rows;
    assert.equal(d.user_id, MEMBER);
    assert.deepEqual(d.topics, ['announcements']);
  });

  test('bad tokens and unknown topics are refused', async () => {
    await fails(null, `select public.register_push_device('not-a-token', 'android', array['live'])`, [], /check constraint/);
    await fails(null, `select public.register_push_device('ExponentPushToken[x]', 'android', array['spam'])`, [], /check constraint/);
  });

  test('only staff queue announcements, and only as plain queued items', async () => {
    await fails(MEMBER, `insert into public.notifications (title, body) values ('Hi', 'There')`, [], /row-level security/);
    await fails(null, `insert into public.notifications (title, body) values ('Hi', 'There')`, [], /row-level security|permission denied/);
    await fails(EDITOR, `insert into public.notifications (title, body, status) values ('Hi', 'There', 'sent')`, [], /row-level security/);
    await fails(EDITOR, `insert into public.notifications (title, body, dedupe_key) values ('Hi', 'There', 'live:x')`, [], /row-level security/);
    const [n] = await rows(EDITOR, `insert into public.notifications (title, body, url) values ('Sunday service', 'Join us at 9:00', '/live') returning id, created_by`);
    assert.equal(n.created_by, EDITOR);
    assert.equal((await rows(MEMBER, `select * from public.notifications`)).length, 0);
    // Can cancel while queued, but not mark it as sent.
    await fails(EDITOR, `update public.notifications set status = 'sent' where id = $1`, [n.id], /row-level security/);
    assert.equal((await rows(EDITOR, `update public.notifications set status = 'cancelled' where id = $1 returning id`, [n.id])).length, 1);
    assert.equal((await rows(EDITOR, `update public.notifications set title = 'Changed' where id = $1 returning id`, [n.id])).length, 0);
  });

  test('the audience count is for staff', async () => {
    await fails(MEMBER, `select public.push_audience()`, [], /Only staff/);
    const [{ push_audience: a }] = await rows(EDITOR, `select public.push_audience()`);
    assert.equal(a.devices, 1);
    assert.equal(a.announcements, 1);
  });

  test('a phone can turn its notifications off', async () => {
    await rows(null, `select public.unregister_push_device($1)`, [TOKEN]);
    assert.equal((await db.query(`select 1 from public.push_devices`)).rows.length, 0);
  });
});

describe('playlists and events', () => {
  test('guests read playlist settings; only staff change them', async () => {
    await rows(EDITOR, `insert into public.playlists (youtube_id, visible, sort) values ('PL123', false, 2)`);
    assert.equal((await rows(null, `select * from public.playlists`)).length, 1);
    await fails(MEMBER, `insert into public.playlists (youtube_id) values ('PL999')`, [], /row-level security/);
    assert.equal((await rows(MEMBER, `update public.playlists set visible = true returning youtube_id`)).length, 0);
  });

  test('guests see published events only; staff see drafts', async () => {
    await rows(EDITOR, `insert into public.events (title, starts_at, status) values ('Conference', now() + interval '10 days', 'published'), ('Planning', now() + interval '20 days', 'draft')`);
    assert.deepEqual((await rows(null, `select title from public.events`)).map((r) => r.title), ['Conference']);
    assert.equal((await rows(EDITOR, `select title from public.events`)).length, 2);
    await fails(MEMBER, `insert into public.events (title, starts_at) values ('X', now())`, [], /row-level security/);
    await fails(EDITOR, `insert into public.events (title, starts_at, ends_at) values ('X', now(), now() - interval '1 hour')`, [], /check constraint/);
  });
});

describe('likes and views', () => {
  const PHONE = 'phone-1234-abcd';
  const OTHER_PHONE = 'phone-9999-zzzz';

  test('guests like with their phone id; liking again unlikes', async () => {
    const [{ toggle_like: a }] = await rows(null, `select public.toggle_like('video', 'abc', $1)`, [PHONE]);
    assert.deepEqual(a, { liked: true, likes: 1 });
    const [{ toggle_like: b }] = await rows(null, `select public.toggle_like('video', 'abc', $1)`, [OTHER_PHONE]);
    assert.equal(b.likes, 2);
    const [{ toggle_like: c }] = await rows(null, `select public.toggle_like('video', 'abc', $1)`, [PHONE]);
    assert.deepEqual(c, { liked: false, likes: 1 });
  });

  test('members like with their account; a guest needs a phone id', async () => {
    const [{ toggle_like: m }] = await rows(MEMBER, `select public.toggle_like('devotional', 'on-repentance')`);
    assert.equal(m.liked, true);
    await fails(null, `select public.toggle_like('video', 'abc')`, [], /Missing phone id/);
    await fails(null, `select public.toggle_like('video', 'abc', 'x')`, [], /Missing phone id/);
    await fails(null, `select public.toggle_like('sermon', 'abc', $1)`, [PHONE], /check constraint/);
  });

  test('events can be liked and viewed', async () => {
    const [{ toggle_like: e }] = await rows(null, `select public.toggle_like('event', 'conference-2026', $1)`, [PHONE]);
    assert.deepEqual(e, { liked: true, likes: 1 });
    await rows(null, `select public.record_view('event', 'conference-2026', $1)`, [PHONE]);
    const [s] = await rows(null, `select * from public.item_stats('event', array['conference-2026'], $1)`, [PHONE]);
    assert.deepEqual([Number(s.likes), Number(s.views), s.liked], [1, 1, true]);
  });

  test('a view counts once per person per day', async () => {
    await rows(null, `select public.record_view('devotional', 'on-repentance', $1)`, [PHONE]);
    await rows(null, `select public.record_view('devotional', 'on-repentance', $1)`, [PHONE]);
    await rows(MEMBER, `select public.record_view('devotional', 'on-repentance')`);
    const stats = await rows(MEMBER, `select * from public.item_stats('devotional', array['on-repentance', 'death'])`);
    assert.deepEqual(
      stats.map((s) => [s.item_id, Number(s.likes), Number(s.views), s.liked]),
      [['on-repentance', 1, 2, true], ['death', 0, 0, false]],
    );
  });

  test('nobody reads the raw likes or views', async () => {
    await fails(null, `select * from public.likes`, [], /permission denied/);
    await fails(MEMBER, `select * from public.views`, [], /permission denied/);
    await fails(MEMBER, `select * from public.top_items('devotional')`, [], /Only staff/);
    const top = await rows(EDITOR, `select * from public.top_items('devotional')`);
    assert.equal(top[0].item_id, 'on-repentance');
  });
});

describe('deleting an account', () => {
  test('removes the member’s prayer requests, likes and views', async () => {
    const GONE = '00000000-0000-0000-0000-0000000000dd';
    await db.query(`insert into auth.users (id, email) values ($1, 'gone@example.com')`, [GONE]);
    await rows(GONE, `insert into public.prayer_requests (message) values ('Please pray for my exams')`);
    await rows(GONE, `select public.toggle_like('video', 'gone-video')`);
    await rows(GONE, `select public.record_view('video', 'gone-video')`);
    await db.query(`delete from auth.users where id = $1`, [GONE]);
    const left = await db.query(
      `select (select count(*) from public.prayer_requests where message = 'Please pray for my exams') as prayers,
              (select count(*) from public.likes where liker = $1) as likes,
              (select count(*) from public.views where viewer = $1) as views`,
      ['u:' + GONE],
    );
    assert.deepEqual(left.rows[0], { prayers: 0, likes: 0, views: 0 });
  });
});

describe('kiswahili content', () => {
  test('devotionals keep a Swahili version alongside English', async () => {
    await rows(EDITOR, `update public.devotionals set title_sw = 'Kuhusu Toba', body_sw = 'Toba ni kubadilika kwa nia.' where slug = 'on-repentance'`);
    const [d] = await rows(null, `select title, title_sw from public.devotionals where slug = 'on-repentance'`);
    assert.deepEqual(d, { title: 'On Repentance', title_sw: 'Kuhusu Toba' });
  });
});

describe('clips', () => {
  test('anyone reads clip settings; only staff change them', async () => {
    await rows(EDITOR, `insert into public.clips (instagram_id, sermon_youtube_id, sermon_start_seconds) values ('17900000000000001', 'pdvLSZRh3N8', 760)`);
    const [c] = await rows(null, `select hidden, sermon_youtube_id, sermon_start_seconds from public.clips where instagram_id = '17900000000000001'`);
    assert.deepEqual(c, { hidden: false, sermon_youtube_id: 'pdvLSZRh3N8', sermon_start_seconds: 760 });
    await fails(MEMBER, `insert into public.clips (instagram_id) values ('17900000000000002')`, [], /row-level security/);
    await fails(null, `update public.clips set hidden = true`, [], /permission denied/);
    assert.equal((await rows(MEMBER, `update public.clips set hidden = true returning instagram_id`)).length, 0);
  });

  test('the Instagram key is write-only, and only for staff', async () => {
    await fails(MEMBER, `select public.set_instagram_token($1)`, ['IGAAexampletoken1234567890'], /Only staff/);
    await fails(EDITOR, `select public.set_instagram_token('short')`, [], /access token/);
    await rows(EDITOR, `select public.set_instagram_token($1)`, ['IGAAexampletoken1234567890']);
    const [{ instagram_status: s }] = await rows(EDITOR, `select public.instagram_status()`);
    assert.equal(s.connected, true);
    assert.ok(s.expires_at);
    assert.equal('access_token' in s, false);
    await fails(EDITOR, `select * from public.instagram_auth`, [], /permission denied/);
    await fails(null, `select * from public.instagram_auth`, [], /permission denied/);
    await fails(MEMBER, `select public.instagram_status()`, [], /Only staff/);
    await rows(EDITOR, `select public.disconnect_instagram()`);
    const [{ instagram_status: after }] = await rows(EDITOR, `select public.instagram_status()`);
    assert.equal(after.connected, false);
  });

  test('clips can be liked', async () => {
    const [{ toggle_like: l }] = await rows(null, `select public.toggle_like('clip', '17900000000000001', 'phone-1234-abcd')`);
    assert.equal(l.liked, true);
  });
});
