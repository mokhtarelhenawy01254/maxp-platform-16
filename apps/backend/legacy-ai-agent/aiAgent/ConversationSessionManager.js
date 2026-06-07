/**
 * Unified session manager for customer-agent conversations.
 * Follows OpenAI SDK Session pattern but with multi-tenancy.
 */
const crypto = require('crypto');

class ConversationSessionManager {
  constructor() {
    this._sessions = new Map(); // sessionId -> session
    this._cleanupInterval = setInterval(() => this._cleanup(), 60 * 60 * 1000); // hourly
  }

  createSession({ companyId, customerId, channel = 'UNKNOWN', metadata = {} }) {
    const sessionId = `session_${crypto.randomUUID()}`;
    const session = {
      id: sessionId,
      companyId,
      customerId,
      channel,
      messages: [],
      toolCalls: [],
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'ACTIVE',
    };
    this._sessions.set(sessionId, session);
    return session;
  }

  addMessage(sessionId, { role, content, agentId, toolCalls, metadata }) {
    const session = this._sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const message = {
      id: `msg_${crypto.randomUUID()}`,
      role,
      content,
      agentId,
      toolCalls: toolCalls || [],
      metadata: metadata || {},
      timestamp: Date.now(),
    };

    session.messages.push(message);
    session.updatedAt = Date.now();

    // Keep only last 100 messages per session
    if (session.messages.length > 100) {
      session.messages = session.messages.slice(-100);
    }

    return message;
  }

  getMessages(sessionId, { limit = 50, offset = 0 } = {}) {
    const session = this._sessions.get(sessionId);
    if (!session) return [];
    return session.messages.slice(-(offset + limit), -offset || undefined);
  }

  getContext(sessionId, maxMessages = 20) {
    const messages = this.getMessages(sessionId, { limit: maxMessages });
    return messages.map(m => ({
      role: m.role,
      content: m.content,
      ...(m.toolCalls.length > 0 ? { toolCalls: m.toolCalls } : {}),
    }));
  }

  getSession(sessionId) {
    return this._sessions.get(sessionId) || null;
  }

  listSessions({ companyId, customerId, status } = {}) {
    let sessions = [...this._sessions.values()];
    if (companyId) sessions = sessions.filter(s => s.companyId === companyId);
    if (customerId) sessions = sessions.filter(s => s.customerId === customerId);
    if (status) sessions = sessions.filter(s => s.status === status);
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  closeSession(sessionId) {
    const session = this._sessions.get(sessionId);
    if (session) {
      session.status = 'CLOSED';
      session.updatedAt = Date.now();
    }
  }

  deleteSession(sessionId) {
    this._sessions.delete(sessionId);
  }

  getStats(sessionId) {
    const session = this._sessions.get(sessionId);
    if (!session) return null;
    return {
      messageCount: session.messages.length,
      toolCallCount: session.messages.reduce((sum, m) => sum + m.toolCalls.length, 0),
      duration: session.updatedAt - session.createdAt,
    };
  }

  _cleanup() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    for (const [id, session] of this._sessions) {
      if (session.status === 'CLOSED' && now - session.updatedAt > maxAge) {
        this._sessions.delete(id);
      }
    }
  }

  destroy() {
    clearInterval(this._cleanupInterval);
    this._sessions.clear();
  }
}

// Singleton
let manager = null;
function getConversationSessionManager() {
  if (!manager) manager = new ConversationSessionManager();
  return manager;
}

module.exports = { ConversationSessionManager, getConversationSessionManager };
