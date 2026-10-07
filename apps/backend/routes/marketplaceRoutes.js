const express = require('express');
const router = express.Router();
const marketplaceController = require('../controller/marketplaceController');
const storefrontThemeCatalogController = require('../controller/storefrontThemeCatalogController');
const verifyToken = require("../utils/verifyToken");

// Public routes
router.get('/apps', verifyToken.optionalAuth, marketplaceController.getAllApps);
router.get('/apps/:slug', verifyToken.optionalAuth, marketplaceController.getAppDetails);
router.get('/categories', verifyToken.optionalAuth, marketplaceController.getCategories);
router.get('/featured', marketplaceController.getFeaturedApps);
router.get('/bundles', verifyToken.optionalAuth, marketplaceController.getBundles);
router.get('/bundles/:slug', verifyToken.optionalAuth, marketplaceController.getBundleDetails);

// Protected routes
router.get('/themes', verifyToken.authenticateToken, storefrontThemeCatalogController.getCompanyCatalog);
router.get('/themes/history', verifyToken.authenticateToken, storefrontThemeCatalogController.getPurchaseHistory);
router.post('/themes/:themeId/purchase', verifyToken.authenticateToken, storefrontThemeCatalogController.purchaseTheme);
router.post('/themes/:themeId/apply', verifyToken.authenticateToken, storefrontThemeCatalogController.activateTheme);
router.get('/logs', verifyToken.authenticateToken, marketplaceController.getMarketplaceLogs);
router.get('/history', verifyToken.authenticateToken, marketplaceController.getMarketplaceLogs);
router.post('/apps/:slug/install', verifyToken.authenticateToken, marketplaceController.installApp);
router.post('/apps/:slug/uninstall', verifyToken.authenticateToken, marketplaceController.uninstallApp);
router.post('/apps/:appId/review', verifyToken.authenticateToken, marketplaceController.addReview);
router.post('/bundles/:slug/subscribe', verifyToken.authenticateToken, marketplaceController.subscribeToBundle);
router.post('/bundles/:slug/checkout', verifyToken.authenticateToken, marketplaceController.createBundleCheckout);


module.exports = router;
