const express = require('express');
const router = express.Router();
const platformSubscriptionController = require('../controller/platformSubscriptionController');
const { requireAuth } = require('../middleware/auth');
const { checkSubscription } = require('../middleware/checkSubscription');

// جميع الـ routes محمية بـ authentication + subscription check
router.use(requireAuth);
router.use(checkSubscription);

// Get current subscription
router.get('/', platformSubscriptionController.getSubscription);

// Get all available plans (public info)
router.get('/plans', platformSubscriptionController.getPlans);

// Upgrade plan
router.post('/upgrade', platformSubscriptionController.upgradePlan);

// Checkout (Creates a Kashier payment session)
router.post('/checkout', platformSubscriptionController.createCheckoutSession);

// Cancel subscription
router.post('/cancel', platformSubscriptionController.cancelSubscription);

// Get billing history
router.get('/billing-history', platformSubscriptionController.getBillingHistory);

// Get usage statistics
router.get('/usage-stats', platformSubscriptionController.getUsageStats);

module.exports = router;
