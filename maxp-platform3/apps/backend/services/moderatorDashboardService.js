const { getSharedPrismaClient } = require('./sharedDatabase');
const redisCacheService = require('./redisCacheService');
const socketService = require('./socketService');
const { normalizeRole } = require('../middleware/rbacMiddleware');
const { buildQueueKeyFromStatus, safeJsonParse } = require('./whatsappInboxMetadata');

const SUPERVISOR_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'];

class ModeratorDashboardService {
  async getDashboardData(companyId, userId, userRole, sessionId = null) {
    const prisma = getSharedPrismaClient();
    const normalizedRole = normalizeRole(userRole);

    const cacheKey = `dash:v2:${companyId}:${userId}:${normalizedRole}:${sessionId || 'all'}`;
    const cached = await redisCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const userSessionIds = await this._getUserSessionIds(companyId, userId, normalizedRole);
    if (!SUPERVISOR_ROLES.includes(normalizedRole) && userSessionIds.length === 0) {
      return this._emptyDashboard();
    }

    const visibleWhere = {
      companyId,
      channel: 'WHATSAPP',
      ...(sessionId ? this._buildSessionFilter(sessionId) : {}),
      ...this._buildVisibilityFilter(userId, normalizedRole)
    };

    const conversationMetrics = await prisma.conversation.findMany({
      where: visibleWhere,
      select: {
        id: true,
        status: true,
        lastMessageAt: true,
        lastMessageIsFromCustomer: true,
        createdAt: true,
        updatedAt: true,
        isRead: true,
        metadata: true
      }
    });

    const latestConversationsSource = await prisma.conversation.findMany({
      where: visibleWhere,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true, phone: true, avatar: true }
        },
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true, department: true }
        }
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 150
    });

    const sessionStatuses = await this._getSessionConnectionStatuses(companyId, sessionId ? [sessionId] : userSessionIds, normalizedRole);
    const moderatorWorkloads = await this._getModeratorWorkloads(companyId, sessionId, normalizedRole, userId);
    const avgResponseTime = await this._calculateAvgResponseTime(companyId, sessionId ? this._buildSessionFilter(sessionId) : {});

    const queueCounters = this._calculateQueueCounters(conversationMetrics);
    const stats = this._calculateStats(conversationMetrics, queueCounters, avgResponseTime, moderatorWorkloads);

    const result = {
      stats,
      queueCounters,
      sessionStatuses,
      moderatorWorkloads,
      latestConversations: latestConversationsSource.slice(0, 12).map((conversation) => this._formatConversationSummary(conversation)),
      slaSummary: {
        atRisk: queueCounters.slaAtRisk,
        breached: queueCounters.slaBreached
      },
      cachedAt: new Date().toISOString()
    };

    await redisCacheService.set(cacheKey, result, 30);
    return result;
  }

  async getTeamDashboard(companyId, teamId) {
    const prisma = getSharedPrismaClient();
    const teamMembers = await prisma.moderatorTeamMember.findMany({
      where: { teamId, companyId, isActive: true },
      select: { userId: true }
    });
    const memberIds = teamMembers.map((member) => member.userId);

    const conversations = await prisma.conversation.findMany({
      where: {
        companyId,
        channel: 'WHATSAPP',
        assignedUserId: { in: memberIds }
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, avatar: true } },
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, department: true } }
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50
    });

    const queueCounters = this._calculateQueueCounters(conversations);

    return {
      teamConversations: conversations.map((conversation) => this._formatConversationSummary(conversation)),
      memberStats: await this._getModeratorWorkloads(companyId, null, 'TEAM_LEADER', null, memberIds),
      queueCounters,
      totalActive: queueCounters.assigned + queueCounters.pending,
      totalUnread: conversations.filter((conversation) => !conversation.isRead).length,
      totalToday: conversations.filter((conversation) => this._isToday(conversation.createdAt)).length
    };
  }

  async getAllAdminDashboard(companyId) {
    const prisma = getSharedPrismaClient();
    const sessions = await prisma.whatsAppSession.findMany({
      where: { companyId },
      select: { id: true }
    });

    const dashboard = await this.getDashboardData(companyId, 'admin-dashboard', 'COMPANY_ADMIN');
    return {
      totalSessions: sessions.length,
      totalConversations: dashboard.queueCounters.total,
      activeConversations: dashboard.queueCounters.assigned + dashboard.queueCounters.pending,
      closedToday: dashboard.stats.closedChats,
      newToday: dashboard.stats.newChats,
      unreadTotal: dashboard.stats.unreadCount,
      topModerators: dashboard.moderatorWorkloads.slice(0, 10)
    };
  }

  _buildSessionFilter(sessionId) {
    return {
      OR: [
        { metadata: { contains: `"sessionId":"${sessionId}"` } },
        { metadata: { contains: `"whatsappSessionId":"${sessionId}"` } }
      ]
    };
  }

  _buildVisibilityFilter(userId, normalizedRole) {
    if (SUPERVISOR_ROLES.includes(normalizedRole)) {
      return {};
    }

    return { assignedUserId: userId };
  }

  async _getUserSessionIds(companyId, userId, normalizedRole) {
    const prisma = getSharedPrismaClient();
    if (SUPERVISOR_ROLES.includes(normalizedRole)) {
      const sessions = await prisma.whatsAppSession.findMany({
        where: { companyId },
        select: { id: true }
      });
      return sessions.map((session) => session.id);
    }

    const assignments = await prisma.whatsAppNumberAssignment.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { assignedUserId: userId },
          { team: { members: { some: { userId, isActive: true } } } }
        ]
      },
      select: { sessionId: true }
    });
    return assignments.map((assignment) => assignment.sessionId);
  }

  async _getSessionConnectionStatuses(companyId, sessionIds, normalizedRole) {
    const prisma = getSharedPrismaClient();
    const where = SUPERVISOR_ROLES.includes(normalizedRole)
      ? { companyId }
      : { companyId, id: { in: sessionIds } };

    const sessions = await prisma.whatsAppSession.findMany({
      where,
      select: { id: true, name: true, phoneNumber: true, status: true, lastConnectedAt: true }
    });

    return sessions.map((session) => ({
      id: session.id,
      name: session.name,
      phoneNumber: session.phoneNumber,
      status: session.status,
      lastConnectedAt: session.lastConnectedAt,
      isOnline: session.status === 'CONNECTED'
    }));
  }

  async _getModeratorWorkloads(companyId, sessionId = null, normalizedRole = 'COMPANY_ADMIN', userId = null, scopedUserIds = null) {
    const prisma = getSharedPrismaClient();
    const moderators = await prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
        ...(scopedUserIds ? { id: { in: scopedUserIds } } : {}),
        role: { in: ['AGENT', 'MODERATOR', 'MANAGER'] }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true
      }
    });

    const visibleModerators = SUPERVISOR_ROLES.includes(normalizedRole)
      ? moderators
      : moderators.filter((moderator) => moderator.id === userId);

    const workloads = await Promise.all(
      visibleModerators.map(async (moderator) => {
        const where = {
          companyId,
          channel: 'WHATSAPP',
          assignedUserId: moderator.id,
          ...(sessionId ? this._buildSessionFilter(sessionId) : {})
        };

        const [assigned, pending, closedToday, unread, avgResponseTime] = await Promise.all([
          prisma.conversation.count({
            where: { ...where, status: { in: ['ASSIGNED', 'ACTIVE', 'ESCALATED'] } }
          }),
          prisma.conversation.count({
            where: { ...where, status: { in: ['PENDING', 'WAITING_CUSTOMER'] } }
          }),
          prisma.conversation.count({
            where: {
              ...where,
              status: 'CLOSED',
              updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }
          }),
          prisma.conversation.count({
            where: { ...where, isRead: false }
          }),
          this._calculateAvgResponseTime(companyId, {
            assignedUserId: moderator.id,
            ...(sessionId ? this._buildSessionFilter(sessionId) : {})
          })
        ]);

        return {
          userId: moderator.id,
          user: {
            id: moderator.id,
            name: `${moderator.firstName || ''} ${moderator.lastName || ''}`.trim() || moderator.id,
            role: moderator.role,
            department: moderator.department || null
          },
          online: socketService.isUserOnline(moderator.id),
          assigned,
          pending,
          unread,
          closedToday,
          avgResponseTime: Math.round(avgResponseTime),
          workload: assigned + pending
        };
      })
    );

    return workloads.sort((left, right) => right.workload - left.workload);
  }

  _calculateQueueCounters(conversations) {
    const counters = {
      total: conversations.length,
      waiting: 0,
      assigned: 0,
      pending: 0,
      closed: 0,
      escalated: 0,
      slaAtRisk: 0,
      slaBreached: 0,
      missedChats: 0
    };

    const now = Date.now();

    for (const conversation of conversations) {
      const status = String(conversation.status || '').toUpperCase();
      const queueKey = buildQueueKeyFromStatus(status);
      const metadata = safeJsonParse(conversation.metadata, {});
      const sla = metadata.sla || {};

      if (queueKey === 'WAITING_QUEUE') counters.waiting += 1;
      if (queueKey === 'ASSIGNED_QUEUE') counters.assigned += 1;
      if (queueKey === 'PENDING_QUEUE') counters.pending += 1;
      if (queueKey === 'CLOSED_QUEUE') counters.closed += 1;
      if (status === 'ESCALATED') counters.escalated += 1;

      if (sla.maxWaitingDeadlineAt) {
        const deadline = new Date(sla.maxWaitingDeadlineAt).getTime();
        if (deadline < now) {
          counters.slaBreached += 1;
        } else if ((deadline - now) / 60000 <= 5) {
          counters.slaAtRisk += 1;
        }
      }

      if (conversation.lastMessageIsFromCustomer && conversation.lastMessageAt && ((now - new Date(conversation.lastMessageAt).getTime()) / 60000) >= 30) {
        counters.missedChats += 1;
      }
    }

    return counters;
  }

  _calculateStats(conversations, queueCounters, avgResponseTime, moderatorWorkloads) {
    return {
      newChats: conversations.filter((conversation) => this._isToday(conversation.createdAt)).length,
      closedChats: conversations.filter((conversation) => conversation.status === 'CLOSED' && this._isToday(conversation.updatedAt)).length,
      totalActive: queueCounters.assigned + queueCounters.pending,
      pendingChats: queueCounters.pending,
      todayConversations: conversations.filter((conversation) => this._isToday(conversation.createdAt)).length,
      unreadCount: conversations.filter((conversation) => !conversation.isRead).length,
      avgResponseTime: Math.round(avgResponseTime),
      queueSize: queueCounters.waiting,
      onlineModerators: moderatorWorkloads.filter((moderator) => moderator.online).length,
      slaBreached: queueCounters.slaBreached,
      missedChats: queueCounters.missedChats
    };
  }

  async _calculateAvgResponseTime(companyId, additionalWhere = {}) {
    const prisma = getSharedPrismaClient();
    const recentMessages = await prisma.message.findMany({
      where: {
        conversation: {
          companyId,
          channel: 'WHATSAPP',
          ...additionalWhere
        }
      },
      orderBy: [
        { conversationId: 'asc' },
        { createdAt: 'asc' }
      ],
      select: { conversationId: true, createdAt: true, isFromCustomer: true }
    });

    const grouped = new Map();
    for (const message of recentMessages) {
      if (!grouped.has(message.conversationId)) {
        grouped.set(message.conversationId, []);
      }
      grouped.get(message.conversationId).push(message);
    }

    let totalMs = 0;
    let count = 0;

    for (const messages of grouped.values()) {
      for (let index = 0; index < messages.length - 1; index += 1) {
        const current = messages[index];
        const next = messages[index + 1];
        if (current.isFromCustomer && !next.isFromCustomer) {
          const diff = new Date(next.createdAt).getTime() - new Date(current.createdAt).getTime();
          if (diff > 0 && diff <= 3600000) {
            totalMs += diff;
            count += 1;
          }
        }
      }
    }

    return count === 0 ? 0 : totalMs / count / 1000;
  }

  _formatConversationSummary(conversation) {
    const { user, ...rest } = conversation;

    return {
      ...rest,
      customer: this._formatCustomer(conversation.customer),
      assignedUser: user
        ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            department: user.department || null
          }
        : null,
      queueKey: buildQueueKeyFromStatus(conversation.status)
    };
  }

  _formatCustomer(customer) {
    const name = [customer?.firstName, customer?.lastName]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ');

    return {
      id: customer?.id,
      name: name || customer?.phone || '—',
      phone: customer?.phone,
      avatar: customer?.avatar || null
    };
  }

  _isToday(value) {
    if (!value) {
      return false;
    }
    const date = new Date(value);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  _emptyDashboard() {
    return {
      stats: {
        newChats: 0,
        closedChats: 0,
        totalActive: 0,
        pendingChats: 0,
        todayConversations: 0,
        unreadCount: 0,
        avgResponseTime: 0,
        queueSize: 0,
        onlineModerators: 0,
        slaBreached: 0,
        missedChats: 0
      },
      queueCounters: {
        total: 0,
        waiting: 0,
        assigned: 0,
        pending: 0,
        closed: 0,
        escalated: 0,
        slaAtRisk: 0,
        slaBreached: 0,
        missedChats: 0
      },
      sessionStatuses: [],
      moderatorWorkloads: [],
      latestConversations: [],
      slaSummary: {
        atRisk: 0,
        breached: 0
      },
      cachedAt: new Date().toISOString()
    };
  }
}

module.exports = new ModeratorDashboardService();
