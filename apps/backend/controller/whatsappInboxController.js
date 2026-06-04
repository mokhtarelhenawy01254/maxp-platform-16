const whatsappInboxService = require('../services/whatsappInboxService');

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
