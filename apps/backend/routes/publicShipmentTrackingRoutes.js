/**
 * Public Shipment Tracking Routes (SHIP-W3)
 * Provides waybill tracking for end customers without authentication
 */

const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const publicShipmentTrackingController = require('../controller/publicShipmentTrackingController');

// 🚦 Rate limit: 20 requests per minute per IP
const publicTrackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح من طلبات التتبع (20 طلب في الدقيقة). يرجى الانتظار لمدة دقيقة.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

router.get('/track/:waybill', publicTrackingLimiter, publicShipmentTrackingController.trackShipmentByWaybill);

module.exports = router;
module.exports.publicTrackingLimiter = publicTrackingLimiter;
