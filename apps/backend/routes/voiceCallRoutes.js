/**
 * Voice Call Routes
 * REST and Webhook routes for AI-driven phone call order confirmations.
 */

const express = require('express');
const router = express.Router();
const voiceCallController = require('../controller/voiceCallController');
const verifyToken = require('../utils/verifyToken');

const ADMIN_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'AGENT'];

// Public webhook ingress (called by telephony providers e.g. Vapi)
router.post('/webhook/vapi', voiceCallController.handleVapiWebhook);

// Protected routes for dashboard users
router.use(verifyToken.authenticateToken);

router.post('/trigger', verifyToken.requireRole(ADMIN_ROLES), voiceCallController.triggerOrderCall);
router.get('/logs/:orderId', verifyToken.requireRole(ADMIN_ROLES), voiceCallController.getOrderCallLogs);
router.get('/settings', verifyToken.requireRole(ADMIN_ROLES), voiceCallController.getVoiceSettings);
router.put('/settings', verifyToken.requireRole(ADMIN_ROLES), voiceCallController.updateVoiceSettings);

module.exports = router;
