const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controller/growthMarketingController');

// All routes require authentication
router.use(requireAuth);

// GET /api/v1/growth-marketing/dashboard
router.get('/dashboard', ctrl.getDashboard);

// GET /api/v1/growth-marketing/repeat-customers?page=1&limit=20&minOrders=2
router.get('/repeat-customers', ctrl.getRepeatCustomers);

// GET /api/v1/growth-marketing/at-risk-customers?days=30&page=1&limit=20
router.get('/at-risk-customers', ctrl.getAtRiskCustomers);

// POST /api/v1/growth-marketing/send-retention-message
router.post('/send-retention-message', ctrl.sendRetentionMessage);

module.exports = router;
