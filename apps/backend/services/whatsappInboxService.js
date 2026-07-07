const { getSharedPrismaClient } = require('./sharedDatabase');
const socketService = require('./socketService');
const whatsappAssignmentEngineService = require('./whatsappAssignmentEngineService');
const inboxNotificationService = require('./inboxNotificationService');
const { normalizeRole } = require('../middleware/rbacMiddleware');
const {
  OPEN_CHAT_STATUSES,
  buildConversationMetadata,
  buildQueueKeyFromStatus,
  getConversationFlags,
  getSessionIdFromMetadata,
  safeJsonParse
} = require('./whatsappInboxMetadata');
const {
  ROUTING_MODES,
  getAssignmentRoutingUserIds,
  getSessionAssignment,
  normalizeRoutingMode
} = require('./whatsappConversationRoutingService');
const {
  getNormalizedSettings
} = require('./whatsappInboxSettingsService');
const { sendText } = require('./whatsapp/WhatsAppMessageHandler');
const { computeWindowStatus } = require('./whatsapp/WhatsAppWindowService');

const SUPERVISOR_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'TEAM_LEADER'];
const STATUS_OPTIONS = ['NEW', 'QUEUED', 'ASSIGNED', 'ACTIVE', 'PENDING', 'WAITING_CUSTOMER', 'ESCALATED', 'CLOSED', 'ARCHIVED'];
const QUEUE_TO_STATUS = {
  WAITING_QUEUE: ['NEW', 'QUEUED'],
  ASSIGNED_QUEUE: ['ASSIGNED', 'ACTIVE', 'ESCALATED'],
  PENDING_QUEUE: ['PENDING', 'WAITING_CUSTOMER'],
  CLOSED_QUEUE: ['CLOSED', 'ARCHIVED']
};

