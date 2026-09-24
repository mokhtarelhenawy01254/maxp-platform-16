const https = require('https');
const http = require('http');

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

function normalizeDreamerConsolidationType(consolidationType) {
  const normalized = String(consolidationType || 'facts').trim().toLowerCase();
  if (['fact_extraction', 'fact-extraction', 'facts_extraction'].includes(normalized)) {
    return 'facts';
  }
  return normalized;
}

function normalizeDreamerFact(fact) {
  if (typeof fact === 'string') {
    return {
      type: 'FACT',
      content: fact,
      confidence: 0.8,
      metadata: { source: 'AI_DREAMER' },
    };
  }

  if (!fact || typeof fact !== 'object') return null;

  const content = fact.content || fact.statement || fact.fact || fact.value;
  if (!content) return null;

  return {
    type: fact.type || 'FACT',
    content: String(content),
    confidence: typeof fact.confidence === 'number' ? fact.confidence : 0.8,
    metadata: fact.metadata || { source: 'AI_DREAMER' },
  };
}

function normalizeDreamerResponse(payload = {}, conversations = []) {
  if (!payload || typeof payload !== 'object') return payload;
  if (Array.isArray(payload.results)) return payload;

  const rows = Array.isArray(payload.result?.conversations)
    ? payload.result.conversations
    : [];

  return {
    ...payload,
    results: rows.map((row = {}, index) => {
      const entities = Array.isArray(row.entities) ? row.entities : [];
      const keyTopics = row.keyTopics || row.key_points || entities
        .map(entity => entity?.name || entity?.value)
        .filter(Boolean);

      return {
        conversation_id: row.conversation_id
          || row.conversationId
          || conversations[index]?.conversation_id
          || conversations[index]?.conversationId
          || null,
        facts: (Array.isArray(row.facts) ? row.facts : [])
          .map(normalizeDreamerFact)
          .filter(Boolean),
        summary: row.summary || '',
        keyTopics,
        sentiment: row.sentiment || 'NEUTRAL',
        actions: Array.isArray(row.actions) ? row.actions : [],
        entities,
      };
    }),
  };
}

/**
 * Send a chat message - uses external AI service.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.customerId
 * @param {string} params.message
 * @param {string} [params.threadId]
 * @param {string} [params.channel="chat"] - Chat channel (e.g. FACEBOOK, INSTAGRAM, WHATSAPP)
 * @param {string|null} [params.agentId=null] - Optional specific agent ID to handle the conversation
 * @param {Object|null} [params.memoryContext=null] - Serialized working memory from Redis
 * @returns {Promise<{status: string, threadId: string, reply: string|null, draftId: string|null}>}
 */
async function sendChatMessage({ companyId, customerId, message, threadId, channel = "chat", agentId = null, memoryContext = null, attachments = null }) {
  const { enrichMemoryContextWithPostProduct } = require('../utils/postProductMappingHelper');
  const enrichedContext = await enrichMemoryContextWithPostProduct(companyId, threadId, memoryContext);

  const url = new URL('/chat', getAiServiceUrl());
  const body = JSON.stringify({
    message,
    thread_id: threadId || null,
    channel,
    agent_id: agentId || null,
    memory_context: enrichedContext,
    attachments
  });
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

/**
 * List pending approval drafts from Python AI service.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} [params.status="pending"]
 * @returns {Promise<{approvals: Array, count: number}>}
 */
async function listApprovals({ companyId, status = "pending" }) {
  const url = new URL(`/approvals?status=${encodeURIComponent(status)}`, getAiServiceUrl());
  const token = getAiServiceToken();

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Company-Id': companyId,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI service approvals error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return { approvals: data.approvals || [], count: data.count || 0 };
}

/**
 * Consolidate dreamer memories via Python ai-service.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {Array} params.conversations - Array of { conversation_id, messages: [{ content, is_from_customer }] }
 * @param {string} [params.consolidationType="facts"]
 * @returns {Promise<{results: Array}>}
 */
async function consolidateDreamer({ companyId, conversations, consolidationType }) {
  const url = new URL('/admin/dreamer/consolidate', getAiServiceUrl());
  const body = JSON.stringify({
    company_id: companyId,
    conversations,
    consolidation_type: normalizeDreamerConsolidationType(consolidationType),
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
    throw new Error(`Dreamer service error ${response.status}: ${text}`);
  }
  return normalizeDreamerResponse(await response.json(), conversations);
}

/**
 * List knowledge questions from Python AI service.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} [params.status="pending"]
 * @returns {Promise<{questions: Array, count: number}>}
 */
async function listKnowledgeQuestions({ companyId, status = "pending" }) {
  const url = new URL(`/knowledge-questions?status=${encodeURIComponent(status)}`, getAiServiceUrl());
  const token = getAiServiceToken();
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Company-Id': companyId,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI service knowledge-questions error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return { questions: data.questions || [], count: data.count || 0 };
}

/**
 * Count pending knowledge questions.
 * @param {Object} params
 * @param {string} params.companyId
 * @returns {Promise<{count: number}>}
 */
async function countPendingKnowledgeQuestions({ companyId }) {
  const url = new URL('/knowledge-questions/count', getAiServiceUrl());
  const token = getAiServiceToken();
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Company-Id': companyId,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI service knowledge-questions count error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return { count: data.count || 0 };
}

/**
 * Answer a knowledge question.
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.questionId
 * @param {string} params.answer
 * @returns {Promise<Object>}
 */
async function answerKnowledgeQuestion({ companyId, questionId, answer }) {
  const url = new URL(`/knowledge-questions/${encodeURIComponent(questionId)}/answer`, getAiServiceUrl());
  const token = getAiServiceToken();
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Company-Id': companyId,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ answer }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI service answer knowledge-question error ${response.status}: ${text}`);
  }
  return await response.json();
}

/**
 * Train the agent from free-form merchant text (auto-extraction to knowledge).
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.text
 * @param {string|null} [params.topic]
 * @returns {Promise<Object>}
 */
async function trainKnowledge({ companyId, text, topic }) {
  const url = new URL('/knowledge-questions/train', getAiServiceUrl());
  const token = getAiServiceToken();
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Company-Id': companyId,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ text, topic }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI service train knowledge error ${response.status}: ${body}`);
  }
  return await response.json();
}

module.exports = {
  sendChatMessage,
  resumeWorkflow,
  healthCheck,
  listApprovals,
  listKnowledgeQuestions,
  countPendingKnowledgeQuestions,
  answerKnowledgeQuestion,
  trainKnowledge,
  consolidateDreamer,
  normalizeAiServiceResponse,
};
