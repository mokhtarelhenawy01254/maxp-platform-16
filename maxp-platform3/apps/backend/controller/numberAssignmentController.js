const numberAssignmentService = require('../services/numberAssignmentService');
const {
  ROUTING_MODES,
  DISTRIBUTION_STRATEGIES
} = require('../services/whatsappConversationRoutingService');

exports.getAllAssignments = async (req, res) => {
  try {
    const assignments = await numberAssignmentService.getCompanyAssignments(
      req.user.companyId
    );
    res.json({ success: true, assignments });
  } catch (error) {
    console.error('[NumberAssignment] getAllAssignments error:', error.message);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
};

exports.getRoutingWorkspace = async (req, res) => {
  try {
    const workspace = await numberAssignmentService.getRoutingWorkspace(
      req.user.companyId
    );
    res.json({ success: true, ...workspace });
  } catch (error) {
    console.error('[NumberAssignment] getRoutingWorkspace error:', error.message);
    res.status(500).json({ error: 'Failed to load routing workspace' });
  }
};

exports.assignNumber = async (req, res) => {
  try {
    const { sessionId, userId, teamId } = req.body;
    if (!sessionId || !userId) {
      return res.status(400).json({ error: 'Session ID and User ID are required' });
    }

    const assignment = await numberAssignmentService.assignNumber(
      sessionId,
      req.user.companyId,
      userId,
      req.user.id,
      teamId || null
    );
    res.json({ success: true, assignment });
  } catch (error) {
    console.error('[NumberAssignment] assignNumber error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to assign number' });
  }
};

exports.saveRoutingRule = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { routingMode, distributionStrategy, userIds } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'At least one employee must be selected' });
    }

    if (
      routingMode !== ROUTING_MODES.NUMBER_OWNER &&
      routingMode !== ROUTING_MODES.ROUND_ROBIN &&
      routingMode !== ROUTING_MODES.SHARED_INBOX
    ) {
      return res.status(400).json({ error: 'Invalid routing mode' });
    }

    if (
      distributionStrategy &&
      distributionStrategy !== DISTRIBUTION_STRATEGIES.ROUND_ROBIN
    ) {
      return res.status(400).json({ error: 'Invalid distribution strategy' });
    }

    const assignment = await numberAssignmentService.saveRoutingRule(
      sessionId,
      req.user.companyId,
      {
        routingMode,
        distributionStrategy,
        userIds
      },
      req.user.id
    );

    res.json({ success: true, assignment });
  } catch (error) {
    console.error('[NumberAssignment] saveRoutingRule error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to save routing rule' });
  }
};

exports.unassignNumber = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const result = await numberAssignmentService.unassignNumber(
      sessionId,
      req.user.companyId,
      req.user.id
    );
    res.json({ success: true, assignment: result });
  } catch (error) {
    console.error('[NumberAssignment] unassignNumber error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to unassign number' });
  }
};

exports.getAvailableNumbers = async (req, res) => {
  try {
    const sessions = await numberAssignmentService.getAvailableSessions(
      req.user.companyId
    );
    res.json({ success: true, sessions });
  } catch (error) {
    console.error('[NumberAssignment] getAvailableNumbers error:', error.message);
    res.status(500).json({ error: 'Failed to fetch available numbers' });
  }
};

exports.getAvailableModerators = async (req, res) => {
  try {
    const moderators = await numberAssignmentService.getAvailableModerators(
      req.user.companyId
    );
    res.json({ success: true, moderators });
  } catch (error) {
    console.error('[NumberAssignment] getAvailableModerators error:', error.message);
    res.status(500).json({ error: 'Failed to fetch moderators' });
  }
};

exports.getMyNumbers = async (req, res) => {
  try {
    const numbers = await numberAssignmentService.getModeratorNumbers(
      req.user.companyId,
      req.user.id
    );
    res.json({ success: true, numbers });
  } catch (error) {
    console.error('[NumberAssignment] getMyNumbers error:', error.message);
    res.status(500).json({ error: 'Failed to fetch your numbers' });
  }
};

exports.getSessionAssignment = async (req, res) => {
  try {
    const assignment = await numberAssignmentService.getSessionAssignment(
      req.params.sessionId
    );
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ success: true, assignment });
  } catch (error) {
    console.error('[NumberAssignment] getSessionAssignment error:', error.message);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
};
