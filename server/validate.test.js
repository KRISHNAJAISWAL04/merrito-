import test from 'node:test';
import assert from 'node:assert/strict';
import { assertRequired, assertLeadPayload } from './validate.js';

test('assertRequired passes when fields present', () => {
  assertRequired({ a: 'x', b: 'y' }, ['a', 'b']);
});

test('assertRequired throws on empty string', () => {
  assert.throws(() => assertRequired({ a: '' }, ['a']), /Missing required fields/);
});

test('assertLeadPayload requires names', () => {
  assert.throws(() => assertLeadPayload({ first_name: '', last_name: 'Y' }), /first_name and last_name/);
  assert.throws(() => assertLeadPayload({ first_name: ' ', last_name: 'Y' }), /first_name and last_name/);
  assert.doesNotThrow(() => assertLeadPayload({ first_name: 'A', last_name: 'B' }));
});