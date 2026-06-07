/**
 * @module managerTools
 * @description Agent management, skills, and handoff tools.
 */

const {
  normalizeOptionalString,
} = require('../utils/toolHelpers');
const { createToolFromFunction } = require('../utils/autoSchemaGenerator');

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

async function agentSpawnHandler(companyId, params = {}) {
  /**
   * Create a specialized agent from an approved template and attach it to the manager.
   * @param {string} role - SALES | SUPPORT | INVENTORY | MARKETING | SHIPPING
   * @param {string} [name] - Optional display name
   * @param {string} [templateSlug] - Optional template slug
   * @param {string[]} [allowedTools] - Tools the agent is allowed to use.
   * @param {string[]} [allowedSkills] - Skills the agent is allowed to use.
   */
  const result = await getAgentManagerService().hireAgent(companyId, {
    ...params,
    requestedBy: 'ceo-agent-tool',
  });
  return result.agent;
}

async function agentUpdateProfileHandler(companyId, params = {}) {
  /**
   * Update an agent profile through the governed and audited manager workflow.
   * @param {string} agentId - Agent id
   * @param {string} [name] - New display name
   * @param {string} [style] - Reply style
   * @param {string} [soulInstructions] - New SOUL instructions
   * @param {string} [model] - Model name
   * @param {string} [agentInstructions] - New agent instructions.
   * @param {string} [toolsInstructions] - New tools instructions.
   * @param {string[]} [allowedTools] - Updated allowed tools list.
   * @param {string[]} [allowedSkills] - Updated allowed skills list.
   */
  const result = await getAgentManagerService().updateAgentProfile(companyId, {
    ...params,
    requestedBy: 'ceo-agent-tool',
    source: 'ceo-agent-tool',
  });
  return result.agent;
}

async function skillCreateHandler(companyId, params = {}) {
  /**
   * Create a new agent skill as SKILL.md and skill.json files in the shared skill registry.
   * @param {string} [id] - Optional lowercase kebab-case id
   * @param {string} displayName - Visible skill name
   * @param {string} description - Short description of when to use the skill
   * @param {string} [purpose] - Skill purpose
   * @param {string[]} [triggerPhrases] - Trigger phrases or intents
   * @param {string[]} [steps] - Core workflow steps
   * @param {string[]} [constraints] - Safety and quality constraints
   * @param {string[]} [examples] - Suitable request examples
   * @param {string[]} [allowedTools] - Up to 3 allowed API tools
   * @param {string} [assignToAgentId] - Optional target agent id
   * @param {boolean} [overwrite] - Use true only when replacing an existing skill
   */
  return getAgentSkillAuthoringService().createSkill(companyId, params);
}

async function agentAssignTaskHandler(companyId, params = {}) {
  /**
   * Create a task in a specialized agent inbox.
   * @param {string} agentId - Agent id
   * @param {string} title - Task title
   * @param {string} [description] - Task description
   * @param {'critical'|'high'|'medium'|'low'} [priority] - high | medium | low
   * @param {string} [conflictKey] - Optional conflict key.
   * @param {string} [conflictAction] - Optional conflict action.
   * @param {string} [conflictResource] - Optional conflict resource.
   * @param {string} [conflictScope] - Optional conflict scope.
   */
  const result = await getAgentManagerService().assignTask(companyId, {
    ...params,
    createdBy: 'ceo-agent-tool',
  });
  return result.task;
}

async function agentHandoffHandler(companyId, params = {}) {
  /**
   * Hand off a conversation or support case to a human or specialized agent with context.
   * @param {'agent'|'human'} targetType - human | agent
   * @param {string} [targetId] - Target agent id when targetType is agent
   * @param {string} reason - Handoff reason
   * @param {string} [summary] - Short context summary
   * @param {string} [conversationId] - Optional conversation id
   * @param {string} [customerId] - Optional customer id
   * @param {string} [priority] - high | medium | low
   */
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
}

async function agentRunTaskHandler(companyId, params = {}) {
  /**
   * Run a direct task on a selected agent and return the result.
   * @param {string} [agentId] - Agent id when known
   * @param {string} [agentName] - Agent name when id is unknown
   * @param {string} [agentRole] - Agent role when name is unknown
   * @param {string} task - Task to run
   * @param {string} [title] - Optional task title.
   */
  const result = await getAgentManagerService().runAgentTask(companyId, params);
  return result;
}

