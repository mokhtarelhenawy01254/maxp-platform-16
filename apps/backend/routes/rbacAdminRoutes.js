const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const rbacController = require('../controller/rbacAdminController');

router.use(verifyToken.authenticateToken);

// ─── Teams Management ─────────────────────────────────────────────

router.get(
  '/teams',
  requireDbPermission('teams.view'),
  rbacController.getTeams
);

router.post(
  '/teams',
  requireDbPermission('teams.manage'),
  rbacController.createTeam
);

router.put(
  '/teams/:teamId',
  requireDbPermission('teams.manage'),
  rbacController.updateTeam
);

router.delete(
  '/teams/:teamId',
  requireDbPermission('teams.manage'),
  rbacController.deleteTeam
);

router.post(
  '/teams/:teamId/members',
  requireDbPermission('teams.manage'),
  rbacController.addTeamMember
);

router.delete(
  '/teams/:teamId/members/:memberId',
  requireDbPermission('teams.manage'),
  rbacController.removeTeamMember
);

// ─── Users Management ─────────────────────────────────────────────

router.get(
  '/users',
  requireDbPermission('users.view'),
  rbacController.getUsers
);

router.patch(
  '/users/:userId/role',
  requireDbPermission('users.manage'),
  rbacController.updateUserRole
);

router.patch(
  '/users/:userId/status',
  requireDbPermission('users.manage'),
  rbacController.toggleUserStatus
);

// ─── Activity Log ─────────────────────────────────────────────────

router.get(
  '/activity-log',
  requireDbPermission('reports.view'),
  rbacController.getActivityLog
);

// ─── Permissions Matrix ──────────────────────────────────────────

router.get(
  '/permissions',
  requireDbPermission('settings.read'),
  rbacController.getPermissionsMatrix
);

module.exports = router;
