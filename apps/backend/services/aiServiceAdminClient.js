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
            let detail = parsed.detail;
            if (Array.isArray(detail)) {
              detail = detail
                .map((d) => `${d.loc ? d.loc.join('.') : ''}: ${d.msg || d.message || JSON.stringify(d)}`)
                .join('; ');
            } else if (typeof detail === 'object' && detail !== null) {
              detail = JSON.stringify(detail);
            }
            return reject(new Error(detail || parsed.message || parsed.error || `AI service error (${res.statusCode})`));
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(res.statusCode >= 400 ? `AI service error (${res.statusCode})` : 'Invalid JSON from AI service'));
        }
      });
    });

    req.on('error', reject);
    const responseTimeoutMs = parseInt(process.env.AI_RESPONSE_TIMEOUT || '600000', 10) || 600000;
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

async function listAgents(companyId, status) {
  const params = [];
  if (companyId) params.push(`company_id=${encodeURIComponent(companyId)}`);
  if (status) params.push(`status=${encodeURIComponent(status)}`);
  const qs = params.length > 0 ? `?${params.join('&')}` : '';
  return request('GET', `/admin/agents${qs}`) || [];
}

async function chatWithAgent({ companyId, agentId, message, threadId, conversationId, customerId, channel, agentConfig, memoryContext, memory_context, attachments }) {
  const incomingMemoryContext = memoryContext || memory_context || null;
  const { enrichMemoryContextWithPostProduct } = require('../utils/postProductMappingHelper');
  const enrichedContext = await enrichMemoryContextWithPostProduct(companyId, threadId || conversationId, incomingMemoryContext);

  const body = {
    company_id: companyId,
    agent_id: agentId,
    message,
    thread_id: threadId,
  };
  if (conversationId) body.conversation_id = conversationId;
  if (customerId) body.customer_id = customerId;
  body.channel = channel || 'dashboard';
  if (agentConfig) body.agent_config = agentConfig;
  if (enrichedContext && Object.keys(enrichedContext).length > 0) body.memory_context = enrichedContext;
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

function normalizeAgentPayload(data = {}) {
  const fieldMap = {
    companyId: 'company_id',
    templateSlug: 'template_slug',
    parentId: 'parent_id',
    allowedTools: 'allowed_tools',
    allowedSkills: 'allowed_skills',
    allowedChannels: 'allowed_channels',
    keyId: 'key_id',
  };
  return Object.entries(data).reduce((body, [key, value]) => {
    if (value === undefined) return body;
    body[fieldMap[key] || key] = value;
    return body;
  }, {});
}

async function spawnAgent({ companyId, role, ...rest }) {
  return request('POST', '/admin/agents/spawn', normalizeAgentPayload({ companyId, role, ...rest }));
}

async function getAgent(companyId, agentId) {
  const qs = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
  return request('GET', `/admin/agents/${encodeURIComponent(agentId)}${qs}`);
}

async function updateAgentStatus(agentId, status) {
  return request('PATCH', `/admin/agents/${encodeURIComponent(agentId)}/status`, { status });
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

async function deleteAgentPermanently(agentId, companyId) {
  return request('DELETE', `/admin/agents/${encodeURIComponent(agentId)}?company_id=${encodeURIComponent(companyId)}&permanent=true`);
}

async function getAgentFiles(agentId, companyId) {
  return request('GET', `/admin/agents/${encodeURIComponent(agentId)}/files?company_id=${encodeURIComponent(companyId)}`);
}

async function saveAgentFiles(agentId, companyId, data) {
  const qs = companyId ? `?company_id=${encodeURIComponent(companyId)}` : '';
  return request('PUT', `/admin/agents/${encodeURIComponent(agentId)}/files${qs}`, data);
}

async function updateAgent(agentId, companyId, data) {
  const body = normalizeAgentPayload(data);
  return request('PUT', `/admin/agents/${encodeURIComponent(agentId)}?company_id=${encodeURIComponent(companyId)}`, body);
}

async function reconcileCompanyAgent(agentId, companyId) {
  return request('POST', `/admin/agents/${encodeURIComponent(agentId)}/reconcile?company_id=${encodeURIComponent(companyId)}`);
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

async function getTemplateCompanies(slug) {
  return request('GET', `/admin/agent-templates/${encodeURIComponent(slug)}/companies`);
}

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

async function getChannelReply(companyId) {
  return request('GET', `/admin/settings/channel-reply?company_id=${encodeURIComponent(companyId)}`);
}

async function updateChannelReply(companyId, channels) {
  return request('PUT', `/admin/settings/channel-reply?company_id=${encodeURIComponent(companyId)}`, { channels });
}

async function getAgentPause(companyId) {
  return request('GET', `/admin/settings/pause?company_id=${encodeURIComponent(companyId)}`);
}

async function updateAgentPause(companyId, paused, reason) {
  return request('PUT', `/admin/settings/pause?company_id=${encodeURIComponent(companyId)}`, { paused, reason });
}

async function listWhatsappAIIgnoreList(companyId) {
  return request('GET', `/admin/whatsapp-ai-ignore-list?company_id=${encodeURIComponent(companyId)}`);
}

async function getWhatsappAIIgnoreStats(companyId) {
  return request('GET', `/admin/whatsapp-ai-ignore-list/stats?company_id=${encodeURIComponent(companyId)}`);
}

async function addWhatsappAIIgnoreEntry(companyId, phoneNumber, label, notes, addedByUserId) {
  return request('POST', '/admin/whatsapp-ai-ignore-list', {
    companyId,
    phoneNumber,
    label: label || null,
    notes: notes || null,
    addedByUserId: addedByUserId || null,
  });
}

async function bulkAddWhatsappAIIgnoreEntries(companyId, items, addedByUserId) {
  return request('POST', '/admin/whatsapp-ai-ignore-list/bulk', {
    companyId,
    items,
    addedByUserId: addedByUserId || null,
  });
}

async function updateWhatsappAIIgnoreEntry(companyId, entryId, patch) {
  return request('PATCH', `/admin/whatsapp-ai-ignore-list/${encodeURIComponent(entryId)}?company_id=${encodeURIComponent(companyId)}`, patch);
}

async function deleteWhatsappAIIgnoreEntry(companyId, entryId) {
  return request('DELETE', `/admin/whatsapp-ai-ignore-list/${encodeURIComponent(entryId)}?company_id=${encodeURIComponent(companyId)}`);
}

async function getGlobalFilterSettings(companyId) {
  return request('GET', `/admin/settings/filters?company_id=${encodeURIComponent(companyId)}`);
}

async function updateGlobalFilterSettings(companyId, data) {
  return request('PUT', `/admin/settings/filters?company_id=${encodeURIComponent(companyId)}`, data);
}

async function visualSearch({ company_id, query, image_base64, mime_type, top_k, min_score }) {
  return request('POST', '/admin/search/visual', {
    company_id,
    query: query || '',
    image_base64: image_base64 || null,
    mime_type: mime_type || 'image/jpeg',
    top_k: top_k || 5,
    min_score: min_score != null ? min_score : 0.30,
  });
}

async function playgroundChat({ provider, model, prompt, systemPrompt, temperature, maxTokens }) {
  return request('POST', '/admin/playground/chat', {
    provider,
    model: model || undefined,
    prompt,
    systemPrompt: systemPrompt || undefined,
    temperature: temperature != null ? temperature : undefined,
    maxTokens: maxTokens || undefined,
  });
}

async function getSelfReviewStats({ days, agent_id, status }) {
  const params = { days: days || 7 };
  if (agent_id) params.agent_id = agent_id;
  if (status) params.status = status;
  const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return request('GET', `/admin/self-review/stats?${qs}`);
}

async function listSelfReviewLogs({ days, page, limit, agent_id, status }) {
  const params = { days: days || 7, page: page || 1, limit: limit || 20 };
  if (agent_id) params.agent_id = agent_id;
  if (status) params.status = status;
  const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return request('GET', `/admin/self-review/logs?${qs}`);
}

async function exportSelfReviewCsv({ days, agent_id, status }) {
  const params = { days: days || 7 };
  if (agent_id) params.agent_id = agent_id;
  if (status) params.status = status;
  const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return request('GET', `/admin/self-review/logs/export?${qs}`);
}

async function updateReviewModel(agentId, modelName) {
  return request('PATCH', `/admin/self-review/agents/${encodeURIComponent(agentId)}/review-model`, { model: modelName });
}

async function getSelfReviewSettings() {
  return request('GET', '/admin/self-review/settings');
}

async function updateSelfReviewSettings(data) {
  return request('PATCH', '/admin/self-review/settings', data);
}

async function notifyOrderCreated(data) {
  return request('POST', '/admin/orders/created', data);
}

module.exports = {
  listTools,
  listSkills,
  updateToolMeta,
  listAgentTemplates,
  getTemplateCompanies,
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
  deleteAgentPermanently,
  getAgentFiles,
  saveAgentFiles,
  updateAgent,
  reconcileCompanyAgent,
  getProductEmbeddingStatus,
  triggerProductEmbeddingSync,
  getKnowledgeEmbeddingStatus,
  triggerKnowledgeEmbeddingSync,
  embedKnowledgeItem,
  deleteKnowledgeEmbeddingItem,
  playgroundChat,
  getGuardrails,
  updateGuardrails,
  getAutoReply,
  updateAutoReply,
  getChannelReply,
  updateChannelReply,
  getAgentPause,
  listWhatsappAIIgnoreList,
  getWhatsappAIIgnoreStats,
  addWhatsappAIIgnoreEntry,
  bulkAddWhatsappAIIgnoreEntries,
  updateWhatsappAIIgnoreEntry,
  deleteWhatsappAIIgnoreEntry,
  updateAgentPause,
  visualSearch,
  getGlobalFilterSettings,
  updateGlobalFilterSettings,
  getSelfReviewStats,
  listSelfReviewLogs,
  exportSelfReviewCsv,
  updateReviewModel,
  getSelfReviewSettings,
  updateSelfReviewSettings,
  notifyOrderCreated,
};
