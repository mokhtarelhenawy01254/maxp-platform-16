const whatsappInboxService = require('../services/whatsappInboxService');
const { computeWindowStatus } = require('../services/whatsapp/WhatsAppWindowService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

/**
 * @route GET /api/v1/whatsapp-inbox/sessions
 * @desc Get all WhatsApp sessions accessible to the current user
 */
exports.getUserSessions = async (req, res) => {
  try {
    const { getUserAccessibleSessionIds } = require('../middleware/numberAccessGuard');
    const prisma = require('../services/sharedDatabase').getSharedPrismaClient();
    const sessions = await getUserAccessibleSessionIds(req.user.id, req.user.companyId, prisma);
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('[InboxController] getUserSessions error:', error.message);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

/**
 * @route GET /api/v1/whatsapp-inbox/sessions/:sessionId/conversations
 * @desc Get conversations for a specific WhatsApp session
 */
exports.getSessionConversations = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await whatsappInboxService.getConversationsBySession(
      sessionId,
      req.user.companyId,
      req.user.id,
      req.user.role,
      req.query
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[InboxController] getSessionConversations error:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

/**
 * @route GET /api/v1/whatsapp-inbox/conversations/:conversationId
 * @desc Get conversation detail with messages
 */
exports.getConversationDetail = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await whatsappInboxService.getConversationDetail(
      conversationId,
      req.user.companyId,
      req.user.id,
      req.user.role
    );
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ success: true, conversation });
  } catch (error) {
    console.error('[InboxController] getConversationDetail error:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
};

/**
 * @route POST /api/v1/whatsapp-inbox/conversations/:conversationId/messages
 * @desc Send a message in a conversation
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const message = await whatsappInboxService.sendMessage(
      conversationId,
      req.user.companyId,
      req.user.id,
      req.user.role,
      content,
      type || 'TEXT'
    );
    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('[InboxController] sendMessage error:', error.message);
    const statusCode = error.message?.includes('locked') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to send message' });
  }
};

/**
 * @route POST /api/v1/whatsapp-inbox/conversations/:conversationId/send-sms
 * @desc Send an SMS fallback to customer in a conversation
 */
exports.sendSmsFallback = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const result = await whatsappInboxService.sendSmsFallback(
      conversationId,
      req.user.companyId,
      req.user.id,
      req.user.role,
      content
    );
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    console.error('[InboxController] sendSmsFallback error:', error.message);
    const statusCode = error.message?.includes('locked') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to send SMS fallback' });
  }
};

/**
 * @route POST /api/v1/whatsapp-inbox/conversations/:conversationId/send-existing-image
 * @desc Send an existing product image as a WhatsApp message
 */
exports.sendExistingImage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { imageUrl, filename, caption } = req.body;

    if (!imageUrl || !filename) {
      return res.status(400).json({ error: 'Image URL and filename are required' });
    }

    const result = await whatsappInboxService.sendExistingImage(
      conversationId,
      req.user.companyId,
      req.user.id,
      req.user.role,
      imageUrl,
      filename,
      caption || ''
    );
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    console.error('[InboxController] sendExistingImage error:', error.message);
    const statusCode = error.message?.includes('locked') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to send image' });
  }
};

/**
 * @route POST /api/v1/whatsapp-inbox/conversations/:conversationId/messages/:messageId/correct
 * @desc Correct an AI message, sending the correction to WhatsApp and creating a guardrail rule
 */
exports.correctMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { correction } = req.body;

    if (!correction) {
      return res.status(400).json({ error: 'Correction content is required' });
    }

    const result = await whatsappInboxService.correctMessage(
      conversationId,
      messageId,
      req.user.companyId,
      req.user.id,
      req.user.role,
      correction
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('[InboxController] correctMessage error:', error.message);
    const statusCode = error.message?.includes('locked') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to correct message' });
  }
};

/**
 * @route PATCH /api/v1/whatsapp-inbox/conversations/:conversationId/status
 * @desc Update conversation status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;

    const updated = await whatsappInboxService.updateChatStatus(
      conversationId,
      req.user.companyId,
      req.user.id,
      req.user.role,
      status,
      req.body.note || null
    );
    res.json({ success: true, conversation: updated });
  } catch (error) {
    console.error('[InboxController] updateStatus error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to update status' });
  }
};

/**
 * @route POST /api/v1/whatsapp-inbox/conversations/:conversationId/assign
 * @desc Assign conversation to a moderator
 */
