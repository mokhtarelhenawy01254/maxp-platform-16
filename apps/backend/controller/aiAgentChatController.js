/**
 * @module aiAgentChatController
 * @description REST controller for merchant ↔ CEOAgent chat.
 * Routes: POST /message, GET /history, DELETE /history, GET /sessions, POST /sessions, DELETE /sessions/:id, GET /status
 */

const crypto = require('crypto');
const aiSdkClient = require('../services/aiSdkClient');
const aiSessionService = require('../services/aiSessionService');
const agentStudioSessionService = require('../services/agentStudioSessionService');
const CorrectiveRAGEngine = require('../services/rag/CorrectiveRAGEngine');
const RagKnowledgeProposalService = require('../services/rag/RagKnowledgeProposalService');
const RagKnowledgeMaintenanceService = require('../services/rag/RagKnowledgeMaintenanceService');
const RagKnowledgeEvaluationSchedulerService = require('../services/rag/RagKnowledgeEvaluationSchedulerService');
const { resolveDefaultCopilotAgent } = require('../utils/resolveDefaultCopilotAgent');

function resolveCompanyId(req) {
  const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'superadmin';
  return (isSuperAdmin && (req.query?.companyId || req.body?.companyId)) || req.user?.companyId;
}

/**
 * Deterministic offline response resolver for shipping-agent when AI service is off (T26 §4.5)
 */
