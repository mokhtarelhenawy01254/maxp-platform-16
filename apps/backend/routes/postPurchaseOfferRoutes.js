const express = require('express');
const postPurchaseOfferController = require('../controller/postPurchaseOfferController');
const verifyToken = require('../utils/verifyToken');
const { extractSubdomainMiddleware } = require('../middleware/subdomainMiddleware');

// 🛡️ Authenticated Merchant Router (mounted at /api/v1/post-purchase-offer)
const adminRouter = express.Router();

adminRouter.get(
  '/',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  postPurchaseOfferController.getOffer
);

adminRouter.put(
  '/',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  postPurchaseOfferController.updateOffer
);

adminRouter.get(
  '/analytics',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  postPurchaseOfferController.getOfferAnalytics
);

// 🌐 Public Storefront Router (mounted at /api/v1/public/post-purchase-offer)
const publicRouter = express.Router();
publicRouter.use(extractSubdomainMiddleware);

publicRouter.get(
  '/',
  postPurchaseOfferController.getPublicOffer
);

publicRouter.get(
  '/:companyId',
  postPurchaseOfferController.getPublicOffer
);

adminRouter.adminRouter = adminRouter;
adminRouter.publicRouter = publicRouter;

module.exports = adminRouter;
