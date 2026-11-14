import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatTime, mapDevotional, mapService, paragraphs } from './content.ts';

test('maps a devotional row for the app', () => {
  const d = mapDevotional({
    slug: 'on-repentance',
    title: 'On Repentance',
    subtitle: '',
    scripture_ref: 'Acts 3:19',
    scripture_text: null,
    excerpt: '',
    body: 'Repentance is the change of mind.\n\nSecond paragraph.',
    audio_url: null,
    publish_on: '2025-10-11',
    series: [{ name: 'Knowledge' }],
  });
  assert.equal(d.id, 'on-repentance');
  assert.equal(d.subtitle, undefined);
  assert.deepEqual(d.scripture, { ref: 'Acts 3:19', text: undefined });
  assert.equal(d.excerpt, 'Repentance is the change of mind.');
  assert.equal(d.series, 'Knowledge');
});

test('splits a body into paragraphs at blank lines', () => {
  assert.deepEqual(paragraphs('One\nline\n\n\nTwo\r\n\r\nThree  '), ['One line', 'Two', 'Three']);
  assert.deepEqual(paragraphs(''), []);
});

test('formats weekly services', () => {
  assert.equal(formatTime('9:5:00'), '09:05');
  assert.deepEqual(mapService({ id: '1', name: 'Sunday Service', weekday: 0, start_time: '09:00:00', venue: 'Dar es Salaam', livestreamed: true }), {
    id: '1',
    day: 'Sun',
    time: '09:00',
    name: 'Sunday Service',
    meta: 'Dar es Salaam · Livestreamed',
  });
  assert.equal(mapService({ id: '2', name: 'Prayer', weekday: 3, start_time: '18:00', venue: null, livestreamed: false }).meta, '');
});
