/**
 * @module aiSessionService
 * @description Manages AI agent chat sessions, history, and rewind via AgentStudioSessionService.
 */

const agentStudioSessionService = require('./agentStudioSessionService');

async function getHistory(companyId, userId, sessionId, user) {
  if (!companyId) return { session: null, messages: [] };
  if (!sessionId) {
    const sessions = await agentStudioSessionService.listSessions(companyId, 'copilot', 1);
    if (sessions && sessions.length > 0) {
      return { session: sessions[0], messages: sessions[0].messages || [] };
    }
    return { session: null, messages: [] };
  }
  const session = await agentStudioSessionService.getSession(companyId, sessionId, 'copilot');
  return {
    session,
    messages: session?.messages || [],
  };
}

async function getHistoryWithCheck(companyId, userId, sessionId, user) {
  if (!companyId) return { notFound: true, session: null, messages: [] };
  if (!sessionId) {
    const history = await getHistory(companyId, userId, null, user);
    return { ok: true, session: history.session, messages: history.messages };
  }

  const check = await agentStudioSessionService.getSessionWithSecurityCheck(companyId, sessionId, 'copilot');
  if (check.status === 'FORBIDDEN') {
    return { forbidden: true, session: null, messages: [] };
  }
  if (check.status === 'NOT_FOUND' || check.status === 'DELETED' || !check.session) {
    return { notFound: true, session: null, messages: [] };
  }
  if (check.status === 'ERROR') {
    throw new Error(check.error || 'Failed to retrieve session from database');
  }

  return {
    ok: true,
    session: check.session,
    messages: check.session.messages || [],
  };
}

async function appendMessage(companyId, sessionId, messageData) {
  return await agentStudioSessionService.appendMessage(companyId, sessionId, messageData, 'copilot');
}

async function clearHistory(companyId, userId, sessionId) {
  if (sessionId) {
    await agentStudioSessionService.deleteSession(companyId, sessionId, 'copilot');
    return { success: true };
  }
  return { success: true };
}

async function listSessions(companyId, userId) {
  return await agentStudioSessionService.listSessions(companyId, 'copilot', 50);
}

async function createSession(companyId, userId, user, options = {}) {
  const sessionId = options.id || `copilot_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const saved = await agentStudioSessionService.saveSession(companyId, userId, 'copilot', {
    id: sessionId,
    title: options.title || 'جلسة جديدة',
    messages: [],
    context: options.context || {},
  });
  return saved || { id: sessionId, title: options.title || 'جلسة جديدة' };
}

async function rewindSession(companyId, sessionId) {
  return await agentStudioSessionService.rewindSession(companyId, sessionId, 'copilot');
}

async function getAgentStatus(companyId) {
  return { status: 'active', companyId };
}

module.exports = {
  getHistory,
  getHistoryWithCheck,
  appendMessage,
  clearHistory,
  listSessions,
  createSession,
  rewindSession,
  getAgentStatus,
};
