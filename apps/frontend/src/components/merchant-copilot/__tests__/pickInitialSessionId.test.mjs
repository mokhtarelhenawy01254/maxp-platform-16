import test from 'node:test';
import assert from 'node:assert/strict';
import { pickInitialSessionId, sessionMessageCount } from '../pickInitialSessionId.mjs';

const sessions = [
  { id: 'sess-empty-newest', messageCount: 0, updatedAt: '2026-10-27T10:00:00.000Z' },
  { id: 'sess-real-8', messageCount: 8, updatedAt: '2026-10-25T10:00:00.000Z' },
  { id: 'sess-real-10', messageCount: 10, updatedAt: '2026-10-10T10:00:00.000Z' },
];

test('uses the explicit ?session= id as-is', () => {
  assert.equal(pickInitialSessionId({ requestedSessionId: 'copilot_sess_explicit', sessions }), 'copilot_sess_explicit');
});
test('falls back to the newest session that actually has messages', () => {
  assert.equal(pickInitialSessionId({ sessions }), 'sess-real-8');
});
test('never opens on a newer empty session', () => {
  assert.notEqual(pickInitialSessionId({ sessions }), 'sess-empty-newest');
});
test('falls back to the newest session when every session is empty', () => {
  assert.equal(pickInitialSessionId({ sessions: [{ id: 'a', messageCount: 0 }, { id: 'b', messageCount: 0 }] }), 'a');
});
test('returns empty string when there are no sessions', () => {
  assert.equal(pickInitialSessionId({ sessions: [] }), '');
  assert.equal(pickInitialSessionId({}), '');
});
test('reads message counts from a messages array too', () => {
  const withArrays = [{ id: 'empty', messages: [] }, { id: 'real', messages: [{ id: 'm1' }, { id: 'm2' }] }];
  assert.equal(pickInitialSessionId({ sessions: withArrays }), 'real');
});
test('ignores malformed sessions without an id', () => {
  assert.equal(pickInitialSessionId({ sessions: [{ messageCount: 5 }, null, { id: 'ok', messageCount: 1 }] }), 'ok');
});
test('counts messages defensively', () => {
  assert.equal(sessionMessageCount(null), 0);
  assert.equal(sessionMessageCount({}), 0);
  assert.equal(sessionMessageCount({ messages: [1, 2, 3] }), 3);
  assert.equal(sessionMessageCount({ messageCount: 7 }), 7);
});
test('trims a blank requested id and treats it as absent', () => {
  assert.equal(pickInitialSessionId({ requestedSessionId: '   ', sessions }), 'sess-real-8');
});
