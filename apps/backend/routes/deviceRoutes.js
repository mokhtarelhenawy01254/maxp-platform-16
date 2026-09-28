const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../utils/verifyToken');
const deviceController = require('../controller/deviceController');

// Helper to check for admin / settings permission
const requireAdminOrManager = (req, res, next) => {
  const role = req.user?.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isCompanyAdmin = ['COMPANY_ADMIN', 'OWNER', 'ADMIN'].includes(role);
  const isProjectManager = ['Project Manager', 'Team Lead', 'TEAM_LEADER'].includes(role);
  const hasSettingsPerm = req.user?.userPermissions?.includes('settings.manage');

  if (isSuperAdmin || isCompanyAdmin || isProjectManager || hasSettingsPerm) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'غير مصرح لك بإدارة أجهزة الشركة',
  });
};

// Device self-registration and status
router.post('/register', authenticateToken, deviceController.registerDevice);
router.get('/status', authenticateToken, deviceController.getCurrentDeviceStatus);

// Admin device management
router.get('/', authenticateToken, requireAdminOrManager, deviceController.listDevices);
router.patch('/:id/type', authenticateToken, requireAdminOrManager, deviceController.updateDevice);
router.delete('/:id', authenticateToken, requireAdminOrManager, deviceController.deleteDevice);

module.exports = router;