async function resolveShippingAgentOfflineAnswer(companyId, messageText) {
  try {
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();

    const cleanMsg = String(messageText || '').replace(/[؟?!.,:;()\[\]]/g, ' ');
    const tokens = cleanMsg.split(/\s+/).filter(Boolean);
    const ignoreWords = new Set([
      'الأوردر', 'اوردر', 'الاوردر', 'أوردراتي', 'طلبي', 'الطلب', 'شحنتي', 'الشحنة',
      'بتاعي', 'بتاعتي', 'فين', 'رقمه', 'رقم', 'كود', 'تتبع', 'حالة', 'عايز', 'اعرف',
      'مساء', 'صباح', 'الخير', 'السلام', 'عليكم', 'order', 'shipment', 'where', 'is', 'my',
      'يا', 'باشا', 'لو', 'سمحت', 'ممكن', 'شغال', 'معانا', 'هو', 'هي', 'ده', 'دي'
    ]);

    let candidateCode = null;
    for (const t of tokens) {
      const cleanToken = t.replace(/[#]/g, '').trim();
      if (cleanToken && !ignoreWords.has(cleanToken) && cleanToken.length >= 2) {
        if (/^[A-Za-z0-9\-_]+$/.test(cleanToken)) {
          candidateCode = cleanToken;
          break;
        }
      }
    }

    if (!candidateCode) {
      return 'أهلاً بك! أنا مروان منسق الشحن والعمليات اللوجستية. يرجى تزويدي برقم الأوردر أو رقم بوليصة الشحن لمتابعة حالته وتحديد موعد التسليم بدقة.';
    }

    // Try finding order in company scope
    const order = await prisma.order.findFirst({
      where: {
        companyId,
        OR: [
          { orderNumber: candidateCode },
          { id: candidateCode },
          { turboTrackingNumber: candidateCode },
          { bostaTrackingNumber: candidateCode },
        ],
      },
      include: {
        shipments: {
          include: { shippingCompany: true },
        },
      },
    });

    if (order) {
      const shipment = order.shipments?.[0];
      const carrierName = shipment?.shippingCompany?.name || (order.turboTrackingNumber ? 'Turbo' : (order.bostaTrackingNumber ? 'Bosta' : 'شركة الشحن'));
      const trackingCode = shipment?.trackingNumber || shipment?.externalShipmentId || order.turboTrackingNumber || order.bostaTrackingNumber || 'غير متوفر';

      const statusTranslations = {
        'PENDING': 'قيد المعالجة والتجهيز',
        'PROCESSING': 'جاري تجهيز الشحنة بالمستودع',
        'CONFIRMED': 'مؤكد وفي انتظار الاستلام من شركة الشحن',
        'SHIPPED': 'تم تسليمها لشركة الشحن وفي طريقها للتوزيع',
        'OUT_FOR_DELIVERY': 'خرجت مع المندوب للتسليم اليوم',
        'DELIVERED': 'تم التسليم للعميل بنجاح',
        'CANCELLED': 'تم إلغاء الطلب',
        'RETURNED': 'مرتجع للمتجر',
      };
      const statusAr = statusTranslations[order.status] || order.status;

      return `طلبك رقم #${order.orderNumber} مسجل لدى ${carrierName}. حالة الشحنة الحالية: ${statusAr}. رقم التتبع: ${trackingCode}.`;
    }

    // Try finding shipment directly in company scope
    const directShipment = await prisma.shipment.findFirst({
      where: {
        companyId,
        OR: [
          { trackingNumber: candidateCode },
          { externalShipmentId: candidateCode },
        ],
      },
      include: { shippingCompany: true, order: true },
    });

    if (directShipment) {
      const carrierName = directShipment.shippingCompany?.name || 'شركة الشحن';
      return `شحنتك رقم ${candidateCode} مسجلة لدى ${carrierName}. الحالة الحالية: ${directShipment.status}.`;
    }

    return `لم يتم العثور على أوردر أو شحنة برقم '${candidateCode}' تابعة لمتجرك. يرجى مراجعة الرقم والتأكد منه.`;
  } catch (err) {
    console.warn('[AI-CHAT-CTRL] resolveShippingAgentOfflineAnswer error:', err.message);
    return null;
  }
}

/**
 * POST /api/v1/ai/chat/message
 * Body: { message: string, sessionId?: string }
 */
async function sendMessage(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { message, sessionId, agentId, agentSlug, memoryContext, memory_context, executiveContext } = req.body;
    const rawImages = req.body?.images || req.body?.attachments || [];
    const incomingImages = Array.isArray(rawImages) ? rawImages : (rawImages ? [rawImages] : []);
    const hasImages = incomingImages.length > 0;
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';

    if (!trimmedMessage && !hasImages) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    // Defensive encoding guard: reject garbled messages consisting purely of question marks from unencoded terminal curls
    const isGarbledMessage = /^[\s\?\.\,\!\؟\-\_]+$/.test(trimmedMessage);
    if (isGarbledMessage && !hasImages) {
      return res.status(400).json({
        success: false,
        error: 'الرسالة المستلمة غير قابلة للقراءة (رموز استفهام فقط ????). يرجى التأكد من إرسال النص بترميز UTF-8 سليم.',
      });
    }

    const effectiveMessage = trimmedMessage || 'يرجى مراجعة وفحص الصورة المرفقة والإفادة بالتحليل والإجراء المقترح.';

    const requestId = (req.headers && (req.headers['x-request-id'] || req.headers['X-Request-Id'])) || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const promptHash = crypto.createHash('sha256').update(effectiveMessage).digest('hex').slice(0, 12);
    const activeSessionId = (typeof sessionId === 'string' && sessionId.trim())
      ? sessionId.trim()
      : `copilot_sess_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // SOTA 2026: Strict slash-command rewind interceptor (prevents accidental data wipe from conversational words)
    const isRewindCommand = /^\s*\/(تراجع|undo|rewind)\s*$/i.test(effectiveMessage);
    if (isRewindCommand && sessionId) {
      const rewindRes = await aiSessionService.rewindSession(companyId, sessionId);
      return res.json({
        success: true,
        reply: rewindRes.message || 'تم التراجع عن آخر خطوة بنجاح واستعادة حالة المحادثة السابقة ↩️',
        rewind: true,
        messages: rewindRes.messages || [],
        session: { id: sessionId },
      });
    }

    // Normalize image attachments for AI services
    const normalizedAttachments = incomingImages.map((img) => {
      if (typeof img === 'string') {
        const isDataUrl = img.startsWith('data:');
        return {
          type: 'image',
          url: img,
          data_url: isDataUrl ? img : undefined,
        };
      }
      return {
        type: img?.type || 'image',
        url: img?.url || (typeof img?.data_url === 'string' ? img.data_url : ''),
        data_url: img?.data_url || (typeof img?.url === 'string' && img.url.startsWith('data:') ? img.url : undefined),
        ...img,
      };
    });

    // Persist incoming user turn to PostgreSQL durable ledger
    await aiSessionService.appendMessage(companyId, activeSessionId, {
      sender: 'user',
      text: trimmedMessage,
      images: incomingImages.map(img => (typeof img === 'string' ? img : (img?.url || img?.data_url || ''))).filter(Boolean),
      attachments: normalizedAttachments,
    });

    // Retrieve recent conversation history and session context for multi-turn continuity (prevent Conversational Amnesia)
    let sessionRecentMessages = [];
    let sessionContext = {};
    let pastSessionsSummary = [];
    try {
      const sessionData = await aiSessionService.getHistory(companyId, userId, activeSessionId);
      if (sessionData) {
        sessionContext = sessionData.session?.context || {};
        if (Array.isArray(sessionData.messages) && sessionData.messages.length > 1) {
          // Exclude the current user message we just appended (the last one) so current turn is not duplicated.
          // Window of 50 turns: long merchant sessions keep their early facts (bundle specs, agreements);
          // the ai-service compacts oldest history into a summary when its 12k token budget is exceeded,
          // so a wider window never explodes the prompt.
          sessionRecentMessages = sessionData.messages
            .filter(m => !m.isDeleted)
            .slice(0, -1)
            .slice(-50)
            .map(m => ({
              role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
              content: m.content || m.text || '',
            }))
            .filter(m => m.content);
        }
      }

      // Fetch other recent historical sessions ONLY if the merchant explicitly asks about past conversations/sessions
      const asksAboutPastSessions = /(المحادثات|الجلسات|حوارات|اتكلمنا|سوابق|محادثة سابقة|جلسة سابقة)/i.test(effectiveMessage);
      if (asksAboutPastSessions) {
        try {
          const allSessions = await agentStudioSessionService.listSessions(companyId, 'copilot', 10);
        if (Array.isArray(allSessions) && allSessions.length > 0) {
          pastSessionsSummary = allSessions
            .filter(s => s.id !== activeSessionId)
            .slice(0, 5)
            .map(s => {
              const msgCount = (s.messages || []).length;
              const lastMsgs = (s.messages || [])
                .slice(-2)
                .map(m => {
                  const roleName = m.role === 'user' ? 'التاجر' : 'المساعد';
                  const cleanText = (m.content || '').replace(/[{}[\]]/g, ' ').replace(/\s+/g, ' ').slice(0, 80).trim();
                  return `[${roleName}]: ${cleanText}`;
                })
                .join(' | ');
              return `جلسة بعنوان "${s.title || 'جلسة سابقة'}" (${msgCount} رسائل) - آخر حوار: ${lastMsgs}`;
            })
            .filter(Boolean);
        }
      } catch (sessListErr) {
        // non-blocking
      }
      }
    } catch (memErr) {
      console.warn('[AI-CHAT-CTRL] Could not load prior messages for context:', memErr.message);
    }

    let result = null;
    const targetAgentId = agentId || agentSlug || await resolveDefaultCopilotAgent(companyId);

    console.log('[AI-CHAT-REQ]', JSON.stringify({
      requestId,
      companyId,
      sessionId: activeSessionId,
      promptHash,
      agentId: targetAgentId,
      messagePreview: effectiveMessage.slice(0, 80),
    }));
    const combinedMemoryContext = {
      ...(sessionContext || {}),
      ...(sessionRecentMessages.length > 0 ? { recentMessages: sessionRecentMessages } : {}),
      ...(pastSessionsSummary.length > 0 ? { pastSessionsSummary } : {}),
      ...(memoryContext || {}),
      ...(memory_context || {}),
      ...(executiveContext ? { executiveContext } : {}),
    };

    if (targetAgentId && targetAgentId !== 'CEO' && targetAgentId !== 'ceo-agent') {
      try {
        const aiServiceAdminClient = require('../services/aiServiceAdminClient');
        const { retryAiTransport } = require('../services/aiServiceRetry');
        const agentChatResult = await retryAiTransport(() => aiServiceAdminClient.chatWithAgent({
          companyId,
          agentId: targetAgentId,
          message: effectiveMessage,
          threadId: activeSessionId,
          customerId: userId,
          memoryContext: combinedMemoryContext,
          channel: req.body?.channel || 'dashboard',
          attachments: normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
          requestId,
        }));

        if (agentChatResult && (agentChatResult.reply || agentChatResult.tool_calls || agentChatResult.status === 'ok')) {
          result = {
            reply: agentChatResult.reply || 'تم استلام الرد بنجاح.',
            toolCalls: agentChatResult.tool_calls || [],
            threadId: activeSessionId,
            agentInfo: {
              id: targetAgentId,
              status: agentChatResult.status,
            },
            modelSelection: agentChatResult.model ? { model: agentChatResult.model } : null,
            session: { id: activeSessionId },
          };

          // Store AI service thread_id in session context without drifting session.id
          if (agentChatResult.thread_id && agentChatResult.thread_id !== activeSessionId) {
            agentStudioSessionService.updateSessionContext(companyId, activeSessionId, {
              aiThreadId: agentChatResult.thread_id,
            }, 'copilot').catch(err => {
              console.warn('[AI-CHAT-CTRL] updateSessionContext warning:', err.message);
            });
          }
        }
      } catch (agentErr) {
        console.warn('[AI-CHAT-CTRL] chatWithAgent fallback to default chat:', agentErr.message);
        // Silent downgrade to the generic chat changes the merchant's agent
        // personality and tool set — record it in the observability ledger
        // instead of leaving it as a console line that pm2 rotation loses.
        try {
          const { recordToolIncident } = require('./superAdminAiIncidentsController');
          recordToolIncident({
            companyId,
            conversationId: activeSessionId,
            customerId: userId,
            errorType: 'AGENT_CHAT_FALLBACK',
            errorMessage: agentErr.message,
            toolName: 'chatWithAgent',
            agentId: targetAgentId,
            model: 'unknown',
            userMessage: effectiveMessage,
            category: 'SYSTEM_ERROR',
          }).catch(() => {});
        } catch (_) {}
      }
    }

    if (!result && targetAgentId === 'shipping-agent') {
      const offlineAnswer = await resolveShippingAgentOfflineAnswer(companyId, effectiveMessage);
      if (offlineAnswer) {
        result = {
          reply: offlineAnswer,
          threadId: activeSessionId,
          agentInfo: { id: targetAgentId, status: 'offline_deterministic' },
          session: { id: activeSessionId },
        };
      }
    }

    if (!result) {
      const { retryAiTransport: retryFallbackTransport } = require('../services/aiServiceRetry');
      const fallbackResult = await retryFallbackTransport(() => aiSdkClient.sendChatMessage({
        companyId,
        customerId: userId,
        message: effectiveMessage,
        threadId: activeSessionId,
        memoryContext: combinedMemoryContext,
        attachments: normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
        requestId,
      }));
      result = {
        reply: fallbackResult.reply,
        toolCalls: fallbackResult.toolCalls || fallbackResult.tool_calls || [],
        agentInfo: fallbackResult.agentInfo || null,
        modelSelection: fallbackResult.modelSelection || null,
        conversationId: activeSessionId,
        session: { id: activeSessionId },
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
              userMessage: effectiveMessage,
            }).catch(() => {});
          } catch (_) {}
        }
      }
    }

    // Persist assistant turn to PostgreSQL durable ledger
    if (result?.reply) {
      const assistantAttachments = result.response_attachments || result.attachments;
      await aiSessionService.appendMessage(companyId, activeSessionId, {
        sender: 'assistant',
        text: result.reply,
        toolCalls: result.toolCalls || [],
        images: Array.isArray(assistantAttachments) && assistantAttachments.length > 0
          ? assistantAttachments.map(a => (typeof a === 'string' ? a : (a.url || a.data_url || ''))).filter(Boolean)
          : undefined,
      });
    }

    return res.json({
      success: true,
      reply: result.reply,
      requestId,
      promptHash,
      toolCalls: result.toolCalls || [],
      agentInfo: result.agentInfo || null,
      modelSelection: result.modelSelection || null,
      conversationId: activeSessionId,
      threadId: activeSessionId,
      session: { id: activeSessionId },
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
        agentId: req.body?.agentId || req.body?.agentSlug || 'executive-assistant-agent',
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

    // The AI service restarts on every deploy; a merchant who types during that
    // window must not see a raw `fetch failed` bubble in the copilot.
    const { isTransientAiTransportError, AI_SERVICE_UNREACHABLE_MESSAGE } = require('../services/aiServiceRetry');
    if (isTransientAiTransportError(error)) {
      return res.status(503).json({
        success: false,
        code: 'AI_SERVICE_UNREACHABLE',
        retryable: true,
        error: AI_SERVICE_UNREACHABLE_MESSAGE,
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
    const companyId = resolveCompanyId(req);
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (req.query?.sessionId) {
      const result = await aiSessionService.getHistoryWithCheck(companyId, userId, req.query.sessionId, req.user);
      if (result.forbidden) {
        return res.status(403).json({
          success: false,
          error: 'لا تملك صلاحية الوصول إلى هذه الجلسة',
          code: 'FORBIDDEN_SESSION',
        });
      }
      if (result.notFound || !result.session) {
        return res.status(404).json({
          success: false,
          error: 'الجلسة غير متاحة أو تم حذفها',
          code: 'SESSION_NOT_FOUND',
        });
      }
      return res.json({
        success: true,
        session: result.session,
        messages: result.messages || [],
      });
    }

    const history = await aiSessionService.getHistory(companyId, userId, null, req.user);
    return res.json({
      success: true,
      session: history.session || null,
      messages: history.messages || [],
    });
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
    const companyId = resolveCompanyId(req);
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
    const companyId = resolveCompanyId(req);
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Opportunistically soft-delete stale empty sessions (0 messages older than 30 mins)
    agentStudioSessionService.cleanupEmptySessions(companyId, 'copilot', 30).catch(err => {
      console.warn('⚠️ [AI-CHAT-CTRL] cleanupEmptySessions warning:', err.message);
    });

    const sessions = await aiSessionService.listSessions(companyId, userId);
    return res.json({ success: true, sessions: sessions || [] });
  } catch (error) {
    console.error('❌ [AI-CHAT-CTRL] listSessions error:', error);
    return res.status(500).json({ success: false, error: 'تعذر تحميل الجلسات السحابية', details: error.message });
  }
}

async function createSession(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const session = await aiSessionService.createSession(companyId, userId, req.user, {
      title: req.body?.title,
    });
    return res.status(201).json({ success: true, session, messages: [] });
  } catch (error) {
    console.error('❌ [AI-CHAT-CTRL] createSession error:', error);
    return res.status(500).json({ success: false, error: 'تعذر إنشاء جلسة سحابية جديدة', details: error.message });
  }
}

async function deleteSession(req, res) {
  try {
    const companyId = resolveCompanyId(req);
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
 * POST /api/v1/ai/chat/sessions/:sessionId/rewind
 */
async function rewindSession(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    const sessionId = req.params?.sessionId || req.body?.sessionId || req.query?.sessionId;

    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId is required' });
    }

    const result = await aiSessionService.rewindSession(companyId, sessionId);
    return res.json(result);
  } catch (error) {
    console.error('[AI-CHAT-CTRL] rewindSession error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to rewind session' });
  }
}

/**
 * GET /api/v1/ai/chat/status
 */
async function getStatus(req, res) {
  try {
    const companyId = resolveCompanyId(req);
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

/**
 * GET /api/v1/ai/chat/default-agent
 * Returns the resolved default copilot agent slug for the current company.
 */
async function getDefaultCopilotAgent(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const slug = await resolveDefaultCopilotAgent(companyId);
    return res.json({ success: true, defaultAgentSlug: slug });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] getDefaultCopilotAgent error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/v1/ai/chat/specialists
 * Returns dynamically discovered specialists, the company default agent, and route mapping.
 */
async function getSpecialists(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const defaultAgentSlug = await resolveDefaultCopilotAgent(companyId);

    // 1. Fetch real active agents configured for this company
    const aiServiceAdminClient = require('../services/aiServiceAdminClient');
    let companyAgents = [];
    try {
      companyAgents = await aiServiceAdminClient.listAgents(companyId, 'ACTIVE');
      if (!Array.isArray(companyAgents)) companyAgents = [];
    } catch (listErr) {
      console.warn('[AI-CHAT-CTRL] Failed to fetch company agents in getSpecialists:', listErr.message);
    }

    // Baseline fallback specialists with rich Arabic metadata & prompts
    const baseSpecialists = [
      {
        id: 'executive-assistant-agent',
        slug: 'executive-assistant-agent',
        name: 'سليم — المساعد التنفيذي',
        role: 'EXECUTIVE_ASSISTANT',
        title: 'المساعد التنفيذي للمنصة وإدارة العمليات',
        description: 'المتابعة التنفيذية الشاملة، مؤشرات الأداء، الأوردرات والمخزون، وتفويض المهام.',
        badge: 'المساعد التنفيذي',
        suggestedPrompts: [
          'أعطني ملخصاً تنفيذياً لحالة البيزنس والمبيعات اليوم',
          'ما هي أهم النواقص أو العمليات المعلقة التي تحتاج تدخلاً فوري؟',
          'فحص إعدادات المتجر وأدوات التحويل وطرق الدفع والشحن',
        ],
      },
      {
        id: 'facebook-media-buyer-agent',
        slug: 'facebook-media-buyer-agent',
        name: 'الميديا باير المحترف',
        role: 'MEDIA_BUYER',
        title: 'خبير إعلانات ميتا وفيسبوك',
        description: 'إدارة الميزانيات، صياغة زوايا البيع، مراقبة الـ CPA وقرارات SCALE و KILL.',
        badge: 'إعلانات وتسويق',
        suggestedPrompts: [
          'افحص الحملات الإعلانية الحالية وقارن CPA بهامش الربح',
          'اقترح 3 زوايا بيع وهوكات إعلانية جديدة للمنتج الأكثر مبيعاً',
          'اقترح سيناريو فيديو ترويجي 9:16 احترافي يصلح لتوليده بأداة Veo 3.1',
        ],
      },
      {
        id: 'order-confirmation-agent',
        slug: 'order-confirmation-agent',
        name: 'منى — تأكيد الطلبات',
        role: 'ORDER_CONFIRMATION',
        title: 'مسؤولة تأكيد ومتابعة الشحن',
        description: 'متابعة أوردرات الدفع عند الاستلام COD المعلقة، تتبع بوالص بوسطة وتيربو ورفع نسب التسليم.',
        badge: 'الطلبات والشحن',
        suggestedPrompts: [
          'لخص لي كل أوردرات COD المعلقة اليوم التي تحتاج تأكيد شحن فوري',
          'افحص بوالص الشحن المتأخرة لدى شركات الشحن',
          'ما هو معدل تسليم الشحنات الفعلي هذا الأسبوع؟',
        ],
      },
      {
        id: 'inventory-pricing-agent',
        slug: 'inventory-pricing-agent',
        name: 'مساعد المخزون والتسعير',
        role: 'INVENTORY_PRICING',
        title: 'خبير المستودعات والتسعير',
        description: 'تحليل المخزون وحساب نقطة التعادل وهوامش الربح وإعادة الطلب في الوقت المناسب.',
        badge: 'المخزون والتسعير',
        suggestedPrompts: [
          'ما هي المنتجات التي أوشكت على النفاد في المخزن؟',
          'احسب هامش الربح ونقطة التعادل للمنتج الأكثر مبيعاً',
          'اقترح خطة إعادة تموين للمنتجات السريعة الحركة',
        ],
      },
      {
        id: 'customer-service-agent',
        slug: 'customer-service-agent',
        name: 'سارة — خدمة العملاء',
        role: 'CUSTOMER_SERVICE',
        title: 'أخصائية تجربة ورضا العملاء',
        description: 'متابعة شكاوى واستفسارات العملاء على واتساب وفيسبوك وتحسين تجربة الشراء.',
        badge: 'خدمة العملاء',
        suggestedPrompts: [
          'ما هي أبرز استفسارات وشكاوى العملاء التي تكررت اليوم؟',
          'لخص لي المحادثات التي تحتاج متابعة بشرية أو تصعيد',
          'كيف يمكن تحسين معدل رد خدمة العملاء على واتساب؟',
        ],
      },
      {
        id: 'hr-assistant-agent',
        slug: 'hr-assistant-agent',
        name: 'مروة — مستشارة شؤون الموظفين',
        role: 'HR_ASSISTANT',
        title: 'شؤون الموظفين والاستفسارات الإدارية',
        description: 'ملفك الوظيفي، حضورك، رصيد إجازاتك، وقسيمة راتبك — وتقديم طلبات الإجازة والاستئذان والسلفة.',
        badge: 'الموارد البشرية',
        icon: '🧑‍💼',
        requiresApp: 'hr-core',
        suggestedPrompts: [
          'رصيد إجازاتي كام؟',
          'سجّل لي طلب إجازة يوم 2/11',
          'في حد من الفريق مش مسجّل حضور النهاردة؟',
        ],
      },
      {
        id: 'shipping-agent',
        slug: 'shipping-agent',
        name: 'مروان — منسق الشحن والعمليات اللوجستية',
        role: 'SHIPPING',
        title: 'منسق الشحن ومتابعة التوصيل وشركات الشحن',
        description: 'متابعة بوالص وحالات الشحن، الرد على شركات الشحن وتذاكر الدعم، والرد على استفسارات العملاء بخصوص الشحنات.',
        badge: 'الشحن واللوجستيات',
        requiresApp: 'order-shipping-turbo',
        suggestedPrompts: [
          'ما هي الشحنات المتأخرة التي تحتاج تذكرة أو متابعة مع شركة الشحن؟',
          'افحص رسائل وتحديثات شركة الشحن على التذاكر المفتوحة',
          'ما حالة شحنة العميل وما آخر تحديث من المندوب؟',
        ],
      },
    ];

    // Build unified specialists list from actual company agents
    const activeAgents = companyAgents.filter((a) => a.status === 'ACTIVE' || !a.status);
    let finalSpecialists = [];

    if (activeAgents.length > 0) {
      finalSpecialists = activeAgents.map((a) => {
        const agentChannels = (a.allowedChannels || a.allowed_channels || []);
        const hasDashboardChannel = Array.isArray(agentChannels) && agentChannels.map((c) => String(c).toUpperCase()).includes('DASHBOARD');
        const baseMatch = baseSpecialists.find(
          (b) => b.slug === a.templateSlug || b.slug === a.template_slug || b.role === a.role
        );

        // A single agent may own the copilot default. Owning the DASHBOARD
        // channel must never promote an agent to "default" on its own: Swan
        // had three dashboard-channel agents and the copilot opened on the
        // wrong one (course coach) while ai_settings asked for the executive
        // assistant.
        const isDefault =
          a.id === defaultAgentSlug ||
          a.slug === defaultAgentSlug ||
          a.templateSlug === defaultAgentSlug ||
          a.template_slug === defaultAgentSlug ||
          baseMatch?.slug === defaultAgentSlug ||
          (a.role === 'EXECUTIVE_ASSISTANT' && defaultAgentSlug === 'executive-assistant-agent');

        return {
          id: a.id,
          slug: a.slug || a.templateSlug || a.template_slug || baseMatch?.slug || a.id,
          name: a.name || baseMatch?.name || a.role || 'وكيل ذكاء اصطناعي',
          role: a.role || baseMatch?.role || 'SPECIALIST',
          title: a.description || baseMatch?.title || a.name || 'وكيل متخصص',
          description: a.description || baseMatch?.description || 'وكيل ذكاء اصطناعي ضمن فريق عمل المتجر.',
          badge: isDefault ? 'المساعد التنفيذي' : (a.departmentName || baseMatch?.badge || a.role || 'متخصص'),
          icon: a.icon || baseMatch?.icon || '🤖',
          isDefault,
          hasDashboardChannel,
          allowedChannels: agentChannels,
          requiresApp: a.requiresApp || baseMatch?.requiresApp,
          suggestedPrompts: baseMatch?.suggestedPrompts || [
            `أعطني ملخصاً عن أداء ${a.name || a.role}`,
            'ما هي أهم النواقص أو العمليات المعلقة لديك الآن؟',
          ],
        };
      });

      // Ensure default copilot agent is placed at the top of the list
      finalSpecialists.sort((x, y) => (y.isDefault ? 1 : 0) - (x.isDefault ? 1 : 0));
    }

    // If company has no active agents or default copilot agent isn't in list, merge baseline
    if (finalSpecialists.length === 0 || !finalSpecialists.some((s) => s.isDefault)) {
      for (const base of baseSpecialists) {
        if (!finalSpecialists.some((s) => s.slug === base.slug)) {
          const isDefault = base.slug === defaultAgentSlug || base.id === defaultAgentSlug;
          finalSpecialists.push({
            ...base,
            isDefault,
          });
        }
      }
      finalSpecialists.sort((x, y) => (y.isDefault ? 1 : 0) - (x.isDefault ? 1 : 0));
    }

    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const installed = await getSharedPrismaClient().companyApp.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { app: { select: { slug: true } } },
    });
    const installedSlugs = new Set(installed.map((r) => r.app?.slug).filter(Boolean));
    finalSpecialists = finalSpecialists.filter((s) => !s.requiresApp || installedSlugs.has(s.requiresApp));

    return res.json({
      success: true,
      defaultAgentSlug,
      specialists: finalSpecialists,
      routeAgentMap: {},
    });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] getSpecialists error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PUT /api/v1/ai/chat/default-agent
 * Sets the default copilot agent slug for the current company.
 * Body: { agentSlug: string }
 */
async function setDefaultCopilotAgent(req, res) {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const { agentSlug } = req.body || {};
    if (!agentSlug) {
      return res.status(400).json({ success: false, error: 'agentSlug is required' });
    }
    const { getSharedPrismaClient } = require('../services/sharedDatabase');
    const prisma = getSharedPrismaClient();
    await prisma.aiSetting.upsert({
      where: { companyId },
      update: { copilotDefaultAgentSlug: agentSlug },
      create: { companyId, copilotDefaultAgentSlug: agentSlug },
    });
    const { invalidateDefaultAgentCache } = require('../utils/resolveDefaultCopilotAgent');
    invalidateDefaultAgentCache(companyId);
    return res.json({ success: true, defaultAgentSlug: agentSlug });
  } catch (error) {
    console.error('[AI-CHAT-CTRL] setDefaultCopilotAgent error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  sendMessage,
  getDefaultCopilotAgent,
  setDefaultCopilotAgent,
  getSpecialists,
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
  rewindSession,
  getStatus,
};

