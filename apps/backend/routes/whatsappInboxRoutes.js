const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { numberAccessGuard, conversationAccessGuard } = require('../middleware/numberAccessGuard');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const inboxController = require('../controller/whatsappInboxController');

// All routes require authentication + app access
router.use(requireAuth);
router.use(checkAppAccess('whatsapp-routing'));

// ─── Sessions ─────────────────────────────────────────────────────

router.get('/sessions', inboxController.getUserSessions);

router.get(
  '/sessions/:sessionId',
  numberAccessGuard('sessionId'),
  inboxController.getSessionDetail
);

router.get(
  '/sessions/:sessionId/conversations',
  numberAccessGuard('sessionId'),
  requirePermission('inbox.view'),
  inboxController.getSessionConversations
);

// ─── Unread Counts ────────────────────────────────────────────────

router.get(
  '/unread-counts',
  requirePermission('inbox.view'),
  inboxController.getUnreadCounts
);

// ─── Conversations ────────────────────────────────────────────────

router.get(
  '/conversations/:conversationId',
  conversationAccessGuard,
  requirePermission('inbox.view'),
  inboxController.getConversationDetail
);

router.post(
  '/conversations/:conversationId/messages',
  conversationAccessGuard,
  requirePermission('inbox.send'),
  inboxController.sendMessage
);

router.patch(
  '/conversations/:conversationId/status',
  conversationAccessGuard,
  requirePermission('inbox.close'),
  inboxController.updateStatus
);

router.post(
  '/conversations/:conversationId/assign',
  conversationAccessGuard,
  requirePermission('inbox.transfer'),
  inboxController.assignConversation
);

router.post(
  '/conversations/:conversationId/transfer',
  conversationAccessGuard,
  requirePermission('inbox.transfer'),
  inboxController.transferConversation
);

module.exports = router;
