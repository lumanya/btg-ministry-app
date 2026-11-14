// Run with: npm run test:feed
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildFeed, durationSeconds, formatDuration, uploadsPlaylistId, type YouTubeVideoItem } from './feed.ts';

const NOW = new Date('2026-11-14T08:00:00Z');

function item(id: string, extra: Partial<YouTubeVideoItem> & { live?: string; duration?: string; published?: string }): YouTubeVideoItem {
  return {
    id,
    snippet: {
      title: `Title ${id}`,
      description: '',
      publishedAt: extra.published ?? '2026-11-01T10:00:00Z',
      liveBroadcastContent: extra.live ?? 'none',
      thumbnails: { high: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` } },
    },
    contentDetails: { duration: extra.duration ?? 'PT45M' },
    liveStreamingDetails: extra.liveStreamingDetails,
  };
}

test('uploads playlist swaps UC for UU', () => {
  assert.equal(uploadsPlaylistId('UC0wRGjSLCWbmVqMfvX3PIiw'), 'UU0wRGjSLCWbmVqMfvX3PIiw');
});

test('durations parse and format', () => {
  assert.equal(durationSeconds('PT1H2M10S'), 3730);
  assert.equal(durationSeconds('PT48M5S'), 2885);
  assert.equal(durationSeconds('P0D'), 0);
  assert.equal(durationSeconds('nonsense'), null);
  assert.equal(formatDuration(3730), '1:02:10');
  assert.equal(formatDuration(2885), '48:05');
  assert.equal(formatDuration(0), null);
});

test('sorts the channel into live, upcoming and past videos', () => {
  const feed = buildFeed(
    'UC0wRGjSLCWbmVqMfvX3PIiw',
    [
      item('upload1', { published: '2026-11-03T10:00:00Z', duration: 'PT30M' }),
      item('short1', { published: '2026-11-04T10:00:00Z', duration: 'PT45S' }),
      item('stream1', {
        duration: 'PT2H1M',
        liveStreamingDetails: { actualStartTime: '2026-11-09T07:00:00Z', actualEndTime: '2026-11-09T09:01:00Z' },
      }),
      item('live1', { live: 'live', duration: 'P0D', liveStreamingDetails: { actualStartTime: '2026-11-14T07:30:00Z' } }),
      item('next2', { live: 'upcoming', liveStreamingDetails: { scheduledStartTime: '2026-11-19T15:00:00Z' } }),
      item('next1', { live: 'upcoming', liveStreamingDetails: { scheduledStartTime: '2026-11-16T07:00:00Z' } }),
      item('stale', { live: 'upcoming', liveStreamingDetails: { scheduledStartTime: '2026-10-01T07:00:00Z' } }),
    ],
    NOW,
  );

  assert.equal(feed.live?.id, 'live1');
  assert.equal(feed.live?.duration, null);
  assert.deepEqual(feed.upcoming.map((v) => v.id), ['next1', 'next2']);
  assert.deepEqual(feed.videos.map((v) => v.id), ['stream1', 'upload1']);
  assert.equal(feed.videos[0].kind, 'stream');
  assert.equal(feed.videos[0].date, '2026-11-09T07:00:00Z');
  assert.equal(feed.videos[0].duration, '2:01:00');
  assert.equal(feed.videos[1].kind, 'video');
  assert.equal(feed.videos[1].thumbnail, 'https://i.ytimg.com/vi/upload1/hqdefault.jpg');
  assert.equal(feed.fetchedAt, NOW.toISOString());
});

test('an empty channel gives an empty feed', () => {
  const feed = buildFeed('UC0wRGjSLCWbmVqMfvX3PIiw', [], NOW);
  assert.equal(feed.live, null);
  assert.deepEqual(feed.upcoming, []);
  assert.deepEqual(feed.videos, []);
});
