/**
 * 📡 Meta WhatsApp Cloud API Webhook Routes
 */

const express = require('express');
const router = express.Router();
const whatsappMetaWebhookController = require('../controller/whatsappMetaWebhookController');

// Verification
router.get('/', whatsappMetaWebhookController.getWebhook);

// Receive events
router.post('/', whatsappMetaWebhookController.postWebhook);

// Temporary Debug Logs
router.get('/debug-logs', whatsappMetaWebhookController.getDebugLogs);

module.exports = router;
