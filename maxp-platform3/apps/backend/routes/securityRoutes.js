const express = require('express');
const router = express.Router();
const securityController = require('../controller/securityController');
const verifyToken = require("../utils/verifyToken");

// All security routes require super admin access
router.use(verifyToken.authenticateToken);
router.use(verifyToken.requireSuperAdmin);

router.get('/stats', securityController.getSecurityStats);
router.get('/daily-report', securityController.getSecurityReports);

module.exports = router;
