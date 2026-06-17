const express = require('express');
const router = express.Router();
const dashboardController = require('../controller/dashboardController');
const verifyToken = require("../utils/verifyToken");
const { cacheMiddleware } = require('../middleware/performanceOptimization');

// All dashboard routes require authentication + company access
router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireCompanyAccess);

// Apply caching to dashboard routes for better performance
router.get('/stats/:companyId', cacheMiddleware(60000), dashboardController.getRealDashboardStatistics); // 1 minute cache
router.get('/activities/:companyId', cacheMiddleware(30000), dashboardController.getRecentActivities); // 30 seconds cache
router.get('/metrics/:companyId', cacheMiddleware(15000), dashboardController.getRealTimeMetrics); // 15 seconds cache


module.exports = router;
