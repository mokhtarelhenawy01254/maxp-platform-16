const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const dashboardController = require('../controller/moderatorDashboardController');

router.use(verifyToken.authenticateToken);

// ─── My Dashboard ─────────────────────────────────────────────────

router.get(
  '/',
  requireDbPermission('dashboard.view'),
  dashboardController.getMyDashboard
);

// ─── Team Dashboard ───────────────────────────────────────────────

router.get(
  '/team/:teamId',
  requireDbPermission('dashboard.view.team'),
  dashboardController.getTeamDashboard
);

// ─── Admin Dashboard ──────────────────────────────────────────────

router.get(
  '/admin',
  requireDbPermission('dashboard.view.all'),
  dashboardController.getAdminDashboard
);

module.exports = router;
