const express = require('express');
const agentInboxController = require('../controller/agentInboxController');
const verifyToken = require('../utils/verifyToken');
const {
  authenticateExternalTaskApi,
  requireExternalTaskScope
} = require('../middleware/externalTaskApiAuth');

const router = express.Router();

router.get(
  '/admin/context',
  verifyToken.authenticateToken,
  agentInboxController.getAdminContext
);
router.post(
  '/admin/credentials',
  verifyToken.authenticateToken,
  agentInboxController.createCredential
);
router.post(
  '/admin/credentials/:credentialId/rotate',
  verifyToken.authenticateToken,
  agentInboxController.rotateCredential
);
router.delete(
  '/admin/credentials/:credentialId',
  verifyToken.authenticateToken,
  agentInboxController.revokeCredential
);

router.use('/facebook', authenticateExternalTaskApi);

router.get(
  '/facebook/conversations',
  requireExternalTaskScope('facebook-inbox:read'),
  agentInboxController.listFacebookConversations
);
router.get(
  '/facebook/conversations/:conversationId/messages',
  requireExternalTaskScope('facebook-inbox:read'),
  agentInboxController.getConversationMessages
);
router.post(
  '/facebook/conversations/:conversationId/pull',
  requireExternalTaskScope('facebook-inbox:read'),
  agentInboxController.pullConversationMessages
);
router.post(
  '/facebook/pull-recent',
  requireExternalTaskScope('facebook-inbox:read'),
  agentInboxController.pullRecentConversations
);
router.post(
  '/facebook/conversations/:conversationId/evaluate',
  requireExternalTaskScope('facebook-inbox:evaluate'),
  agentInboxController.evaluateConversation
);

module.exports = router;
