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

    // 1. Conversations where customer initiated (incoming)
    const incomingConversations = await prisma.conversation.findMany({
      where: {
        companyId,
        channel: 'WHATSAPP',
        createdAt: dateRange,
      },
      select: {
        id: true,
        assignedUserId: true,
        status: true,
        createdAt: true,
        lastMessageAt: true,
        lastMessageIsFromCustomer: true,
      },
    });

    const totalIncoming = incomingConversations.length;
    const totalAssigned = incomingConversations.filter(c => c.assignedUserId).length;

    // 2. Outgoing conversations (employee-initiated)
    const outgoingConversations = await prisma.conversation.findMany({
      where: {
        companyId,
        channel: 'WHATSAPP',
        lastMessageIsFromCustomer: false,
        updatedAt: dateRange,
      },
      select: {
        id: true,
        assignedUserId: true,
        status: true,
      },
    });

    const totalOutgoing = outgoingConversations.length;

    // 3. Messages by employees (replied)
    const employeeMessages = await prisma.message.findMany({
      where: {
        conversation: {
          companyId,
          channel: 'WHATSAPP',
        },
        isFromCustomer: false,
        createdAt: dateRange,
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        createdAt: true,
      },
    });

    const repliedConversationIds = new Set(employeeMessages.map(m => m.conversationId));
    const totalReplied = repliedConversationIds.size;
    const totalUnreplied = Math.max(0, totalIncoming - totalReplied);

    // 4. Messages from customers
    const customerMessages = await prisma.message.findMany({
      where: {
        conversation: {
          companyId,
          channel: 'WHATSAPP',
        },
        isFromCustomer: true,
        createdAt: dateRange,
      },
      select: {
        id: true,
        conversationId: true,
        createdAt: true,
      },
    });

    const totalIncomingMessages = customerMessages.length;
    const totalOutgoingMessages = employeeMessages.length;

    // 5. Per-employee breakdown
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

    // Track which conversations each employee replied to
    const employeeRepliedConvos = new Map();
    for (const msg of employeeMessages) {
      if (msg.senderId && msg.conversationId) {
        if (!employeeRepliedConvos.has(msg.senderId)) {
          employeeRepliedConvos.set(msg.senderId, new Set());
        }
        employeeRepliedConvos.get(msg.senderId).add(msg.conversationId);
        addToEmployee(msg.senderId, 'outgoingMessages');
      }
    }

    // Calculate replied/unreplied per employee
    for (const [userId, convIds] of employeeRepliedConvos) {
      addToEmployee(userId, 'repliedConversations', convIds.size);
    }

    for (const [userId, emp] of employeeMap) {
      emp.unrepliedConversations = Math.max(0, emp.assignedConversations - emp.repliedConversations);
    }

    // 6. Response time calculation (first response per conversation)
    // Build a map: conversationId -> first customer message time
    const convFirstCustomerMsg = new Map();
    for (const msg of customerMessages) {
      const existing = convFirstCustomerMsg.get(msg.conversationId);
      if (!existing || msg.createdAt < existing) {
        convFirstCustomerMsg.set(msg.conversationId, msg.createdAt);
      }
    }

    // For each employee message, find time diff with the first customer message in that conversation
    for (const msg of employeeMessages) {
      const firstCustomer = convFirstCustomerMsg.get(msg.conversationId);
      if (firstCustomer && msg.senderId) {
        const diffMs = msg.createdAt - firstCustomer;
        if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
          const emp = employeeMap.get(msg.senderId);
          if (emp) {
            emp.responseTimes.push(diffMs);
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
    const overallAvgResponseMs = employeeMessages.length > 0 && customerMessages.length > 0
      ? (() => {
          const allTimes = [];
          for (const msg of employeeMessages) {
            const firstCustomer = convFirstCustomerMsg.get(msg.conversationId);
            if (firstCustomer) {
              const diff = msg.createdAt - firstCustomer;
              if (diff > 0 && diff < 24 * 60 * 60 * 1000) allTimes.push(diff);
            }
          }
          return allTimes.length > 0
            ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length
            : null;
        })()
      : null;

    const summary = {
      totalIncomingConversations: totalIncoming,
      totalOutgoingConversations: totalOutgoing,
      totalAssigned,
      totalReplied,
      totalUnreplied,
      totalIncomingMessages,
      totalOutgoingMessages,
      overallResponseRate: totalIncoming > 0
        ? Math.round((totalReplied / totalIncoming) * 10000) / 100
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
