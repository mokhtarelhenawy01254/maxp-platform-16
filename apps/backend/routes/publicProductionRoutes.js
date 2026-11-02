/**
 * Public Production Order Tracking Routes (HZ-F)
 *
 * Public unauthenticated endpoints for customer production order tracking.
 */

const express = require('express');
const PublicProductionController = require('../controller/publicProductionController');

const router = express.Router();

let rateLimiter = (req, res, next) => next();
try {
  const { createRateLimiter } = require('../middleware/rateLimiter');
  if (typeof createRateLimiter === 'function') {
    rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 60 });
  }
} catch (_) {}

router.get('/:token', rateLimiter, PublicProductionController.getPublicOrder);

module.exports = router;
