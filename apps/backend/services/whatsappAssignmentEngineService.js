const socketService = require('./socketService');
const inboxNotificationService = require('./inboxNotificationService');
const { getSharedPrismaClient } = require('./sharedDatabase');
const {
  OPEN_CHAT_STATUSES,
  WAITING_QUEUE_STATUSES,
  buildConversationMetadata,
  buildQueueKeyFromStatus,
  getConversationFlags,
  getSessionIdFromMetadata,
  safeJsonParse
} = require('./whatsappInboxMetadata');
const {
  getNormalizedSettings,
  serializeSettingsPayload
} = require('./whatsappInboxSettingsService');
const { normalizeRole } = require('../middleware/rbacMiddleware');
const { parseRoutingUserIds, normalizeRoutingMode, ROUTING_MODES } = require('./whatsappConversationRoutingService');

const ROUTING_STRATEGIES = {
  ROUND_ROBIN: 'ROUND_ROBIN',
  LEAST_LOAD: 'LEAST_LOAD',
  SKILL_BASED: 'SKILL_BASED'
};

class WhatsAppAssignmentEngineService {
  constructor() {
    this.reassignmentInterval = null;
    this.isSweepRunning = false;
  }

  async assignConversationToBestModerator({
    companyId,
    conversationId,
    sessionId,
    sourceUserId = null,
    force = false,
    reason = 'auto_assignment',
    excludeUserIds = []
  }) {
    const prisma = getSharedPrismaClient();
    const postCommitNotifications = [];
    const postCommitEvents = [];

    const result = await prisma.$transaction(async (tx) => {
      await this._acquireRoutingLock(tx, companyId, sessionId || conversationId);

      const conversation = await tx.conversation.findUnique({
        where: { id: conversationId },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              status: true
            }
          }
        }
      });

      if (!conversation || conversation.companyId !== companyId) {
        throw new Error('Conversation not found');
      }

      const effectiveSessionId = sessionId || getSessionIdFromMetadata(conversation.metadata);
      if (!effectiveSessionId) {
        throw new Error('Conversation session could not be resolved');
      }

      const settings = await getNormalizedSettings(companyId, tx);
      const flags = getConversationFlags(conversation);
      const alreadyAssigned = Boolean(conversation.assignedUserId);

      if (alreadyAssigned && !force) {
        return {
          conversation,
          assignedUserId: conversation.assignedUserId,
          effectiveSessionId,
          skipped: true
        };
      }

      const pool = await this._buildCandidatePool(tx, companyId, effectiveSessionId, settings, excludeUserIds);
      const signals = await this._buildRoutingSignals(tx, conversation, effectiveSessionId, settings, flags);

      if (pool.length === 0) {
        const queuedMetadata = buildConversationMetadata(conversation.metadata, {
          whatsappSessionId: effectiveSessionId,
          sessionId: effectiveSessionId,
          inboxRouting: {
            sessionId: effectiveSessionId,
            queueKey: 'WAITING_QUEUE',
            assignmentStrategy: settings.assignmentConfig.strategy,
            reason: 'no_available_moderators',
            detectedLanguage: signals.detectedLanguage,
            detectedCountry: signals.detectedCountry,
            detectedDepartment: signals.detectedDepartment,
            customerType: signals.customerType
          },
          ownership: {
            sessionId: effectiveSessionId,
            currentOwnerId: null,
            lastAssignedBy: sourceUserId,
            lastReassignmentReason: reason,
            lockActive: false
          },
          sla: this._buildSlaState(conversation, settings, { firstResponseAt: null })
        });

        const queuedConversation = await tx.conversation.update({
          where: { id: conversationId },
          data: {
            assignedUserId: null,
            status: 'QUEUED',
            metadata: queuedMetadata,
            updatedAt: new Date()
          }
        });

        await this._logActivity(tx, companyId, sourceUserId, 'QUEUE_CONVERSATION', conversationId, {
          reason: 'no_available_moderators',
          sessionId: effectiveSessionId
        });

        postCommitEvents.push({
          type: 'conversation:updated',
          conversationId,
          companyId
        });

        return {
          conversation: queuedConversation,
          assignedUserId: null,
          effectiveSessionId,
          queued: true
        };
      }

