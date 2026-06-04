/**
 * @module managerTools
 * @description Agent management, skills, and handoff tools.
 */

const {
  normalizeOptionalString,
} = require('../utils/toolHelpers');

function getAgentManagerService() {
  return require('../agentManagerService');
}

function getAgentSkillAuthoringService() {
  return require('../agentSkillAuthoringService');
}

function getAgentAuditTrailService() {
  return require('../agentAuditTrailService');
}

function getDraftProposalService() {
  return require('../draftProposalService');
}

const TOOLS = {
  'agent.spawn': {
    description: 'Create a specialized agent from an approved template and attach it to the manager.',
    params: { role: 'SALES | SUPPORT | INVENTORY | MARKETING | SHIPPING', name: 'Optional display name', templateSlug: 'Optional template slug' },
    requiredParams: ['role'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['role'],
      properties: {
        role: { type: 'string', description: 'Agent role: SALES, SUPPORT, INVENTORY, MARKETING, or SHIPPING.' },
        name: { type: 'string', description: 'Optional display name for the agent.' },
        templateSlug: { type: 'string', description: 'Optional template slug to use.' },
        allowedTools: { type: 'array', items: { type: 'string' }, description: 'Tools the agent is allowed to use.' },
        allowedSkills: { type: 'array', items: { type: 'string' }, description: 'Skills the agent is allowed to use.' },
      },
    },
    handler: async (companyId, params = {}) => {
      const result = await getAgentManagerService().hireAgent(companyId, {
        ...params,
        requestedBy: 'ceo-agent-tool',
      });
      return result.agent;
    },
  },

  'agent.update_profile': {
    description: 'Update an agent profile through the governed and audited manager workflow.',
    params: { agentId: 'Agent id', name: 'New display name', style: 'Reply style', soulInstructions: 'New SOUL instructions', model: 'Model name' },
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['agentId'],
      properties: {
        agentId: { type: 'string', description: 'The agent ID to update.' },
        name: { type: 'string', description: 'New display name.' },
        model: { type: 'string', description: 'New model name.' },
        style: { type: 'string', description: 'New reply style.' },
        soulInstructions: { type: 'string', description: 'New SOUL instructions.' },
        agentInstructions: { type: 'string', description: 'New agent instructions.' },
        toolsInstructions: { type: 'string', description: 'New tools instructions.' },
        allowedTools: { type: 'array', items: { type: 'string' }, description: 'Updated allowed tools list.' },
        allowedSkills: { type: 'array', items: { type: 'string' }, description: 'Updated allowed skills list.' },
      },
    },
    handler: async (companyId, params = {}) => {
      const result = await getAgentManagerService().updateAgentProfile(companyId, {
        ...params,
        requestedBy: 'ceo-agent-tool',
        source: 'ceo-agent-tool',
      });
      return result.agent;
    },
  },

  'skill.create': {
    description: 'Create a new agent skill as SKILL.md and skill.json files in the shared skill registry.',
    params: {
      id: 'Optional lowercase kebab-case id',
      displayName: 'Visible skill name',
      description: 'Short description of when to use the skill',
      purpose: 'Skill purpose',
      triggerPhrases: 'Trigger phrases or intents',
      steps: 'Core workflow steps',
      constraints: 'Safety and quality constraints',
      examples: 'Suitable request examples',
      allowedTools: 'Up to 3 allowed API tools',
      assignToAgentId: 'Optional target agent id',
      overwrite: 'Use true only when replacing an existing skill',
    },
    requiredParams: ['displayName', 'description'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['displayName', 'description'],
      properties: {
        id: { type: 'string', description: 'Optional kebab-case ID.' },
        displayName: { type: 'string', description: 'Visible skill name.' },
        description: { type: 'string', description: 'When to use this skill.' },
        purpose: { type: 'string', description: 'Skill purpose.' },
        triggerPhrases: { type: 'array', items: { type: 'string' }, description: 'Trigger phrases or intents.' },
        steps: { type: 'array', items: { type: 'string' }, description: 'Core workflow steps.' },
        constraints: { type: 'array', items: { type: 'string' }, description: 'Safety and quality constraints.' },
        examples: { type: 'array', items: { type: 'string' }, description: 'Example requests.' },
        allowedTools: { type: 'array', items: { type: 'string' }, description: 'Up to 3 allowed tools.' },
        assignToAgentId: { type: 'string', description: 'Optional target agent ID.' },
        overwrite: { type: 'boolean', description: 'Set true to replace an existing skill.' },
      },
    },
    handler: async (companyId, params = {}) => {
      return getAgentSkillAuthoringService().createSkill(companyId, params);
    },
  },

  'agent.assign_task': {
    description: 'Create a task in a specialized agent inbox.',
    params: { agentId: 'Agent id', title: 'Task title', description: 'Task description', priority: 'high | medium | low' },
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['agentId', 'title'],
      properties: {
        agentId: { type: 'string', description: 'Target agent ID.' },
        title: { type: 'string', description: 'Task title.' },
        description: { type: 'string', description: 'Task description.' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Task priority.' },
        conflictKey: { type: 'string', description: 'Optional conflict key.' },
        conflictAction: { type: 'string', description: 'Optional conflict action.' },
        conflictResource: { type: 'string', description: 'Optional conflict resource.' },
        conflictScope: { type: 'string', description: 'Optional conflict scope.' },
      },
    },
    handler: async (companyId, params = {}) => {
      const result = await getAgentManagerService().assignTask(companyId, {
        ...params,
        createdBy: 'ceo-agent-tool',
      });
      return result.task;
    },
  },

  'agent.handoff': {
    description: 'Hand off a conversation or support case to a human or specialized agent with context.',
    params: {
      targetType: 'human | agent',
      targetId: 'Target agent id when targetType is agent',
      reason: 'Handoff reason',
      summary: 'Short context summary',
      conversationId: 'Optional conversation id',
      customerId: 'Optional customer id',
      priority: 'high | medium | low',
    },
    requiredParams: ['targetType', 'reason'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['targetType', 'reason'],
      properties: {
        targetType: { type: 'string', enum: ['agent', 'human'], description: 'Transfer to an agent or human.' },
        targetId: { type: 'string', description: 'Target agent ID when targetType is agent.' },
        reason: { type: 'string', description: 'Handoff reason.' },
        summary: { type: 'string', description: 'Short context summary.' },
      },
    },
    handler: async (companyId, params = {}) => {
      const targetType = normalizeOptionalString(params.targetType) || 'human';
      const reason = normalizeOptionalString(params.reason);
      if (!reason) throw new Error('HANDOFF_REASON_REQUIRED');

      const result = await getAgentManagerService().assignTask(companyId, {
        title: `Handoff: ${reason}`,
        description: normalizeOptionalString(params.summary) || reason,
        priority: normalizeOptionalString(params.priority) || 'high',
        agentId: targetType === 'agent' ? normalizeOptionalString(params.targetId) : null,
        assignTo: targetType === 'human' ? 'HUMAN' : null,
        createdBy: 'ceo-agent-tool',
        metadata: {
          handoff: {
            targetType,
            targetId: normalizeOptionalString(params.targetId),
            reason,
            summary: normalizeOptionalString(params.summary),
            conversationId: normalizeOptionalString(params.conversationId),
            customerId: normalizeOptionalString(params.customerId),
          },
        },
      });

      return {
        handoff: true,
        targetType,
        reason,
        task: result.task,
        message: 'Conversation handoff task created.',
      };
    },
  },

  'agent.run_task': {
    description: 'Run a direct task on a selected agent and return the result.',
    params: {
      agentId: 'Agent id when known',
      agentName: 'Agent name when id is unknown',
      agentRole: 'Agent role when name is unknown',
      task: 'Task to run',
    },
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['task'],
      properties: {
        agentId: { type: 'string', description: 'Agent ID when known.' },
        agentName: { type: 'string', description: 'Agent name when ID is unknown.' },
        agentRole: { type: 'string', description: 'Agent role when name is unknown.' },
        title: { type: 'string', description: 'Optional task title.' },
        task: { type: 'string', description: 'The task to execute.' },
      },
    },
    handler: async (companyId, params = {}) => {
      const result = await getAgentManagerService().runAgentTask(companyId, params);
      return result;
    },
  },

  'agent.list_agents': {
    description: 'List current company agents.',
    params: {},
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Optional status filter.' },
      },
    },
    handler: async (companyId) => {
      const state = await getAgentManagerService().readState(companyId, ['agents']);
      return state.agents || [];
    },
  },

  'agent.read_state': {
    description: 'Read agent manager state, team, inbox, tools, and skills.',
    params: { include: 'Optional comma-separated sections such as agents,inbox,tools,skills' },
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        include: { type: 'array', items: { type: 'string' }, description: 'Sections to include: agents, inbox, tools, skills.' },
      },
    },
    handler: async (companyId, params = {}) => {
      return getAgentManagerService().readState(companyId, params.include || []);
    },
  },

  'audit.read': {
    description: 'Read recent agent decision and tool audit entries for the current company.',
    params: { agentId: 'Optional agent id', limit: 'Number of audit entries, max 100' },
    readOnly: true,
    sideEffects: 'read',
    requiresApproval: false,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Optional agent ID to filter audit entries.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Number of audit entries to return.' },
      },
    },
    handler: async (companyId, params = {}) => {
      const requestedLimit = Number(params.limit || 5);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(Math.floor(requestedLimit), 1), 100)
        : 5;
      const entries = await getAgentAuditTrailService().getDecisionLog(companyId, {
        agentId: normalizeOptionalString(params.agentId),
        limit,
      });
      return {
        count: entries.length,
        entries,
      };
    },
  },
};

module.exports = TOOLS;
