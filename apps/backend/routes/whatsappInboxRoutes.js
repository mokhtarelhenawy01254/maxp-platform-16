const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { numberAccessGuard, conversationAccessGuard } = require('../middleware/numberAccessGuard');
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const { checkAppAccess } = require('../middleware/checkAppAccess');
const inboxController = require('../controller/whatsappInboxController');

// All routes require authentication and active WhatsApp subscription
router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('whatsapp-business'));

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
  requireDbPermission('inbox.view'),
  inboxController.getSessionConversations
);

// ─── Unread Counts ────────────────────────────────────────────────

router.get(
  '/unread-counts',
  requireDbPermission('inbox.view'),
  inboxController.getUnreadCounts
);

// ─── WhatsApp Messaging Window ────────────────────────────────────

router.get(
  '/sessions/:sessionId/contacts/:phone/window',
  numberAccessGuard('sessionId'),
  requireDbPermission('inbox.view'),
  inboxController.getContactWindow
);

// ─── Conversations ────────────────────────────────────────────────

router.get(
  '/conversations/:conversationId',
  conversationAccessGuard,
  requireDbPermission('inbox.view'),
  inboxController.getConversationDetail
);

router.post(
  '/conversations/:conversationId/messages',
  conversationAccessGuard,
  requireDbPermission('inbox.send'),
  inboxController.sendMessage
);

router.post(
  '/conversations/:conversationId/send-sms',
  conversationAccessGuard,
  requireDbPermission('inbox.send'),
  inboxController.sendSmsFallback
);

router.post(
  '/conversations/:conversationId/send-existing-image',
  conversationAccessGuard,
  requireDbPermission('inbox.send'),
  inboxController.sendExistingImage
);

router.post(
  '/conversations/:conversationId/messages/:messageId/correct',
  conversationAccessGuard,
  requireDbPermission('inbox.send'),
  inboxController.correctMessage
);

router.patch(
  '/conversations/:conversationId/status',
  conversationAccessGuard,
  requireDbPermission('inbox.close'),
  inboxController.updateStatus
);

router.post(
  '/conversations/:conversationId/assign',
  conversationAccessGuard,
  requireDbPermission('inbox.transfer'),
  inboxController.assignConversation
);

router.post(
  '/conversations/:conversationId/transfer',
  conversationAccessGuard,
  requireDbPermission('inbox.transfer'),
  inboxController.transferConversation
);

// ─── Employee Analytics ─────────────────────────────────────────────
router.get(
  '/employee-analytics',
  requireDbPermission('inbox.view'),
  inboxController.getEmployeeAnalytics
);

// ─── Conversation Analytics ────────────────────────────────────────
router.get(
  '/conversation-analytics',
  requireDbPermission('inbox.view'),
  inboxController.getConversationAnalytics
);

module.exports = router;
