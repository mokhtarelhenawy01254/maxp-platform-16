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
router.get('/export', require('./orders'));
router.get('/:id', orderController.getOneOrder);
router.put('/:id', orderController.updateOrder);
router.delete('/all', verifyToken.requireRole(['OWNER', 'COMPANY_ADMIN', 'MANAGER']), orderController.deleteAllOrders);
router.post('/trash/move', verifyToken.requireRole(['OWNER', 'COMPANY_ADMIN', 'MANAGER']), orderController.moveOrdersToTrash);
router.post('/trash/restore', verifyToken.requireRole(['OWNER', 'COMPANY_ADMIN', 'MANAGER']), orderController.restoreOrdersFromTrash);

// Bulk Search Route
router.post('/bulk-search', bulkSearchController.bulkSearchOrders);

// Customer Rating Routes
const ordersHandler = require('./orders');
if (ordersHandler.handleCustomerRatingUpdate) {
  router.put('/:id/customer-rating', ordersHandler.handleCustomerRatingUpdate);
  router.post('/:id/customer-rating', ordersHandler.handleCustomerRatingUpdate);
}
if (ordersHandler.handleCustomerRatingRecalculate) {
  router.post('/:id/recalculate-rating', ordersHandler.handleCustomerRatingRecalculate);
}

module.exports = router;
