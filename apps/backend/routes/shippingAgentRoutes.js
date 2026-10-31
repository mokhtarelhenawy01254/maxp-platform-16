const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { getTicketAdapter } = require('../services/shippingProviderService');
const ticketThreadService = require('../services/shipping/ticketThreadService');
const carrierTicketSyncCron = require('../cron/carrierTicketSyncCron');

const ALLOWED_ROLES = ['OWNER', 'COMPANY_ADMIN', 'MANAGER', 'AGENT', 'SUPER_ADMIN', 'AI_SERVICE'];

function requireShippingAgentRole(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  const userRole = req.user.role;
  if (ALLOWED_ROLES.includes(userRole) || req.user.service === true) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Insufficient role permissions' });
}

// Global middlewares for shipping agent router
router.use(verifyToken.authenticateToken);
router.use(requireShippingAgentRole);
router.use(checkAppAccess('order-shipping-turbo'));

/**
 * GET /api/v1/shipping-agent/threads
 * List threads for current user company
 */
router.get('/threads', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { status, unreadOnly, limit, cursor } = req.query;
    const result = await ticketThreadService.listThreads(companyId, {
      status,
      unreadOnly,
      limit,
      cursor,
    });
    return res.json(result);
  } catch (err) {
    console.error('[SHIPPING-AGENT-ROUTE] Error listing threads:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/shipping-agent/threads/:id
 * Get thread details and latest 50 messages
 */
router.get('/threads/:id', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const result = await ticketThreadService.getThread(companyId, id);
    if (!result.success) {
      return res.status(result.status || 404).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error('[SHIPPING-AGENT-ROUTE] Error fetching thread:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/shipping-agent/threads/:id/reply
 * Send a reply to the carrier and record outbound message
 */
router.post('/threads/:id/reply', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, error: 'نص الرد مطلوب' });
    }

    const threadRes = await ticketThreadService.getThread(companyId, id);
    if (!threadRes.success || !threadRes.thread) {
      return res.status(404).json({ success: false, error: 'المحادثة غير موجودة' });
    }

    const thread = threadRes.thread;
    const adapter = getTicketAdapter({ providerKey: thread.providerKey });

    // 1) Send reply via carrier adapter
    const replyResult = await adapter.reply({
      companyId,
      ticketId: thread.externalId,
      message: String(message).trim(),
    });

    // 2) Append outbound message to local database
    const appendResult = await ticketThreadService.appendMessage(thread.id, {
      companyId,
      direction: 'OUTBOUND',
      externalId: replyResult?.externalId || `out-${Date.now()}`,
      body: String(message).trim(),
      authorName: req.user.name || 'المتجر',
      sentAt: new Date(),
    });

    // 3) Mark thread as read & update status
    await ticketThreadService.markRead(companyId, id);

    const prisma = getSharedPrismaClient();
    await prisma.carrierTicket.update({
      where: { id: thread.id },
      data: { status: 'RESOLVED' },
    });

    return res.json({
      success: true,
      message: 'تم إرسال الرد بنجاح',
      sentMessage: appendResult.message,
      replyResult,
    });
  } catch (err) {
    console.error('[SHIPPING-AGENT-ROUTE] Error replying to thread:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/shipping-agent/threads/:id/close
 * Close a thread
 */
router.post('/threads/:id/close', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const thread = await prisma.carrierTicket.findFirst({
      where: { id, companyId },
    });

    if (!thread) {
      return res.status(404).json({ success: false, error: 'المحادثة غير موجودة' });
    }

    await prisma.carrierTicket.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    return res.json({ success: true, message: 'تم إغلاق المحادثة', status: 'CLOSED' });
  } catch (err) {
    console.error('[SHIPPING-AGENT-ROUTE] Error closing thread:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/shipping-agent/threads/sync
 * Manually trigger synchronization (e.g. for DEMO provider or cron test)
 */
router.post('/threads/sync', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { providerKey, code, threadId } = req.body || {};

    const syncResult = await carrierTicketSyncCron.syncTickets({
      companyId,
      providerKey,
      code,
      threadId,
    });

    return res.json({
      success: true,
      ...syncResult,
    });
  } catch (err) {
    console.error('[SHIPPING-AGENT-ROUTE] Error syncing tickets:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/shipping-agent/settings
 */
router.get('/settings', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const settings = await ticketThreadService.getSettings(companyId);
    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/v1/shipping-agent/settings
 */
router.put('/settings', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const updated = await ticketThreadService.updateSettings(companyId, req.body);
    return res.json({ success: true, settings: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
