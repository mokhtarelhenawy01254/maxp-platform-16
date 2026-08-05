const express = require('express');
const router = express.Router();
const inventoryController = require('../controller/inventoryController');
const { authenticateToken, requireCompanyAccess } = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireCompanyAccess);

// Base inventory routes require inventory-pro
router.get('/', checkAppAccess('inventory-pro'), inventoryController.getInventory);

// Get inventory alerts (low stock / out of stock)
router.get('/alerts', checkAppAccess('inventory-pro'), inventoryController.getAlerts);

// Get stock movements
router.get('/movements', checkAppAccess('inventory-pro'), inventoryController.getStockMovements);

// Create a lightweight product from inventory intake and send it to review
router.post('/products', checkAppAccess('inventory-pro'), inventoryController.createInventoryProduct);

// Get inventory for specific product
router.get('/product/:productId', checkAppAccess('inventory-pro'), inventoryController.getProductInventory);

// Update stock quantity
router.post('/update-stock', checkAppAccess('inventory-pro'), inventoryController.updateStock);

// Approve a pending stock movement
router.post('/approve-movement', checkAppAccess('inventory-pro'), inventoryController.approveMovement);

// Transfer stock between warehouses (requires multi-warehouse-pro, falls back to inventory-pro)
router.post('/transfer', checkAppAccess('multi-warehouse-pro'), inventoryController.transferStock);

module.exports = router;
