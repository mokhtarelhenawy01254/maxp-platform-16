const express = require('express');
const router = express.Router();
const shiftController = require('../controller/shiftController');
const { authenticateToken, requireRole } = require('../utils/verifyToken');

// Employee Actions
router.post('/close', authenticateToken, shiftController.closeShift);
router.post('/overtime/start', authenticateToken, shiftController.startOvertime);
router.post('/overtime/end', authenticateToken, shiftController.endOvertime);
router.get('/status', authenticateToken, shiftController.getShiftStatus);

// Admin / Manager Management
router.get(
  '/overtime',
  authenticateToken,
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  shiftController.listOvertime
);

router.patch(
  '/overtime/:id/status',
  authenticateToken,
  requireRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER']),
  shiftController.updateOvertimeStatus
);

module.exports = router;
