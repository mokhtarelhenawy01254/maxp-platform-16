/**
 * @module aiServiceAdminClient
 * @description HTTP client for the maxp-ai-service admin API.
 */

const http = require('http');
const https = require('https');

function getBaseUrl() {
  return (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
}

function getToken() {
  return process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || '';
}

async function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const base = getBaseUrl();
    const url = new URL(`${base}${path}`);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            return reject(new Error(parsed.detail || parsed.message || parsed.error || `AI service error (${res.statusCode})`));
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(res.statusCode >= 400 ? `AI service error (${res.statusCode})` : 'Invalid JSON from AI service'));
        }
      });
    });

    req.on('error', reject);
    const responseTimeoutMs = parseInt(process.env.AI_RESPONSE_TIMEOUT || '120000', 10) || 120000;
    req.setTimeout(responseTimeoutMs, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function listTools() {
  return request('GET', '/admin/tools') || [];
}

async function listSkills() {
  return request('GET', '/admin/skills') || [];
}

async function updateToolMeta(toolName, data) {
  return request('PUT', `/admin/tools/${encodeURIComponent(toolName)}`, data);
}

async function listAgents(companyId) {
  const qs = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
  return request('GET', `/admin/agents${qs}`) || [];
}

async function chatWithAgent({ companyId, agentId, message, threadId, conversationId, customerId, channel, agentConfig, memoryContext, attachments }) {
  const body = {
    company_id: companyId,
    agent_id: agentId,
    message,
    thread_id: threadId,
  };
  if (conversationId) body.conversation_id = conversationId;
  if (customerId) body.customer_id = customerId;
  if (channel) body.channel = channel;
  if (agentConfig) body.agent_config = agentConfig;
  if (memoryContext) body.memory_context = memoryContext;
  if (attachments) body.attachments = attachments;
  return request('POST', '/admin/agents/chat', body);
}

async function evaluateSandboxResponse({ companyId, message, response, toolCalls, criteria, provider, model, keyId }) {
  return request('POST', '/admin/sandbox/evaluate-response', {
    company_id: companyId,
    message,
    response,
    tool_calls: Array.isArray(toolCalls) ? toolCalls : [],
    criteria: Array.isArray(criteria) ? criteria : [],
    provider,
    model,
    key_id: keyId,
  });
}

async function updateGlobalConfig(config) {
  return request('PATCH', '/admin/config', config);
}

async function setProviderPriority(providers) {
  return request('POST', '/admin/provider-priority', { providers });
}

async function createKey(key) {
  return request('POST', '/admin/keys', key);
}

async function deleteKey(id) {
  return request('DELETE', `/admin/keys/${encodeURIComponent(id)}`);
}

async function setKeyStatus(id, isActive) {
  return request('PATCH', `/admin/keys/${encodeURIComponent(id)}/status`, { is_active: isActive });
}

/**
 * Test a provider API key via Python ai-service.
 * @param {Object} params
 * @param {string} params.provider
 * @param {string} params.apiKey
 * @param {string} [params.model]
 * @param {Array} [params.messages] - Optional pre-constructed messages for chat test
 * @param {string} [params.prompt] - Optional single prompt for completion test
 * @param {number} [params.timeoutMs]
 * @returns {Promise<{ok: boolean, reply: string, latency_ms: number, model: string, provider: string}>}
 */
async function spawnAgent({ companyId, role, ...rest }) {
  return request('POST', '/admin/agents/spawn', { company_id: companyId, role, ...rest });
}

async function getAgent(companyId, agentId) {
  const qs = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
  return request('GET', `/admin/agents/${encodeURIComponent(agentId)}${qs}`);
}

async function updateAgentStatus(agentId, status) {
  return request('PATCH', `/admin/agents/${encodeURIComponent(agentId)}/status`, { status });
}

async function testProviderKey({ provider, apiKey, model, messages, prompt, timeoutMs }) {
  const body = { provider, api_key: apiKey };
  if (model) body.model = model;
  if (messages) body.messages = messages;
  if (prompt) body.prompt = prompt;
  if (timeoutMs) body.timeout_ms = timeoutMs;
  const result = await request('POST', '/admin/test', body);
  if (!result) {
    return { success: false, error: 'AI service returned an error (check connectivity or auth token)', latency_ms: 0, model: '', reply: null };
  }
  return result;
}

async function getManagerContext(companyId) {
  return request('GET', `/admin/manager/context?company_id=${encodeURIComponent(companyId)}`);
}

async function getTeamMap(companyId) {
  return request('GET', `/admin/team-map?company_id=${encodeURIComponent(companyId)}`);
}

async function archiveAgent(agentId, companyId) {
  return request('DELETE', `/admin/agents/${encodeURIComponent(agentId)}?company_id=${encodeURIComponent(companyId)}`);
}

async function getAgentFiles(agentId, companyId) {
  return request('GET', `/admin/agents/${encodeURIComponent(agentId)}/files?company_id=${encodeURIComponent(companyId)}`);
}

async function updateAgent(agentId, companyId, data) {
  const body = { ...data };
  if (body.allowedChannels !== undefined) {
    body.allowed_channels = body.allowedChannels;
    delete body.allowedChannels;
  }
  return request('PUT', `/admin/agents/${encodeURIComponent(agentId)}?company_id=${encodeURIComponent(companyId)}`, body);
}

async function getProductEmbeddingStatus(companyId) {
  const qs = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
  return request('GET', `/admin/product-embeddings/status${qs}`);
}

async function triggerProductEmbeddingSync(companyId) {
  return request('POST', '/admin/product-embeddings/sync', { company_id: companyId || null });
}

async function getKnowledgeEmbeddingStatus(companyId) {
  const qs = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
  return request('GET', `/admin/knowledge-embeddings/status${qs}`);
}

async function triggerKnowledgeEmbeddingSync(companyId) {
  return request('POST', '/admin/knowledge-embeddings/sync', { company_id: companyId || null });
}

async function embedKnowledgeItem({ sourceId, sourceType, companyId, title, content, category = '', tags = '' }) {
  return request('POST', '/admin/knowledge-embeddings/embed-item', {
    source_id: sourceId,
    source_type: sourceType,
    company_id: companyId,
    title,
    content,
    category: category || '',
    tags: tags || '',
  });
}

async function deleteKnowledgeEmbeddingItem(sourceId, sourceType) {
  return request('DELETE', '/admin/knowledge-embeddings/item', {
    source_id: sourceId,
    source_type: sourceType,
  });
}

// ── Agent Template Management (2026 unified approach) ──────────────

async function listAgentTemplates(params = {}) {
  const query = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return request('GET', `/admin/agent-templates${query ? '?' + query : ''}`);
}

async function getAgentTemplate(slug) {
  return request('GET', `/admin/agent-templates/${encodeURIComponent(slug)}`);
}

async function createAgentTemplate(data) {
  return request('POST', '/admin/agent-templates', data);
}

async function updateAgentTemplate(slug, data) {
  return request('PUT', `/admin/agent-templates/${encodeURIComponent(slug)}`, data);
}

async function deleteAgentTemplate(slug) {
  return request('DELETE', `/admin/agent-templates/${encodeURIComponent(slug)}`);
}

async function bulkUpdateAgentTemplatesStatus(slugs, isActive) {
  return request('PATCH', '/admin/agent-templates/bulk-status', { slugs, is_active: isActive });
}

async function listDepartments(companyId) {
  const qs = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
  return request('GET', `/admin/departments${qs}`) || [];
}

async function getGuardrails(companyId) {
  return request('GET', `/admin/settings/guardrails?company_id=${encodeURIComponent(companyId)}`);
}

async function updateGuardrails(companyId, data) {
  return request('PUT', `/admin/settings/guardrails?company_id=${encodeURIComponent(companyId)}`, data);
}

async function getAutoReply(companyId) {
  return request('GET', `/admin/settings/auto-reply?company_id=${encodeURIComponent(companyId)}`);
}

async function updateAutoReply(companyId, enabled) {
  return request('PUT', `/admin/settings/auto-reply?company_id=${encodeURIComponent(companyId)}`, { autoReplyEnabled: enabled });
}

async function getGlobalFilterSettings(companyId) {
  return request('GET', `/admin/settings/filters?company_id=${encodeURIComponent(companyId)}`);
}

async function updateGlobalFilterSettings(companyId, data) {
  return request('PUT', `/admin/settings/filters?company_id=${encodeURIComponent(companyId)}`, data);
}

module.exports = {
  listTools,
  listSkills,
  updateToolMeta,
  listAgentTemplates,
  getAgentTemplate,
  createAgentTemplate,
  updateAgentTemplate,
  deleteAgentTemplate,
  bulkUpdateAgentTemplatesStatus,
  listDepartments,
  listAgents,
  chatWithAgent,
  evaluateSandboxResponse,
  updateGlobalConfig,
  setProviderPriority,
  createKey,
  deleteKey,
  setKeyStatus,
  testProviderKey,
  spawnAgent,
  getAgent,
  updateAgentStatus,
  getManagerContext,
  getTeamMap,
  archiveAgent,
  getAgentFiles,
  updateAgent,
  getProductEmbeddingStatus,
  triggerProductEmbeddingSync,
  getKnowledgeEmbeddingStatus,
  triggerKnowledgeEmbeddingSync,
  embedKnowledgeItem,
  deleteKnowledgeEmbeddingItem,
  getGuardrails,
  updateGuardrails,
  getAutoReply,
  updateAutoReply,
  getGlobalFilterSettings,
  updateGlobalFilterSettings,
};
