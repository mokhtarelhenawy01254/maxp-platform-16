const https = require('https');
const http = require('http');
const { isAiServiceEnabled } = require('../legacy-ai-agent/aiAgent/aiServiceRouter');
const aiChatService = require('../legacy-ai-agent/aiAgent/aiChatService');

function getAiServiceUrl() {
  return process.env.AI_SERVICE_URL || 'http://localhost:8000';
}

function getAiServiceToken() {
  const token = process.env.AI_SERVICE_TOKEN || process.env.MAXP_SERVICE_TOKEN || '';
  if (!token) {
    throw new Error('AI_SERVICE_TOKEN is required to call maxp-ai-service');
  }
  return token;
}

function normalizeAiServiceResponse(payload = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  return {
    ...payload,
    threadId: payload.threadId || payload.thread_id || null,
    draftId: payload.draftId || payload.draft_id || null,
  };
}

/**
 * Send a chat message - uses external AI service if enabled, otherwise falls back to legacy AI agent.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.customerId
 * @param {string} params.message
 * @param {string} [params.threadId]
 * @returns {Promise<{status: string, threadId: string, reply: string|null, draftId: string|null}>}
 */
async function sendChatMessage({ companyId, customerId, message, threadId }) {
  if (isAiServiceEnabled(companyId)) {
    const url = new URL('/chat', getAiServiceUrl());
    const body = JSON.stringify({ message, thread_id: threadId || null });
    const token = getAiServiceToken();

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Company-Id': companyId,
        'X-Customer-Id': customerId,
        'Authorization': `Bearer ${token}`,
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI service error ${response.status}: ${text}`);
    }

    return normalizeAiServiceResponse(await response.json());
  }

  // Fallback to legacy AI agent (CEOAgent)
  const result = await aiChatService.sendMessage(companyId, customerId, message, {
    sessionId: threadId,
  });

  return normalizeAiServiceResponse({
    status: 'ok',
    threadId: result.conversationId,
    reply: result.reply,
    draftId: null,
    agentInfo: result.agentInfo,
    modelSelection: result.modelSelection,
  });
}

/**
 * Resume a paused workflow after merchant approval/rejection.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.threadId
 * @param {string} params.draftId
 * @param {boolean} params.approved
 * @param {string} [params.reason]
 * @param {string} [params.decidedBy]
 * @returns {Promise<{status: string, reply: string, threadId: string}>}
 */
async function resumeWorkflow({ companyId, threadId, draftId, approved, reason, decidedBy }) {
  const url = new URL('/resume', getAiServiceUrl());
  const body = JSON.stringify({
    thread_id: threadId,
    draft_id: draftId,
    approved,
    reason: reason || null,
    decided_by: decidedBy || null,
  });
  const token = getAiServiceToken();

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Company-Id': companyId,
      'Authorization': `Bearer ${token}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI service resume error ${response.status}: ${text}`);
  }

  return normalizeAiServiceResponse(await response.json());
}

/**
 * Check health of maxp-ai-service.
 */
async function healthCheck() {
  const url = new URL('/health', getAiServiceUrl());
  const response = await fetch(url.toString());
  return response.ok;
}

module.exports = {
  sendChatMessage,
  resumeWorkflow,
  healthCheck,
  normalizeAiServiceResponse,
};
