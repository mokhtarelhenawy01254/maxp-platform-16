const express = require('express');
const router = express.Router();
const storefrontSettingsController = require('../controller/storefrontSettingsController');
const storefrontThemeCatalogController = require('../controller/storefrontThemeCatalogController');
const verifyToken = require('../utils/verifyToken');

router.get(
  '/',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.getSettings,
);

router.get(
  '/theme-catalog',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontThemeCatalogController.getCompanyCatalog,
);

router.get(
  '/theme-catalog/history',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontThemeCatalogController.getPurchaseHistory,
);

router.post(
  '/theme-catalog/:themeId/purchase',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontThemeCatalogController.purchaseTheme,
);

router.post(
  '/theme-catalog/:themeId/activate',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontThemeCatalogController.activateTheme,
);

router.put(
  '/',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.updateSettings,
);

router.post(
  '/reset',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.resetSettings,
);

router.post(
  '/test-facebook-pixel',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.testFacebookPixel,
);

router.post(
  '/test-facebook-capi',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.testFacebookCapi,
);

router.post(
  '/send-test-event',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.sendTestEvent,
);

router.get(
  '/pixel-diagnostics',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.getPixelDiagnostics,
);

router.post(
  '/check-token-permissions',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.checkTokenPermissions,
);

router.get(
  '/pixels',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.getPixels,
);

router.post(
  '/pixels',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.addPixel,
);

router.put(
  '/pixels/:id',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.updatePixel,
);

router.delete(
  '/pixels/:id',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.deletePixel,
);

router.post(
  '/pixels/:id/test',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.testPixelById,
);

router.post(
  '/create-pixel',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.createFacebookPixel,
);

router.get(
  '/business-accounts',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.getBusinessAccounts,
);

router.get(
  '/clarity-analytics',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  storefrontSettingsController.getClarityAnalytics,
);

module.exports = router;
