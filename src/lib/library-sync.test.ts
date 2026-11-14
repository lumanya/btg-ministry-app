import assert from 'node:assert/strict';
import { test } from 'node:test';

import { emptyLibrary, mergeOnSignIn } from './library-sync.ts';

const video = (id: string) => ({
  id,
  youtubeId: id,
  title: `Sermon ${id}`,
  description: '',
  date: '2025-10-01',
  thumbnail: null,
  duration: null,
  kind: 'video' as const,
  scheduledStart: null,
});

test('a guest’s reading and saves carry over into the account', () => {
  const local = { ...emptyLibrary, read: { a: '2026-11-13', b: '2026-11-14' }, savedDevotionals: ['a'], savedVideos: [video('v1')] };
  const { next, uploadReads, uploadSaved } = mergeOnSignIn(
    local,
    [{ devotional_slug: 'b', read_on: '2026-11-12' }, { devotional_slug: 'c', read_on: '2026-11-10' }],
    [{ kind: 'video', item_id: 'v2', data: video('v2') }],
    'u1',
  );
  assert.deepEqual(next.read, { a: '2026-11-13', b: '2026-11-12', c: '2026-11-10' });
  assert.deepEqual(uploadReads, [{ devotional_slug: 'a', read_on: '2026-11-13' }]);
  assert.deepEqual(next.savedDevotionals, ['a']);
  assert.deepEqual(next.savedVideos.map((v) => v.id), ['v1', 'v2']);
  assert.deepEqual(uploadSaved.map((s) => `${s.kind}:${s.item_id}`), ['devotional:a', 'video:v1']);
  assert.equal(next.owner, 'u1');
});

test('another account’s data left on the phone is not mixed in', () => {
  const local = { ...emptyLibrary, read: { x: '2026-11-14' }, savedDevotionals: ['x'], owner: 'someone-else' };
  const { next, uploadReads, uploadSaved } = mergeOnSignIn(local, [], [], 'u1');
  assert.deepEqual(next.read, {});
  assert.deepEqual(next.savedDevotionals, []);
  assert.equal(uploadReads.length + uploadSaved.length, 0);
});

test('nothing is uploaded twice and broken rows are ignored', () => {
  const local = { ...emptyLibrary, read: { a: '2026-11-13' }, savedDevotionals: ['a'], owner: 'u1' };
  const { next, uploadReads, uploadSaved } = mergeOnSignIn(
    local,
    [{ devotional_slug: 'a', read_on: '2026-11-13' }],
    [{ kind: 'devotional', item_id: 'a', data: null }, { kind: 'video', item_id: 'bad', data: { nope: true } }],
    'u1',
  );
  assert.equal(uploadReads.length + uploadSaved.length, 0);
  assert.deepEqual(next.savedVideos, []);
});
