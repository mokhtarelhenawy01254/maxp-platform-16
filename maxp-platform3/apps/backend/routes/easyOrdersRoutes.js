const express = require('express');
const router = express.Router();
const easyOrdersController = require('../controller/easyOrdersController');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// Apply order-core access check to all routes in this router
router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('order-core'));


// جلب المنتجات من Easy Orders (للعرض في الواجهة)
router.post('/fetch-products', verifyToken.authenticateToken, easyOrdersController.fetchProductsFromEasyOrders);

// استيراد المنتجات المحددة
router.post('/import-selected', verifyToken.authenticateToken, easyOrdersController.importSelectedProducts);

// استيراد منتج واحد من Easy Orders
router.post('/import-product', verifyToken.authenticateToken, easyOrdersController.importProductFromEasyOrders);

// استيراد عدة منتجات دفعة واحدة
router.post('/import-products-bulk', verifyToken.authenticateToken, easyOrdersController.importProductsBulk);

// مزامنة منتج موجود مع Easy Orders
router.put('/sync-product/:id', verifyToken.authenticateToken, easyOrdersController.syncProductWithEasyOrders);

// Get order statistics
router.get('/simple/stats', verifyToken.authenticateToken, easyOrdersController.getOrderStats);

// Settings and Sync
router.get('/settings', verifyToken.authenticateToken, easyOrdersController.getEasyOrdersSettings);
router.post('/settings', verifyToken.authenticateToken, easyOrdersController.saveEasyOrdersSettings);
router.post('/sync-orders', verifyToken.authenticateToken, easyOrdersController.fetchAndImportOrders);
router.get('/sync-logs', verifyToken.authenticateToken, easyOrdersController.getSyncLogs);

module.exports = router;