      const choice = this._pickCandidate(pool, signals, settings);
      const now = new Date();
      const nextAssignmentState = this._buildNextAssignmentState(settings.assignmentState, effectiveSessionId, choice.user.id, conversation.customerId);
      const targetStatus = WAITING_QUEUE_STATUSES.includes(String(conversation.status || '').toUpperCase()) ? 'ASSIGNED' : (conversation.status || 'ASSIGNED');
      const metadata = buildConversationMetadata(conversation.metadata, {
        whatsappSessionId: effectiveSessionId,
        sessionId: effectiveSessionId,
        inboxRouting: {
          sessionId: effectiveSessionId,
          queueKey: buildQueueKeyFromStatus(targetStatus),
          assignmentStrategy: choice.strategy,
          detectedLanguage: signals.detectedLanguage,
          detectedCountry: signals.detectedCountry,
          detectedDepartment: signals.detectedDepartment,
          customerType: signals.customerType,
          priorityBucket: signals.priorityBucket,
          previousOwnerId: signals.previousOwnerId,
          lastAssignedAt: now.toISOString(),
          workloadSnapshot: {
            active: choice.workload.active,
            pending: choice.workload.pending,
            waitingCustomer: choice.workload.waitingCustomer,
            unread: choice.workload.unread
          }
        },
        ownership: {
          sessionId: effectiveSessionId,
          currentOwnerId: choice.user.id,
          currentOwnerName: this._formatUserName(choice.user),
          currentTeamId: choice.teamId || null,
          lockActive: true,
          lockedAt: now.toISOString(),
          lockExpiresAt: new Date(now.getTime() + (settings.ownershipConfig.lockDurationMin * 60000)).toISOString(),
          lastAssignedBy: sourceUserId,
          lastReassignmentReason: reason
        },
        collaboration: {
          assistanceRequested: false,
          mentionedUserIds: []
        },
        sla: this._buildSlaState(conversation, settings, { firstResponseAt: null })
      });

      const updatedConversation = await tx.conversation.update({
        where: { id: conversationId },
        data: {
          assignedUserId: choice.user.id,
          status: targetStatus,
          priority: signals.priorityValue,
          metadata
        }
      });

      await tx.inboxSettings.update({
        where: { companyId },
        data: serializeSettingsPayload({
          assignmentState: nextAssignmentState
        })
      });

      await this._logActivity(tx, companyId, sourceUserId, 'AUTO_ASSIGN_CONVERSATION', conversationId, {
        sessionId: effectiveSessionId,
        toUserId: choice.user.id,
        strategy: choice.strategy,
        reason
      });

      postCommitNotifications.push({
        type: 'assignment',
        companyId,
        userId: choice.user.id,
        title: 'تم إسناد محادثة جديدة إليك',
        body: `${this._formatCustomerName(conversation.customer)} تم توجيهه إليك تلقائيًا`,
        conversationId,
        sessionId: effectiveSessionId,
        data: {
          strategy: choice.strategy,
          reason
        }
      });

      postCommitEvents.push({
        type: 'conversation:assignment',
        companyId,
        conversationId,
        payload: {
          conversationId,
          assignedUserId: choice.user.id,
          assignedUserName: this._formatUserName(choice.user),
          strategy: choice.strategy,
          reason
        }
      });
      postCommitEvents.push({
        type: 'conversation:updated',
        companyId,
        conversationId
      });

