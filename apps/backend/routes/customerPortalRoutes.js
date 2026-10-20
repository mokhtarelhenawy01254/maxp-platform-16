/**
 * Customer Portal Routes (Wave 8)
 *
 * Public routes:
 * GET /api/v1/customer-portal/context?token=...
 * GET /api/v1/customer-portal/order?token=...
 */

const express = require('express');
const controller = require('../controller/customerPortalController');

const router = express.Router();

router.get('/context', controller.getContext);
router.get('/order', controller.getOrder);

module.exports = router;
