/**
 * Shipping Portal Settlements Routes (SHIP-W5)
 * Mounted at /api/v1/shipping-portal/settlements
 */

const express = require('express');
const router = express.Router();
const controller = require('../controller/shippingSettlementPortalController');

router.get('/', controller.listSettlements);
router.post('/preview', controller.previewSettlement);
router.post('/', controller.createSettlement);
router.get('/:id', controller.getSettlementById);
router.post('/:id/approve', controller.approveSettlement);
router.post('/:id/pay', controller.paySettlement);
router.post('/:id/reject', controller.rejectSettlement);
router.get('/:id/export', controller.exportSettlementCsv);

module.exports = router;
