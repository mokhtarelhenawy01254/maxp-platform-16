const express = require('express');
const router = express.Router();
const marketplaceManagementController = require('../controller/marketplaceManagementController');
const migrationController = require('../controller/marketplaceMigrationController');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');

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
router.post('/apps', marketplaceManagementController.createApp);
router.put('/apps/:id', marketplaceManagementController.updateApp);
router.delete('/apps/:id', marketplaceManagementController.deleteApp);

// Pricing Rules Management
router.get('/pricing-rules', marketplaceManagementController.getAllPricingRules);
router.post('/pricing-rules', marketplaceManagementController.createPricingRule);
router.put('/pricing-rules/:id', marketplaceManagementController.updatePricingRule);
router.delete('/pricing-rules/:id', marketplaceManagementController.deletePricingRule);

// Bundles Management
router.get('/bundles', marketplaceManagementController.getAllBundles);
router.post('/bundles', marketplaceManagementController.createBundle);
router.put('/bundles/:id', marketplaceManagementController.updateBundle);
router.delete('/bundles/:id', marketplaceManagementController.deleteBundle);

// Enterprise Plans Management
router.get('/enterprise-plans', marketplaceManagementController.getAllEnterprisePlans);
router.post('/enterprise-plans', marketplaceManagementController.createEnterprisePlan);
router.put('/enterprise-plans/:id', marketplaceManagementController.updateEnterprisePlan);
router.delete('/enterprise-plans/:id', marketplaceManagementController.deleteEnterprisePlan);

// 📦 Migration Routes (Consolidated)
router.get('/export', migrationController.exportMarketplace);
router.post('/import', migrationController.importMarketplace);

module.exports = router;
