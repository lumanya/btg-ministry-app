// Run with: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clock, seedTitle } from './clips.ts';

test('all-caps Instagram titles read in sentence case', () => {
  assert.equal(seedTitle('DUNIA NI ULIMWENGU WA ROHONI.. KUSHINDWA KUELEWA HILI…'), 'Dunia ni ulimwengu wa rohoni.. kushindwa kuelewa hili…');
  assert.equal(seedTitle('FUNDISHO LA KRISTO HALIMBANI MTU'), 'Fundisho la Kristo halimbani mtu');
  assert.equal(seedTitle('“YESU NI BWANA”'), '“Yesu ni Bwana”');
});

test('titles that already use lower case are left alone', () => {
  assert.equal(seedTitle('The Vision of Paul'), 'The Vision of Paul');
});

test('clock', () => {
  assert.equal(clock(750), '12:30');
  assert.equal(clock(3725), '1:02:05');
});
