/**
 * Shipping Reports Routes (SHIP-W7)
 * Endpoint: /api/v1/shipping-reports
 * Roles: OWNER / COMPANY_ADMIN / OPERATIONS
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const shippingReportsController = require('../controller/shippingReportsController');

const REPORT_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'OPERATIONS', 'MANAGER'];

const roleGuard = (req, res, next) => {
  if (typeof verifyToken.requireRole === 'function') {
    return verifyToken.requireRole(REPORT_ROLES)(req, res, next);
  }
  if (!req.user || !REPORT_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'غير مصرح' });
  }
  next();
};

const authMiddleware = [
  verifyToken.authenticateToken,
  roleGuard,
];

router.get('/summary', ...authMiddleware, shippingReportsController.getSummary);
router.get('/coverage', ...authMiddleware, shippingReportsController.getCoverageReport);
router.get('/by-governorate', ...authMiddleware, shippingReportsController.getByGovernorate);
router.get('/by-client', ...authMiddleware, shippingReportsController.getByClient);
router.get('/by-courier', ...authMiddleware, shippingReportsController.getByCourier);
router.get('/profit', ...authMiddleware, shippingReportsController.getProfitReport);
router.get('/profit/uncovered', ...authMiddleware, shippingReportsController.getUncoveredProfit);
router.post('/profit/recalc', ...authMiddleware, shippingReportsController.recalcProfit);

module.exports = router;
