const express = require('express');
const router = express.Router();
const partnerController = require('../controller/platformPartner.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/performanceOptimization');

// All partner routes require authentication
router.use(requireAuth);

// Public Partner Routes (Current User)
router.post('/register', partnerController.registerPartner);
router.get('/dashboard', cacheMiddleware(60000), partnerController.getPartnerDashboard);
router.post('/payout-request', partnerController.requestPayout);

// Super Admin Only Routes
router.use(requireRole(['SUPER_ADMIN']));

router.get('/admin/stats', cacheMiddleware(60000), partnerController.getAdminStats);
router.get('/admin/partners', partnerController.getAdminPartners);
router.get('/admin/payouts', partnerController.getAdminPayouts);
router.put('/admin/partners/:partnerId/title', partnerController.updateTitle);
router.put('/admin/payouts/:payoutId', partnerController.processPayout);
router.get('/admin/settings', partnerController.getAdminSettings);
router.put('/admin/settings', partnerController.updateAdminSettings);

module.exports = router;
