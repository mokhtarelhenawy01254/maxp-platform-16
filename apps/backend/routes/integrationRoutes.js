/**
 * Store Integration Routes (SHIP-T5)
 * WooCommerce and Shopify integrations
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const storeIntegrationController = require('../controller/storeIntegrationController');

const portalAuth = [verifyToken.authenticateToken];

// CRUD integrations
router.post('/', ...portalAuth, storeIntegrationController.createIntegration);
router.get('/', ...portalAuth, storeIntegrationController.listIntegrations);
router.patch('/:id', ...portalAuth, storeIntegrationController.updateIntegration);
router.delete('/:id', ...portalAuth, storeIntegrationController.deleteIntegration);
router.post('/:id/test', ...portalAuth, storeIntegrationController.testIntegration);

module.exports = router;
