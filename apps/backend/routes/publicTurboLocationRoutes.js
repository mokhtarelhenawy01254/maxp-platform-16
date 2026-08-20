const express = require('express');
const router = express.Router();
const { searchAreaByTextPublic } = require('../controller/turbo/locationHandlers');

/**
 * Public Turbo location search for storefront pages (no auth required).
 * Base path: /api/v1/public/turbo/location
 * The companyId comes from the query param (same pattern as public shipping quotes).
 */

// GET /api/v1/public/turbo/location/search-area?q=...&companyId=...
router.get('/search-area', searchAreaByTextPublic);

module.exports = router;
