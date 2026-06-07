/**
 * @module aiSessionService
 * @description Manages AI agent chat sessions and history.
 */

const { getSharedPrismaClient } = require('./sharedDatabase');

async function getHistory(companyId, userId, sessionId, user) {
  try {
    const prisma = getSharedPrismaClient();
    const where = { companyId };
    if (sessionId) where.id = sessionId;
    if (userId) where.userId = userId;
    const session = sessionId
      ? await prisma.aIChatSession.findFirst({ where, include: { messages: { orderBy: { createdAt: 'asc' } } } })
      : await prisma.aIChatSession.findFirst({ where: { companyId, userId }, orderBy: { updatedAt: 'desc' }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    return session ? session.messages : [];
  } catch {
    return [];
  }
}

async function clearHistory(companyId, userId, sessionId) {
  try {
    const prisma = getSharedPrismaClient();
    if (sessionId) {
      await prisma.aIChatMessage.deleteMany({ where: { sessionId } });
      return { success: true };
    }
    const sessions = await prisma.aIChatSession.findMany({ where: { companyId, userId } });
    for (const s of sessions) {
      await prisma.aIChatMessage.deleteMany({ where: { sessionId: s.id } });
    }
    return { success: true };
  } catch {
    return { success: false };
  }
}

async function listSessions(companyId, userId) {
  try {
    const prisma = getSharedPrismaClient();
    return await prisma.aIChatSession.findMany({
      where: { companyId, userId },
      orderBy: { updatedAt: 'desc' },
    });
  } catch {
    return [];
  }
}

async function createSession(companyId, userId, user, options = {}) {
  try {
    const prisma = getSharedPrismaClient();
    return await prisma.aIChatSession.create({
      data: {
        companyId,
        userId,
        title: options.title || 'New conversation',
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      },
    });
  } catch {
    return { id: null, companyId, userId };
  }
}

async function getAgentStatus(companyId) {
  return { status: 'active', companyId };
}

module.exports = {
  getHistory,
  clearHistory,
  listSessions,
  createSession,
  getAgentStatus,
};
