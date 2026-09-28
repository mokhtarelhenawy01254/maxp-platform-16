/**
 * @module aiSessionService
 * @description Manages AI agent chat sessions, history, and rewind via AgentStudioSessionService.
 */

const agentStudioSessionService = require('./agentStudioSessionService');

async function getHistory(companyId, userId, sessionId, user) {
  try {
    if (!companyId) return { session: null, messages: [] };
    if (!sessionId) {
      const sessions = await agentStudioSessionService.listSessions(companyId, 'copilot', 1);
      if (sessions && sessions.length > 0) {
        return { session: sessions[0], messages: sessions[0].messages || [] };
      }
      return { session: null, messages: [] };
    }
    const session = await agentStudioSessionService.getSession(companyId, sessionId);
    return {
      session,
      messages: session?.messages || [],
    };
  } catch (err) {
    console.warn('[aiSessionService] getHistory warning:', err.message);
    return { session: null, messages: [] };
  }
}

async function getHistoryWithCheck(companyId, userId, sessionId, user) {
  try {
    if (!companyId) return { notFound: true, session: null, messages: [] };
    if (!sessionId) {
      const history = await getHistory(companyId, userId, null, user);
      return { ok: true, session: history.session, messages: history.messages };
    }

    const check = await agentStudioSessionService.getSessionWithSecurityCheck(companyId, sessionId);
    if (check.status === 'FORBIDDEN') {
      return { forbidden: true, session: null, messages: [] };
    }
    if (check.status === 'NOT_FOUND' || check.status === 'DELETED' || !check.session) {
      return { notFound: true, session: null, messages: [] };
    }

    return {
      ok: true,
      session: check.session,
      messages: check.session.messages || [],
    };
  } catch (err) {
    console.warn('[aiSessionService] getHistoryWithCheck warning:', err.message);
    return { notFound: true, session: null, messages: [] };
  }
}

async function appendMessage(companyId, sessionId, messageData) {
  try {
    return await agentStudioSessionService.appendMessage(companyId, sessionId, messageData, 'copilot');
  } catch (err) {
    console.warn('[aiSessionService] appendMessage warning:', err.message);
    return false;
  }
}

async function clearHistory(companyId, userId, sessionId) {
  try {
    if (sessionId) {
      await agentStudioSessionService.deleteSession(companyId, sessionId);
      return { success: true };
    }
    return { success: true };
  } catch {
    return { success: false };
  }
}

async function listSessions(companyId, userId) {
  try {
    return await agentStudioSessionService.listSessions(companyId, 'copilot', 50);
  } catch (err) {
    console.warn('[aiSessionService] listSessions warning:', err.message);
    return [];
  }
}

async function createSession(companyId, userId, user, options = {}) {
  try {
    const sessionId = options.id || `copilot_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const saved = await agentStudioSessionService.saveSession(companyId, userId, 'copilot', {
      id: sessionId,
      title: options.title || 'جلسة جديدة',
      messages: [],
    });
    return saved || { id: sessionId, title: options.title || 'جلسة جديدة' };
  } catch (err) {
    console.warn('[aiSessionService] createSession warning:', err.message);
    return { id: `copilot_sess_${Date.now()}`, title: 'جلسة جديدة' };
  }
}

async function rewindSession(companyId, sessionId) {
  try {
    return await agentStudioSessionService.rewindSession(companyId, sessionId);
  } catch (err) {
    console.warn('[aiSessionService] rewindSession warning:', err.message);
    return { success: false, error: err.message };
  }
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
