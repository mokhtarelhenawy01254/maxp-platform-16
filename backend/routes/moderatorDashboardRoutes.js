const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbacMiddleware');
const dashboardController = require('../controller/moderatorDashboardController');

router.use(requireAuth);

// ─── My Dashboard ─────────────────────────────────────────────────

router.get(
  '/',
  requirePermission('dashboard.view'),
  dashboardController.getMyDashboard
);

// ─── Team Dashboard ───────────────────────────────────────────────

router.get(
  '/team/:teamId',
  requirePermission('dashboard.view.team'),
  dashboardController.getTeamDashboard
);

// ─── Admin Dashboard ──────────────────────────────────────────────

router.get(
  '/admin',
  requirePermission('dashboard.view.all'),
  dashboardController.getAdminDashboard
);

module.exports = router;
