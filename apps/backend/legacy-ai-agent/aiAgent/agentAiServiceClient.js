/**
 * HTTP client for agent management operations on the ai-service.
 * Used when AI_SERVICE_MODE=primary.
 */

function getAiServiceUrl() {
  return process.env.AI_SERVICE_URL || 'http://localhost:8000';
}

function getAiServiceToken() {
  const token = process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || '';
  if (!token) return null;
  return token;
}

function isAiServicePrimary() {
  return String(process.env.AI_SERVICE_MODE || '').trim().toLowerCase() === 'primary';
}

async function _fetch(path, options = {}) {
  const url = `${getAiServiceUrl()}${path}`;
  const token = getAiServiceToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI service error ${response.status} on ${options.method || 'GET'} ${path}: ${text}`);
  }

  return response.json();
}

async function spawnAgent(companyId, data) {
  return _fetch('/admin/agents/spawn', {
    method: 'POST',
    body: { company_id: companyId, ...data },
  });
}

async function getAgent(agentId) {
  return _fetch(`/admin/agents/${agentId}`);
}

async function listAgents(companyId, options = {}) {
  const params = new URLSearchParams({ company_id: companyId });
  if (options.status) params.set('status', options.status);
  if (options.role) params.set('role', options.role);
  return _fetch(`/admin/agents?${params.toString()}`);
}

async function updateAgent(agentId, data) {
  return _fetch(`/admin/agents/${agentId}`, {
    method: 'PUT',
    body: data,
  });
}

async function archiveAgent(agentId) {
  return _fetch(`/admin/agents/${agentId}`, { method: 'DELETE' });
}

async function reconcileAgent(agentId) {
  return _fetch(`/admin/agents/${agentId}/reconcile`, { method: 'POST' });
}

async function listTemplates() {
  return _fetch('/admin/templates');
}

async function getTemplate(slug) {
  return _fetch(`/admin/templates/${slug}`);
}

/**
 * Delegate embedding generation to the Python AI service.
 * @param {string|null} text - The text to embed
 * @param {number} [dimension=768] - The embedding dimension
 * @param {string|null} [imageBytes=null] - Base64 encoded image bytes
 * @param {string|null} [mimeType=null] - MIME type of the image
 * @returns {Promise<number[]>} The embedding vector
 */
async function generateEmbedding(text, dimension = 768, imageBytes = null, mimeType = null) {
  const result = await _fetch('/admin/embeddings/generate', {
    method: 'POST',
    body: { text, dimension, image_bytes: imageBytes, mime_type: mimeType },
  });
  return result.embedding;
}

module.exports = {
  isAiServicePrimary,
  spawnAgent,
  getAgent,
  listAgents,
  updateAgent,
  archiveAgent,
  reconcileAgent,
  listTemplates,
  getTemplate,
  generateEmbedding,
};

