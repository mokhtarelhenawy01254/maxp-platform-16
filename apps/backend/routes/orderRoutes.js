const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');
const bulkSearchController = require('../controller/bulkSearchController');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// Apply authentication and company access check
router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireCompanyAccess);
router.use(checkAppAccess('order-core'));

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOneOrder);
router.put('/:id', orderController.updateOrder);
router.delete('/all', orderController.deleteAllOrders);
router.post('/trash/move', orderController.moveOrdersToTrash);
router.post('/trash/restore', orderController.restoreOrdersFromTrash);

// Bulk Search Route
router.post('/bulk-search', bulkSearchController.bulkSearchOrders);

module.exports = router;
