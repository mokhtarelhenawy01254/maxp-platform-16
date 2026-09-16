const express = require('express');
const router = express.Router();
const postPurchaseOfferController = require('../controller/postPurchaseOfferController');
const verifyToken = require('../utils/verifyToken');
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');

// 🛡️ Authenticated Merchant Routes
router.get(
  '/',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  postPurchaseOfferController.getOffer
);

router.put(
  '/',
  verifyToken.authenticateToken,
  verifyToken.requireCompanyAccess,
  postPurchaseOfferController.updateOffer
);

// 🌐 Public Storefront Route
router.get(
  '/public',
  extractSubdomainMiddleware,
  requireCompany,
  postPurchaseOfferController.getPublicOffer
);

module.exports = router;
