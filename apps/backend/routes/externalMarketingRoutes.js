const express = require('express');
const router = express.Router();
const externalMarketingApiController = require('../controller/externalMarketingApiController');
const {
  authenticateExternalApi,
  requireExternalScope
} = require('../middleware/externalApiAuth');

// 📖 Documentation endpoint (open for auto-discovery by bots & integrations)
router.get('/docs', externalMarketingApiController.getDocs);

// 🔐 All operational endpoints require a valid external API key
router.use(authenticateExternalApi);

// 📊 Analytics Endpoints
router.get(
  '/analytics/summary',
  requireExternalScope('analytics:read'),
  externalMarketingApiController.getAnalyticsSummary
);
router.get(
  '/analytics/orders-by-source',
  requireExternalScope('analytics:read'),
  externalMarketingApiController.getOrdersBySource
);

// 🛍️ Products Endpoints
router.get(
  '/products/top',
  requireExternalScope('products:read'),
  externalMarketingApiController.getTopProducts
);

// 💳 Subscriptions Endpoints
router.get(
  '/subscriptions/summary',
  requireExternalScope('subscriptions:read'),
  externalMarketingApiController.getSubscriptionsSummary
);

// 📄 Landing Pages Endpoints
router.get(
  '/landing-pages/stats',
  requireExternalScope('landing:read'),
  externalMarketingApiController.getLandingPagesStats
);

// 👥 Leads Endpoints
router.get(
  '/leads/summary',
  requireExternalScope('leads:read'),
  externalMarketingApiController.getLeadsSummary
);

// 📢 Ads Endpoints
router.get(
  '/ads/summary',
  requireExternalScope('ads:read'),
  externalMarketingApiController.getAdsSummary
);

module.exports = router;
