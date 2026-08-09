const express = require('express');
const router = express.Router();
const reportsController = require('../controller/reportsController');
const { authenticateToken, requireCompanyAccess } = require('../utils/verifyToken');

// تطبيق authentication على جميع routes التقارير
// كل مستخدم يرى فقط تقارير شركته
router.use(authenticateToken);
router.use(requireCompanyAccess);

// المسار القديم للـ dashboard
router.get('/dashboard', reportsController.getReports);

// مسارات التقارير الجديدة
router.get('/all', reportsController.getAllReports);
router.get('/sales', reportsController.getSalesReport);
router.get('/customers', reportsController.getCustomersReport);
router.get('/conversations', reportsController.getConversationsReport);
router.get('/products', reportsController.getProductsReport);
router.get('/performance', reportsController.getPerformanceReport);
router.get('/moderators', reportsController.getModeratorsReport);
router.get('/orders-detailed', reportsController.getDetailedOrderReport);
router.get('/order-status-analytics', reportsController.getOrderStatusAnalytics);
router.get('/inventory-detailed', reportsController.getDetailedInventoryReport);
router.get('/profit-loss', reportsController.getProfitLossReport);

module.exports = router;
