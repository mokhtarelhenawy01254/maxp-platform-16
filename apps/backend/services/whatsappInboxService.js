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
const { clearConversationAudienceCache } = require('./whatsappRealtimeAudienceService');
const { sendText, sendImage } = require('./whatsapp/WhatsAppMessageHandler');
const { computeWindowStatus } = require('./whatsapp/WhatsAppWindowService');
const { getMetaGraphApiVersion } = require('../config/metaApi');

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
      companyId,
      typingSimulation: true
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

  async sendSmsFallback(conversationId, companyId, userId, userRole, content) {
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

    if (!conversation.customer?.phone) {
      throw new Error('Customer does not have a valid phone number');
    }

    const WhatsAppWindowPolicyService = require('./whatsapp/WhatsAppWindowPolicyService');
    const policy = await WhatsAppWindowPolicyService.getWindowPolicySettings(companyId);

    const smsGateway = require('./sms/smsGatewayService');
    const smsResult = await smsGateway.sendSMS({
      to: conversation.customer.phone,
      text: content,
      senderId: policy.smsConfig?.senderId,
      config: { ...policy.smsConfig, provider: policy.smsProvider }
    });

    if (!smsResult.success) {
      throw new Error(smsResult.error || 'Failed to send SMS fallback');
    }

    await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: 'SMS',
        content,
        metadata: JSON.stringify({
          provider: smsResult.provider,
          messageId: smsResult.messageId,
          channel: 'SMS_FALLBACK'
        })
      }
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: `[SMS] ${content.substring(0, 100)}`,
        lastMessageIsFromCustomer: false
      }
    });

    await this._logActivity(companyId, userId, 'SEND_SMS_FALLBACK', conversationId, {
      contentPreview: content.substring(0, 60),
      messageId: smsResult.messageId
    });

    socketService.emitToCompany(companyId, 'conversation:updated', { conversationId });

    return {
      success: true,
      messageId: smsResult.messageId,
      provider: smsResult.provider
    };
  }

  async sendExistingImage(conversationId, companyId, userId, userRole, imageUrl, filename, caption = '') {
    const prisma = getSharedPrismaClient();
    const normalizedRole = normalizeRole(userRole);

    if (!imageUrl || !filename) {
      throw new Error('Image URL and filename are required');
    }

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

    await sendImage(sessionId, conversation.customer.phone, imageUrl, caption, {
      senderId: userId,
      companyId
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: 'ACTIVE',
        isRead: true,
        unreadCount: 0,
        lastMessageAt: new Date(),
        lastMessagePreview: '📷 صورة منتج',
        lastMessageIsFromCustomer: false,
        updatedAt: new Date()
      }
    });

    await this._logActivity(companyId, userId, 'SEND_IMAGE', conversationId, {
      sessionId,
      fileName: filename
    });

    socketService.emitToCompany(companyId, 'conversation:updated', { conversationId });

    return {
      success: true
    };
  }

  async correctMessage(conversationId, messageId, companyId, userId, userRole, correction) {
    const prisma = getSharedPrismaClient();

    // 1. Get the conversation & verify access/lock
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: { select: { id: true, phone: true, facebookId: true, instagramId: true } },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation || conversation.companyId !== companyId) {
      throw new Error('Conversation not found');
    }

    const normalizedRole = normalizeRole(userRole);
    if (!SUPERVISOR_ROLES.includes(normalizedRole) && conversation.assignedUserId !== userId) {
      throw new Error('Conversation is locked to another moderator');
    }

    // 2. Find the wrong AI message (with messageId)
    const aiMessage = conversation.messages.find(m => m.id === messageId);
    if (!aiMessage) {
      throw new Error('AI message to correct not found');
    }
    if (aiMessage.isFromCustomer || aiMessage.senderId) {
      throw new Error('Can only correct messages generated by the AI agent');
    }

    // 3. Find the last customer message before the AI message
    const customerMessages = conversation.messages.filter(
      m => m.isFromCustomer && m.createdAt < aiMessage.createdAt
    );
    customerMessages.sort((a, b) => b.createdAt - a.createdAt);
    const customerMessage = customerMessages[0];
    const customerText = customerMessage ? customerMessage.content : "(سؤال غير معروف)";

    // 4. Format the feedback text for Guardrails API
    const feedbackText = `العميل قال: "${customerText}" والوكيل أخطأ وأجاب بـ: "${aiMessage.content}" فقام الموظف البشري بتصحيح الرد إلى: "${correction}"`;

    // 5. Find the active agent for the whatsapp channel for this company
    let agentId = null;
    try {
      const axios = require('axios');
      const aiServiceUrl = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const token = process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || "";
      
      const agentsRes = await axios.get(`${aiServiceUrl}/admin/agents?company_id=${encodeURIComponent(companyId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const activeAgents = agentsRes.data || [];
      
      // Match agent by conversation channel (whatsapp, facebook, instagram, telegram)
      const channelType = (conversation.channel || 'WHATSAPP').toLowerCase();
      const channelAgent = activeAgents.find(a => 
        a.status === 'ACTIVE' && 
        (a.channels || []).some(ch => ch.toLowerCase() === channelType)
      );
      
      if (channelAgent) {
        agentId = channelAgent.id;
      } else if (activeAgents.length > 0) {
        // Fallback: any active agent
        const active = activeAgents.find(a => a.status === 'ACTIVE');
        if (active) agentId = active.id;
      }
    } catch (err) {
      console.error('[whatsappInboxService] Failed to fetch active agent:', err.message);
    }

    // 6. Create the Guardrail rule if an agent was found
    let guardrail = null;
    if (agentId) {
      try {
        const axios = require('axios');
        const aiServiceUrl = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
        const token = process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || "";
        
        const grRes = await axios.post(`${aiServiceUrl}/admin/agents/${agentId}/guardrails`, {
          feedbackText,
          companyId,
          source: 'correction_auto'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        guardrail = grRes.data;
        console.log(`[whatsappInboxService] Auto-guardrail created successfully: ${guardrail.id} for agent: ${agentId}`);
      } catch (err) {
        console.error('[whatsappInboxService] Failed to create guardrail rule:', err.response?.data || err.message);
      }
    } else {
      console.warn('[whatsappInboxService] No active WhatsApp agent found. Skipping auto-guardrail creation.');
    }

    // 7. Send the corrected reply to the customer via the appropriate channel
    let messageSent = false;
    const channel = (conversation.channel || 'WHATSAPP').toUpperCase();

    if (channel === 'WHATSAPP') {
      const sessionId = getSessionIdFromMetadata(conversation.metadata);
      if (sessionId) {
        try {
          await sendText(sessionId, conversation.customer.phone, correction, {
            senderId: userId,
            companyId,
            typingSimulation: true
          });
          messageSent = true;
        } catch (sendErr) {
          console.warn('[correctMessage] WhatsApp send failed (correction saved anyway):', sendErr.message);
        }
      } else {
        console.warn('[correctMessage] No WhatsApp session ID. Correction saved but message not sent.');
      }
    } else if (channel === 'FACEBOOK') {
      try {
        let metadata = safeJsonParse(conversation.metadata, {});
        let actualPageId = metadata.pageId || null;
        let pageAccessToken = metadata.pageAccessToken || null;

        if (!pageAccessToken && actualPageId) {
          const { getPageToken } = require('../controller/conversation/conversationShared');
          const pageTokenData = await getPageToken(actualPageId);
          pageAccessToken = pageTokenData?.pageAccessToken || null;
        }

        if (!pageAccessToken) {
          const facebookPage = await prisma.facebookPage.findFirst({
            where: { companyId, status: 'connected' }
          });
          if (facebookPage) {
            actualPageId = facebookPage.pageId;
            pageAccessToken = facebookPage.pageAccessToken;
          }
        }

        if (pageAccessToken && conversation.customer?.facebookId) {
          const { sendProductionFacebookMessage } = require('../utils/production-facebook-fix');
          await sendProductionFacebookMessage(
            conversation.customer.facebookId,
            correction,
            'TEXT',
            actualPageId,
            pageAccessToken
          );
          messageSent = true;
        } else {
          console.warn('[correctMessage] Missing Facebook credentials or customer facebookId.');
        }
      } catch (fbErr) {
        console.warn('[correctMessage] Facebook send failed (correction saved anyway):', fbErr.message);
      }
    } else if (channel === 'INSTAGRAM') {
      try {
        const igPage = await prisma.facebookPage.findFirst({
          where: { companyId, instagramAccountId: { not: null } },
          select: { pageAccessToken: true, instagramAccountId: true }
        });
        if (igPage?.pageAccessToken && igPage?.instagramAccountId && conversation.customer?.instagramId) {
          const axios = require('axios');
          const IG_API = `https://graph.facebook.com/${getMetaGraphApiVersion()}/${igPage.instagramAccountId}/messages`;
          await axios.post(IG_API, {
            recipient: { id: conversation.customer.instagramId },
            message: { text: correction }
          }, {
            headers: { Authorization: `Bearer ${igPage.pageAccessToken}` }
          });
          messageSent = true;
        } else {
          console.warn('[correctMessage] Missing Instagram credentials or customer instagramId.');
        }
      } catch (igErr) {
        console.warn('[correctMessage] Instagram send failed (correction saved anyway):', igErr.message);
      }
    } else if (channel === 'TELEGRAM') {
      try {
        let meta = safeJsonParse(conversation.metadata, {});
        if (meta.isUserbot && meta.userbotConfigId) {
          const telegramUserbotService = require('./TelegramUserbotService');
          await telegramUserbotService.sendUserbotReply(conversationId, correction);
        } else {
          const telegramBotService = require('./TelegramBotService');
          await telegramBotService.sendReply(conversationId, correction);
        }
        messageSent = true;
      } catch (tgErr) {
        console.warn('[correctMessage] Telegram send failed (correction saved anyway):', tgErr.message);
      }
    }

    // For non-WhatsApp channels, save the corrected message to the database
    // (WhatsApp messages are auto-saved via the webhook/message handler pipeline)
    if (channel !== 'WHATSAPP') {
      try {
        await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            type: 'TEXT',
            content: correction,
            isFromCustomer: false,
            isRead: true
          }
        });
      } catch (dbErr) {
        console.error('[correctMessage] Failed to save corrected message to DB:', dbErr.message);
      }
    }

    // 8. Update conversation status
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
        lastMessagePreview: correction.substring(0, 120),
        lastMessageIsFromCustomer: false,
        metadata: buildConversationMetadata(conversation.metadata, {
          inboxRouting: {
            queueKey: 'ASSIGNED_QUEUE'
          },
          sla
        })
      }
    });

    await this._logActivity(companyId, userId, 'SEND_CORRECTION', conversationId, {
      sessionId,
      contentPreview: correction.substring(0, 60),
      originalMessageId: messageId,
      guardrailCreated: !!guardrail,
      messageSent
    });

    socketService.emitToCompany(companyId, 'conversation:updated', { conversationId });

    return {
      success: true,
      messageSent,
      guardrailCreated: !!guardrail,
      guardrail
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
    const counters = {
      total: 0,
      waiting: 0,
      assigned: 0,
      pending: 0,
      closed: 0,
      escalated: 0,
      slaBreached: 0,
      missedChats: 0
    };

    const now = Date.now();

    // 1) توزيع الحالات عبر groupBy (بدل سحب كل الصفوف لحساب العدادات في JS)
    const statusGroups = await prisma.conversation.groupBy({
      by: ['status'],
      where,
      _count: { _all: true }
    });

    for (const group of statusGroups) {
      const status = String(group.status || '').toUpperCase();
      const count = group._count._all;
      counters.total += count;

      const queueKey = buildQueueKeyFromStatus(status);
      if (queueKey === 'WAITING_QUEUE') counters.waiting += count;
      if (queueKey === 'ASSIGNED_QUEUE') counters.assigned += count;
      if (queueKey === 'PENDING_QUEUE') counters.pending += count;
      if (queueKey === 'CLOSED_QUEUE') counters.closed += count;
      if (status === 'ESCALATED') counters.escalated += count;
    }

    // 2) SLA breaches: نفلتر status !== CLOSED في الـ SQL (نفس منطق النسخة الأصلية)
    const slaCandidates = await prisma.conversation.findMany({
      where: {
        ...where,
        status: { not: 'CLOSED' }
      },
      select: {
        status: true,
        metadata: true
      }
    });

    for (const conversation of slaCandidates) {
      const status = String(conversation.status || '').toUpperCase();
      const sla = safeJsonParse(conversation.metadata, {}).sla || {};
      if (sla.maxWaitingDeadlineAt && new Date(sla.maxWaitingDeadlineAt).getTime() < now && status !== 'CLOSED') {
        counters.slaBreached += 1;
      }
    }

    // 3) Missed chats: نفلتر في الـ SQL الرسائل العميلة الأقدم من 30 دقيقة
    const cutoff = new Date(now - 30 * 60 * 1000);
    const missedCandidates = await prisma.conversation.findMany({
      where: {
        ...where,
        lastMessageIsFromCustomer: true,
        lastMessageAt: { lte: cutoff }
      },
      select: {
        lastMessageAt: true
      }
    });

    for (const conversation of missedCandidates) {
      if (conversation.lastMessageAt) {
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

    // 🧹 Invalidate audience cache: الإسناد اليدوي غيّر الـ audience بتاع المحادثة
    clearConversationAudienceCache();
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
