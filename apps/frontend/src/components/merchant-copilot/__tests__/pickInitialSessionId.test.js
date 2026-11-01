/**
 * Unit tests — اختيار الجلسة عند فتح الدروار (Task 292f5aa7).
 * المرافق: apps/frontend/src/components/merchant-copilot/pickInitialSessionId.js
 *
 * القرار: ?session= صريح → الجلسة دي · مفيش → أحدث جلسة فيها رسائل.
 */

const { pickInitialSessionId, sessionMessageCount } = require('../pickInitialSessionId');

const sessions = [
  { id: 'sess-empty-newest', messageCount: 0, updatedAt: '2026-10-27T10:00:00.000Z' },
  { id: 'sess-real-8', messageCount: 8, updatedAt: '2026-10-25T10:00:00.000Z' },
  { id: 'sess-real-10', messageCount: 10, updatedAt: '2026-10-10T10:00:00.000Z' },
];

describe('pickInitialSessionId (task 292f5aa7)', () => {
  it('uses the explicit ?session= id as-is', () => {
    expect(pickInitialSessionId({ requestedSessionId: 'copilot_sess_explicit', sessions })).toBe(
      'copilot_sess_explicit'
    );
  });

  it('falls back to the newest session that actually has messages', () => {
    expect(pickInitialSessionId({ sessions })).toBe('sess-real-8');
  });

  it('never opens on a newer empty session', () => {
    const picked = pickInitialSessionId({ sessions });
    expect(picked).not.toBe('sess-empty-newest');
  });

  it('falls back to the newest session when every session is empty', () => {
    const allEmpty = [
      { id: 'a', messageCount: 0 },
      { id: 'b', messageCount: 0 },
    ];
    expect(pickInitialSessionId({ sessions: allEmpty })).toBe('a');
  });

  it('returns empty string when there are no sessions', () => {
    expect(pickInitialSessionId({ sessions: [] })).toBe('');
    expect(pickInitialSessionId({})).toBe('');
  });

  it('reads message counts from a messages array too', () => {
    const withArrays = [
      { id: 'empty', messages: [] },
      { id: 'real', messages: [{ id: 'm1' }, { id: 'm2' }] },
    ];
    expect(pickInitialSessionId({ sessions: withArrays })).toBe('real');
  });

  it('ignores malformed sessions without an id', () => {
    expect(pickInitialSessionId({ sessions: [{ messageCount: 5 }, null, { id: 'ok', messageCount: 1 }] })).toBe('ok');
  });

  it('counts messages defensively', () => {
    expect(sessionMessageCount(null)).toBe(0);
    expect(sessionMessageCount({})).toBe(0);
    expect(sessionMessageCount({ messages: [1, 2, 3] })).toBe(3);
    expect(sessionMessageCount({ messageCount: 7 })).toBe(7);
  });

  it('trims a blank requested id and treats it as absent', () => {
    expect(pickInitialSessionId({ requestedSessionId: '   ', sessions })).toBe('sess-real-8');
  });
});
