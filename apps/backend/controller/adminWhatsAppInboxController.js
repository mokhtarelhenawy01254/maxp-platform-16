const whatsappInboxService = require('../services/whatsappInboxService');
const prisma = require('../services/sharedDatabase').getSharedPrismaClient();

function getCompanyId(req) {
  const companyId = req.query.companyId || req.body?.companyId || req.user?.companyId || 'cmopgxu3a07i4jujj6f1oh32h';
  if (!companyId) {
    const err = new Error('companyId is required');
    err.statusCode = 400;
    throw err;
  }
  return companyId;
}

exports.getCompanySessions = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const sessions = await prisma.whatsAppSession.findMany({
      where: { companyId },
      select: { id: true, name: true, phoneNumber: true, status: true },
    });
    res.json({ success: true, sessions });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message || 'Failed to fetch sessions' });
  }
};

exports.getSessionDetail = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const session = await whatsappInboxService.getSessionDetail(
      req.params.sessionId, companyId, req.user.id, req.user.role,
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch session' });
  }
};

exports.getSessionConversations = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const result = await whatsappInboxService.getConversationsBySession(
      req.params.sessionId, companyId, req.user.id, req.user.role, req.query,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch conversations' });
  }
};

exports.getConversationDetail = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const conversation = await whatsappInboxService.getConversationDetail(
      req.params.conversationId, companyId, req.user.id, req.user.role,
    );
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch conversation' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { content, type } = req.body;
    if (!content) return res.status(400).json({ error: 'Message content is required' });
    const message = await whatsappInboxService.sendMessage(
      req.params.conversationId, companyId, req.user.id, req.user.role,
      content, type || 'TEXT',
    );
    res.status(201).json({ success: true, message });
  } catch (error) {
    const status = error.message?.includes('locked') ? 403 : 500;
    res.status(status).json({ error: error.message || 'Failed to send message' });
  }
};

exports.sendExistingImage = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { imageUrl, filename, caption } = req.body;
    if (!imageUrl || !filename) {
      return res.status(400).json({ error: 'Image URL and filename are required' });
    }
    const result = await whatsappInboxService.sendExistingImage(
      req.params.conversationId, companyId, req.user.id, req.user.role,
      imageUrl, filename, caption || '',
    );
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    const status = error.message?.includes('locked') ? 403 : 500;
    res.status(status).json({ error: error.message || 'Failed to send image' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const updated = await whatsappInboxService.updateChatStatus(
      req.params.conversationId, companyId, req.user.id, req.user.role,
      req.body.status, req.body.note || null,
    );
    res.json({ success: true, conversation: updated });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update status' });
  }
};

exports.assignConversation = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const updated = await whatsappInboxService.assignConversation(
      req.params.conversationId, companyId, req.user.id, req.user.role,
      req.body.userId,
    );
    res.json({ success: true, conversation: updated });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to assign conversation' });
  }
};

exports.transferConversation = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const updated = await whatsappInboxService.transferConversation(
      req.params.conversationId, companyId, req.user.id, req.user.role,
      req.body.toUserId, req.body.note || null,
    );
    res.json({ success: true, conversation: updated });
  } catch (error) {
    const status = error.message?.includes('locked') ? 403 : 500;
    res.status(status).json({ error: error.message || 'Failed to transfer conversation' });
  }
};

exports.getUnreadCounts = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const result = await whatsappInboxService.getUnreadCounts(companyId, req.user.id, req.user.role);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch unread counts' });
  }
};
