const { getSharedPrismaClient } = require('./sharedDatabase');

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function listSessions(companyId, userId, includeDeleted = false) {
  const prisma = getSharedPrismaClient();
  const userSessions = await prisma.aiSandboxSession.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(userId ? { userId } : {}),
      ...(includeDeleted ? {} : { isDeleted: false }),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { messages: true } },
    },
  });
  return userSessions;
}

async function getSession(sessionId, companyId) {
  const prisma = getSharedPrismaClient();
  return prisma.aiSandboxSession.findFirst({
    where: {
      id: sessionId,
      ...(companyId ? { companyId } : {}),
      isDeleted: false,
    },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
}

async function createSession(data) {
  const prisma = getSharedPrismaClient();
  return prisma.aiSandboxSession.create({
    data: {
      id: data.id || generateId(),
      companyId: data.companyId,
      userId: data.userId,
      title: data.title || 'New Session',
      agentId: data.agentId,
      agentName: data.agentName || null,
      agentRole: data.agentRole || null,
      model: data.model,
      provider: data.provider,
      keyId: data.keyId || null,
    },
  });
}

async function updateSessionTitle(sessionId, title, companyId) {
  const prisma = getSharedPrismaClient();
  return prisma.aiSandboxSession.updateMany({
    where: {
      id: sessionId,
      ...(companyId ? { companyId } : {}),
      isDeleted: false,
    },
    data: { title },
  });
}

async function deleteSession(sessionId, companyId) {
  const prisma = getSharedPrismaClient();
  return prisma.aiSandboxSession.updateMany({
    where: {
      id: sessionId,
      ...(companyId ? { companyId } : {}),
      isDeleted: false,
    },
    data: { isDeleted: true },
  });
}

async function addMessage(sessionId, companyId, data) {
  const prisma = getSharedPrismaClient();
  const msg = await prisma.aiSandboxMessage.create({
    data: {
      id: generateId(),
      sessionId,
      role: data.role,
      content: data.content,
      model: data.model || null,
      provider: data.provider || null,
      keyId: data.keyId || null,
      keyName: data.keyName || null,
      tokensInput: data.tokensInput || 0,
      tokensOutput: data.tokensOutput || 0,
      tokensTotal: (data.tokensInput || 0) + (data.tokensOutput || 0),
      latencyMs: data.latencyMs || null,
      cost: data.cost || 0,
      toolCalls: data.toolCalls ? JSON.stringify(data.toolCalls) : null,
      metadata: data.metadata || null,
    },
  });

  await prisma.aiSandboxSession.update({
    where: { id: sessionId },
    data: {
      messageCount: { increment: 1 },
      toolCallCount: { increment: data.toolCallCount || 0 },
      totalCost: { increment: data.cost || 0 },
      totalTokens: { increment: (data.tokensInput || 0) + (data.tokensOutput || 0) },
    },
  });

  return msg;
}

async function updateSessionAfterMessage(sessionId, companyId, stats) {
  const prisma = getSharedPrismaClient();
  const session = await prisma.aiSandboxSession.findFirst({
    where: { id: sessionId, companyId },
  });
  if (!session) return;

  const newMsgCount = session.messageCount + 1;
  const newAvgLatency = stats.latencyMs
    ? ((session.avgLatency * session.messageCount) + stats.latencyMs) / newMsgCount
    : session.avgLatency;

  await prisma.aiSandboxSession.update({
    where: { id: sessionId },
    data: {
      messageCount: newMsgCount,
      toolCallCount: { increment: stats.toolCallCount || 0 },
      totalCost: { increment: stats.cost || 0 },
      totalTokens: { increment: stats.tokens || 0 },
      avgLatency: newAvgLatency,
    },
  });
}

module.exports = {
  listSessions,
  getSession,
  createSession,
  updateSessionTitle,
  deleteSession,
  addMessage,
  updateSessionAfterMessage,
};
