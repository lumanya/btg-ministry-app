// Run with: npm run test:podcast
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatClock, formatLength, parseDuration, parsePodcastRss, plainText } from './podcast.ts';

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>BTG Ministry Podcast</title>
    <description><![CDATA[<p>Audio teachings &amp; devotionals</p>]]></description>
    <itunes:image href="https://example.org/show.jpg"/>
    <item>
      <title>The Soul: Consciousness</title>
      <guid isPermaLink="false">ep-2</guid>
      <pubDate>Sat, 27 Sep 2025 06:00:00 GMT</pubDate>
      <enclosure url="https://example.org/ep2.mp3" length="123" type="audio/mpeg"/>
      <itunes:duration>48:05</itunes:duration>
      <itunes:season>2</itunes:season>
      <content:encoded><![CDATA[<p>Your Christian life makes no sense<br/>if you do not know.</p>]]></content:encoded>
    </item>
    <item>
      <title>Introduction to Death</title>
      <guid>ep-1</guid>
      <pubDate>Thu, 02 Oct 2025 06:00:00 GMT</pubDate>
      <enclosure url="https://example.org/ep1.mp3" type="audio/mpeg"/>
      <itunes:duration>3730</itunes:duration>
      <itunes:image href="https://example.org/ep1.jpg"/>
      <description>What you cannot control, you fear.</description>
    </item>
    <item>
      <title>Trailer without audio</title>
    </item>
  </channel>
</rss>`;

test('reads the show and its episodes', () => {
  const p = parsePodcastRss(RSS);
  assert.equal(p.title, 'BTG Ministry Podcast');
  assert.equal(p.description, 'Audio teachings & devotionals');
  assert.equal(p.artwork, 'https://example.org/show.jpg');
  assert.equal(p.episodes.length, 2, 'items without audio are skipped');

  const [a, b] = p.episodes;
  assert.equal(a.id, 'ep-2');
  assert.equal(a.audioUrl, 'https://example.org/ep2.mp3');
  assert.equal(a.duration, 2885);
  assert.equal(a.date, '2025-09-27T06:00:00.000Z');
  assert.equal(a.series, 'Season 2');
  assert.equal(a.artwork, 'https://example.org/show.jpg');
  assert.equal(a.description, 'Your Christian life makes no sense\nif you do not know.');

  assert.equal(b.id, 'ep-1');
  assert.equal(b.duration, 3730);
  assert.equal(b.artwork, 'https://example.org/ep1.jpg');
  assert.equal(b.series, null);
  assert.equal(b.description, 'What you cannot control, you fear.');
});

test('a feed with one item still gives a list', () => {
  const one = RSS.replace(/<item>[\s\S]*?<\/item>\s*<item>/, '<item>').replace(/<item>\s*<title>Trailer[\s\S]*?<\/item>/, '');
  assert.equal(parsePodcastRss(one).episodes.length, 1);
});

test('broken or empty input does not throw', () => {
  assert.deepEqual(parsePodcastRss('').episodes, []);
  assert.deepEqual(parsePodcastRss('<html><body>Not a feed</body></html>').episodes, []);
});

test('durations and clocks', () => {
  assert.equal(parseDuration('1:02:10'), 3730);
  assert.equal(parseDuration('48:05'), 2885);
  assert.equal(parseDuration('2885'), 2885);
  assert.equal(parseDuration(''), null);
  assert.equal(parseDuration('abc'), null);
  assert.equal(formatClock(3730), '1:02:10');
  assert.equal(formatClock(125.7), '2:05');
  assert.equal(formatLength(2885), '48 min');
  assert.equal(formatLength(3730), '1 hr 2 min');
  assert.equal(formatLength(3600), '1 hr');
  assert.equal(plainText('<p>a</p><p>b</p>'), 'a\nb');
});
