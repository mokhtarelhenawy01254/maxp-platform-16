/**
 * @module agentChatTranscriptService
 * @description Durable best-effort transcript storage for merchant ↔ CEOAgent
 * chat sessions. Redis/workingMemory stays the fast path; this keeps sessions
 * inspectable after the short memory TTL expires.
 */

const { getSharedPrismaClient } = require('../sharedDatabase');

function makeMessageId() {
  return `chatmsg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function toDate(value, fallback = new Date()) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function getDelegates(prisma) {
  const session = prisma.aIChatSession || prisma.aiChatSession;
  const message = prisma.aIChatMessage || prisma.aiChatMessage;
  const member = prisma.devTeamMember;
  if (!session || !message || !member) return null;
  return { session, message, member };
}

function toSession(row) {
  return {
    id: row.id,
    title: row.title || 'جلسة جديدة',
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt?.toISOString?.() || new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString?.() || new Date().toISOString(),
  };
}

class AgentChatTranscriptService {
  constructor() {
    this._memberCache = new Map();
  }

  async _withDb(operation, fallback) {
    try {
      const prisma = getSharedPrismaClient();
      const delegates = getDelegates(prisma);
      if (!delegates) return fallback;
      return await operation(delegates);
    } catch (error) {
      console.warn('[AGENT-CHAT-TRANSCRIPT] skipped:', error.message);
      return fallback;
    }
  }

  async _ensureMember(companyId, userId, delegates) {
    if (!companyId || !userId) return null;
    const cacheKey = `${companyId}:${userId}`;
    if (this._memberCache.has(cacheKey)) return this._memberCache.get(cacheKey);

    let member = await delegates.member.findUnique({ where: { userId } });
    if (!member) {
      member = await delegates.member.create({
        data: {
          userId,
          companyRelId: companyId,
          role: 'agent_chat_user',
          department: 'AI',
          skills: 'CEO Agent chat transcript',
          availability: 'available',
          isActive: true,
        },
      });
    }

    this._memberCache.set(cacheKey, member);
    return member;
  }

  async saveSession(companyId, userId, session = {}) {
    if (!session?.id) return null;
    return this._withDb(async (delegates) => {
      const member = await this._ensureMember(companyId, userId, delegates);
      if (!member?.id) return null;
      const now = new Date();
      return delegates.session.upsert({
        where: { id: session.id },
        create: {
          id: session.id,
          userId: member.id,
          title: session.title || 'جلسة جديدة',
          isActive: Boolean(session.isActive),
          createdAt: toDate(session.createdAt, now),
          updatedAt: toDate(session.updatedAt, now),
        },
        update: {
          title: session.title || 'جلسة جديدة',
          isActive: Boolean(session.isActive),
          updatedAt: toDate(session.updatedAt, now),
        },
      });
    }, null);
  }

  async saveSessions(companyId, userId, sessions = []) {
    for (const session of sessions || []) {
      await this.saveSession(companyId, userId, session);
    }
  }

  async listSessions(companyId, userId) {
    return this._withDb(async (delegates) => {
      const member = await this._ensureMember(companyId, userId, delegates);
      if (!member?.id) return [];
      const rows = await delegates.session.findMany({
        where: { userId: member.id },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });
      return rows.map(toSession);
    }, []);
  }

  async appendMessage(companyId, userId, session, { role, content, isError = false }) {
    if (!session?.id || !role || !String(content || '').trim()) return null;
    return this._withDb(async (delegates) => {
      await this.saveSession(companyId, userId, session);
      return delegates.message.create({
        data: {
          id: makeMessageId(),
          sessionId: session.id,
          role,
          content: String(content),
          isError: Boolean(isError),
        },
      });
    }, null);
  }

  async loadMessages(sessionId) {
    if (!sessionId) return [];
    return this._withDb(async (delegates) => {
      const rows = await delegates.message.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
        take: 200,
      });
      return rows.map(row => ({
        role: row.role,
        content: row.content,
        timestamp: row.createdAt?.toISOString?.() || new Date().toISOString(),
        isError: Boolean(row.isError),
      }));
    }, []);
  }

  async deleteSession(sessionId) {
    if (!sessionId) return null;
    return this._withDb(async (delegates) => {
      return delegates.session.deleteMany({ where: { id: sessionId } });
    }, null);
  }
}

module.exports = new AgentChatTranscriptService();
