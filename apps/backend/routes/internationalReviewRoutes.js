/**
 * International Customs Acknowledgment Review Routes (SHIP-T4)
 * Allows reviewing (approving/rejecting) international shipment customs acknowledgments.
 * Mounted on: /international and /api/v1/international
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const shippingPortalController = require('../controller/shippingPortalController');

router.use(verifyToken.authenticateToken);

router.patch('/:id/review', shippingPortalController.reviewInternationalAck);
router.get('/pending', shippingPortalController.getPendingInternational);

module.exports = router;
