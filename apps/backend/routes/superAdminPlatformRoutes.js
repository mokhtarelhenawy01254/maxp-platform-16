const express = require('express');
const router = express.Router();
const superAdminPlatformController = require('../controller/superAdminPlatformController');
const platformSiteHomepageController = require('../controller/platformSiteHomepageController');
const platformSignupCouponController = require('../controller/platformSignupCouponController');
const platformSiteMetaPixelController = require('../controller/platformSiteMetaPixelController');
const platformSpecialtyController = require('../controller/platformSpecialtyController');
const superAdminSettingsController = require('../controller/superAdminSettingsController');
const platformDefaultSidebarController = require('../controller/platformDefaultSidebarController');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');
const platformValidator = require('../middleware/superAdminPlatformValidation');

// All routes require authentication and super admin role
router.use(authenticateToken);
router.use(requireSuperAdmin);

// Marketplace Management
router.get('/marketplace-stats', superAdminPlatformController.getMarketplaceStats);


// Platform Site Meta Pixel
router.get('/site-homepage', platformSiteHomepageController.getAdminSettings);
router.put('/site-homepage', platformSiteHomepageController.updateAdminSettings);
router.get('/site-meta-pixel', platformSiteMetaPixelController.getAdminSettings);
router.put('/site-meta-pixel', platformSiteMetaPixelController.updateAdminSettings);

// Platform Default Sidebar Settings
router.get('/default-sidebar', platformDefaultSidebarController.getAdminSettings);
router.put('/default-sidebar', platformDefaultSidebarController.updateAdminSettings);

// Platform Signup Coupons
router.get('/signup-coupons', platformSignupCouponController.listCoupons);
router.post(
  '/signup-coupons',
  platformValidator.upsertSignupCouponRules(),
  platformValidator.validate,
  platformSignupCouponController.createCoupon
);
router.put(
  '/signup-coupons/:id',
  platformValidator.updateSignupCouponRules(),
  platformValidator.validate,
  platformSignupCouponController.updateCoupon
);
router.delete(
  '/signup-coupons/:id',
  platformValidator.deleteSignupCouponRules(),
  platformValidator.validate,
  platformSignupCouponController.removeCoupon
);

// Business Specialties
router.get('/business-specialties', platformSpecialtyController.listSpecialties);
router.post(
  '/business-specialties',
  platformValidator.upsertBusinessSpecialtyRules(),
  platformValidator.validate,
  platformSpecialtyController.createSpecialty
);
router.put(
  '/business-specialties/:id',
  platformValidator.updateBusinessSpecialtyRules(),
  platformValidator.validate,
  platformSpecialtyController.updateSpecialty
);
router.delete(
  '/business-specialties/:id',
  platformValidator.deleteBusinessSpecialtyRules(),
  platformValidator.validate,
  platformSpecialtyController.removeSpecialty
);
router.get('/business-specialties/app-options', platformSpecialtyController.getMarketplaceAppOptions);


// Platform Central Settings
router.get('/settings/kashier', superAdminSettingsController.getKashierSettings);
router.put('/settings/kashier', superAdminSettingsController.updateKashierSettings);
router.post('/settings/kashier/test-connection', superAdminSettingsController.testKashierConnection);

module.exports = router;
