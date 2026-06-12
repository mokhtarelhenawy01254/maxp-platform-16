const aiServiceAdminClient = require('./aiServiceAdminClient');

async function spawnAgentIfNeeded(companyId, role, options = {}) {
  try {
    return await aiServiceAdminClient.spawnAgent({ companyId, role, ...options });
  } catch (err) {
    console.warn('[SandboxBridge] spawnAgent failed:', err.message);
    return null;
  }
}

async function getAgentConfig(companyId, agentId) {
  try {
    return await aiServiceAdminClient.getAgent(companyId, agentId);
  } catch (err) {
    return null;
  }
}

async function listAgents(companyId, filters = {}) {
  return await aiServiceAdminClient.listAgents(companyId, filters);
}

async function listTools(companyId) {
  return await aiServiceAdminClient.listTools(companyId);
}

async function chatWithSandboxAgent(params) {
  return await aiServiceAdminClient.chatWithAgent(params);
}

function createSandboxAgentMeta(templateSlug, companyId, config) {
  return {
    id: config.id || `${templateSlug}_${companyId}`,
    name: config.name || templateSlug,
    role: config.role || 'CUSTOMER_SALES',
    companyId,
    templateSlug,
    allowedTools: config.allowedTools || [],
    allowedSkills: config.allowedSkills || [],
    model: config.model || 'default',
    persona: config.persona || { soulInstructions: '' },
  };
}

module.exports = {
  spawnAgentIfNeeded,
  getAgentConfig,
  listAgents,
  listTools,
  chatWithSandboxAgent,
  createSandboxAgentMeta,
};
