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
          resolve(res.statusCode < 400 ? (data ? JSON.parse(data) : {}) : null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
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
async function testProviderKey({ provider, apiKey, model, messages, prompt, timeoutMs }) {
  const body = { provider, api_key: apiKey };
  if (model) body.model = model;
  if (messages) body.messages = messages;
  if (prompt) body.prompt = prompt;
  if (timeoutMs) body.timeout_ms = timeoutMs;
  return request('POST', '/admin/test', body);
}

module.exports = {
  listTools,
  listAgents,
  chatWithAgent,
  evaluateSandboxResponse,
  updateGlobalConfig,
  setProviderPriority,
  createKey,
  deleteKey,
  setKeyStatus,
  testProviderKey,
};
