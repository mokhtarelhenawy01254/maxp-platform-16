const express = require('express');
const router = express.Router();
const controller = require('../controller/radiologyCriticalFindingsController');
const verifyToken = require('../utils/verifyToken');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.use(verifyToken.authenticateToken);

router.put('/studies/:id/report/critical', controller.setCriticalFinding);
router.post('/studies/:id/report/critical/acknowledge', verifyToken.requireRole(MANAGER_ROLES), controller.acknowledgeCriticalFinding);

module.exports = router;
