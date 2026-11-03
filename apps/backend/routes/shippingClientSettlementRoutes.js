/**
 * Shipping Client Settlements Routes (SHIP-W5)
 * Mounted at /api/v1/shipping-client/settlements
 */

const express = require('express');
const router = express.Router();
const controller = require('../controller/shippingClientSettlementController');

router.get('/', controller.listSettlements);
router.get('/:id', controller.getSettlementById);
router.get('/:id/export', controller.exportSettlementCsv);

module.exports = router;
