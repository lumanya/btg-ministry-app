// Run with: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkCode, checkEmail, checkName, checkPassword, cleanEmail, friendlyAuthError } from './auth-messages.ts';

test('email checks', () => {
  assert.equal(cleanEmail('  Grace@Example.ORG '), 'grace@example.org');
  assert.equal(checkEmail('grace@example.org'), null);
  assert.match(checkEmail('')!, /Enter your email/);
  assert.match(checkEmail('grace@example')!, /doesn’t look complete/);
  assert.match(checkEmail('grace example.org')!, /doesn’t look complete/);
});

test('password, name and code checks', () => {
  assert.equal(checkPassword('longenough'), null);
  assert.match(checkPassword('short')!, /at least 8/);
  assert.match(checkPassword('')!, /Enter a password/);
  assert.equal(checkName('Iman'), null);
  assert.match(checkName('   ')!, /Enter your name/);
  assert.equal(checkCode('123 456'), null);
  assert.match(checkCode('12ab56')!, /numbers in the email/);
  assert.match(checkCode('')!, /Enter the code/);
});

test('auth errors become plain sentences', () => {
  assert.match(friendlyAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' }), /don’t match/);
  assert.match(friendlyAuthError({ message: 'Email not confirmed' }), /Confirm your email/);
  assert.match(friendlyAuthError({ code: 'user_already_exists' }), /already exists/);
  assert.match(friendlyAuthError({ code: 'otp_expired' }), /expired/);
  assert.match(friendlyAuthError({ status: 429 }), /Too many attempts/);
  assert.match(friendlyAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }), /internet connection/);
  assert.match(friendlyAuthError(undefined), /Something went wrong/);
});
