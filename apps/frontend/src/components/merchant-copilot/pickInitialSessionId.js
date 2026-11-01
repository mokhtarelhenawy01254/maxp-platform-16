/**
 * pickInitialSessionId — اختيار الجلسة اللي الدروار يفتح عليها (Task 292f5aa7).
 *
 * القرار: ?session= صريح → الجلسة دي. مفيش → أحدث جلسة **فيها رسائل**،
 * ولو كلها فاضية → أحدث جلسة، ولو مفيش جلسات خلاص → ''.
 *
 * الملف JS خالص (بدون أي import) عشان يتست بـjest بدون transpile.
 */

/**
 * @param {any} session
 * @returns {number}
 */
function sessionMessageCount(session) {
  if (!session) return 0;
  if (typeof session.messageCount === 'number' && Number.isFinite(session.messageCount)) {
    return session.messageCount;
  }
  if (Array.isArray(session.messages)) return session.messages.length;
  return 0;
}

/**
 * @param {{requestedSessionId?: string|null, sessions?: Array<any>}} [input]
 * @returns {string}
 */
function pickInitialSessionId({ requestedSessionId, sessions } = {}) {
  const requested =
    requestedSessionId === null || requestedSessionId === undefined
      ? ''
      : String(requestedSessionId).trim();

  if (requested) return requested;

  const list = Array.isArray(sessions) ? sessions.filter((s) => s && s.id) : [];
  if (list.length === 0) return '';

  // القائمة مرتّبة updatedAt DESC من السيرفر — أول واحدة فيها رسائل = أحدث محادثة حقيقية
  const withMessages = list.find((s) => sessionMessageCount(s) > 0);
  const chosen = withMessages || list[0];

  return String(chosen.id);
}

module.exports = { pickInitialSessionId, sessionMessageCount };
