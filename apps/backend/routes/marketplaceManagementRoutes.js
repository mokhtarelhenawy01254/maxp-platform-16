const express = require('express');
const router = express.Router();
const marketplaceManagementController = require('../controller/marketplaceManagementController');
const migrationController = require('../controller/marketplaceMigrationController');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');
const {
  validateCreateApp,
  validateUpdateApp,
  validateCreateBundle,
  validateUpdateBundle,
  validateCreatePricingRule,
  validateUpdatePricingRule,
  validateCreateEnterprisePlan,
  validateUpdateEnterprisePlan,
} = require('../validators/marketplaceManagementValidator');

// All routes require authentication and super admin role
router.use(authenticateToken);
router.use(requireSuperAdmin);

// Marketplace Apps Management
router.get('/catalog/diff', marketplaceManagementController.getCatalogDiff);
router.get('/coverage', marketplaceManagementController.getCoverage);
router.post(
  '/coverage/companies/:companyId/apps/:slug/install',
  marketplaceManagementController.installCompanyCoverageApp,
);
router.get('/apps', marketplaceManagementController.getAllApps);
router.post('/apps', validateCreateApp, marketplaceManagementController.createApp);
router.put('/apps/:id', validateUpdateApp, marketplaceManagementController.updateApp);
router.delete('/apps/:id', marketplaceManagementController.deleteApp);

// Pricing Rules Management
router.get('/pricing-rules', marketplaceManagementController.getAllPricingRules);
router.post('/pricing-rules', validateCreatePricingRule, marketplaceManagementController.createPricingRule);
router.put('/pricing-rules/:id', validateUpdatePricingRule, marketplaceManagementController.updatePricingRule);
router.delete('/pricing-rules/:id', marketplaceManagementController.deletePricingRule);

// Bundles Management
router.get('/bundles', marketplaceManagementController.getAllBundles);
router.post('/bundles', validateCreateBundle, marketplaceManagementController.createBundle);
router.put('/bundles/:id', validateUpdateBundle, marketplaceManagementController.updateBundle);
router.delete('/bundles/:id', marketplaceManagementController.deleteBundle);

// Enterprise Plans Management
router.get('/enterprise-plans', marketplaceManagementController.getAllEnterprisePlans);
router.post('/enterprise-plans', validateCreateEnterprisePlan, marketplaceManagementController.createEnterprisePlan);
router.put('/enterprise-plans/:id', validateUpdateEnterprisePlan, marketplaceManagementController.updateEnterprisePlan);
router.delete('/enterprise-plans/:id', marketplaceManagementController.deleteEnterprisePlan);

// 📦 Migration Routes (Consolidated)
router.get('/export', migrationController.exportMarketplace);
router.post('/import', migrationController.importMarketplace);

module.exports = router;
