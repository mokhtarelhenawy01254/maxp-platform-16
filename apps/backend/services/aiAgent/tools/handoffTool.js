/**
 * Handoff tool: allows LLM to transfer conversation to another agent.
 */
const { createToolFromFunction } = require('../utils/autoSchemaGenerator');

async function handoffToHandler(companyId, params, context) {
  /**
   * Transfer the conversation to a specialist agent. Use when the customer needs expertise outside your role.
   * @param {string} targetRole - Role of the agent to transfer to (e.g., SALES, SUPPORT, SHIPPING)
   * @param {string} reason - Brief reason for the transfer
   * @param {string} context - Key information to pass to the target agent (JSON string)
   */
  const { targetRole, reason, context: handoffContext } = params;
  const { runId, agent } = context;

  // Lazy require to avoid circular dependency
  const agentProvisioningService = require('../agentProvisioningService');
  const { getRunStateManager } = require('../RunStateManager');

  // Find target agent
  const targetAgent = agentProvisioningService.listAgents(companyId)
    .find(a => a.role === targetRole && a.status === 'ACTIVE');

  if (!targetAgent) {
    return {
      status: 'FAILED',
      error: `No active agent found with role ${targetRole}`,
    };
  }

  // Log the handoff
  const runManager = getRunStateManager();
  const run = runManager.getRun(runId);
  if (run) {
    run.handoffs = run.handoffs || [];
    run.handoffs.push({
      fromRole: agent.role,
      toRole: targetRole,
      reason,
      timestamp: Date.now(),
    });
  }

  return {
    status: 'HANDOFF_INITIATED',
    targetRole,
    targetAgentId: targetAgent.id,
    reason,
    message: `Conversation transferred to ${targetRole} agent.`,
  };
}

const HANDOFF_TOOL = createToolFromFunction('agent.handoff_to', handoffToHandler, {
  description: 'Transfer the conversation to a specialist agent. Use when the customer needs expertise outside your role.',
  readOnly: false,
});

module.exports = HANDOFF_TOOL;
