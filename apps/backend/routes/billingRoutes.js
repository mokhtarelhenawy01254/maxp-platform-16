/**
 * Billing Routes — V1.0
 * Subscription status and billing history endpoints.
 */
 
const express = require('express');
const router = express.Router();
const billingService = require('../services/billingService');
const verifyToken = require("../utils/verifyToken");

// ponytail: checkSubscription middleware removed
router.use(verifyToken.authenticateToken);

/**
 * GET /api/billing/status
 * Returns current subscription status.
 */
router.get('/status', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(400).json({ success: false, message: 'Company ID required' });

        const status = await billingService.getSubscriptionStatus(companyId);

        res.json({ success: true, subscription: status });
    } catch (error) {
        console.error('❌ [BILLING ROUTE] /status error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to get subscription status' });
    }
});

/**
 * GET /api/billing/history
 * Returns paginated billing history.
 */
router.get('/history', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(400).json({ success: false, message: 'Company ID required' });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await billingService.getBillingHistory(companyId, page, limit);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('❌ [BILLING ROUTE] /history error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to get billing history' });
    }
});

module.exports = router;
