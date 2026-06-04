const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/platformPartner.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

// All partner routes require authentication
router.use(requireAuth);

// Public Partner Routes (Current User)
router.post('/register', partnerController.registerPartner);
router.get('/dashboard', partnerController.getPartnerDashboard);
router.post('/payout-request', partnerController.requestPayout);

// Super Admin Only Routes
router.use(requireRole(['SUPER_ADMIN']));

router.get('/admin/stats', partnerController.getAdminStats);
router.patch('/admin/title/:partnerId', partnerController.updateTitle);
router.post('/admin/process-payout/:payoutId', partnerController.processPayout);

module.exports = router;
