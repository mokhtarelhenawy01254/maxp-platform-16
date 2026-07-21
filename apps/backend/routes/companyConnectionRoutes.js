const express = require('express');
const router = express.Router();
const companyConnectionController = require('../controller/companyConnectionController');
const verifyToken = require('../utils/verifyToken');

router.use(verifyToken.authenticateToken);

// Requests
router.get('/requests', companyConnectionController.getReceivedRequests);
router.post('/requests', companyConnectionController.sendConnectionRequest);
router.get('/requests/received', companyConnectionController.getReceivedRequests);
router.put('/requests/:id/respond', companyConnectionController.respondToRequest);

// Connections
router.get('/active', companyConnectionController.getActiveConnections);
router.get('/consumers', companyConnectionController.getConsumers);
router.put('/:id/permissions', companyConnectionController.updatePermissions);
router.delete('/:id', companyConnectionController.deleteConnection);

// Company Affiliates (Dashboard)
router.get('/affiliates', companyConnectionController.getCompanyAffiliates);

// Data Pulling
router.get('/:providerId/products', companyConnectionController.fetchProductsFromProvider);
router.post('/:providerId/import', companyConnectionController.importInternalProducts);

// ───────── Consumer Side (الشركة المسوقة) ─────────
router.get('/:connectionId/consumer/affiliate', companyConnectionController.getConsumerAffiliateData);
router.get('/:connectionId/consumer/orders', companyConnectionController.getConsumerConnectionOrders);
router.get('/:connectionId/consumer/commissions', companyConnectionController.getConsumerConnectionCommissions);
router.get('/:connectionId/consumer/payouts', companyConnectionController.getConsumerConnectionPayouts);
router.post('/:connectionId/consumer/payout-request', companyConnectionController.createConsumerConnectionPayoutRequest);
router.post('/:connectionId/consumer/resync-balance', companyConnectionController.resyncConsumerAffiliateBalance);
router.post('/:connectionId/consumer/create-test-commissions', companyConnectionController.createTestCommissions);

// ───────── Provider Side (الشركة المورّدة) ─────────
router.get('/:connectionId/provider/orders', companyConnectionController.getProviderConnectionOrders);
router.get('/:connectionId/provider/commissions', companyConnectionController.getProviderConnectionCommissions);
router.get('/:connectionId/provider/payouts', companyConnectionController.getProviderConnectionPayouts);
router.post('/:connectionId/provider/payouts/:payoutId/record', companyConnectionController.recordProviderPayout);
router.post('/:connectionId/provider/payouts/:payoutId/cancel', companyConnectionController.cancelProviderPayout);

module.exports = router;
