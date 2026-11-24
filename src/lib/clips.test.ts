// Run with: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calmCaps, clock, seedTitle } from './clips.ts';

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

test('calmCaps turns capitals into sentences, keeping names of God', () => {
  assert.equal(calmCaps('LIGHT FROM LIGHT. LIFE FROM LIFE IN CHRIST'), 'Light from light. Life from life in Christ');
  assert.equal(calmCaps('NINAKIRI\nYESU NI BWANA'), 'Ninakiri\nYesu ni Bwana');
  assert.equal(calmCaps('Already written well.'), 'Already written well.');
});
