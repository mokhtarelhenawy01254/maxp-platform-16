/**
 * @module aiAgentChatController
 * @description REST controller for merchant ↔ CEOAgent chat.
 * Routes: POST /message, GET /history, DELETE /history, GET /sessions, POST /sessions, DELETE /sessions/:id, GET /status
 */

const aiSdkClient = require('../services/aiSdkClient');
const aiSessionService = require('../services/aiSessionService');
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
    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { message, sessionId, agentId, agentSlug, memoryContext, memory_context, executiveContext } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    let result = null;
    const targetAgentId = agentId || agentSlug || 'store-manager-agent';
    const combinedMemoryContext = {
      ...(memoryContext || {}),
      ...(memory_context || {}),
      ...(executiveContext ? { executiveContext } : {}),
    };

    if (targetAgentId && targetAgentId !== 'CEO' && targetAgentId !== 'ceo-agent') {
      try {
        const aiServiceAdminClient = require('../services/aiServiceAdminClient');
        const agentChatResult = await aiServiceAdminClient.chatWithAgent({
          companyId,
          agentId: targetAgentId,
          message,
          threadId: sessionId,
          memoryContext: combinedMemoryContext,
        });

        if (agentChatResult && (agentChatResult.reply || agentChatResult.tool_calls || agentChatResult.status === 'ok')) {
          result = {
            reply: agentChatResult.reply || 'تم استلام الرد بنجاح.',
            toolCalls: agentChatResult.tool_calls || [],
            threadId: agentChatResult.thread_id || sessionId,
            agentInfo: {
              id: targetAgentId,
              status: agentChatResult.status,
            },
            modelSelection: agentChatResult.model ? { model: agentChatResult.model } : null,
            session: { id: agentChatResult.thread_id || sessionId },
          };
        }
      } catch (agentErr) {
        console.warn('[AI-CHAT-CTRL] chatWithAgent fallback to default chat:', agentErr.message);
      }
    }

    if (!result) {
      const fallbackResult = await aiSdkClient.sendChatMessage({
        companyId,
        customerId: userId,
        message,
        threadId: sessionId,
        memoryContext: combinedMemoryContext,
      });
      result = {
        reply: fallbackResult.reply,
        toolCalls: fallbackResult.toolCalls || fallbackResult.tool_calls || [],
        agentInfo: fallbackResult.agentInfo || null,
        modelSelection: fallbackResult.modelSelection || null,
        conversationId: fallbackResult.conversationId || fallbackResult.threadId,
        session: fallbackResult.session || { id: fallbackResult.threadId },
      };
    }

    // Automatically capture tool execution failures into the persistent observability ledger
    if (Array.isArray(result?.toolCalls)) {
      for (const tc of result.toolCalls) {
        if (tc.status === 'failed' || tc.error || tc.output?.error || tc.output?.success === false) {
          try {
            const { recordToolIncident } = require('./superAdminAiIncidentsController');
            recordToolIncident({
              companyId,
              conversationId: result.conversationId || result.threadId || sessionId,
              customerId: userId,
              errorType: 'TOOL_EXECUTION_FAILURE',
              errorMessage: tc.error || tc.output?.error || tc.output?.message || 'فشل استدعاء الأداة من قِبل الوكيل',
              toolName: tc.name,
              toolArguments: tc.arguments,
              agentId: targetAgentId,
              model: result.modelSelection?.model || 'DeepSeek-V3',
              userMessage: message,
            }).catch(() => {});
          } catch (_) {}
        }
      }
    }

    return res.json({
      success: true,
      reply: result.reply,
      toolCalls: result.toolCalls || [],
      agentInfo: result.agentInfo || null,
      modelSelection: result.modelSelection || null,
      conversationId: result.conversationId || result.threadId,
      session: result.session || { id: result.threadId },
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] sendMessage error:', error.message);

    // Record runtime error in the observability ledger
    try {
      const { recordToolIncident } = require('./superAdminAiIncidentsController');
      recordToolIncident({
        companyId: req.user?.companyId,
        conversationId: req.body?.sessionId,
        customerId: req.user?.id,
        errorType: error.code || 'AGENT_RUNTIME_FAILURE',
        errorMessage: error.message,
        agentId: req.body?.agentId || req.body?.agentSlug || 'store-manager-agent',
        userMessage: req.body?.message,
        stack: error.stack,
      }).catch(() => {});
    } catch (_) {}

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
 * GET /api/v1/ai/chat/rag-knowledge-faqs
 * Returns FAQ list with embedding status.
 */
async function getRagKnowledgeFaqs(req, res) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const items = await RagKnowledgeMaintenanceService.getFaqList(companyId, {
      limit: req.query?.limit,
    });

    return res.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] getRagKnowledgeFaqs error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * GET /api/v1/ai/chat/rag-knowledge-policies
 * Returns Policy list with embedding status.
 */
async function getRagKnowledgePolicies(req, res) {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const items = await RagKnowledgeMaintenanceService.getPolicyList(companyId, {
      limit: req.query?.limit,
    });

    return res.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] getRagKnowledgePolicies error:', error.message);
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
 * GET /api/v1/ai/chat/rag-knowledge-products
 * Query: { limit?: number, offset?: number }
 */
async function getRagKnowledgeProducts(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await RagKnowledgeMaintenanceService.getProductEmbeddingOverview(companyId, {
      limit: req.query?.limit,
      offset: req.query?.offset,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] getRagKnowledgeProducts error:', error.message);
    return res.status(500).json({
      success: false,
      error: `[INTERNAL_ERROR] ${error.message}`,
    });
  }
}

/**
 * POST /api/v1/ai/chat/rag-knowledge-products-backfill
 * Body: { productId?: string, limit?: number, force?: boolean }
 */
async function backfillRagKnowledgeProducts(req, res) {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const result = await RagKnowledgeMaintenanceService.backfillProductEmbeddings(companyId, {
      productId: req.body?.productId,
      limit: req.body?.limit,
      force: req.body?.force,
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] backfillRagKnowledgeProducts error:', error.message);
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

    const history = await aiSessionService.getHistory(companyId, userId, req.query?.sessionId, req.user);
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

    const result = await aiSessionService.clearHistory(companyId, userId, req.query?.sessionId || req.body?.sessionId);
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

    let sessions = await aiSessionService.listSessions(companyId, userId);
    if (!sessions.length) {
      const session = await aiSessionService.createSession(companyId, userId, req.user);
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

    const session = await aiSessionService.createSession(companyId, userId, req.user, {
      title: req.body?.title,
    });
    const history = await aiSessionService.getHistory(companyId, userId, session.id, req.user);
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

    const result = await aiSessionService.clearHistory(companyId, userId, req.params.sessionId);
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

    const status = await aiSessionService.getAgentStatus(companyId);
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
  getRagKnowledgeFaqs,
  getRagKnowledgePolicies,
  getRagKnowledgeOverview,
  backfillRagKnowledgeEmbeddings,
  getRagKnowledgeProducts,
  backfillRagKnowledgeProducts,
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
