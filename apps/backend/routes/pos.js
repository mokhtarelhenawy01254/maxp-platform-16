const express = require('express');
const router = express.Router();
const posController = require('../controller/posController');
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');

// Protect all POS routes
if (typeof verifyToken.authenticateToken !== 'function') {
  throw new Error('verifyToken.authenticateToken is not a function');
}

router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireCompanyAccess);
router.use(checkAppAccess('pos-pro'));

// POST /api/pos/orders - Create new POS order
router.post('/orders', posController.createPOSOrder);

module.exports = router;
