const express = require('express');
const router = express.Router();
const marketplaceController = require('../controller/marketplaceController');
const storefrontThemeCatalogController = require('../controller/storefrontThemeCatalogController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/apps', optionalAuth, marketplaceController.getAllApps);
router.get('/apps/:slug', optionalAuth, marketplaceController.getAppDetails);
router.get('/categories', optionalAuth, marketplaceController.getCategories);
router.get('/featured', marketplaceController.getFeaturedApps);
router.get('/bundles', optionalAuth, marketplaceController.getBundles);
router.get('/bundles/:slug', optionalAuth, marketplaceController.getBundleDetails);

// Protected routes
router.get('/themes', requireAuth, storefrontThemeCatalogController.getCompanyCatalog);
router.get('/themes/history', requireAuth, storefrontThemeCatalogController.getPurchaseHistory);
router.post('/themes/:themeId/purchase', requireAuth, storefrontThemeCatalogController.purchaseTheme);
router.post('/themes/:themeId/apply', requireAuth, storefrontThemeCatalogController.activateTheme);
router.post('/apps/:slug/install', requireAuth, marketplaceController.installApp);
router.post('/apps/:slug/uninstall', requireAuth, marketplaceController.uninstallApp);
router.post('/apps/:appId/review', requireAuth, marketplaceController.addReview);
router.post('/bundles/:slug/subscribe', requireAuth, marketplaceController.subscribeToBundle);
router.post('/unlimited/subscribe', requireAuth, marketplaceController.subscribeToUnlimited);

module.exports = router;
