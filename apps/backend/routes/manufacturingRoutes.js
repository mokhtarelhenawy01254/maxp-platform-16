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

// ============================================================================
// 4. Contract Manufacturing (Customer Orders & Payments) Routes
// ============================================================================
router.get('/customer-orders', controller.listCustomerOrders);
router.post('/customer-orders', controller.createCustomerOrder);
router.get('/customer-orders/:id', controller.getCustomerOrderById);
router.patch('/customer-orders/:id', controller.updateCustomerOrder);
router.post('/customer-orders/:id/children', controller.linkOrCreateChildOrder);

router.get('/customer-orders/:id/payments', controller.listCustomerOrderPayments);
router.post('/customer-orders/:id/payments/generate', controller.generateDefaultPayments);
router.post('/customer-orders/:id/payments', controller.createCustomerOrderPayment);
router.patch('/customer-orders/:id/payments/:paymentId', controller.updateCustomerOrderPayment);

// ============================================================================
// 5. Partner Factories & External Subcontracting (Wave 2)
// ============================================================================
router.get('/partner-factories/performance', controller.getPartnerFactoriesPerformance);
router.get('/partner-factories', controller.listPartnerFactories);
router.post('/partner-factories', controller.createPartnerFactory);
router.get('/partner-factories/:id', controller.getPartnerFactoryById);
router.patch('/partner-factories/:id', controller.updatePartnerFactory);
router.delete('/partner-factories/:id', controller.deletePartnerFactory);

// Stage External Execution & Factory Events
router.patch('/orders/:orderId/stages/:stageId/assignment', controller.assignStageExecution);
router.post('/orders/:orderId/stages/:stageId/factory-events', controller.recordStageFactoryEvent);

// Manufacturing Attachments
router.get('/orders/:id/attachments', controller.listOrderAttachments);
router.post('/attachments', controller.createAttachment);
router.delete('/attachments/:id', controller.deleteAttachment);

// ============================================================================
// 6. Fabric Calculator & Material Conversions (Wave 2.5)
// ============================================================================
router.post('/fabric/convert', controller.convertFabric);
router.post('/fabric/actual-gsm', controller.calculateActualGsm);
router.post('/fabric/requirements', controller.calculateFabricRequirements);
router.post('/fabric/actual-waste', controller.calculateActualWaste);

module.exports = router;
