/**
 * checkSubscription middleware
 * Blocks access for companies with SUSPENDED or EXPIRED subscriptions.
 * Attach after auth middleware on protected routes.
 */

const billingService = require('../services/billingService');

/**
 * Full subscription check — blocks suspended/expired accounts.
 */
async function checkSubscription(req, res, next) {
    try {
        const companyId = req.user?.companyId || req.companyId;

        // Skip check if no company context (e.g. super-admin routes)
        if (!companyId) return next();

        const status = await billingService.getSubscriptionStatus(companyId);

        if (status.status === 'SUSPENDED') {
            return res.status(403).json({
                success: false,
                locked: true,
                reason: 'subscription_suspended',
                message: 'تم تعليق اشتراكك بسبب عدم سداد الرسوم. يرجى إعادة شحن المحفظة.',
                plan: status.plan,
            });
        }

        if (status.status === 'EXPIRED') {
            return res.status(403).json({
                success: false,
                locked: true,
                reason: 'subscription_expired',
                message: 'انتهت صلاحية اشتراكك. يرجى تجديد الاشتراك للمتابعة.',
                plan: status.plan,
            });
        }

        // Attach subscription info for downstream use
        req.subscription = status;
        next();
    } catch (error) {
        console.error('❌ [checkSubscription] Error:', error.message);
        // Fail open — don't block on billing service errors
        next();
    }
}

/**
 * Soft check — attaches subscription info but doesn't block.
 * Use on routes where you want to show upgrade prompts but not hard-block.
 */
async function attachSubscription(req, res, next) {
    try {
        const companyId = req.user?.companyId || req.companyId;
        if (companyId) {
            req.subscription = await billingService.getSubscriptionStatus(companyId);
        }
    } catch (error) {
        // Non-fatal
    }
    next();
}

module.exports = { checkSubscription, attachSubscription };
