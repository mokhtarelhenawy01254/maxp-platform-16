const { getSharedPrismaClient } = require('./sharedDatabase');
const redisCacheService = require('./redisCacheService');
const {
  ROUTING_MODES,
  DISTRIBUTION_STRATEGIES,
  getAssignmentRoutingUserIds,
  normalizeDistributionStrategy,
  normalizeRoutingMode,
  parseRoutingUserIds,
  serializeRoutingUserIds
} = require('./whatsappConversationRoutingService');

class NumberAssignmentService {
  async assignNumber(sessionId, companyId, assignedUserId, assignedByUserId, teamId = null) {
    return this.saveRoutingRule(
      sessionId,
      companyId,
      {
        routingMode: ROUTING_MODES.NUMBER_OWNER,
        distributionStrategy: DISTRIBUTION_STRATEGIES.ROUND_ROBIN,
        userIds: [assignedUserId],
        teamId
      },
      assignedByUserId
    );
  }

  async saveRoutingRule(sessionId, companyId, config, actorUserId) {
    const prisma = getSharedPrismaClient();
    const routingMode = normalizeRoutingMode(config?.routingMode);
    const distributionStrategy = normalizeDistributionStrategy(
      config?.distributionStrategy
    );
    const normalizedUserIds = Array.from(
      new Set(
        (config?.userIds || [])
          .map((entry) => String(entry || '').trim())
          .filter(Boolean)
      )
    );

    if (routingMode === ROUTING_MODES.NUMBER_OWNER && normalizedUserIds.length !== 1) {
      throw new Error('NUMBER_OWNER mode requires exactly one employee.');
    }

    if (routingMode === ROUTING_MODES.ROUND_ROBIN && normalizedUserIds.length < 2) {
      throw new Error('ROUND_ROBIN mode requires at least two employees.');
    }

    const session = await prisma.whatsAppSession.findFirst({
      where: { id: sessionId, companyId },
      select: { id: true }
    });

    if (!session) {
      throw new Error('WhatsApp session not found.');
    }

    const users = await prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        id: { in: normalizedUserIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        role: true,
        isActive: true
      },
      orderBy: { firstName: 'asc' }
    });

    if (users.length !== normalizedUserIds.length) {
      throw new Error('One or more selected employees are invalid or inactive.');
    }

    const serializedUserIds = serializeRoutingUserIds(normalizedUserIds);
    const assignedUserId =
      routingMode === ROUTING_MODES.NUMBER_OWNER ? normalizedUserIds[0] : null;

    const existing = await prisma.whatsAppNumberAssignment.findUnique({
      where: { sessionId }
    });

    const nextData = {
      companyId,
      assignedUserId,
      routingMode,
      distributionStrategy,
      routingUserIds: serializedUserIds,
      roundRobinCursor: 0,
      lastDistributedUserId: null,
      lastDistributedAt: null,
      teamId: config?.teamId || null,
      assignedByUserId: actorUserId,
      assignedAt: new Date(),
      unassignedAt: null,
      isActive: true
    };

    const assignment = existing
      ? await prisma.whatsAppNumberAssignment.update({
          where: { sessionId },
          data: nextData,
          include: {
            session: {
              select: {
                id: true,
                phoneNumber: true,
                name: true,
                status: true,
                provider: true,
                profileName: true,
                lastConnectedAt: true
              }
            }
          }
        })
      : await prisma.whatsAppNumberAssignment.create({
          data: {
            sessionId,
            ...nextData
          },
          include: {
            session: {
              select: {
                id: true,
                phoneNumber: true,
                name: true,
                status: true,
                provider: true,
                profileName: true,
                lastConnectedAt: true
              }
            }
          }
        });

    await this._logActivity(
      companyId,
      actorUserId,
      existing ? 'UPDATE_NUMBER_ROUTING' : 'ASSIGN_NUMBER',
      'session',
      sessionId,
      {
        routingMode,
        distributionStrategy,
        userIds: normalizedUserIds
      }
    );

    await redisCacheService.del(`dash:${companyId}:*`);

    return this._decorateAssignment(assignment, users);
  }

  async unassignNumber(sessionId, companyId, userId) {
    const prisma = getSharedPrismaClient();

    const updated = await prisma.whatsAppNumberAssignment.update({
      where: { sessionId },
      data: {
        assignedUserId: null,
        routingUserIds: serializeRoutingUserIds([]),
        routingMode: ROUTING_MODES.NUMBER_OWNER,
        distributionStrategy: DISTRIBUTION_STRATEGIES.ROUND_ROBIN,
        roundRobinCursor: 0,
        lastDistributedUserId: null,
        lastDistributedAt: null,
        teamId: null,
        unassignedAt: new Date(),
        isActive: false,
        assignedByUserId: userId
      },
      include: {
        session: {
          select: {
            id: true,
            phoneNumber: true,
            name: true,
            status: true,
            provider: true,
            profileName: true,
            lastConnectedAt: true
          }
        }
      }
    });

    await this._logActivity(companyId, userId, 'UNASSIGN_NUMBER', 'session', sessionId, {});
    await redisCacheService.del(`dash:${companyId}:*`);

    return this._decorateAssignment(updated, []);
  }

  async getCompanyAssignments(companyId) {
    const prisma = getSharedPrismaClient();

    const assignments = await prisma.whatsAppNumberAssignment.findMany({
      where: { companyId },
      include: {
        session: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            status: true,
            lastConnectedAt: true,
            provider: true,
            profileName: true
          }
        },
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            isActive: true
          }
        },
        team: {
          select: { id: true, name: true }
        },
        assignedByUser: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const routingUserIds = Array.from(
      new Set(assignments.flatMap((assignment) => parseRoutingUserIds(assignment.routingUserIds)))
    );

    const routingUsers = routingUserIds.length
      ? await prisma.user.findMany({
          where: {
            companyId,
            id: { in: routingUserIds }
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            role: true,
            isActive: true
          },
          orderBy: { firstName: 'asc' }
        })
      : [];

    return assignments.map((assignment) =>
      this._decorateAssignment(assignment, routingUsers)
    );
  }

  async getRoutingWorkspace(companyId) {
    const prisma = getSharedPrismaClient();
    const [sessions, assignments, moderators] = await Promise.all([
      prisma.whatsAppSession.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          status: true,
          provider: true,
          profileName: true,
          lastConnectedAt: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.getCompanyAssignments(companyId),
      this.getAvailableModerators(companyId)
    ]);

    const assignmentMap = new Map(assignments.map((assignment) => [assignment.sessionId, assignment]));

    const numbers = sessions.map((session) => {
      const assignment = assignmentMap.get(session.id) || null;
      const routingMembers = assignment?.routingUsers || [];
      const activeMembers = routingMembers.filter((member) => member.isActive);
      const routingMode = assignment?.routingMode || ROUTING_MODES.NUMBER_OWNER;

      return {
        id: session.id,
        sessionId: session.id,
        session,
        assignmentId: assignment?.id || null,
        isConfigured: Boolean(assignment?.isActive),
        connectionStatus: session.status || assignment?.connectionStatus || 'DISCONNECTED',
        routingMode,
        distributionStrategy:
          assignment?.distributionStrategy || DISTRIBUTION_STRATEGIES.ROUND_ROBIN,
        assignedUser: assignment?.assignedUser || null,
        routingUsers: routingMembers,
        routingUserIds: routingMembers.map((member) => member.id),
        activeMemberCount: activeMembers.length,
        lastDistributedUserId: assignment?.lastDistributedUserId || null,
        lastDistributedAt: assignment?.lastDistributedAt || null,
        roundRobinCursor: assignment?.roundRobinCursor || 0,
        assignedAt: assignment?.assignedAt || null,
        isActive: assignment?.isActive || false
      };
    });

    return {
      numbers,
      moderators,
      stats: {
        totalNumbers: numbers.length,
        configuredNumbers: numbers.filter((number) => number.isConfigured).length,
        exclusiveNumbers: numbers.filter(
          (number) => number.isConfigured && number.routingMode === ROUTING_MODES.NUMBER_OWNER
        ).length,
        roundRobinNumbers: numbers.filter(
          (number) => number.isConfigured && number.routingMode === ROUTING_MODES.ROUND_ROBIN
        ).length,
        connectedNumbers: numbers.filter(
          (number) => number.connectionStatus === 'CONNECTED'
        ).length
      }
    };
  }

  async getSessionAssignment(sessionId) {
    const prisma = getSharedPrismaClient();

    const assignment = await prisma.whatsAppNumberAssignment.findUnique({
      where: { sessionId },
      include: {
        session: {
          select: { id: true, name: true, phoneNumber: true, status: true }
        },
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true }
        },
        team: {
          select: { id: true, name: true }
        }
      }
    });

    if (!assignment) {
      return null;
    }

    const routingUserIds = parseRoutingUserIds(assignment.routingUserIds);
    const routingUsers = routingUserIds.length
      ? await prisma.user.findMany({
          where: { id: { in: routingUserIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            role: true,
            isActive: true
          },
          orderBy: { firstName: 'asc' }
        })
      : [];

    return this._decorateAssignment(assignment, routingUsers);
  }

  async getAvailableSessions(companyId) {
    const prisma = getSharedPrismaClient();

    const assignedIds = await prisma.whatsAppNumberAssignment.findMany({
      where: { companyId, isActive: true },
      select: { sessionId: true }
    });

    const ids = assignedIds.map((assignment) => assignment.sessionId);

    return prisma.whatsAppSession.findMany({
      where: {
        companyId,
        ...(ids.length > 0 ? { id: { notIn: ids } } : {})
      },
      select: { id: true, name: true, phoneNumber: true, status: true, createdAt: true }
    });
  }

  async getAvailableModerators(companyId) {
    const prisma = getSharedPrismaClient();

    return prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        role: { in: ['AGENT', 'MANAGER'] }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        role: true,
        isActive: true
      },
      orderBy: { firstName: 'asc' }
    });
  }

  async updateConnectionStatus(sessionId, companyId, status) {
    const prisma = getSharedPrismaClient();

    const data = { connectionStatus: status };
    if (status === 'CONNECTED') {
      data.lastConnectedAt = new Date();
    } else if (status === 'DISCONNECTED') {
      data.lastDisconnectedAt = new Date();
    }

    return prisma.whatsAppNumberAssignment.update({
      where: { sessionId },
      data
    });
  }

  async getModeratorNumbers(companyId, userId) {
    const workspace = await this.getRoutingWorkspace(companyId);

    return workspace.numbers
      .filter((entry) => {
        if (!entry.isConfigured) return false;

        const allowedIds =
          entry.routingMode === ROUTING_MODES.ROUND_ROBIN
            ? entry.routingUserIds
            : entry.assignedUser
              ? [entry.assignedUser.id]
              : entry.routingUserIds;

        return allowedIds.includes(userId);
      })
      .map((entry) => ({
        ...entry.session,
        assignmentId: entry.assignmentId,
        assignedAt: entry.assignedAt,
        workingHoursStart: null,
        workingHoursEnd: null,
        routingMode: entry.routingMode,
        routingUserIds: entry.routingUserIds
      }));
  }

  _decorateAssignment(assignment, routingUsers) {
    const routingIds = getAssignmentRoutingUserIds(assignment);
    const orderedRoutingUsers = routingIds
      .map((userId) => routingUsers.find((user) => user.id === userId))
      .filter(Boolean);

    return {
      ...assignment,
      routingMode: normalizeRoutingMode(assignment.routingMode),
      distributionStrategy: normalizeDistributionStrategy(
        assignment.distributionStrategy
      ),
      routingUserIds: routingIds,
      routingUsers: orderedRoutingUsers
    };
  }

  async _logActivity(companyId, userId, action, entityType, entityId, metadata = {}) {
    try {
      const prisma = getSharedPrismaClient();
      await prisma.moderatorActivityLog.create({
        data: {
          companyId,
          userId,
          action,
          entityType,
          entityId,
          metadata: JSON.stringify(metadata)
        }
      });
    } catch (error) {
      console.error('[ActivityLog] Error:', error.message);
    }
  }
}

module.exports = new NumberAssignmentService();
