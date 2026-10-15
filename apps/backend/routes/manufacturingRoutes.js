const express = require('express');
const router = express.Router();
const controller = require('../controller/manufacturingController');
const verifyToken = require('../utils/verifyToken');
const { checkAppAccess } = require('../middleware/checkAppAccess');

// All manufacturing routes require authentication and subscription access to 'manufacturing'
router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('manufacturing'));

// ============================================================================
// 1. Bill of Materials (BOM) Routes
// ============================================================================
router.get('/boms/:id', controller.getBomById);
router.get('/boms', controller.listBoms);
router.post('/boms', controller.createBom);
router.put('/boms/:id', controller.updateBom);
router.delete('/boms/:id', controller.deleteBom);
router.post('/boms/:id/clone', controller.cloneBom);
router.post('/boms/:id/resolve-variants', controller.resolveVariantRequirements);

// ============================================================================
// 2. Production Orders Lifecycle Routes
// ============================================================================
router.get('/orders/:id/cost-analysis', controller.getOrderCostAnalysis);
router.get('/orders/:id', controller.getOrderById);
router.get('/orders', controller.listOrders);
router.post('/orders', controller.createOrder);
router.post('/orders/:id/release', controller.releaseOrder);
router.post('/orders/:id/start', controller.startOrder);
router.put('/orders/:id/stages/:stageId', controller.updateStageProgress);
router.post('/orders/:id/scrap', controller.recordScrap);
router.post('/orders/:id/issue-materials', controller.issueMaterials);
router.post('/orders/:id/receive-goods', controller.receiveFinishedGoods);
router.post('/orders/:id/complete', controller.completeOrder);
router.post('/orders/:id/cancel', controller.cancelOrder);

// ============================================================================
// 3. Manufacturing Settings Routes
// ============================================================================
router.get('/settings', controller.getSettings);
router.put('/settings', controller.updateSettings);

module.exports = router;
