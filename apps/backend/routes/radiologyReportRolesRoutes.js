const express = require('express');
const router = express.Router();
const controller = require('../controller/radiologyReportRolesController');
const verifyToken = require('../utils/verifyToken');

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];

router.use(verifyToken.authenticateToken);

router.put('/studies/:id/report/roles', verifyToken.requireRole(MANAGER_ROLES), controller.recordRole);
router.delete('/studies/:id/report/roles/:role', verifyToken.requireRole(MANAGER_ROLES), controller.clearRole);

module.exports = router;
