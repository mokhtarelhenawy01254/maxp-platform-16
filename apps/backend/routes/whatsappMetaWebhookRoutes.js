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

module.exports = router;