class WhatsAppInboxService {
  async getConversationsBySession(sessionId, companyId, userId, userRole, filters = {}) {
    const prisma = getSharedPrismaClient();
    const normalizedRole = normalizeRole(userRole);
    const sessionAssignment = SUPERVISOR_ROLES.includes(normalizedRole)
      ? null
      : await getSessionAssignment(sessionId, companyId, prisma);
    const visibleWhere = {
      companyId,
      channel: 'WHATSAPP',
      ...this._buildSessionFilter(sessionId),
      ...this._buildSessionVisibilityFilter(userId, normalizedRole, sessionAssignment)
    };

    const where = {
      ...visibleWhere
    };

    if (filters.status) {
      where.status = String(filters.status).toUpperCase();
    }

    if (filters.queue && QUEUE_TO_STATUS[filters.queue]) {
      where.status = { in: QUEUE_TO_STATUS[filters.queue] };
    }

    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: 'insensitive' } },
        { customer: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { customer: { phone: { contains: filters.search } } }
      ];
    }

    const page = Number(filters.page || 1);
    const limit = Math.min(Number(filters.limit || 50), 100);
    const skip = (page - 1) * limit;

    const [conversations, total, queueCounters, moderatorPool, settings] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true, email: true, avatar: true, status: true }
          },
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true, department: true }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, content: true, type: true, createdAt: true, isFromCustomer: true }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { lastMessageAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.conversation.count({ where }),
      this._getQueueCounters(prisma, visibleWhere),
      whatsappAssignmentEngineService.getSessionModeratorPool(companyId, sessionId),
      getNormalizedSettings(companyId, prisma)
    ]);

    const customerIds = conversations
      .filter((c) => c.customerId)
      .map((c) => c.customerId);

    let windowByCustomerId = {};
    if (customerIds.length > 0) {
      const contacts = await prisma.whatsAppContact.findMany({
        where: { customerId: { in: customerIds }, sessionId },
        select: { customerId: true, lastCustomerMessageAt: true }
      });
      for (const contact of contacts) {
        if (contact.customerId) {
          windowByCustomerId[contact.customerId] = computeWindowStatus(contact);
        }
      }
    }

    return {
      conversations: conversations.map((conversation) => ({
        ...this._formatConversationSummary(conversation),
        window: windowByCustomerId[conversation.customerId] || computeWindowStatus(null)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      summary: {
        queueCounters,
        moderatorPool: moderatorPool.map((candidate) => this._formatModeratorPoolItem(candidate)),
        activeStrategy: settings.assignmentConfig.strategy,
        maxChatsPerModerator: settings.queueConfig.maxChatsPerModerator || settings.maxChatsPerModerator || 25
      }
    };
  }

  async getConversationDetail(conversationId, companyId, userId, userRole) {
    const prisma = getSharedPrismaClient();
    const normalizedRole = normalizeRole(userRole);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: true,
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true, department: true, skills: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true }
            }
          }
        },
        conversationTags: true,
        notes: {
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!conversation || conversation.companyId !== companyId) {
      return null;
    }

    if (!conversation.isRead) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          isRead: true,
          unreadCount: 0
        }
      });
    }

    const sessionId = getSessionIdFromMetadata(conversation.metadata);

    let window = computeWindowStatus(null);
    if (sessionId && conversation.customerId) {
      const contact = await prisma.whatsAppContact.findFirst({
        where: { customerId: conversation.customerId, sessionId },
        select: { lastCustomerMessageAt: true }
      });
      if (contact) {
        window = computeWindowStatus(contact);
      }
    }

    const [moderatorPool, settings] = await Promise.all([
      sessionId ? whatsappAssignmentEngineService.getSessionModeratorPool(companyId, sessionId) : Promise.resolve([]),
      getNormalizedSettings(companyId, prisma)
    ]);

    return {
      ...conversation,
      customer: this._formatCustomerSummary(conversation.customer),
      flags: getConversationFlags(conversation),
      queueKey: buildQueueKeyFromStatus(conversation.status),
      canTransfer: SUPERVISOR_ROLES.includes(normalizedRole) || settings.ownershipConfig.allowModeratorTransferRequest,
      availableModerators: moderatorPool.map((candidate) => this._formatModeratorPoolItem(candidate)),
      window
    };
  }

  async sendMessage(conversationId, companyId, userId, userRole, content, type = 'TEXT') {
    const prisma = getSharedPrismaClient();
    const normalizedRole = normalizeRole(userRole);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: {
          select: { id: true, phone: true, firstName: true, lastName: true }
        }
      }
    });

    if (!conversation || conversation.companyId !== companyId) {
      throw new Error('Conversation not found');
    }

    if (!SUPERVISOR_ROLES.includes(normalizedRole) && conversation.assignedUserId !== userId) {
      throw new Error('Conversation is locked to another moderator');
    }

    const sessionId = getSessionIdFromMetadata(conversation.metadata);
    if (!sessionId) {
      throw new Error('Conversation session is missing');
    }

    if (String(type).toUpperCase() !== 'TEXT') {
      throw new Error('Only text replies are supported in this workflow');
    }

    await sendText(sessionId, conversation.customer.phone, content, {
      senderId: userId,
      companyId
    });

    const metadata = safeJsonParse(conversation.metadata, {});
    const sla = {
      ...(metadata.sla || {}),
      firstResponseAt: metadata?.sla?.firstResponseAt || new Date().toISOString(),
      breached: false
    };

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'ACTIVE',
        isRead: true,
        unreadCount: 0,
        lastMessageAt: new Date(),
        lastMessagePreview: content.substring(0, 120),
        lastMessageIsFromCustomer: false,
        metadata: buildConversationMetadata(conversation.metadata, {
          inboxRouting: {
            queueKey: 'ASSIGNED_QUEUE'
          },
          sla
        })
      }
    });

    await this._logActivity(companyId, userId, 'SEND_MESSAGE', conversationId, {
      sessionId,
      contentPreview: content.substring(0, 60)
    });

    socketService.emitToCompany(companyId, 'conversation:updated', { conversationId });

    return {
      success: true
    };
  }

  async assignConversation(conversationId, companyId, actingUserId, userRole, newUserId = null) {
    const prisma = getSharedPrismaClient();
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { metadata: true }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const sessionId = getSessionIdFromMetadata(conversation.metadata);
    if (!sessionId) {
      throw new Error('Conversation session is missing');
    }

    if (!newUserId) {
      return whatsappAssignmentEngineService.assignConversationToBestModerator({
        companyId,
        conversationId,
        sessionId,
        sourceUserId: actingUserId,
        force: true,
        reason: 'manual_rebalance'
      });
    }

    return this._manuallyAssignConversation({
      conversationId,
      companyId,
      actingUserId,
      newUserId,
      sessionId,
      reason: 'manual_assignment',
      userRole
    });
  }

  async transferConversation(conversationId, companyId, fromUserId, userRole, toUserId, transferNote = null) {
    const prisma = getSharedPrismaClient();
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { metadata: true, assignedUserId: true, customerId: true }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const sessionId = getSessionIdFromMetadata(conversation.metadata);
    if (!sessionId) {
      throw new Error('Conversation session is missing');
    }

    const updated = await this._manuallyAssignConversation({
      conversationId,
      companyId,
      actingUserId: fromUserId,
      newUserId: toUserId,
      sessionId,
      reason: 'transfer',
      userRole,
      transferNote
    });

    await inboxNotificationService.notifyTransfer(
      companyId,
      conversationId,
      fromUserId,
      toUserId,
      'Transfer'
    );

    return updated;
  }

  async updateChatStatus(conversationId, companyId, userId, userRole, status, note = null) {
    const prisma = getSharedPrismaClient();
    const normalizedStatus = String(status || '').toUpperCase();

    if (!STATUS_OPTIONS.includes(normalizedStatus)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const settings = await getNormalizedSettings(companyId, prisma);
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation || conversation.companyId !== companyId) {
      throw new Error('Conversation not found');
    }

    if (normalizedStatus === 'CLOSED' && settings.requireNoteOnClose && !note) {
      throw new Error('A closing note is required by inbox settings');
    }

    const metadata = buildConversationMetadata(conversation.metadata, {
      inboxRouting: {
        queueKey: buildQueueKeyFromStatus(normalizedStatus)
      }
    });

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: normalizedStatus,
        metadata
      }
    });

    await this._logActivity(companyId, userId, 'UPDATE_STATUS', conversationId, {
      status: normalizedStatus
    });

    socketService.emitToCompany(companyId, 'conversation:updated', { conversationId });
    return updated;
  }

  async getUnreadCounts(companyId, userId, userRole) {
    const prisma = getSharedPrismaClient();
    const normalizedRole = normalizeRole(userRole);
    const sessions = await this._getUserSessions(companyId, userId, normalizedRole);

    const counts = {};
    for (const session of sessions) {
      const sessionAssignment = SUPERVISOR_ROLES.includes(normalizedRole)
        ? null
        : await getSessionAssignment(session.id, companyId, prisma);
      counts[session.id] = await prisma.conversation.count({
        where: {
          companyId,
          channel: 'WHATSAPP',
          isRead: false,
          ...this._buildSessionFilter(session.id),
          ...this._buildSessionVisibilityFilter(userId, normalizedRole, sessionAssignment)
        }
      });
    }

    return {
      counts,
      total: Object.values(counts).reduce((sum, value) => sum + value, 0)
    };
  }

  async getSessionDetail(sessionId, companyId, userId, userRole) {
    const prisma = getSharedPrismaClient();
    const normalizedRole = normalizeRole(userRole);
    const sessionAssignment = SUPERVISOR_ROLES.includes(normalizedRole)
      ? null
      : await getSessionAssignment(sessionId, companyId, prisma);
    const session = await prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
      include: {
        assignment: {
          include: {
            assignedUser: {
              select: { id: true, firstName: true, lastName: true, avatar: true }
            },
            team: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!session || session.companyId !== companyId) {
      return null;
    }

    const [summary, moderatorPool] = await Promise.all([
      this._getQueueCounters(prisma, {
        companyId,
        channel: 'WHATSAPP',
        ...this._buildSessionFilter(sessionId),
        ...this._buildSessionVisibilityFilter(userId, normalizedRole, sessionAssignment)
      }),
      whatsappAssignmentEngineService.getSessionModeratorPool(companyId, sessionId)
    ]);

    return {
      ...session,
      summary,
      moderatorPool: moderatorPool.map((candidate) => this._formatModeratorPoolItem(candidate))
    };
  }

  _buildSessionFilter(sessionId) {
    return {
      OR: [
        { metadata: { contains: `"sessionId":"${sessionId}"` } },
        { metadata: { contains: `"whatsappSessionId":"${sessionId}"` } },
        { metadata: { contains: `"sessionId":"${sessionId}` } },
        { metadata: { contains: `"whatsappSessionId":"${sessionId}` } }
      ]
    };
  }

  _buildVisibilityFilter(userId, normalizedRole) {
    if (SUPERVISOR_ROLES.includes(normalizedRole)) {
      return {};
    }

    return {
      assignedUserId: userId
    };
  }

  _buildSessionVisibilityFilter(userId, normalizedRole, sessionAssignment) {
    if (SUPERVISOR_ROLES.includes(normalizedRole)) {
      return {};
    }

    const routingUserIds = getAssignmentRoutingUserIds(sessionAssignment);
    const routingMode = normalizeRoutingMode(sessionAssignment?.routingMode);

    if (
      routingUserIds.includes(userId) &&
      (routingMode === ROUTING_MODES.NUMBER_OWNER ||
       routingMode === ROUTING_MODES.SHARED_INBOX)
    ) {
      return {};
    }

    return this._buildVisibilityFilter(userId, normalizedRole);
  }

  async _getUserSessions(companyId, userId, normalizedRole) {
    const prisma = getSharedPrismaClient();

    if (SUPERVISOR_ROLES.includes(normalizedRole)) {
      return prisma.whatsAppSession.findMany({
        where: { companyId },
        select: { id: true, phoneNumber: true, name: true, status: true }
      });
    }

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

    const allowedSessions = assignments.filter((assignment) => {
      const routingUserIds = getAssignmentRoutingUserIds(assignment);
      if (routingUserIds.includes(userId)) {
        return true;
      }

      return (assignment.team?.members || []).some((member) => member.userId === userId);
    });

    return Array.from(
      new Map(
        allowedSessions
          .filter((assignment) => assignment.session)
          .map((assignment) => [assignment.session.id, assignment.session])
      ).values()
    );
  }

  async _getQueueCounters(prisma, where) {
    const conversations = await prisma.conversation.findMany({
      where,
      select: {
        id: true,
        status: true,
        lastMessageAt: true,
        lastMessageIsFromCustomer: true,
        assignedUserId: true,
        metadata: true
      }
    });

    const counters = {
      total: conversations.length,
      waiting: 0,
      assigned: 0,
      pending: 0,
      closed: 0,
      escalated: 0,
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

      if (sla.maxWaitingDeadlineAt && new Date(sla.maxWaitingDeadlineAt).getTime() < now && status !== 'CLOSED') {
        counters.slaBreached += 1;
      }

      if (conversation.lastMessageIsFromCustomer && conversation.lastMessageAt) {
        const ageMinutes = (now - new Date(conversation.lastMessageAt).getTime()) / 60000;
        if (ageMinutes >= 30) {
          counters.missedChats += 1;
        }
      }
    }

    return counters;
  }

  _formatConversationSummary(conversation) {
    return {
      ...conversation,
      customer: this._formatCustomerSummary(conversation.customer),
      assignedUser: conversation.user
        ? {
            id: conversation.user.id,
            firstName: conversation.user.firstName,
            lastName: conversation.user.lastName,
            avatar: conversation.user.avatar,
            department: conversation.user.department || null
          }
        : null,
      flags: getConversationFlags(conversation),
      queueKey: buildQueueKeyFromStatus(conversation.status),
      lastMessage: conversation.messages?.[0] || null,
      messages: undefined
    };
  }

  _formatCustomerSummary(customer) {
    if (!customer) {
      return null;
    }

    const name = [customer.firstName, customer.lastName]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ');

    return {
      id: customer.id,
      name: name || customer.phone || '—',
      phone: customer.phone,
      email: customer.email || null,
      avatar: customer.avatar || null,
      status: customer.status || null
    };
  }

  _formatModeratorPoolItem(candidate) {
    return {
      id: candidate.user.id,
      name: this._formatUserName(candidate.user),
      role: candidate.user.role,
      department: candidate.user.department || null,
      skills: candidate.skills || [],
      online: candidate.online,
      insideWorkingWindow: candidate.insideWorkingWindow,
      workload: candidate.workload
    };
  }

  _formatUserName(user) {
    return [user?.firstName, user?.lastName]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ') || user?.email || 'Moderator';
  }

  async _manuallyAssignConversation({
    conversationId,
    companyId,
    actingUserId,
    newUserId,
    sessionId,
    reason,
    transferNote
  }) {
    const prisma = getSharedPrismaClient();

    const updated = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId }
      });

      if (!conversation || conversation.companyId !== companyId) {
        throw new Error('Conversation not found');
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${companyId}:${sessionId}`}))`;

      const metadata = buildConversationMetadata(conversation.metadata, {
        whatsappSessionId: sessionId,
        sessionId,
        inboxRouting: {
          queueKey: 'ASSIGNED_QUEUE',
          assignmentStrategy: 'MANUAL'
        },
        ownership: {
          sessionId,
          currentOwnerId: newUserId,
          lockedAt: new Date().toISOString(),
          lastAssignedBy: actingUserId,
          lastReassignmentReason: reason
        }
      });

      const nextConversation = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          assignedUserId: newUserId,
          status: 'ASSIGNED',
          metadata
        }
      });

      if (transferNote) {
        await tx.conversationModeratorNote.create({
          data: {
            conversationId,
            companyId,
            authorId: actingUserId,
            content: transferNote,
            type: 'transfer_note'
          }
        });
      }

      await tx.moderatorActivityLog.create({
        data: {
          companyId,
          userId: actingUserId,
          action: reason === 'transfer' ? 'TRANSFER_CONVERSATION' : 'MANUAL_ASSIGN_CONVERSATION',
          entityType: 'conversation',
          entityId: conversationId,
          metadata: JSON.stringify({
            toUserId: newUserId,
            sessionId,
            reason
          })
        }
      });

      return nextConversation;
    });

    socketService.emitToCompany(companyId, 'conversation:assignment', {
      conversationId,
      assignedUserId: newUserId,
      reason
    });
    socketService.emitToCompany(companyId, 'conversation:updated', { conversationId });

    return updated;
  }

  async _logActivity(companyId, userId, action, conversationId, metadata) {
    try {
      if (!userId) {
        return;
      }

      const prisma = getSharedPrismaClient();
      await prisma.moderatorActivityLog.create({
        data: {
          companyId,
          userId,
          action,
          entityType: 'conversation',
          entityId: conversationId,
          metadata: JSON.stringify(metadata || {})
        }
      });
    } catch (error) {
      console.error('[InboxActivity] Failed to log activity:', error.message);
    }
  }
}

module.exports = new WhatsAppInboxService();
