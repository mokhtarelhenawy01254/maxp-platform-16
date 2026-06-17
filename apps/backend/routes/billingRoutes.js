/**
 * Billing Routes — V1.0
 * Provides subscription status, billing history, and plan management endpoints.
 */

const express = require('express');
const router = express.Router();
const billingService = require('../services/billingService');
const verifyToken = require("../utils/verifyToken");
const { checkSubscription } = require('../middleware/checkSubscription');

// All billing routes require authentication + subscription check
router.use(verifyToken.authenticateToken);
router.use(checkSubscription);

/**
 * GET /api/billing/status
 * Returns current subscription plan and status.
 */
router.get('/status', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(400).json({ success: false, message: 'Company ID required' });

        const status = await billingService.getSubscriptionStatus(companyId);
        const limits = await billingService.getPlanLimits(status.plan);

        res.json({ success: true, subscription: status, limits });
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

/**
 * GET /api/billing/plan-limits
 * Returns the feature limits for the company's current plan.
 */
router.get('/plan-limits', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) return res.status(400).json({ success: false, message: 'Company ID required' });

        const status = await billingService.getSubscriptionStatus(companyId);
        const limits = await billingService.getPlanLimits(status.plan);

        res.json({ success: true, plan: status.plan, limits });
    } catch (error) {
        console.error('❌ [BILLING ROUTE] /plan-limits error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to get plan limits' });
    }
});

/**
 * POST /api/billing/upgrade
 * Upgrade the company's plan (admin or self-service).
 */
router.post('/upgrade', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { plan } = req.body;

        if (!companyId) return res.status(400).json({ success: false, message: 'Company ID required' });
        if (!['BASIC', 'PRO', 'ENTERPRISE'].includes(plan)) {
            return res.status(400).json({ success: false, message: 'Invalid plan. Must be BASIC, PRO, or ENTERPRISE' });
        }

        await billingService.upgradePlan(companyId, plan);
        const newStatus = await billingService.getSubscriptionStatus(companyId);

        res.json({ success: true, message: `Plan upgraded to ${plan}`, subscription: newStatus });
    } catch (error) {
        console.error('❌ [BILLING ROUTE] /upgrade error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to upgrade plan' });
    }
});

module.exports = router;
