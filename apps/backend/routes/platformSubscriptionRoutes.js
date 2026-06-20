const express = require('express');
const router = express.Router();
const platformSubscriptionController = require('../controller/platformSubscriptionController');
const verifyToken = require("../utils/verifyToken");

// ponytail: checkSubscription middleware removed — subscription status handled per-app via checkAppAccess
const basicSubscriptionCheck = async (req, res, next) => {
  next();
};

// جميع الـ routes محمية بـ authentication
router.use(verifyToken.authenticateToken);

// Bundle activation — before subscription check so new users can activate
router.post('/messaging-checkout', platformSubscriptionController.messagingCheckout);
router.post('/messaging-upgrade', platformSubscriptionController.messagingUpgrade);

router.use(basicSubscriptionCheck);

// Get current subscription
router.get('/', platformSubscriptionController.getSubscription);

// Cancel subscription
router.post('/cancel', platformSubscriptionController.cancelSubscription);

// Get billing history
router.get('/billing-history', platformSubscriptionController.getBillingHistory);

module.exports = router;
