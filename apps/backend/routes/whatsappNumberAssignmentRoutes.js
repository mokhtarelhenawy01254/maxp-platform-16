const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const assignmentController = require('../controller/numberAssignmentController');

router.use(verifyToken.authenticateToken);

// ─── Admin Routes ─────────────────────────────────────────────────

router.get(
  '/',
  requireDbPermission('numbers.view'),
  assignmentController.getAllAssignments
);

router.get(
  '/workspace',
  requireDbPermission('numbers.view'),
  assignmentController.getRoutingWorkspace
);

router.get(
  '/available',
  requireDbPermission('numbers.manage'),
  assignmentController.getAvailableNumbers
);

router.get(
  '/moderators',
  requireDbPermission('numbers.manage'),
  assignmentController.getAvailableModerators
);

router.post(
  '/assign',
  requireDbPermission('numbers.assign'),
  assignmentController.assignNumber
);

router.put(
  '/:sessionId/routing',
  requireDbPermission('numbers.assign'),
  assignmentController.saveRoutingRule
);

router.post(
  '/unassign',
  requireDbPermission('numbers.assign'),
  assignmentController.unassignNumber
);

router.get(
  '/:sessionId',
  requireDbPermission('numbers.view'),
  assignmentController.getSessionAssignment
);

module.exports = router;