      return {
        conversation: updatedConversation,
        assignedUserId: choice.user.id,
        effectiveSessionId,
        assignedUser: choice.user,
        strategy: choice.strategy,
        queued: false,
        skipped: false
      };
    });

    for (const notification of postCommitNotifications) {
      await inboxNotificationService.createNotification(
        notification.companyId,
        notification.userId,
        notification.type,
        notification.title,
        notification.body,
        notification.sessionId,
        notification.conversationId,
        notification.data
      );
    }

    for (const event of postCommitEvents) {
      if (event.type === 'conversation:assignment') {
        socketService.emitToCompany(event.companyId, 'conversation:assignment', event.payload);
      }

      if (event.type === 'conversation:updated') {
        socketService.emitToCompany(event.companyId, 'conversation:updated', {
          conversationId: event.conversationId
        });
      }
    }

    return result;
  }

  async evaluateConversationForReassignment({ companyId, conversationId }) {
    const prisma = getSharedPrismaClient();
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: {
          select: { id: true, phone: true, status: true, firstName: true, lastName: true }
        }
      }
    });

    if (!conversation || conversation.companyId !== companyId) {
      return null;
    }

    if (!OPEN_CHAT_STATUSES.includes(String(conversation.status || '').toUpperCase())) {
      return null;
    }

    const settings = await getNormalizedSettings(companyId, prisma);
    const metadata = safeJsonParse(conversation.metadata, {});
    const ownership = metadata.ownership || {};
    const sessionId = getSessionIdFromMetadata(conversation.metadata);

    if (!settings.reassignmentConfig.enabled || !sessionId) {
      return null;
    }

    const assignedUserId = conversation.assignedUserId;
    const shouldAssignUnowned = !assignedUserId && conversation.lastMessageIsFromCustomer;
    if (shouldAssignUnowned) {
      return this.assignConversationToBestModerator({
        companyId,
        conversationId,
        sessionId,
        force: false,
        reason: 'unowned_customer_message'
      });
    }

    if (!assignedUserId) {
      return null;
    }

    const elapsedMinutes = conversation.lastMessageAt
      ? Math.max(0, (Date.now() - new Date(conversation.lastMessageAt).getTime()) / 60000)
      : 0;
    const user = await prisma.user.findUnique({
      where: { id: assignedUserId },
      select: {
        id: true,
        timezone: true,
        availability: true
      }
    });

    const reasons = [];

    if (conversation.lastMessageIsFromCustomer && elapsedMinutes >= settings.reassignmentConfig.timeoutMinutes) {
      reasons.push('response_timeout');
    }

    if (settings.reassignmentConfig.reassignOnOffline && !socketService.isUserOnline(assignedUserId)) {
      reasons.push('moderator_offline');
    }

    if (settings.reassignmentConfig.reassignOutsideWorkingHours && !this._isInsideWorkingWindow(settings, user)) {
      reasons.push('outside_working_hours');
    }

    const activeLoad = await prisma.conversation.count({
      where: {
        companyId,
        assignedUserId,
        status: { in: ['ASSIGNED', 'ACTIVE', 'PENDING', 'WAITING_CUSTOMER', 'ESCALATED'] }
      }
    });

    const maxChats = settings.queueConfig.maxChatsPerModerator || settings.maxChatsPerModerator || 25;
    if (settings.reassignmentConfig.reassignOnCapacityReached && activeLoad > maxChats) {
      reasons.push('capacity_reached');
    }

    if (reasons.length === 0) {
      return null;
    }

    return this.assignConversationToBestModerator({
      companyId,
      conversationId,
      sessionId,
      force: true,
      reason: reasons[0],
      excludeUserIds: [assignedUserId]
    });
  }

  async runReassignmentSweep() {
    if (this.isSweepRunning) {
      return;
    }

    this.isSweepRunning = true;
    try {
      const prisma = getSharedPrismaClient();
      const candidates = await prisma.conversation.findMany({
        where: {
          channel: 'WHATSAPP',
          status: { in: ['ASSIGNED', 'ACTIVE', 'PENDING', 'WAITING_CUSTOMER', 'QUEUED'] }
        },
        select: {
          id: true,
          companyId: true
        },
        take: 100
      });

      for (const candidate of candidates) {
        try {
          await this.evaluateConversationForReassignment({
            companyId: candidate.companyId,
            conversationId: candidate.id
          });
        } catch (error) {
          console.error('[InboxReassignment] Failed to evaluate conversation:', candidate.id, error.message);
        }
      }
    } finally {
      this.isSweepRunning = false;
    }
  }

  startBackgroundMonitor() {
    if (this.reassignmentInterval) {
      return;
    }

    this.reassignmentInterval = setInterval(() => {
      this.runReassignmentSweep().catch((error) => {
        console.error('[InboxReassignment] Background sweep failed:', error.message);
      });
    }, 60000);

    if (typeof this.reassignmentInterval.unref === 'function') {
      this.reassignmentInterval.unref();
    }
  }

  stopBackgroundMonitor() {
    if (this.reassignmentInterval) {
      clearInterval(this.reassignmentInterval);
      this.reassignmentInterval = null;
    }
  }

  async getSessionModeratorPool(companyId, sessionId) {
    const prisma = getSharedPrismaClient();
    const settings = await getNormalizedSettings(companyId, prisma);
    return this._buildCandidatePool(prisma, companyId, sessionId, settings, []);
  }

  async _buildCandidatePool(tx, companyId, sessionId, settings, excludeUserIds = []) {
    const assignment = await tx.whatsAppNumberAssignment.findFirst({
      where: {
        companyId,
        sessionId,
        isActive: true
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            availability: true,
            timezone: true,
            department: true,
            skills: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            members: {
              where: { isActive: true },
              select: {
                isTeamLeader: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    availability: true,
                    timezone: true,
                    department: true,
                    skills: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!assignment) {
      return [];
    }

    const poolById = new Map();

    if (assignment.assignedUser?.isActive) {
      poolById.set(assignment.assignedUser.id, {
        user: assignment.assignedUser,
        teamId: assignment.teamId || null
      });
    }

    for (const member of assignment.team?.members || []) {
      if (!member.user?.isActive) {
        continue;
      }

      const normalizedRole = normalizeRole(member.user.role);
      if (normalizedRole !== 'MODERATOR' && normalizedRole !== 'TEAM_LEADER') {
        continue;
      }

      if (!poolById.has(member.user.id)) {
        poolById.set(member.user.id, {
          user: member.user,
          teamId: assignment.team?.id || null,
          isTeamLeader: member.isTeamLeader
        });
      }
    }

    const routingMode = normalizeRoutingMode(assignment.routingMode);
    if (poolById.size === 0 && (routingMode === ROUTING_MODES.SHARED_INBOX || routingMode === ROUTING_MODES.ROUND_ROBIN)) {
      const routingIds = parseRoutingUserIds(assignment.routingUserIds);
      if (routingIds.length > 0) {
        const routingUsers = await tx.user.findMany({
          where: {
            id: { in: routingIds },
            isActive: true,
            companyId
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            availability: true,
            timezone: true,
            department: true,
            skills: true
          }
        });
        for (const user of routingUsers) {
          const normalizedRole = normalizeRole(user.role);
          if (normalizedRole === 'MODERATOR' || normalizedRole === 'TEAM_LEADER') {
            poolById.set(user.id, { user, teamId: null });
          }
        }
      }
    }

    const rawPool = Array.from(poolById.values()).filter((candidate) => !excludeUserIds.includes(candidate.user.id));
    if (rawPool.length === 0) {
      return [];
    }

    const workloads = await this._loadWorkloads(tx, companyId, rawPool.map((candidate) => candidate.user.id));
    const maxChats = settings.queueConfig.maxChatsPerModerator || settings.maxChatsPerModerator || 25;

    return rawPool
      .map((candidate) => ({
        ...candidate,
        workload: workloads.get(candidate.user.id) || {
          active: 0,
          pending: 0,
          waitingCustomer: 0,
          unread: 0,
          totalWeighted: 0
        },
        online: socketService.isUserOnline(candidate.user.id),
        insideWorkingWindow: this._isInsideWorkingWindow(settings, candidate.user),
        overCapacity: (workloads.get(candidate.user.id)?.totalOpen || 0) >= maxChats,
        skills: this._normalizeSkills(candidate.user.skills)
      }))
      .sort((left, right) => this._formatUserName(left.user).localeCompare(this._formatUserName(right.user), 'ar'));
  }

  async _buildRoutingSignals(tx, conversation, sessionId, settings, flags) {
    const customerName = this._formatCustomerName(conversation.customer);
    const messagePreview = conversation.lastMessagePreview || customerName;
    const detectedLanguage = flags.detectedLanguage || this._detectLanguage(messagePreview);
    const detectedCountry = flags.detectedCountry || this._detectCountry(conversation.customer?.phone);
    const customerType = conversation.customer?.status === 'VIP' ? 'VIP' : 'STANDARD';
    const detectedDepartment = customerType === 'VIP'
      ? 'vip'
      : detectedLanguage === 'ar'
        ? 'sales'
        : 'support';

    const previousConversation = await tx.conversation.findFirst({
      where: {
        companyId: conversation.companyId,
        channel: 'WHATSAPP',
        customerId: conversation.customerId,
        id: { not: conversation.id },
        assignedUserId: { not: null }
      },
      orderBy: { updatedAt: 'desc' },
      select: { assignedUserId: true }
    });

    return {
      sessionId,
      detectedLanguage,
      detectedCountry,
      detectedDepartment,
      customerType,
      previousOwnerId: previousConversation?.assignedUserId || flags.ownerLock?.currentOwnerId || null,
      priorityBucket: customerType === 'VIP' ? 'VIP' : (previousConversation ? 'RETURNING' : 'NEW'),
      priorityValue: customerType === 'VIP' ? 5 : previousConversation ? 3 : 1,
      strategy: settings.assignmentConfig.strategy || ROUTING_STRATEGIES.ROUND_ROBIN
    };
  }

  _pickCandidate(pool, signals, settings) {
    const eligiblePool = pool.filter((candidate) => {
      if (settings.assignmentConfig.roundRobin?.respectOnlineStatus && !candidate.online) {
        return false;
      }

      if (settings.assignmentConfig.roundRobin?.respectWorkingHours && !candidate.insideWorkingWindow) {
        return false;
      }

      if (candidate.overCapacity) {
        return false;
      }

      return true;
    });

    const fallbackPool = eligiblePool.length > 0 ? eligiblePool : pool.filter((candidate) => !candidate.overCapacity);
    const scopedPool = fallbackPool.length > 0 ? fallbackPool : pool;

    const strategy = signals.strategy;

    if (strategy === ROUTING_STRATEGIES.LEAST_LOAD) {
      const selected = [...scopedPool].sort((left, right) => {
        if (left.workload.totalWeighted === right.workload.totalWeighted) {
          return this._formatUserName(left.user).localeCompare(this._formatUserName(right.user), 'ar');
        }

        return left.workload.totalWeighted - right.workload.totalWeighted;
      })[0];

      return {
        ...selected,
        strategy
      };
    }

    if (strategy === ROUTING_STRATEGIES.SKILL_BASED) {
      const selected = [...scopedPool]
        .map((candidate) => ({
          ...candidate,
          skillScore: this._calculateSkillScore(candidate, signals, settings)
        }))
        .sort((left, right) => {
          if (left.skillScore === right.skillScore) {
            return left.workload.totalWeighted - right.workload.totalWeighted;
          }

          return right.skillScore - left.skillScore;
        })[0];

      return {
        ...selected,
        strategy
      };
    }

    const scopeKey = `${signals.sessionId}`;
    const sortedPool = [...scopedPool];
    const startIndex = Number(settings.assignmentState?.roundRobinIndexByScope?.[scopeKey] || 0);
    const selected = sortedPool[startIndex % sortedPool.length];

    return {
      ...selected,
      strategy: ROUTING_STRATEGIES.ROUND_ROBIN
    };
  }

  _calculateSkillScore(candidate, signals, settings) {
    let score = 0;
    const candidateSkills = candidate.skills;
    const department = String(candidate.user.department || '').toLowerCase();

    if (candidateSkills.includes(signals.detectedLanguage)) {
      score += 30;
    }

    if (candidateSkills.includes(signals.detectedCountry.toLowerCase())) {
      score += 20;
    }

    if (candidateSkills.includes(signals.detectedDepartment) || department === signals.detectedDepartment) {
      score += 25;
    }

    if (signals.customerType === 'VIP') {
      if (candidateSkills.includes('vip') || settings.skillConfig.vipTeams.includes(candidate.teamId)) {
        score += 35;
      }
    }

    if (signals.previousOwnerId && signals.previousOwnerId === candidate.user.id && settings.assignmentConfig.smartRouting?.previousOwnerPreference) {
      score += 40;
    }

    score -= candidate.workload.totalWeighted;
    if (candidate.online) {
      score += 10;
    }

    return score;
  }

  async _loadWorkloads(tx, companyId, userIds) {
    const groups = await tx.conversation.findMany({
      where: {
        companyId,
        assignedUserId: { in: userIds },
        status: { in: ['ASSIGNED', 'ACTIVE', 'PENDING', 'WAITING_CUSTOMER', 'ESCALATED'] }
      },
      select: {
        assignedUserId: true,
        status: true,
        isRead: true
      }
    });

    const workloads = new Map();

    for (const userId of userIds) {
      workloads.set(userId, {
        active: 0,
        pending: 0,
        waitingCustomer: 0,
        unread: 0,
        totalOpen: 0,
        totalWeighted: 0
      });
    }

    for (const conversation of groups) {
      const bucket = workloads.get(conversation.assignedUserId);
      if (!bucket) {
        continue;
      }

      bucket.totalOpen += 1;

      if (['ASSIGNED', 'ACTIVE', 'ESCALATED'].includes(conversation.status)) {
        bucket.active += 1;
      }

      if (conversation.status === 'PENDING') {
        bucket.pending += 1;
      }

      if (conversation.status === 'WAITING_CUSTOMER') {
        bucket.waitingCustomer += 1;
      }

      if (!conversation.isRead) {
        bucket.unread += 1;
      }
    }

    for (const bucket of workloads.values()) {
      bucket.totalWeighted =
        bucket.active +
        (bucket.pending * 1.5) +
        (bucket.waitingCustomer * 1.2) +
        (bucket.unread * 0.35);
    }

    return workloads;
  }

  _buildNextAssignmentState(currentState, sessionId, userId, customerId) {
    const state = safeJsonParse(currentState, {
      roundRobinIndexByScope: {},
      lastAssignedUserByCustomer: {}
    });
    const scopeKey = `${sessionId}`;
    const currentIndex = Number(state.roundRobinIndexByScope?.[scopeKey] || 0);

    return {
      ...state,
      roundRobinIndexByScope: {
        ...(state.roundRobinIndexByScope || {}),
        [scopeKey]: currentIndex + 1
      },
      lastAssignedUserByCustomer: {
        ...(state.lastAssignedUserByCustomer || {}),
        ...(customerId ? { [customerId]: userId } : {})
      }
    };
  }

  _buildSlaState(conversation, settings, overrides = {}) {
    const now = Date.now();
    const firstResponseDeadlineAt = new Date(now + ((settings.slaConfig.firstResponseMinutes || 5) * 60000)).toISOString();
    const maxWaitingDeadlineAt = new Date(now + ((settings.slaConfig.maxWaitingMinutes || 15) * 60000)).toISOString();

    return {
      firstResponseDeadlineAt,
      maxWaitingDeadlineAt,
      firstResponseAt: overrides.firstResponseAt || null,
      lastCustomerMessageAt: conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toISOString() : new Date().toISOString(),
      breached: false
    };
  }

  _detectLanguage(text = '') {
    if (/[\u0600-\u06FF]/.test(text)) {
      return 'ar';
    }

    return 'en';
  }

  _detectCountry(phone = '') {
    const normalized = String(phone || '').replace(/\D/g, '');
    if (normalized.startsWith('20')) return 'EG';
    if (normalized.startsWith('966')) return 'SA';
    if (normalized.startsWith('971')) return 'AE';
    if (normalized.startsWith('965')) return 'KW';
    return 'UNKNOWN';
  }

  _isInsideWorkingWindow(settings, user) {
    if (!settings.workingHoursEnabled) {
      return true;
    }

    const timezone = user?.timezone || 'UTC';
    const now = new Date();
    const localParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(now);

    const weekdayMap = {
      Mon: 'MON',
      Tue: 'TUE',
      Wed: 'WED',
      Thu: 'THU',
      Fri: 'FRI',
      Sat: 'SAT',
      Sun: 'SUN'
    };

    const weekday = weekdayMap[localParts.find((part) => part.type === 'weekday')?.value] || 'MON';
    const currentTime = `${localParts.find((part) => part.type === 'hour')?.value || '00'}:${localParts.find((part) => part.type === 'minute')?.value || '00'}`;
    const allowedDays = String(settings.workingDays || '').split(',').filter(Boolean);

    if (allowedDays.length > 0 && !allowedDays.includes(weekday)) {
      return false;
    }

    return currentTime >= settings.workingHoursStart && currentTime <= settings.workingHoursEnd;
  }

  _normalizeSkills(skillsValue) {
    if (!skillsValue) {
      return [];
    }

    if (Array.isArray(skillsValue)) {
      return skillsValue.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
    }

    const parsed = safeJsonParse(skillsValue, null);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
    }

    return String(skillsValue)
      .split(/[,\n|]/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  async _acquireRoutingLock(tx, companyId, scopeId) {
    const lockKey = `${companyId}:${scopeId}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
  }

  async _logActivity(tx, companyId, userId, action, conversationId, metadata) {
    if (!userId) {
      return;
    }

    await tx.moderatorActivityLog.create({
      data: {
        companyId,
        userId,
        action,
        entityType: 'conversation',
        entityId: conversationId,
        metadata: JSON.stringify(metadata || {})
      }
    });
  }

  _formatCustomerName(customer) {
    const name = [customer?.firstName, customer?.lastName]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ');
    return name || customer?.phone || 'العميل';
  }

  _formatUserName(user) {
    return [user?.firstName, user?.lastName]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ') || user?.email || user?.id || 'Moderator';
  }
}

module.exports = new WhatsAppAssignmentEngineService();
