console.log('✅ [DEBUG] campaignCalculatorRoutes: Starting load...');
const express = require('express');
const router = express.Router();
console.log('✅ [DEBUG] campaignCalculatorRoutes: Importing auth middleware...');

// Deferred auth middleware to avoid undefined callback on boot
const deferredRequireAuth = (req, res, next) => {
  const verifyToken = require("../utils/verifyToken");
  if (auth && typeof verifyToken.requireAuth === 'function') {
    return verifyToken.requireAuth(req, res, next);
  }
  next(new Error('verifyToken.authenticateToken middleware is undefined at runtime'));
};

// Helper to handle potential circular dependency undefined exports
const safeHandler = (handlerName) => {
  return (req, res, next) => {
    const ctrl = require('../controller/campaignCalculatorController');
    if (ctrl && typeof ctrl[handlerName] === 'function') {
      return ctrl[handlerName](req, res, next);
    }
    next(new Error(`Handler ${handlerName} is undefined.`));
  };
};

// Get historical defaults for calculator
router.get('/defaults', deferredRequireAuth, safeHandler('getCampaignCalculatorDefaults'));

// Calculate campaign predictions
router.post('/predict', deferredRequireAuth, safeHandler('calculateCampaignPredictions'));

// Compare with historical campaign
router.get('/compare/:campaignId', deferredRequireAuth, safeHandler('compareWithHistoricalCampaign'));

module.exports = router;
