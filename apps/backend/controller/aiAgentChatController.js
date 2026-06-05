/**
 * @module aiAgentChatController
 * @description REST controller for merchant ↔ CEOAgent chat.
 * Routes: POST /message, GET /history, DELETE /history, GET /sessions, POST /sessions, DELETE /sessions/:id, GET /status
 */

const aiChatService = require('../legacy-ai-agent/aiAgent/aiChatService');
const CorrectiveRAGEngine = require('../services/rag/CorrectiveRAGEngine');
const RagKnowledgeProposalService = require('../services/rag/RagKnowledgeProposalService');
const RagKnowledgeMaintenanceService = require('../services/rag/RagKnowledgeMaintenanceService');
const RagKnowledgeEvaluationSchedulerService = require('../services/rag/RagKnowledgeEvaluationSchedulerService');

/**
 * POST /api/v1/ai/chat/message
 * Body: { message: string, sessionId?: string }
 */
async function sendMessage(req, res) {
  try {
    const companyId = req.user?.companyId || req.body?.companyId;
    const userId = req.user?.id || req.body?.userId;

    if (!(companyId && userId) && process.env.NODE_ENV !== 'development') {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { message, sessionId } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const result = await aiChatService.sendMessage(companyId, userId, message, {
      sessionId,
      user: req.user,
    });

    return res.json({
      success: true,
      reply: result.reply,
      agentInfo: result.agentInfo,
      modelSelection: result.modelSelection,
      conversationId: result.conversationId,
      session: result.session,
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] sendMessage error:', error.message);
    if (
      error.code === 'AI_AGENT_EMPTY_REPLY' ||
      error.code === 'AI_AGENT_LLM_UNAVAILABLE' ||
      error.code === 'AI_AGENT_TOOL_CALL_LEAK' ||
      error.code === 'AI_AGENT_UNGROUNDED_REPLY'
    ) {
      return res.status(422).json({
        success: false,
        code: error.code,
        error: error.publicMessage || error.message || 'الموديل لم يرجع رد صالح.',
        modelSelection: error.modelSelection || null,
      });
    }
    return res.status(500).json({ 
      success: false, 
      error: `[INTERNAL_ERROR] ${error.message}`,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
}

/**
 * POST /api/v1/ai/chat/rag-preview
 * Body: { message: string, sourceOrder?: string[], category?: string, persistTrace?: boolean }
 *
 * Deterministic knowledge-preview endpoint for admin/UAT flows. It exposes
 * retrieved evidence and grading without invoking the LLM or sending a reply.
 */
async function previewRag(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { message, sourceOrder, category, persistTrace } = req.body || {};
    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const result = await CorrectiveRAGEngine.query(companyId, message, {
      sourceOrder: Array.isArray(sourceOrder) ? sourceOrder : undefined,
      category: typeof category === 'string' && category.trim() ? category.trim() : undefined,
      persistTrace: persistTrace !== false,
    });

    return res.json({
      success: true,
      answer: result.answer,
      sources: result.sources,
      grading: result.grading,
      finalSource: result.finalSource,
      iterations: result.iterations,
      attempts: result.attempts || [],
      retrievalMode: result.retrievalMode,
      traceId: result.traceId || null,
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] previewRag error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * GET /api/v1/ai/chat/rag-failures
 *
 * Returns recent failed/guardrailed Agentic RAG queries for policy maintenance.
 */
async function listRagFailures(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const failures = await CorrectiveRAGEngine.getFailureQueue(companyId, {
      limit: req.query?.limit,
    });

    return res.json({
      success: true,
      failures,
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] listRagFailures error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * GET /api/v1/ai/chat/rag-knowledge-overview
 *
 * Returns tenant-scoped FAQ/Policy health, proposal counts, and recent RAG
 * failures so admins can maintain knowledge before customer-facing replies.
 */
async function getRagKnowledgeOverview(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const overview = await RagKnowledgeMaintenanceService.getOverview(companyId, {
      sampleLimit: req.query?.sampleLimit,
    });

    return res.json({
      success: true,
      overview,
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] getRagKnowledgeOverview error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * POST /api/v1/ai/chat/rag-knowledge-backfill
 * Body: { target?: "all"|"faq"|"policy", limit?: number, force?: boolean }
 */
async function backfillRagKnowledgeEmbeddings(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await RagKnowledgeMaintenanceService.backfillEmbeddings(companyId, {
      target: req.body?.target,
      limit: req.body?.limit,
      force: req.body?.force,
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] backfillRagKnowledgeEmbeddings error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * POST /api/v1/ai/chat/rag-knowledge-evaluate
 * Body: { scenarios?: Array, sourceOrder?: string[], category?: string }
 */
async function runRagKnowledgeEvaluation(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const report = await RagKnowledgeMaintenanceService.runEvaluation(companyId, {
      scenarios: req.body?.scenarios,
      sourceOrder: req.body?.sourceOrder,
      category: req.body?.category,
    });

    return res.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] runRagKnowledgeEvaluation error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * POST /api/v1/ai/chat/rag-knowledge-evaluate/run-now
 *
 * Runs and persists the tenant-scoped Agentic RAG evaluation so the admin lab
 * and background scheduler share one auditable health trail.
 */
async function runPersistedRagKnowledgeEvaluation(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await RagKnowledgeEvaluationSchedulerService.runForCompany(companyId, {
      trigger: 'manual',
      alertOnFailure: req.body?.alertOnFailure !== false,
    });

    if (result.error) {
      return res.status(500).json({
        success: false,
        error: result.error.message || 'RAG evaluation failed',
        result,
      });
    }

    return res.json({
      success: true,
      report: result.report,
      log: result.log || null,
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] runPersistedRagKnowledgeEvaluation error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * POST /api/v1/ai/chat/rag-knowledge-proposals
 *
 * Creates a human-review proposal from a failed RAG trace. This does not write
 * FAQ/Policy knowledge until a reviewer explicitly approves the edited draft.
 */
async function createRagKnowledgeProposal(req, res) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { failureTraceId, targetType, question, answer, title, content, category } = req.body || {};
    if (!failureTraceId) {
      return res.status(400).json({ success: false, error: 'failureTraceId is required' });
    }

    const result = await RagKnowledgeProposalService.createProposal(companyId, failureTraceId, {
      targetType,
      question,
      answer,
      title,
      content,
      category,
    }, { userId });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(result.deduplicated ? 200 : 201).json(result);
  } catch (error) {
    console.error('[AI-CHAT-CTRL] createRagKnowledgeProposal error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * GET /api/v1/ai/chat/rag-knowledge-proposals
 */
async function listRagKnowledgeProposals(req, res) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const proposals = await RagKnowledgeProposalService.listProposals(companyId, {
      status: req.query?.status || 'PENDING',
      limit: req.query?.limit,
    });

    return res.json({ success: true, proposals });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] listRagKnowledgeProposals error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * POST /api/v1/ai/chat/rag-knowledge-proposals/:id/approve
 */
async function approveRagKnowledgeProposal(req, res) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await RagKnowledgeProposalService.approveProposal(companyId, req.params.id, {
      edits: req.body?.edits || {},
    }, { userId });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('[AI-CHAT-CTRL] approveRagKnowledgeProposal error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * POST /api/v1/ai/chat/rag-knowledge-proposals/:id/reject
 */
async function rejectRagKnowledgeProposal(req, res) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await RagKnowledgeProposalService.rejectProposal(
      companyId,
      req.params.id,
      req.body?.reason || '',
      { userId },
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('[AI-CHAT-CTRL] rejectRagKnowledgeProposal error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * GET /api/v1/ai/chat/history
 */
async function getHistory(req, res) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const history = await aiChatService.getHistory(companyId, userId, req.query?.sessionId, req.user);
    return res.json({ success: true, ...history });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] getHistory error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get history' });
  }
}

/**
 * DELETE /api/v1/ai/chat/history
 */
async function clearHistory(req, res) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await aiChatService.clearHistory(companyId, userId, req.query?.sessionId || req.body?.sessionId);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] clearHistory error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to clear history' });
  }
}

async function listSessions(req, res) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    let sessions = await aiChatService.listSessions(companyId, userId);
    if (!sessions.length) {
      const session = await aiChatService.createSession(companyId, userId, req.user);
      sessions = [session];
    }
    return res.json({ success: true, sessions });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] listSessions error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to list sessions' });
  }
}

async function createSession(req, res) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const session = await aiChatService.createSession(companyId, userId, req.user, {
      title: req.body?.title,
    });
    const history = await aiChatService.getHistory(companyId, userId, session.id, req.user);
    return res.status(201).json({ success: true, session, messages: history.messages });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] createSession error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to create session' });
  }
}

async function deleteSession(req, res) {
  try {
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await aiChatService.clearHistory(companyId, userId, req.params.sessionId);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] deleteSession error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to delete session' });
  }
}

/**
 * GET /api/v1/ai/chat/status
 */
async function getStatus(req, res) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const status = await aiChatService.getAgentStatus(companyId);
    return res.json({ success: true, agent: status });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] getStatus error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get status' });
  }
}

module.exports = {
  sendMessage,
  previewRag,
  listRagFailures,
  getRagKnowledgeOverview,
  backfillRagKnowledgeEmbeddings,
  runRagKnowledgeEvaluation,
  runPersistedRagKnowledgeEvaluation,
  createRagKnowledgeProposal,
  listRagKnowledgeProposals,
  approveRagKnowledgeProposal,
  rejectRagKnowledgeProposal,
  getHistory,
  clearHistory,
  listSessions,
  createSession,
  deleteSession,
  getStatus,
};
