const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const agentWorkspaceController = require('../controller/agentWorkspaceController');

router.use(verifyToken.authenticateToken);

/**
 * @route GET /api/v1/agent-workspace/my-orders
 * @desc Get orders assigned to the current agent
 * @access Private
 */
router.get('/my-orders', agentWorkspaceController.getMyOrders);

/**
 * @route POST /api/v1/agent-workspace/orders/:id/log-call
 * @desc Log a call attempt for an order
 * @access Private
 */
router.post('/orders/:id/log-call', agentWorkspaceController.logCallAttempt);

/**
 * @route POST /api/v1/agent-workspace/orders/:id/follow-up
 * @desc Schedule a follow-up for an order
 * @access Private
 */
router.post('/orders/:id/follow-up', agentWorkspaceController.scheduleFollowUp);

/**
 * @route POST /api/v1/agent-workspace/orders/:id/quick-action
 * @desc Quickly update order status (Confirm, Cancel, etc.)
 * @access Private
 */
router.post('/orders/:id/quick-action', agentWorkspaceController.quickAction);

module.exports = router;
