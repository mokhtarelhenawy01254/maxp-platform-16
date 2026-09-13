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

// Get reorder points (aggregated / per warehouse / pre-order view)
router.get('/reorder-points', checkAppAccess('inventory-pro'), inventoryController.getReorderPoints);

// Update reorder point for a whole product or a single inventory record
router.put('/reorder-points/product/:productId', checkAppAccess('inventory-pro'), inventoryController.updateReorderPoint);
router.put('/reorder-points/:inventoryId', checkAppAccess('inventory-pro'), inventoryController.updateReorderPoint);

// Bulk update reorder points
router.post('/reorder-points/bulk', checkAppAccess('inventory-pro'), inventoryController.bulkUpdateReorderPoints);

// Approve a pending stock movement
router.post('/approve-movement', checkAppAccess('inventory-pro'), inventoryController.approveMovement);

// Transfer stock between warehouses (requires inventory-pro, falls back to multi-warehouse-pro)
router.post('/transfer', checkAppAccess('inventory-pro'), inventoryController.transferStock);

// ==========================================
// 🤖 Inventory AI Studio Routes
// ==========================================
const inventoryAiController = require('../controller/inventoryAiController');

// Chat with Inventory & Pricing Agent
router.post('/ai/chat', (req, res) => inventoryAiController.chat(req, res));

// Get active routed agent for inventory
router.get('/ai/active-agent', (req, res) => inventoryAiController.getActiveAgent(req, res));

// Cloud Session Persistence
router.get('/ai/sessions', (req, res) => inventoryAiController.listSessions(req, res));
router.post('/ai/sessions', (req, res) => inventoryAiController.saveSession(req, res));
router.delete('/ai/sessions/:id', (req, res) => inventoryAiController.deleteSession(req, res));

// Action Canvas execution (apply price/stock adjustment)
router.post('/ai/apply-action', (req, res) => inventoryAiController.applyAction(req, res));

module.exports = router;

