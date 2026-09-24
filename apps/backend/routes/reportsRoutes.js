const express = require('express');
const router = express.Router();
const reportsController = require('../controller/reportsController');
const productDeliveryReturnsController = require('../controller/productDeliveryReturnsController');
const { authenticateToken, requireCompanyAccess } = require('../utils/verifyToken');
const { cacheMiddleware } = require('../middleware/performanceOptimization');

// O�O�O"USU, authentication O1U,U% O�U.USO1 routes OU,O�U,OO�USO�
// U�U, U.O3O�OrO_U. USO�U% U?U,O� O�U,OO�USO� O'O�U�O�U�
router.use(authenticateToken);
router.use(requireCompanyAccess);

// O�O-O�OO�USOO� OU,O�U,OO�USO� OU,O_U_USU. U,U,U? dashboard
router.use(cacheMiddleware(60000));

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
router.get('/products-delivery-returns', productDeliveryReturnsController.getProductDeliveryReturnsReport);

module.exports = router;
