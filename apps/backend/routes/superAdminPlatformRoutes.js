const express = require('express');
const router = express.Router();
const superAdminPlatformController = require('../controller/superAdminPlatformController');
const platformSiteHomepageController = require('../controller/platformSiteHomepageController');
const platformSignupCouponController = require('../controller/platformSignupCouponController');
const platformSiteMetaPixelController = require('../controller/platformSiteMetaPixelController');
const platformOnboardingController = require('../controller/platformOnboardingController');
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');
const platformValidator = require('../middleware/superAdminPlatformValidation');

// All routes require authentication and super admin role
router.use(authenticateToken);
router.use(requireSuperAdmin);

// Platform Subscriptions Management
router.get('/subscriptions', superAdminPlatformController.getAllSubscriptions);
router.put(
  '/subscription/:id',
  platformValidator.updateSubscriptionRules(),
  platformValidator.validate,
  superAdminPlatformController.updateSubscription
);

// Billing & Revenue
router.get('/billing-overview', superAdminPlatformController.getBillingOverview);
router.post(
  '/retry-failed-payment/:id',
  platformValidator.retryPaymentRules(),
  platformValidator.validate,
  superAdminPlatformController.retryFailedPayment
);

// Marketplace Management
router.get('/marketplace-stats', superAdminPlatformController.getMarketplaceStats);

// Platform Site Meta Pixel
router.get('/site-homepage', platformSiteHomepageController.getAdminSettings);
router.put('/site-homepage', platformSiteHomepageController.updateAdminSettings);
router.get('/site-meta-pixel', platformSiteMetaPixelController.getAdminSettings);
router.put('/site-meta-pixel', platformSiteMetaPixelController.updateAdminSettings);

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

// Platform Signup Onboarding
router.get('/onboarding-settings', platformOnboardingController.getSettings);
router.put(
  '/onboarding-settings',
  platformValidator.updateOnboardingSettingsRules(),
  platformValidator.validate,
  platformOnboardingController.updateSettings
);
router.get('/business-specialties', platformOnboardingController.listSpecialties);
router.post(
  '/business-specialties',
  platformValidator.upsertBusinessSpecialtyRules(),
  platformValidator.validate,
  platformOnboardingController.createSpecialty
);
router.put(
  '/business-specialties/:id',
  platformValidator.updateBusinessSpecialtyRules(),
  platformValidator.validate,
  platformOnboardingController.updateSpecialty
);
router.delete(
  '/business-specialties/:id',
  platformValidator.deleteBusinessSpecialtyRules(),
  platformValidator.validate,
  platformOnboardingController.removeSpecialty
);
router.get('/business-specialties/app-options', platformOnboardingController.getMarketplaceAppOptions);

// Plan Limits Management
router.put(
  '/plan-limit/:plan',
  platformValidator.updatePlanLimitRules(),
  platformValidator.validate,
  superAdminPlatformController.updatePlanLimit
);

module.exports = router;
