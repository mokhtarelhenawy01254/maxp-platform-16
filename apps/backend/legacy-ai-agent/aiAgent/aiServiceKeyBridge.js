/**
 * @module aiServiceKeyBridge
 * @description Dual-write bridge from MaxP backend to maxp-ai-service admin API.
 *
 * All methods are best-effort: they never throw and never block the user request
 * for more than 5 seconds. Failures are logged so the operator can reconcile.
 *
 * Set the following env vars on the MaxP backend:
 *   AI_SERVICE_URL       e.g. https://ai.maxp.online
 *   AI_SERVICE_TOKEN     same value as maxp-ai-service MAXP_SERVICE_TOKEN
 *   AI_SERVICE_TIMEOUT   optional, default 5000ms
 *
 * To disable dual-write (e.g. during incident), set AI_SERVICE_ENABLED=false.
 */

const axios = require('axios');

const DEFAULT_TIMEOUT = 5000;

function getConfig() {
  return {
    baseUrl: (process.env.AI_SERVICE_URL || '').replace(/\/+$/, ''),
    token: process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || '',
    timeout: Number.parseInt(process.env.AI_SERVICE_TIMEOUT, 10) || DEFAULT_TIMEOUT,
    enabled: process.env.AI_SERVICE_ENABLED !== 'false',
  };
}

function disabledResponse(reason) {
  return { skipped: true, reason };
}

async function request(method, path, body, options = {}) {
  const cfg = getConfig();
  if (!cfg.enabled) return disabledResponse('AI_SERVICE_ENABLED=false');
  if (!cfg.baseUrl) return disabledResponse('AI_SERVICE_URL not set');
  if (!cfg.token) return disabledResponse('AI_SERVICE_TOKEN not set');

  const url = `${cfg.baseUrl}${path}`;
  try {
    const response = await axios.request({
      method,
      url,
      data: body,
      timeout: options.timeout || cfg.timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.token}`,
      },
      validateStatus: () => true,
    });
    if (response.status >= 200 && response.status < 300) {
      return { ok: true, status: response.status, data: response.data };
    }
    const detail =
      typeof response.data === 'object' && response.data !== null
        ? JSON.stringify(response.data)
        : String(response.data || '').slice(0, 300);
    console.warn(
      `[ai-bridge] ${method} ${path} -> ${response.status} ${detail}`
    );
    return { ok: false, status: response.status, data: response.data };
  } catch (error) {
    console.warn(`[ai-bridge] ${method} ${path} failed: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

function toBridgeKey(prismaKey) {
  return {
    id: prismaKey.id,
    name: prismaKey.name,
    provider: prismaKey.provider,
    api_key: prismaKey.apiKey,
    base_url: prismaKey.baseUrl || undefined,
    key_type: prismaKey.keyType === 'COMPANY' ? 'COMPANY' : 'CENTRAL',
    company_id: prismaKey.companyId || undefined,
    max_requests_per_day: prismaKey.maxRequestsPerDay || 1500,
    priority: prismaKey.priority || 1,
    is_active: prismaKey.isActive !== false,
  };
}

exports.health = async function health() {
  return request('GET', '/admin/providers');
};

exports.listProviders = async function listProviders() {
  return request('GET', '/admin/providers');
};

exports.listKeys = async function listKeys(params = {}) {
  const qs = new URLSearchParams();
  if (params.provider) qs.set('provider', params.provider);
  if (params.company_id) qs.set('company_id', params.company_id);
  if (params.is_active !== undefined) qs.set('is_active', String(params.is_active));
  if (params.limit) qs.set('limit', String(params.limit));
  const tail = qs.toString() ? `?${qs.toString()}` : '';
  return request('GET', `/admin/keys${tail}`);
};

exports.createKey = async function createKey(prismaKey) {
  return request('POST', '/admin/keys', toBridgeKey(prismaKey));
};

exports.updateKey = async function updateKey(id, patch) {
  return request('PATCH', `/admin/keys/${id}`, patch);
};

exports.deleteKey = async function deleteKey(id) {
  return request('DELETE', `/admin/keys/${id}`);
};

exports.setKeyStatus = async function setKeyStatus(id, isActive) {
  return request('PATCH', `/admin/keys/${id}/status`, { is_active: isActive });
};

exports.testKey = async function testKey(id) {
  return request('POST', `/admin/keys/${id}/test`);
};

exports.setProviderPriority = async function setProviderPriority(providers) {
  return request('POST', '/admin/provider-priority', { providers });
};

exports.getGlobalConfig = async function getGlobalConfig() {
  return request('GET', '/admin/config');
};

exports.updateGlobalConfig = async function updateGlobalConfig(patch) {
  return request('PATCH', '/admin/config', patch);
};

exports.getDashboard = async function getDashboard() {
  return request('GET', '/admin/dashboard');
};

exports.listLogs = async function listLogs(params = {}) {
  const qs = new URLSearchParams();
  if (params.provider) qs.set('provider', params.provider);
  if (params.status) qs.set('status', params.status);
  if (params.limit) qs.set('limit', String(params.limit));
  const tail = qs.toString() ? `?${qs.toString()}` : '';
  return request('GET', `/admin/logs${tail}`);
};

exports.isConfigured = function isConfigured() {
  const cfg = getConfig();
  return cfg.enabled && Boolean(cfg.baseUrl) && Boolean(cfg.token);
};

// ─── Agent Operations ──────────────────────────────────────────────

exports.listAgents = async function listAgents(companyId) {
  return request('GET', `/admin/agents?company_id=${encodeURIComponent(companyId)}`);
};

exports.chatWithAgent = async function chatWithAgent({
  companyId,
  agentId,
  message,
  threadId,
  conversationId,
  customerId,
  channel,
  agentConfig,
  memoryContext,
}) {
  return request(
    'POST',
    '/admin/agents/chat',
    {
      company_id: companyId,
      agent_id: agentId,
      message,
      thread_id: threadId,
      conversation_id: conversationId,
      customer_id: customerId,
      channel,
      agent_config: agentConfig,
      memory_context: memoryContext,
    },
    { timeout: 60000 }
  );
};
