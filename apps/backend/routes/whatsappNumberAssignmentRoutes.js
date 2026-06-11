const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbacMiddleware');
const assignmentController = require('../controller/numberAssignmentController');

router.use(requireAuth);

// ─── Admin Routes ─────────────────────────────────────────────────

router.get(
  '/',
  requirePermission('numbers.view'),
  assignmentController.getAllAssignments
);

router.get(
  '/workspace',
  requirePermission('numbers.view'),
  assignmentController.getRoutingWorkspace
);

router.get(
  '/available',
  requirePermission('numbers.manage'),
  assignmentController.getAvailableNumbers
);

router.get(
  '/moderators',
  requirePermission('numbers.manage'),
  assignmentController.getAvailableModerators
);

router.post(
  '/assign',
  requirePermission('numbers.assign'),
  assignmentController.assignNumber
);

router.put(
  '/:sessionId/routing',
  requirePermission('numbers.assign'),
  assignmentController.saveRoutingRule
);

router.post(
  '/unassign',
  requirePermission('numbers.assign'),
  assignmentController.unassignNumber
);

router.get(
  '/:sessionId',
  requirePermission('numbers.view'),
  assignmentController.getSessionAssignment
);

module.exports = router;
