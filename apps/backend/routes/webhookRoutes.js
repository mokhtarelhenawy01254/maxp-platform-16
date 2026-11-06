const express = require('express');
const router = express.Router();
const webhookController = require('../controller/webhookController');
const storeIntegrationController = require('../controller/storeIntegrationController');

router.get('/', webhookController.getWebhook);
router.post('/', webhookController.postWebhook);

// External store order webhook (WooCommerce / Shopify) (SHIP-T5)
router.post('/store/:integrationId/order', storeIntegrationController.handleStoreOrderWebhook);

module.exports = router;
