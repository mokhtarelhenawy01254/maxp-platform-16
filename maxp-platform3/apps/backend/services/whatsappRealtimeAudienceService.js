const { getSharedPrismaClient } = require('./sharedDatabase');
const {
  ROUTING_MODES,
  getAssignmentRoutingUserIds,
  normalizeRoutingMode
} = require('./whatsappConversationRoutingService');

function buildSessionMetadataWhere(sessionId, remoteJid) {
  return {
    AND: [
      {
        OR: [
          { metadata: { contains: `"sessionId":"${sessionId}"` } },
          { metadata: { contains: `"whatsappSessionId":"${sessionId}"` } },
          { metadata: { contains: `sessionId:${sessionId}` } },
          { metadata: { contains: `whatsappSessionId:${sessionId}` } }
        ]
      },
      {
        metadata: { contains: `"remoteJid":"${remoteJid}"` }
      }
    ]
  };
}

async function getConversationAudience({
  companyId,
  sessionId,
  conversationId = null,
  remoteJid = null
}) {
  const prisma = getSharedPrismaClient();

  const [conversation, assignment, users] = await Promise.all([
    conversationId
      ? prisma.conversation.findFirst({
          where: {
            id: conversationId,
            companyId,
            channel: 'WHATSAPP'
          },
          select: {
            id: true,
            assignedUserId: true
          }
        })
      : sessionId && remoteJid
        ? prisma.conversation.findFirst({
            where: {
              companyId,
              channel: 'WHATSAPP',
              ...buildSessionMetadataWhere(sessionId, remoteJid)
            },
            select: {
              id: true,
              assignedUserId: true
            }
          })
        : null,
    sessionId
      ? prisma.whatsAppNumberAssignment.findFirst({
          where: {
            companyId,
            sessionId,
            isActive: true
          },
          select: {
            assignedUserId: true,
            routingMode: true,
            routingUserIds: true,
            team: {
              select: {
                members: {
                  where: { isActive: true },
                  select: { userId: true }
                }
              }
            }
          }
        })
      : null,
    prisma.user.findMany({
      where: { companyId, isActive: true },
      select: { id: true, role: true }
    })
  ]);

  const audience = new Set();

  // 1. Add all admins and team leaders of the company to the audience
  const { normalizeRole } = require('../middleware/rbacMiddleware');
  users.forEach((user) => {
    const role = normalizeRole(user.role);
    if (role === 'SUPER_ADMIN' || role === 'COMPANY_ADMIN' || role === 'TEAM_LEADER') {
      audience.add(user.id);
    }
  });

  // 2. Add agents based on routing assignment and conversation assignment state
  if (assignment) {
    const routingMode = normalizeRoutingMode(assignment.routingMode);
    const routingUserIds = getAssignmentRoutingUserIds(assignment);
    const teamUserIds = assignment.team?.members?.map((m) => m.userId).filter(Boolean) || [];

    if (conversation?.assignedUserId) {
      if (routingMode === ROUTING_MODES.SHARED_INBOX) {
        // Shared Inbox: all agents in assignment pool can see and access
        routingUserIds.forEach(id => audience.add(id));
        teamUserIds.forEach(id => audience.add(id));
        if (assignment.assignedUserId) audience.add(assignment.assignedUserId);
        audience.add(conversation.assignedUserId);
      } else {
        // Round Robin or Number Owner: only the assigned agent has access
        audience.add(conversation.assignedUserId);
      }
    } else {
      // Unassigned: all agents in assignment pool can see and access
      routingUserIds.forEach(id => audience.add(id));
      teamUserIds.forEach(id => audience.add(id));
      if (assignment.assignedUserId) audience.add(assignment.assignedUserId);
    }
  }

  return {
    conversationId: conversation?.id || null,
    assignedUserId: conversation?.assignedUserId || null,
    userIds: Array.from(audience)
  };
}

function emitToUsers(io, userIds, eventName, payload) {
  if (!io || !Array.isArray(userIds) || userIds.length === 0) {
    return false;
  }

  const uniqueUserIds = Array.from(
    new Set(userIds.map((userId) => String(userId || '').trim()).filter(Boolean))
  );

  uniqueUserIds.forEach((userId) => {
    io.to(`user_${userId}`).emit(eventName, payload);
  });

  return uniqueUserIds.length > 0;
}

function emitToAudience(
  io,
  {
    companyId,
    userIds,
    eventName,
    payload,
    fallbackToCompany = false
  }
) {
  const deliveredToUsers = emitToUsers(io, userIds, eventName, payload);

  if (!deliveredToUsers && fallbackToCompany && companyId) {
    io?.to(`company_${companyId}`).emit(eventName, payload);
  }
}

module.exports = {
  getConversationAudience,
  emitToUsers,
  emitToAudience
};
