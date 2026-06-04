const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbacMiddleware');
const rbacController = require('../controller/rbacAdminController');

router.use(requireAuth);

// ─── Teams Management ─────────────────────────────────────────────

router.get(
  '/teams',
  requirePermission('teams.view'),
  rbacController.getTeams
);

router.post(
  '/teams',
  requirePermission('teams.manage'),
  rbacController.createTeam
);

router.put(
  '/teams/:teamId',
  requirePermission('teams.manage'),
  rbacController.updateTeam
);

router.delete(
  '/teams/:teamId',
  requirePermission('teams.manage'),
  rbacController.deleteTeam
);

router.post(
  '/teams/:teamId/members',
  requirePermission('teams.manage'),
  rbacController.addTeamMember
);

router.delete(
  '/teams/:teamId/members/:memberId',
  requirePermission('teams.manage'),
  rbacController.removeTeamMember
);

// ─── Users Management ─────────────────────────────────────────────

router.get(
  '/users',
  requirePermission('users.view'),
  rbacController.getUsers
);

router.patch(
  '/users/:userId/role',
  requirePermission('users.manage'),
  rbacController.updateUserRole
);

router.patch(
  '/users/:userId/status',
  requirePermission('users.manage'),
  rbacController.toggleUserStatus
);

// ─── Activity Log ─────────────────────────────────────────────────

router.get(
  '/activity-log',
  requirePermission('reports.view'),
  rbacController.getActivityLog
);

// ─── Permissions Matrix ──────────────────────────────────────────

router.get(
  '/permissions',
  requirePermission('settings.read'),
  rbacController.getPermissionsMatrix
);

module.exports = router;
