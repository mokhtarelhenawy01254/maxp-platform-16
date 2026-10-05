const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');
const agentWorkspaceController = require('../controller/agentWorkspaceController');
const { createEndpointRateLimiter } = require('../middleware/rateLimiter');

router.use(verifyToken.authenticateToken);
router.use(checkAppAccess('agent-workspace'));

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
router.post('/orders/:id/log-call', createEndpointRateLimiter('AGENT_ACTIONS'), agentWorkspaceController.logCallAttempt);

/**
 * @route POST /api/v1/agent-workspace/orders/:id/follow-up
 * @desc Schedule a follow-up for an order
 * @access Private
 */
router.post('/orders/:id/follow-up', createEndpointRateLimiter('AGENT_ACTIONS'), agentWorkspaceController.scheduleFollowUp);

/**
 * @route POST /api/v1/agent-workspace/orders/:id/quick-action
 * @desc Quickly update order status (Confirm, Cancel, etc.)
 * @access Private
 */
router.post('/orders/:id/quick-action', createEndpointRateLimiter('AGENT_ACTIONS'), agentWorkspaceController.quickAction);

/**
 * @route GET /api/v1/agent-workspace/reports
 * @desc Get real-time operational confirmation performance metrics and reports
 * @access Private
 */
router.get('/reports', agentWorkspaceController.getWorkspaceReports);

/**
 * @route GET /api/v1/agent-workspace/team-workload
 * @desc Get confirmation team capacity and unassigned pool telemetry for managers
 * @access Private (Managerial)
 */
router.get('/team-workload', agentWorkspaceController.requireManager, agentWorkspaceController.getTeamWorkload);

/**
 * @route POST /api/v1/agent-workspace/auto-distribute
 * @desc Auto distribute unassigned orders across active agents
 * @access Private (Managerial)
 */
router.post('/auto-distribute', createEndpointRateLimiter('AGENT_ACTIONS'), agentWorkspaceController.requireManager, agentWorkspaceController.autoDistributeOrders);

/**
 * @route POST /api/v1/agent-workspace/assign
 * @desc Assign or reassign an order to an agent
 * @access Private (Managerial)
 */
router.post('/assign', createEndpointRateLimiter('AGENT_ACTIONS'), agentWorkspaceController.requireManager, agentWorkspaceController.assignOrder);

/**
 * @route PUT /api/v1/agent-workspace/orders/:id/items
 * @desc Update order items, quantities, upsells and financial totals
 * @access Private
 */
router.put('/orders/:id/items', createEndpointRateLimiter('AGENT_ACTIONS'), agentWorkspaceController.updateOrderItems);

/**
 * @route PUT /api/v1/agent-workspace/orders/:id/customer
 * @desc Update order customer contact and shipping address details
 * @access Private
 */
router.put('/orders/:id/customer', createEndpointRateLimiter('AGENT_ACTIONS'), agentWorkspaceController.updateOrderCustomer);

module.exports = router;
