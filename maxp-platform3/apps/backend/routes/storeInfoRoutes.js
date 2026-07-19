const express = require('express');
const router = express.Router();
const storeInfoController = require('../controller/storeInfoController');
const { requireCompany } = require('../middleware/companyMiddleware');

/**
 * 🏪 Public Store Info Routes
 * Base path: /api/v1/public/store-info
 */

// Ensure company context is available
router.use(requireCompany);

// GET /api/v1/public/store-info
router.get('/', storeInfoController.getPublicStoreInfo);

module.exports = router;
