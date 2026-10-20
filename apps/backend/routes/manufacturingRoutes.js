const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const uploadsDir = path.resolve(__dirname, '../uploads/manufacturing');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = uuidv4();
    cb(null, `techpack-${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});
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

// Customer Portal Link Lifecycle (Wave 8)
router.post('/customer-orders/:id/portal-link/generate', controller.generateCustomerOrderPortalLink);
router.patch('/customer-orders/:id/portal-link/toggle', controller.toggleCustomerOrderPortalLink);
router.delete('/customer-orders/:id/portal-link', controller.deleteCustomerOrderPortalLink);

// ============================================================================
// 5. Partner Factories & External Subcontracting (Wave 2)
// ============================================================================
router.get('/partner-factories/performance', controller.getPartnerFactoriesPerformance);
router.get('/partner-factories', controller.listPartnerFactories);
router.post('/partner-factories', controller.createPartnerFactory);
router.get('/partner-factories/:id', controller.getPartnerFactoryById);
router.patch('/partner-factories/:id', controller.updatePartnerFactory);
router.delete('/partner-factories/:id', controller.deletePartnerFactory);

// Partner Factories Portal Links (Wave 3)
router.post('/partner-factories/:id/portal-link/generate', controller.generatePartnerFactoryPortalLink);
router.post('/partner-factories/:id/portal-link/toggle', controller.togglePartnerFactoryPortalLink);
router.post('/partner-factories/:id/portal-link/revoke', controller.revokePartnerFactoryPortalLink);

// Stage External Execution & Factory Events
router.patch('/orders/:orderId/stages/:stageId/assignment', controller.assignStageExecution);
router.post('/orders/:orderId/stages/:stageId/factory-events', controller.recordStageFactoryEvent);

// Manufacturing Attachments & Management Review System (Wave 3)
router.get('/orders/:id/attachments', controller.listOrderAttachments);
router.post('/attachments', controller.createAttachment);
router.delete('/attachments/:id', controller.deleteAttachment);

router.get('/reviews', controller.listReviews);
router.patch('/reviews/:id/approve', controller.approveReview);
router.patch('/reviews/:id/reject', controller.rejectReview);
router.patch('/reviews/:id/publish', controller.publishReview);
router.patch('/reviews/:id/hide', controller.hideReview);

// ============================================================================
// 6. Fabric Calculator & Material Conversions (Wave 2.5)
// ============================================================================
router.post('/fabric/convert', controller.convertFabric);
router.post('/fabric/actual-gsm', controller.calculateActualGsm);
router.post('/fabric/requirements', controller.calculateFabricRequirements);
router.post('/fabric/actual-waste', controller.calculateActualWaste);

// ============================================================================
// 7. Tech Packs (ملفات المنتجات الفنية) & Versions (Wave 4)
// ============================================================================
router.get('/tech-packs', controller.listTechPacks);
router.post('/tech-packs', controller.createTechPack);
router.get('/tech-packs/:id', controller.getTechPackById);
router.patch('/tech-packs/:id', controller.updateTechPack);
router.post('/tech-packs/:id/clone-version', controller.cloneTechPackVersion);
router.post('/tech-packs/:id/approve', controller.approveTechPack);
router.post('/tech-packs/:id/archive', controller.archiveTechPack);
router.get('/tech-packs/:id/versions', controller.getTechPackVersions);
router.post('/tech-packs/:id/files', upload.single('file'), controller.uploadTechPackFile);
router.delete('/tech-packs/:id/files/:fileId', controller.deleteTechPackFile);

// ============================================================================
// 8. Size Charts (جداول المقاسات والمصفوفة ثلاثية النسخ) (Wave 4)
// ============================================================================
router.get('/size-charts', controller.listSizeCharts);
router.post('/size-charts', controller.createSizeChart);
router.get('/size-charts/:id', controller.getSizeChartById);
router.patch('/size-charts/:id', controller.updateSizeChart);
router.post('/size-charts/:id/clone-version', controller.cloneSizeChartVersion);
router.post('/size-charts/:id/approve', controller.approveSizeChart);
router.post('/size-charts/:id/archive', controller.archiveSizeChart);
router.get('/size-charts/:id/versions', controller.getSizeChartVersions);
router.get('/size-charts/:id/matrix', controller.getSizeChartMatrix);


// ============================================================================
// 9. Sample Orders (أوامر تصنيع العينات المستقلة والتحويل) (Wave 5)
// ============================================================================
router.get('/sample-orders', controller.listSampleOrders);
router.post('/sample-orders', controller.createSampleOrder);
router.get('/sample-orders/:id', controller.getSampleOrderById);
router.patch('/sample-orders/:id', controller.updateSampleOrder);
router.delete('/sample-orders/:id', controller.deleteSampleOrder);
router.post('/sample-orders/:id/stages', controller.addSampleStage);
router.patch('/sample-orders/:id/stages/:stageId', controller.updateSampleStage);
router.post('/sample-orders/:id/files', upload.single('file'), controller.uploadSampleFile);
router.post('/sample-orders/:id/approve', controller.approveSampleOrder);
router.post('/sample-orders/:id/reject', controller.rejectSampleOrder);
router.post('/sample-orders/:id/convert-to-order', controller.convertSampleToOrder);


// ============================================================================
// 10. Standard Production Stage Templates & Sets (مكتبة مراحل الإنتاج القياسية) (Wave 6)
// ============================================================================
router.get('/stage-templates', controller.listStageTemplates);
router.post('/stage-templates', controller.createStageTemplate);
router.get('/stage-templates/:id', controller.getStageTemplateById);
router.patch('/stage-templates/:id', controller.updateStageTemplate);
router.delete('/stage-templates/:id', controller.archiveStageTemplate);

router.get('/stage-template-sets', controller.listStageTemplateSets);
router.post('/stage-template-sets', controller.createStageTemplateSet);
router.get('/stage-template-sets/:id', controller.getStageTemplateSetById);
router.patch('/stage-template-sets/:id', controller.updateStageTemplateSet);
router.delete('/stage-template-sets/:id', controller.archiveStageTemplateSet);

router.post('/stage-template-sets/:id/items', controller.addStageTemplateSetItem);
router.delete('/stage-template-sets/:id/items/:itemId', controller.removeStageTemplateSetItem);
router.put('/stage-template-sets/:id/reorder', controller.reorderStageTemplateSetItems);

router.post('/orders/:orderId/apply-stage-set', controller.applyStageSetToOrder);
router.post('/boms/:bomId/apply-stage-set', controller.applyStageSetToBom);


// ============================================================================
// 11. Partner Factory Agreements & Payments (Wave 7)
// ============================================================================
router.get('/factory-agreements', controller.listFactoryAgreements);
router.post('/factory-agreements', controller.createFactoryAgreement);
router.get('/factory-agreements/:id', controller.getFactoryAgreementById);
router.patch('/factory-agreements/:id', controller.updateFactoryAgreement);
router.post('/factory-agreements/:id/activate', controller.activateFactoryAgreement);
router.post('/factory-agreements/:id/close', controller.closeFactoryAgreement);
router.post('/factory-agreements/:id/cancel', controller.cancelFactoryAgreement);
router.delete('/factory-agreements/:id', controller.deleteFactoryAgreement);

router.post('/factory-agreements/:id/payments/generate', controller.generateAgreementPayments);
router.post('/factory-agreements/:id/payments', controller.createAgreementPayment);
router.patch('/factory-agreements/:id/payments/:paymentId/pay', controller.payAgreementPayment);
router.patch('/factory-agreements/:id/payments/:paymentId/cancel', controller.cancelAgreementPayment);

router.post('/factory-agreements/:id/files', upload.single('file'), controller.uploadAgreementFile);
router.delete('/factory-agreements/:id/files/:fileId', controller.deleteAgreementFile);

module.exports = router;

