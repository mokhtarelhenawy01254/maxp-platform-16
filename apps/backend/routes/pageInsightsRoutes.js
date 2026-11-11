const express = require('express');
const router = express.Router();
const pageInsightsController = require('../controller/pageInsightsController');
const verifyToken = require('../utils/verifyToken');

// قائمة الصفحات المتصلة (لاختيار الأصل بالاسم)
router.get(
  '/pages/insights',
  verifyToken.authenticateToken,
  pageInsightsController.getInsightsPages
);

// إحصائيات صفحة محددة
router.get(
  '/pages/insights/:pageId',
  verifyToken.authenticateToken,
  pageInsightsController.getPageInsights
);

// إحصائيات منشورات صفحة محددة
router.get(
  '/pages/insights/:pageId/posts',
  verifyToken.authenticateToken,
  pageInsightsController.getPostInsights
);

module.exports = router;
