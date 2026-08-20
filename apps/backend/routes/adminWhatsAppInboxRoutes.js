const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const inboxController = require('../controller/adminWhatsAppInboxController');

router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireSuperAdmin);

router.get('/sessions', inboxController.getCompanySessions);
router.get('/sessions/:sessionId', inboxController.getSessionDetail);
router.get('/sessions/:sessionId/conversations', inboxController.getSessionConversations);
router.get('/unread-counts', inboxController.getUnreadCounts);
router.get('/conversations/:conversationId', inboxController.getConversationDetail);
router.post('/conversations/:conversationId/messages', inboxController.sendMessage);
router.post('/conversations/:conversationId/send-existing-image', inboxController.sendExistingImage);
router.patch('/conversations/:conversationId/status', inboxController.updateStatus);
router.post('/conversations/:conversationId/assign', inboxController.assignConversation);
router.post('/conversations/:conversationId/transfer', inboxController.transferConversation);

module.exports = router;
