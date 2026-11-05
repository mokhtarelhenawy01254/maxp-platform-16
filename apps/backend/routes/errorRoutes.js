const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const errorController = require('../controller/errorController');

// Rate limit frontend error reports: max 30 requests per minute per IP
const errorLogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: false,
  legacyHeaders: false,
  validate: { trustProxy: false },
  handler: (req, res) => {
    // Return 204 No Content quickly when throttled, preventing error cascades
    res.status(204).end();
  }
});

// Define route for logging errors
// POST /api/v1/errors/log
router.post('/log', errorLogLimiter, errorController.logError);

module.exports = router;
