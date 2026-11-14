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
