import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, devotionalState, formatDay, friendlyError, slugify, todayInTanzania } from './lib.ts';

test('slugify makes clean links', () => {
  assert.equal(slugify('On Repentance, part 2!'), 'on-repentance-part-2');
  assert.equal(slugify('  Death & Life  '), 'death-and-life');
  assert.equal(slugify('Café — naïve'), 'cafe-naive');
  assert.equal(slugify('!!!'), '');
});

test('today follows Tanzania time', () => {
  assert.equal(todayInTanzania(new Date('2026-11-14T20:59:00Z')), '2026-11-14');
  assert.equal(todayInTanzania(new Date('2026-11-14T21:00:00Z')), '2026-11-15');
});

test('devotional state', () => {
  assert.equal(devotionalState('draft', '2026-11-20', '2026-11-14'), 'draft');
  assert.equal(devotionalState('published', '2026-11-20', '2026-11-14'), 'scheduled');
  assert.equal(devotionalState('published', '2026-11-14', '2026-11-14'), 'live');
});

test('dates', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(formatDay('2025-10-11'), 'Sat, 11 Oct 2025');
});

test('friendly errors', () => {
  assert.match(friendlyError({ code: '23505', message: 'duplicate key value violates unique constraint "devotionals_slug_key"' }), /link/);
  assert.match(friendlyError({ code: '42501', message: 'x' }), /isn’t allowed/);
  assert.equal(friendlyError({ code: 'P0001', message: 'The ministry needs at least one admin.' }), 'The ministry needs at least one admin.');
});

import { eatInputToIso, formatEat, isoToEatInput } from './lib.ts';

test('Tanzania date-time inputs', () => {
  assert.equal(eatInputToIso('2026-12-12T18:30'), '2026-12-12T15:30:00.000Z');
  assert.equal(isoToEatInput('2026-12-12T15:30:00.000Z'), '2026-12-12T18:30');
  assert.equal(formatEat('2026-12-12T15:30:00.000Z'), 'Sat 12 Dec, 18:30');
});
