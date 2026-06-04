const express = require('express');
const analyticsController = require('../controller/analyticsController');
const {
  extractSubdomainMiddleware,
  requireCompany,
} = require('../middleware/subdomainMiddleware');
const { cacheMiddleware } = require('../middleware/performanceOptimization');

const router = express.Router();

router.use(extractSubdomainMiddleware);
router.use(requireCompany);

router.get('/store', cacheMiddleware(60000), analyticsController.getStoreAnalytics);
router.get('/products/top', cacheMiddleware(60000), analyticsController.getTopProducts);
router.get('/daily', cacheMiddleware(60000), analyticsController.getDailyAnalytics);

module.exports = router;