async function agentOrchestrateHandler(companyId, params = {}) {
  /**
   * Coordinate multiple specialist agents to collaborate on a complex goal, then synthesize a unified plan.
   * @param {string} goal - The high-level goal or request
   * @param {object[]} agents - Array of {agentId, role, task} for each specialist to consult
   * @param {object} [constraints] - Optional constraints such as budget or timeline
   */
  const agentManagerService = getAgentManagerService();
  const manager = await agentManagerService.getManagerAgent(companyId);
  manager.setModelManager(require('../aiRuntimeService').getModelManager());
  const result = await manager.orchestrateMultiAgentWorkflow({
    goal: params.goal,
    agents: params.agents || [],
    constraints: params.constraints || {},
  });
  return result;
}

async function agentListAgentsHandler(companyId) {
  /**
   * List current company agents.
   */
  const state = await getAgentManagerService().readState(companyId, ['agents']);
  return state.agents || [];
}

async function agentReadStateHandler(companyId, params = {}) {
  /**
   * Read agent manager state, team, inbox, tools, and skills.
   * @param {string} [include] - Optional comma-separated sections such as agents,inbox,tools,skills
   */
  return getAgentManagerService().readState(companyId, params.include || []);
}

async function auditReadHandler(companyId, params = {}) {
  /**
   * Read recent agent decision and tool audit entries for the current company.
   * @param {string} [agentId] - Optional agent id
   * @param {number} [limit] - Number of audit entries, max 100
   */
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
}

const TOOLS = {
  'agent.spawn': createToolFromFunction('agent.spawn', agentSpawnHandler, {
    description: 'Create a specialized agent from an approved template and attach it to the manager.',
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
  }),

  'agent.update_profile': createToolFromFunction('agent.update_profile', agentUpdateProfileHandler, {
    description: 'Update an agent profile through the governed and audited manager workflow.',
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
  }),

  'skill.create': createToolFromFunction('skill.create', skillCreateHandler, {
    description: 'Create a new agent skill as SKILL.md and skill.json files in the shared skill registry.',
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
  }),

  'agent.assign_task': createToolFromFunction('agent.assign_task', agentAssignTaskHandler, {
    description: 'Create a task in a specialized agent inbox.',
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
  }),

  'agent.handoff': createToolFromFunction('agent.handoff', agentHandoffHandler, {
    description: 'Hand off a conversation or support case to a human or specialized agent with context.',
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
  }),

  'agent.run_task': createToolFromFunction('agent.run_task', agentRunTaskHandler, {
    description: 'Run a direct task on a selected agent and return the result.',
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
  }),

  'agent.orchestrate': createToolFromFunction('agent.orchestrate', agentOrchestrateHandler, {
    description: 'Coordinate multiple specialist agents to collaborate on a complex goal, then synthesize a unified plan.',
    requiredParams: ['goal', 'agents'],
    readOnly: false,
    sideEffects: 'write',
    requiresApproval: true,
    companyScoped: true,
    inputSchema: {
      type: 'object',
      required: ['goal', 'agents'],
      properties: {
        goal: { type: 'string', description: 'The high-level goal or request.' },
        agents: {
          type: 'array',
          items: {
            type: 'object',
            required: ['agentId', 'role', 'task'],
            properties: {
              agentId: { type: 'string', description: 'Specialist agent ID.' },
              role: { type: 'string', description: 'Agent role (SALES, SUPPORT, MARKETING, INVENTORY).' },
              task: { type: 'string', description: 'Specific task to assign this agent.' },
            },
          },
          description: 'List of specialist agents to consult.',
        },
        constraints: {
          type: 'object',
          description: 'Optional constraints like budget, timeline, or scope.',
        },
      },
    },
  }),

  'agent.list_agents': createToolFromFunction('agent.list_agents', agentListAgentsHandler, {
    description: 'List current company agents.',
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
  }),

  'agent.read_state': createToolFromFunction('agent.read_state', agentReadStateHandler, {
    description: 'Read agent manager state, team, inbox, tools, and skills.',
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
  }),

  'audit.read': createToolFromFunction('audit.read', auditReadHandler, {
    description: 'Read recent agent decision and tool audit entries for the current company.',
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
  }),
};

module.exports = TOOLS;
