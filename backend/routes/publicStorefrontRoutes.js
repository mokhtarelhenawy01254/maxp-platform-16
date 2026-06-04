const express = require('express');
const router = express.Router();
const publicStorefrontController = require('../controller/publicStorefrontController');
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');

/**
 * 🏪 Public Storefront settings
 * Base path: /api/v1/public/storefront
 */

// Apply subdomain extraction and company check
router.use(extractSubdomainMiddleware);
router.use(requireCompany);

// GET /api/v1/public/storefront/settings
router.get('/settings', publicStorefrontController.getStorefrontSettings);
router.post('/apps/:slug/track', publicStorefrontController.trackMarketplaceAppUsage);

module.exports = router;
