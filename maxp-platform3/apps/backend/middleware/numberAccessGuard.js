const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { normalizeRole } = require('./rbacMiddleware');
const {
  ROUTING_MODES,
  getAssignmentRoutingUserIds,
  normalizeRoutingMode
} = require('../services/whatsappConversationRoutingService');

const getTeamMemberIds = (assignment) =>
  assignment?.team?.members?.map((member) => member.userId).filter(Boolean) || [];

const canAccessSessionAssignment = (assignment, userId) => {
  if (!assignment) return false;

  const routingUserIds = getAssignmentRoutingUserIds(assignment);
  if (routingUserIds.includes(userId)) {
    return true;
  }

  return getTeamMemberIds(assignment).includes(userId);
};

const numberAccessGuard = (paramName = 'sessionId') => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const companyId = req.user?.companyId;
      const userRole = normalizeRole(req.user?.role);

      if (!userId || !companyId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (
        userRole === 'SUPER_ADMIN' ||
        userRole === 'COMPANY_ADMIN' ||
        userRole === 'TEAM_LEADER'
      ) {
        return next();
      }

      const prisma = getSharedPrismaClient();
      const sessionId = req.params[paramName] || req.body[paramName] || req.query[paramName];

      if (!sessionId) {
        return next();
      }

      const assignment = await prisma.whatsAppNumberAssignment.findFirst({
        where: {
          sessionId,
          companyId,
          isActive: true
        },
        include: {
          team: {
            select: {
              members: {
                where: { isActive: true },
                select: { userId: true }
              }
            }
          }
        }
      });

      if (!canAccessSessionAssignment(assignment, userId)) {
        return res.status(403).json({
          error: 'Access denied: You are not assigned to this WhatsApp number',
          code: 'NUMBER_ACCESS_DENIED'
        });
      }

      next();
    } catch (error) {
      console.error('[NumberAccessGuard] Error:', error.message);
      return res.status(500).json({ error: 'Access check failed' });
    }
  };
};

const conversationAccessGuard = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const companyId = req.user?.companyId;
    const userRole = normalizeRole(req.user?.role);

    if (!userId || !companyId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (
      userRole === 'SUPER_ADMIN' ||
      userRole === 'COMPANY_ADMIN' ||
      userRole === 'TEAM_LEADER'
    ) {
      return next();
    }

    const conversationId =
      req.params.conversationId || req.query.conversationId || req.body.conversationId;
    if (!conversationId) {
      return next();
    }

    const prisma = getSharedPrismaClient();

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        companyId: true,
        assignedUserId: true,
        metadata: true
      }
    });

    if (!conversation || conversation.companyId !== companyId) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    let sessionId = null;
    try {
      const meta = JSON.parse(conversation.metadata || '{}');
      sessionId = meta.sessionId || meta.whatsappSessionId;
    } catch (error) {
      sessionId = null;
    }

    if (!sessionId) {
      if (conversation.assignedUserId === userId) {
        return next();
      }

      return res.status(403).json({
        error: 'Access denied: This conversation is outside your WhatsApp access scope',
        code: 'CONVERSATION_ACCESS_DENIED'
      });
    }

    const assignment = await prisma.whatsAppNumberAssignment.findFirst({
      where: {
        sessionId,
        companyId,
        isActive: true
      },
      include: {
        team: {
          select: {
            members: {
              where: { isActive: true },
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!canAccessSessionAssignment(assignment, userId)) {
      return res.status(403).json({
        error: 'Access denied: This conversation does not belong to your assigned numbers',
        code: 'CONVERSATION_ACCESS_DENIED'
      });
    }

    const routingMode = normalizeRoutingMode(assignment?.routingMode);
    if (
      routingMode === ROUTING_MODES.ROUND_ROBIN &&
      conversation.assignedUserId &&
      conversation.assignedUserId !== userId
    ) {
      return res.status(403).json({
        error: 'Access denied: This conversation is assigned to another employee',
        code: 'CONVERSATION_ACCESS_DENIED'
      });
    }

    if (
      routingMode === ROUTING_MODES.SHARED_INBOX
    ) {
      return next();
    }

    next();
  } catch (error) {
    console.error('[ConversationAccessGuard] Error:', error.message);
    return res.status(500).json({ error: 'Conversation access check failed' });
  }
};

const getUserAccessibleSessionIds = async (userId, companyId, prisma) => {
  const userRole = normalizeRole(
    (
      await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      })
    )?.role
  );

  const assignments = await prisma.whatsAppNumberAssignment.findMany({
    where: {
      companyId,
      isActive: true
    },
    include: {
      session: {
        select: { id: true, phoneNumber: true, name: true, status: true }
      },
      team: {
        select: {
          members: {
            where: { isActive: true },
            select: { userId: true }
          }
        }
      }
    }
  });

  if (
    userRole === 'SUPER_ADMIN' ||
    userRole === 'COMPANY_ADMIN' ||
    userRole === 'TEAM_LEADER'
  ) {
    return Array.from(
      new Map(
        assignments
          .filter((assignment) => assignment.session)
          .map((assignment) => [assignment.session.id, assignment.session])
      ).values()
    );
  }

  const allowedSessions = assignments.filter((assignment) =>
    canAccessSessionAssignment(assignment, userId)
  );

  return Array.from(
    new Map(
      allowedSessions
        .filter((assignment) => assignment.session)
        .map((assignment) => [assignment.session.id, assignment.session])
    ).values()
  );
};

module.exports = {
  numberAccessGuard,
  conversationAccessGuard,
  getUserAccessibleSessionIds
};