exports.assignConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId: newUserId } = req.body;

    const updated = await whatsappInboxService.assignConversation(
      conversationId,
      req.user.companyId,
      req.user.id,
      req.user.role,
      newUserId
    );
    res.json({ success: true, conversation: updated });
  } catch (error) {
    console.error('[InboxController] assignConversation error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to assign conversation' });
  }
};

/**
 * @route POST /api/v1/whatsapp-inbox/conversations/:conversationId/transfer
 * @desc Transfer conversation to another moderator
 */
exports.transferConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { toUserId } = req.body;
    const fromUserId = req.user.id;

    const updated = await whatsappInboxService.transferConversation(
      conversationId,
      req.user.companyId,
      fromUserId,
      req.user.role,
      toUserId,
      req.body.note || null
    );

    res.json({ success: true, conversation: updated });
  } catch (error) {
    console.error('[InboxController] transferConversation error:', error.message);
    const statusCode = error.message?.includes('locked') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to transfer conversation' });
  }
};

/**
 * @route GET /api/v1/whatsapp-inbox/unread-counts
 * @desc Get unread counts per session
 */
exports.getUnreadCounts = async (req, res) => {
  try {
    const result = await whatsappInboxService.getUnreadCounts(
      req.user.companyId,
      req.user.id,
      req.user.role
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[InboxController] getUnreadCounts error:', error.message);
    res.status(500).json({ error: 'Failed to fetch unread counts' });
  }
};

/**
 * @route GET /api/v1/whatsapp-inbox/sessions/:sessionId
 * @desc Get session detail
 */
exports.getSessionDetail = async (req, res) => {
  try {
    const session = await whatsappInboxService.getSessionDetail(
      req.params.sessionId,
      req.user.companyId,
      req.user.id,
      req.user.role
    );
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json({ success: true, session });
  } catch (error) {
    console.error('[InboxController] getSessionDetail error:', error.message);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};

/**
 * @route GET /api/v1/whatsapp-inbox/sessions/:sessionId/contacts/:phone/window
 * @desc Get 24-hour messaging window status for a contact
 */
exports.getContactWindow = async (req, res) => {
  try {
    const { sessionId } = req.params;
    let phone = req.params.phone;

    // Normalize phone
    phone = phone.replace(/\D/g, '');

    const prisma = require('../services/sharedDatabase').getSharedPrismaClient();

    // Look up the contact by session + phone
    const contact = await prisma.whatsAppContact.findFirst({
      where: {
        sessionId,
        OR: [
          { phoneNumber: { contains: phone } },
          { jid: { contains: phone } }
        ]
      },
      select: {
        id: true,
        jid: true,
        phoneNumber: true,
        name: true,
        pushName: true,
        lastCustomerMessageAt: true,
        customerId: true
      }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found in this session'
      });
    }

    const window = computeWindowStatus(contact);

    res.json({
      success: true,
      contact: {
        id: contact.id,
        jid: contact.jid,
        phoneNumber: contact.phoneNumber,
        name: contact.name || contact.pushName || null
      },
      window
    });
  } catch (error) {
    console.error('[InboxController] getContactWindow error:', error.message);
    res.status(500).json({ error: 'Failed to fetch window status' });
  }
};

/**
 * @route GET /api/v1/whatsapp-inbox/employee-analytics
 * @desc Employee performance analytics for WhatsApp conversations
 * @query date - ISO date string (defaults to today)
 * @query startDate - ISO date string (optional range start)
 * @query endDate - ISO date string (optional range end)
 */
exports.getEmployeeAnalytics = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;
    const { date, startDate, endDate } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      const targetDate = date ? new Date(date) : new Date();
      start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);
    }

    const dateRange = { gte: start, lte: end };

    // 1. Customer messages in period → determines incoming conversations
    const customerMessages = await prisma.message.findMany({
      where: {
        conversation: { companyId, channel: 'WHATSAPP' },
        isFromCustomer: true,
        createdAt: dateRange,
      },
      select: { id: true, conversationId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const incomingConversationIds = [...new Set(customerMessages.map(m => m.conversationId))];
    const totalIncomingConversations = incomingConversationIds.length;

    // 2. Conversations with incoming messages → get assignments
    const incomingConversations = incomingConversationIds.length > 0
      ? await prisma.conversation.findMany({
          where: { id: { in: incomingConversationIds } },
          select: { id: true, assignedUserId: true },
        })
      : [];
    const assignedConvMap = new Map(incomingConversations.map(c => [c.id, c]));
    const totalAssigned = incomingConversations.filter(c => c.assignedUserId).length;

    // 3. Employee messages in period
    const employeeMessages = await prisma.message.findMany({
      where: {
        conversation: { companyId, channel: 'WHATSAPP' },
        isFromCustomer: false,
        createdAt: dateRange,
      },
      select: { id: true, conversationId: true, senderId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const incomingConvIdSet = new Set(incomingConversationIds);
    const repliedIncomingConvIds = new Set(
      employeeMessages.filter(m => incomingConvIdSet.has(m.conversationId)).map(m => m.conversationId)
    );
    const totalReplied = repliedIncomingConvIds.size;
    const totalUnreplied = totalIncomingConversations - totalReplied;

    const totalIncomingMessages = customerMessages.length;
    const totalOutgoingMessages = employeeMessages.length;

    // 4. Per-employee breakdown
    const employeeMap = new Map();

    const addToEmployee = (userId, field, value = 1) => {
      if (!userId) return;
      if (!employeeMap.has(userId)) {
        employeeMap.set(userId, {
          userId,
          assignedConversations: 0,
          repliedConversations: 0,
          unrepliedConversations: 0,
          incomingMessages: 0,
          outgoingMessages: 0,
          responseTimes: [],
        });
      }
      const emp = employeeMap.get(userId);
      emp[field] = (emp[field] || 0) + value;
    };

    // Assign incoming conversations to employees
    for (const conv of incomingConversations) {
      if (conv.assignedUserId) {
        addToEmployee(conv.assignedUserId, 'assignedConversations');
      }
    }

    // Per-employee incoming message count (was always 0 before)
    for (const msg of customerMessages) {
      const conv = assignedConvMap.get(msg.conversationId);
      if (conv?.assignedUserId) {
        addToEmployee(conv.assignedUserId, 'incomingMessages');
      }
    }

    // Track employee replies — only count replies in conversations assigned TO them
    const employeeRepliedConvos = new Map();
    for (const msg of employeeMessages) {
      if (msg.senderId && msg.conversationId) {
        addToEmployee(msg.senderId, 'outgoingMessages');
        const conv = assignedConvMap.get(msg.conversationId);
        if (conv?.assignedUserId === msg.senderId) {
          if (!employeeRepliedConvos.has(msg.senderId)) {
            employeeRepliedConvos.set(msg.senderId, new Set());
          }
          employeeRepliedConvos.get(msg.senderId).add(msg.conversationId);
        }
      }
    }

    // Calculate replied/unreplied per employee
    for (const [userId, convIds] of employeeRepliedConvos) {
      addToEmployee(userId, 'repliedConversations', convIds.size);
    }

    for (const [userId, emp] of employeeMap) {
      emp.unrepliedConversations = emp.assignedConversations - emp.repliedConversations;
    }

    // 5. Response time: per-turn, from last customer msg to next employee reply
    const msgsByConv = new Map();
    for (const msg of customerMessages) {
      if (!msgsByConv.has(msg.conversationId)) msgsByConv.set(msg.conversationId, []);
      msgsByConv.get(msg.conversationId).push({ ...msg, isCustomer: true });
    }
    for (const msg of employeeMessages) {
      if (!msgsByConv.has(msg.conversationId)) msgsByConv.set(msg.conversationId, []);
      msgsByConv.get(msg.conversationId).push({ ...msg, isCustomer: false });
    }

    for (const [, msgs] of msgsByConv) {
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      let lastCustomerTime = null;
      for (const msg of msgs) {
        if (msg.isCustomer) {
          lastCustomerTime = msg.createdAt;
        } else if (lastCustomerTime && msg.senderId) {
          const diffMs = msg.createdAt - lastCustomerTime;
          if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
            const emp = employeeMap.get(msg.senderId);
            if (emp) emp.responseTimes.push(diffMs);
          }
        }
      }
    }

    // 7. Fetch user details
    const userIds = Array.from(employeeMap.keys());
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
    }) : [];

    const userMap = new Map(users.map(u => [u.id, u]));

    // 8. Calculate averages and finalize
    const employeeStats = Array.from(employeeMap.values()).map(emp => {
      const user = userMap.get(emp.userId);
      const avgResponseTimeMs = emp.responseTimes.length > 0
        ? emp.responseTimes.reduce((a, b) => a + b, 0) / emp.responseTimes.length
        : null;
      const responseRate = emp.assignedConversations > 0
        ? (emp.repliedConversations / emp.assignedConversations) * 100
        : 0;

      return {
        userId: emp.userId,
        userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'غير معروف',
        userEmail: user?.email || '',
        userImage: user?.avatar || null,
        assignedConversations: emp.assignedConversations,
        repliedConversations: emp.repliedConversations,
        unrepliedConversations: emp.unrepliedConversations,
        incomingMessages: emp.incomingMessages,
        outgoingMessages: emp.outgoingMessages,
        responseRate: Math.round(responseRate * 100) / 100,
        avgResponseTimeMs,
        avgResponseTimeMin: avgResponseTimeMs ? Math.round(avgResponseTimeMs / 60000) : null,
      };
    });

    employeeStats.sort((a, b) => b.assignedConversations - a.assignedConversations);

    // Overall summary
    const allTimes = [];
    for (const [, msgs] of msgsByConv) {
      let lastCustomerTime = null;
      for (const msg of msgs) {
        if (msg.isCustomer) {
          lastCustomerTime = msg.createdAt;
        } else if (lastCustomerTime) {
          const diff = msg.createdAt - lastCustomerTime;
          if (diff > 0 && diff < 24 * 60 * 60 * 1000) allTimes.push(diff);
        }
      }
    }
    const overallAvgResponseMs = allTimes.length > 0
      ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length
      : null;

    const summary = {
      totalIncomingConversations,
      totalAssigned,
      totalReplied,
      totalUnreplied,
      totalIncomingMessages,
      totalOutgoingMessages,
      overallResponseRate: totalIncomingConversations > 0
        ? Math.round((totalReplied / totalIncomingConversations) * 10000) / 100
        : 0,
      overallAvgResponseTimeMs: overallAvgResponseMs,
      overallAvgResponseTimeMin: overallAvgResponseMs
        ? Math.round(overallAvgResponseMs / 60000)
        : null,
      activeEmployees: userIds.length,
    };

    res.json({
      success: true,
      period: { start: start.toISOString(), end: end.toISOString() },
      summary,
      employees: employeeStats,
    });
  } catch (error) {
    console.error('[InboxController] getEmployeeAnalytics error:', error.message);
    res.status(500).json({ error: 'Failed to fetch employee analytics' });
  }
};

/**
 * @route GET /api/v1/whatsapp-inbox/conversation-analytics
 * @desc Conversation analytics: status distribution, hourly patterns, tags, recent conversations
 * @query startDate - ISO date string
 * @query endDate - ISO date string
 */
exports.getConversationAnalytics = async (req, res) => {
  try {
    const prisma = getSharedPrismaClient();
    const companyId = req.user.companyId;
    const { startDate, endDate } = req.query;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate + 'T00:00:00.000Z');
      end = new Date(endDate + 'T23:59:59.999Z');
    } else {
      const now = new Date();
      end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
      start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
      start.setUTCHours(0, 0, 0, 0);
    }

    const dateRange = { gte: start, lte: end };

    // 1. ALL WhatsApp conversations (not filtered by createdAt — broadcasts go to existing convs)
    const conversations = await prisma.conversation.findMany({
      where: {
        companyId,
        channel: { in: ['WHATSAPP', 'whatsapp'] },
        lastMessageAt: { gte: start }, // at least one message in period
      },
      select: {
        id: true,
        status: true,
        assignedUserId: true,
        lastMessageAt: true,
        lastMessageIsFromCustomer: true,
        unreadCount: true,
        priority: true,
        createdAt: true,
      },
    });

    const totalConversations = conversations.length;

    // 2. Status distribution
    const statusCounts = {};
    for (const conv of conversations) {
      statusCounts[conv.status] = (statusCounts[conv.status] || 0) + 1;
    }

    // 3. Assigned vs unassigned
    const assignedCount = conversations.filter(c => c.assignedUserId).length;
    const unassignedCount = totalConversations - assignedCount;

    // 4. Last message origin (who needs to reply next)
    const waitingForReply = conversations.filter(c => c.lastMessageIsFromCustomer).length;
    const awaitingCustomer = totalConversations - waitingForReply;

    // 5. Messages in period for these conversations
    const convIds = conversations.map(c => c.id);
    const messages = convIds.length > 0
      ? await prisma.message.findMany({
          where: {
            conversationId: { in: convIds },
            createdAt: dateRange,
          },
          select: {
            id: true,
            conversationId: true,
            isFromCustomer: true,
            senderId: true,
            metadata: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const totalMessages = messages.length;
    const incomingMessages = messages.filter(m => m.isFromCustomer).length;
    const outgoingMessages = totalMessages - incomingMessages;

    // Categorize outgoing: broadcast (metadata.isBroadcast) vs manual (senderId set) vs automated (no senderId)
    let broadcastOutgoing = 0;
    let manualOutgoing = 0;
    let autoOutgoing = 0;
    for (const m of messages) {
      if (m.isFromCustomer) continue;
      let meta = null;
      try { meta = m.metadata ? JSON.parse(m.metadata) : null; } catch(e) {}
      if (meta && meta.isBroadcast === true) {
        broadcastOutgoing++;
      } else if (m.senderId) {
        manualOutgoing++;
      } else {
        autoOutgoing++;
      }
    }

    // 6. Avg messages per conversation
    const msgsPerConv = new Map();
    for (const msg of messages) {
      msgsPerConv.set(msg.conversationId, (msgsPerConv.get(msg.conversationId) || 0) + 1);
    }
    const avgMessagesPerConversation = convIds.length > 0
      ? Math.round((totalMessages / convIds.length) * 10) / 10
      : 0;

    // 7. Hourly distribution (0-23)
    const hourlyDistribution = Array.from({ length: 24 }, () => 0);
    for (const msg of messages) {
      const hour = new Date(msg.createdAt).getHours();
      hourlyDistribution[hour]++;
    }

    // 8. Daily distribution (for time series)
    const dailyMap = new Map();
    for (const msg of messages) {
      const day = new Date(msg.createdAt).toISOString().substring(0, 10);
      if (!dailyMap.has(day)) dailyMap.set(day, { incoming: 0, outgoing: 0, conversations: new Set() });
      const entry = dailyMap.get(day);
      if (msg.isFromCustomer) entry.incoming++;
      else entry.outgoing++;
      entry.conversations.add(msg.conversationId);
    }
    const dailyDistribution = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        incoming: data.incoming,
        outgoing: data.outgoing,
        conversations: data.conversations.size,
      }));

    // 9. Tags distribution (from ConversationTag)
    const tags = convIds.length > 0
      ? await prisma.conversationTag.findMany({
          where: { conversationId: { in: convIds } },
          select: { tag: true, conversationId: true },
        })
      : [];
    const tagCounts = {};
    for (const t of tags) {
      tagCounts[t.tag] = (tagCounts[t.tag] || 0) + 1;
    }
    const tagDistribution = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    // 10. Unread summary
    const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    const conversationsWithUnread = conversations.filter(c => c.unreadCount > 0).length;

    // 11. Response time calculation
    const convMsgs = new Map();
    for (const msg of messages) {
      if (!convMsgs.has(msg.conversationId)) convMsgs.set(msg.conversationId, []);
      convMsgs.get(msg.conversationId).push(msg);
    }
    const responseTimes = [];
    for (const [, msgs] of convMsgs) {
      let lastCustomerTime = null;
      for (const msg of msgs) {
        if (msg.isFromCustomer) {
          lastCustomerTime = msg.createdAt;
        } else if (lastCustomerTime) {
          const diffMs = msg.createdAt - lastCustomerTime;
          if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
            responseTimes.push(diffMs);
          }
        }
      }
    }
    const avgResponseTimeMs = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : null;

    // 12. Recent conversations (last 10 by lastMessageAt)
    const recentConversations = [...conversations]
      .sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        status: c.status,
        assignedUserId: c.assignedUserId,
        lastMessageAt: c.lastMessageAt,
        lastMessageIsFromCustomer: c.lastMessageIsFromCustomer,
        unreadCount: c.unreadCount,
        messageCount: msgsPerConv.get(c.id) || 0,
      }));

    // 13. Fetch user names for assigned moderators
    const assignedUserIds = [...new Set(conversations.filter(c => c.assignedUserId).map(c => c.assignedUserId))];
    const assignedUsers = assignedUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: assignedUserIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const userMap = new Map(assignedUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`.trim()]));

    res.json({
      success: true,
      period: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        totalConversations,
        totalMessages,
        incomingMessages,
        outgoingMessages,
        manualOutgoing,
        broadcastOutgoing,
        autoOutgoing,
        avgMessagesPerConversation,
        assignedCount,
        unassignedCount,
        waitingForReply,
        awaitingCustomer,
        totalUnread,
        conversationsWithUnread,
        avgResponseTimeMs,
        avgResponseTimeMin: avgResponseTimeMs ? Math.round(avgResponseTimeMs / 60000) : null,
      },
      statusDistribution: statusCounts,
      hourlyDistribution,
      dailyDistribution,
      tagDistribution,
      recentConversations,
      userMap: Object.fromEntries(userMap),
    });
  } catch (error) {
    console.error('[InboxController] getConversationAnalytics error:', error.message);
    res.status(500).json({ error: 'Failed to fetch conversation analytics' });
  }
};
