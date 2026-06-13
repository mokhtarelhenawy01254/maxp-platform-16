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

  const [conversation, assignment] = await Promise.all([
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
            routingUserIds: true
          }
        })
      : null
  ]);

  const audience = new Set();

  if (conversation?.assignedUserId) {
    audience.add(conversation.assignedUserId);
  } else if (assignment) {
    const routingMode = normalizeRoutingMode(assignment.routingMode);
    const routingUserIds = getAssignmentRoutingUserIds(assignment);

    if (
      routingMode === ROUTING_MODES.NUMBER_OWNER &&
      assignment.assignedUserId
    ) {
      audience.add(assignment.assignedUserId);
    } else if (routingUserIds.length > 0) {
      audience.add(routingUserIds[0]);
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
    fallbackToCompany = true
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
