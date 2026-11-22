import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildClips, clipTitle, mediaUrl, mergeMedia, shouldRefresh, videosOf } from './clips.ts';

test('titles come from the first line of the caption', () => {
  assert.equal(clipTitle('A word on grace 🙏 #faith #btg\nMore text'), 'A word on grace');
  assert.equal(clipTitle('\n\nRepentance is the change of mind. @btgministry'), 'Repentance is the change of mind.');
  assert.equal(clipTitle(undefined), '');
  const long = clipTitle('This is a much longer first line of a caption that keeps going past the limit');
  assert.ok(long.length <= 60 && long.endsWith('…'), long);
});

test('only videos, newest first, with staff settings', () => {
  const media = [
    { id: '100001', media_type: 'IMAGE', media_url: 'https://x/img.jpg', timestamp: '2026-11-10T10:00:00+0000' },
    { id: '100002', media_type: 'VIDEO', media_url: 'https://x/a.mp4', thumbnail_url: 'https://x/a.jpg', caption: 'Old one', timestamp: '2026-11-01T10:00:00+0000' },
    { id: '100003', media_type: 'VIDEO', media_url: 'https://x/b.mp4', caption: 'New one', timestamp: '2026-11-12T10:00:00+0000' },
    { id: '100004', media_type: 'VIDEO', caption: 'Licensed music', timestamp: '2026-11-13T10:00:00+0000' },
    { id: '100005', media_type: 'VIDEO', media_url: 'https://x/c.mp4', caption: 'Hidden', timestamp: '2026-11-14T10:00:00+0000' },
  ];
  const settings = [
    { instagram_id: '100002', hidden: false, title: 'Grace that keeps', sermon_youtube_id: 'pdvLSZRh3N8', sermon_start_seconds: 760 },
    { instagram_id: '100005', hidden: true, title: null, sermon_youtube_id: null, sermon_start_seconds: null },
  ];
  const app = buildClips(media, settings);
  assert.deepEqual(app.map((c) => c.id), ['100003', '100002']);
  assert.deepEqual(app[1].sermon, { youtubeId: 'pdvLSZRh3N8', start: 760 });
  assert.equal(app[1].title, 'Grace that keeps');
  assert.equal(app[0].title, 'New one');
  assert.equal(app[0].sermon, null);
  assert.equal(app[1].thumbnail, 'https://x/a.jpg');
  assert.equal(app[1].postedAt, '2026-11-01T10:00:00+0000');

  const all = buildClips(media, settings, true);
  assert.deepEqual(all.map((c) => c.id), ['100005', '100004', '100003', '100002']);
  assert.equal(all[0].hidden, true);
  assert.equal(all[1].videoUrl, null);
});

test('the key is renewed when under 30 days are left, at most once a day', () => {
  const now = Date.parse('2026-11-15T12:00:00Z');
  const day = 24 * 3600 * 1000;
  const iso = (ms: number) => new Date(ms).toISOString();
  // Just pasted, 60 days left.
  assert.equal(shouldRefresh({ expires_at: iso(now + 60 * day), refreshed_at: null, updated_at: iso(now - 3600 * 1000) }, now), false);
  // Five weeks later: 25 days left.
  assert.equal(shouldRefresh({ expires_at: iso(now + 25 * day), refreshed_at: null, updated_at: iso(now - 35 * day) }, now), true);
  // Renewed an hour ago: wait, even if the date looks close.
  assert.equal(shouldRefresh({ expires_at: iso(now + 5 * day), refreshed_at: iso(now - 3600 * 1000), updated_at: iso(now - 40 * day) }, now), false);
  // Plenty of time left.
  assert.equal(shouldRefresh({ expires_at: iso(now + 50 * day), refreshed_at: iso(now - 10 * day), updated_at: iso(now - 10 * day) }, now), false);
});

test('business keys never renew and read the account by ID', () => {
  const now = Date.parse('2026-11-21T12:00:00Z');
  assert.equal(shouldRefresh({ expires_at: null, refreshed_at: null, updated_at: '2026-01-01T00:00:00Z' }, now), false);
  assert.match(mediaUrl('EAAkey', '17841402024265975'), /^https:\/\/graph\.facebook\.com\/v25\.0\/17841402024265975\/media\?fields=/);
  assert.match(mediaUrl('IGAAkey', null), /^https:\/\/graph\.instagram\.com\/me\/media\?fields=/);
});

test('old feed videos and videos inside carousels count too', () => {
  const media = [
    { id: '1', media_type: 'VIDEO', media_url: 'https://x/old.mp4', caption: 'Feed video from 2019', timestamp: '2019-03-01T10:00:00+0000' },
    {
      id: '2',
      media_type: 'CAROUSEL_ALBUM',
      caption: 'Conference highlights',
      permalink: 'https://instagram.com/p/2',
      timestamp: '2020-05-01T10:00:00+0000',
      children: { data: [{ id: '21', media_type: 'IMAGE', media_url: 'https://x/p.jpg' }, { id: '22', media_type: 'VIDEO', media_url: 'https://x/v.mp4', thumbnail_url: 'https://x/v.jpg' }] },
    },
    { id: '3', media_type: 'IMAGE', media_url: 'https://x/i.jpg', timestamp: '2021-01-01T10:00:00+0000' },
  ];
  const v = videosOf(media);
  assert.deepEqual(v.map((m) => m.id), ['1', '22']);
  assert.equal(v[1].caption, 'Conference highlights');
  assert.equal(v[1].permalink, 'https://instagram.com/p/2');
  const clips = buildClips(media, []);
  assert.deepEqual(clips.map((c) => c.id), ['22', '1']);
  assert.equal(clips[0].title, 'Conference highlights');
});

test('new posts merge into the stored history, newest first', () => {
  const stored = [
    { id: 'a', media_type: 'VIDEO', media_url: 'https://x/a-old.mp4', timestamp: '2026-11-01T10:00:00+0000' },
    { id: 'b', media_type: 'VIDEO', media_url: 'https://x/b.mp4', timestamp: '2020-01-01T10:00:00+0000' },
  ];
  const fresh = [
    { id: 'c', media_type: 'VIDEO', media_url: 'https://x/c.mp4', timestamp: '2026-11-20T10:00:00+0000' },
    { id: 'a', media_type: 'VIDEO', media_url: 'https://x/a-new.mp4', timestamp: '2026-11-01T10:00:00+0000' },
  ];
  const merged = mergeMedia(stored, fresh);
  assert.deepEqual(merged.map((m) => m.id), ['c', 'a', 'b']);
  assert.equal(merged[1].media_url, 'https://x/a-new.mp4');
});
