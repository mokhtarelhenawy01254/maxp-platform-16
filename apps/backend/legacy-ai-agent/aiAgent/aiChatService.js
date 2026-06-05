/**
 * @module aiChatService
 * @description Direct merchant ↔ CEOAgent chat service.
 * Lets company owners send messages to the CEOAgent and receive intelligent
 * business-context responses, with fast workingMemory plus durable transcripts.
 */

const workingMemoryService = require('./workingMemoryService');
const CorrectiveRAGEngine = require('../../services/rag/CorrectiveRAGEngine');
const telemetryTracerService = require('./telemetryTracerService');
const CEOAgent = require('./CEOAgent');
const aiRuntimeService = require('../aiRuntimeService');
const redisCacheService = require('../../services/redisCacheService');
const { normalizeAgentReply } = require('./agentReplyNormalizer');
const { containsInternalToolSyntax } = require('./agentToolCallParser');
const agentChatTranscriptService = require('./agentChatTranscriptService');
const agentGoalRunService = require('./agentGoalRunService');
const agentIntentRelevanceService = require('./agentIntentRelevanceService');
const agentIntentClassifierService = require('./agentIntentClassifierService');
const i18n = require('./i18n');

const CHAT_PREFIX = 'merchant-chat';
const SESSION_INDEX_TTL_SECONDS = 30 * 24 * 60 * 60;

function makeSessionId() {
  return `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getUserDisplayName(user = {}) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim()
    || user.email
    || 'Account Owner';
}

function isCannedOpeningMessage(message = {}) {
  if (message.role !== 'assistant') return false;
  const content = String(message.content || '');
  return content.startsWith('Hello ')
    && content.includes('Company Administration Agent')
    && content.includes('Before we begin');
}

function filterDisplayMessages(messages = []) {
  return Array.isArray(messages)
    ? messages.filter(message => (
      !isCannedOpeningMessage(message) &&
      !(message.role === 'assistant' && containsInternalToolSyntax(message.content))
    ))
    : [];
}

function buildEmptyReplyPublicMessage(errorCode, modelSelection = null, rawReason = '') {
  let tip = '';
  if (errorCode === 'AI_AGENT_TOOL_CALL_LEAK') {
    tip = i18n.t('agentError.tool_call_leak_tip');
  } else if (errorCode === 'AI_AGENT_UNGROUNDED_REPLY') {
    tip = i18n.t('agentError.ungrounded_reply_tip');
  } else if (errorCode === 'AI_AGENT_LLM_UNAVAILABLE') {
    if (modelSelection?.error === 'MODEL_NOT_AGENT_READY') {
      tip = i18n.t('agentError.model_not_agent_ready_tip');
    } else if (modelSelection?.error === 'PREFERRED_MODEL_NOT_AVAILABLE') {
      tip = i18n.t('agentError.preferred_model_not_available_tip');
    } else if (['ALL_KEYS_UNAVAILABLE', 'PROVIDER_BUDGET_EXHAUSTED', 'BUDGET_EXCEEDED'].includes(modelSelection?.error)) {
      tip = modelSelection?.message || i18n.t('agentError.budget_exhausted_tip');
    } else {
      tip = i18n.t('agentError.llm_unavailable_tip');
    }
  } else {
    tip = i18n.t('agentError.generic_tip');
  }

  let technicalDetails = `[${i18n.t('agentError.prefix')}: ${errorCode}]`;
  if (rawReason) {
    technicalDetails += `\n${i18n.t('agentError.reason')}: ${rawReason}`;
  }
  if (modelSelection) {
    technicalDetails += `\n${i18n.t('agentError.model')}: ${modelSelection.model || i18n.t('agentError.undefined')} (${modelSelection.provider || i18n.t('agentError.undefined')})`;
    if (modelSelection.error) {
      technicalDetails += ` | ${i18n.t('agentError.model_error')}: ${modelSelection.error}`;
    }
    if (modelSelection.message) {
      technicalDetails += ` | ${i18n.t('agentError.message')}: ${modelSelection.message}`;
    }
  }

  return `${technicalDetails}\n\n${i18n.t('agentError.tip')}: ${tip}`;
}

function buildIntentTraceFromTaskResult(taskResult = {}) {
  const tools = Array.isArray(taskResult?.result?.tools) ? taskResult.result.tools : [];
  const successfulTools = tools.filter(tool => tool?.success);
  const lastTool = [...successfulTools].reverse()[0] || [...tools].reverse()[0] || null;
  const toolIntentMap = {
    'hr.attendance_today': 'hr.attendance.today',
    'audit.read': 'audit.read',
    'agent.list_agents': 'agents.read',
    'agent.read_state': 'agents.read',
    'order.summary': 'orders',
    'order.lookup': 'orders',
    'order.recentList': 'orders',
    'product.search': 'products',
    'product.lowStock': 'inventory',
  };
  return {
    lastToolName: lastTool?.tool || null,
    lastToolIntent: taskResult?.result?.goalRun?.type
      ? `goals.${taskResult.result.goalRun.type}`
      : toolIntentMap[lastTool?.tool] || null,
    tools: tools.map(tool => ({
      tool: tool?.tool || null,
      success: Boolean(tool?.success),
      readOnly: tool?.readOnly !== false,
    })).filter(tool => tool.tool),
  };
}

function isAmbiguousCreateTurn(message = '') {
  return Boolean(agentIntentRelevanceService._private?.isAmbiguousCreateRequest?.(message));
}

class AiChatService {
  constructor() {
    /** @type {Map<string, CEOAgent>} companyId → CEOAgent */
    this._agents = new Map();
    this._sessionIndexes = new Map();
  }

  /**
   * Send a message to CEOAgent and return its response.
   *
   * @param {string} companyId
   * @param {string} userId       - merchant user ID (for per-user history)
   * @param {string} message      - merchant's message text
   * @returns {{ reply: string, agentInfo: Object, taskDetails: Object, conversationId: string }}
   */
  async sendMessage(companyId, userId, message, options = {}) {
    if (!message?.trim()) throw new Error('Message cannot be empty');

    const session = await this.ensureSession(companyId, userId, options.sessionId, options.user);
    const conversationId = this._conversationId(companyId, userId, session.id);
    let trace = null;
    try {
      trace = await telemetryTracerService.startTrace({ companyId, channel: 'MERCHANT_CHAT', provider: 'ceo-agent' });
    } catch (e) {
      console.warn('[AI-CHAT] Telemetry unavailable (non-fatal):', e.message);
    }

    const safeEndTrace = async (status) => {
      if (trace?.id) {
        await telemetryTracerService.endTrace(trace.id, { status }).catch(() => {});
      }
    };

    try {
      // ── 1. Add user message to working memory ────────────────────────────
      await workingMemoryService.addMessage(companyId, conversationId, {
        role: 'user',
        content: message,
      });
      await agentChatTranscriptService.appendMessage(companyId, userId, session, {
        role: 'user',
        content: message,
      }).catch(() => {});
      const memCtx = await workingMemoryService.getContext(companyId, conversationId);

      // Pre-classify intent once — shared by processTurn (goal detection) and
      // resolveToolPlan (routing) so we never call the LLM twice per turn.
      // Only for non-active-goal turns: active goals skip LLM routing anyway.
      const activeRun = await agentGoalRunService.loadActiveRun(companyId, conversationId).catch(() => null);
      let preClassified = null;
      if (!activeRun && companyId && process.env.NODE_ENV !== 'test') {
        preClassified = await agentIntentClassifierService.classifyIntentFromLLM({
          message,
          companyId,
          availableTools: [],
          context: {},
        }).catch((err) => {
          console.warn('[AI-CHAT] Pre-classification failed (non-fatal):', err.message);
          return null;
        });
      }

      const goalTurn = await agentGoalRunService.processTurn({
        companyId,
        userId,
        conversationId,
        sessionId: session.id,
        message,
        preClassified,
      }).catch((error) => {
        console.warn('[AI-CHAT] Goal state unavailable (non-fatal):', error.message);
        return { activeGoal: null, promptBlock: '' };
      });
      const ambiguousCreateTurn = isAmbiguousCreateTurn(message);
      // ── 2. Optional RAG for business context ─────────────────────────────
      let ragAnswer = null;
      let ragSpan = null;
      if (!ambiguousCreateTurn && trace?.id) {
        ragSpan = await telemetryTracerService.startSpan({ traceId: trace.id, name: 'rag-query', type: 'RETRIEVAL' }).catch(() => null);
      }
      if (!ambiguousCreateTurn) {
        try {
          const ragResult = await CorrectiveRAGEngine.query(companyId, message);
          ragAnswer = ragResult?.answer || null;
        } catch (e) {
          console.warn('[AI-CHAT] RAG failed (non-fatal):', e.message);
        }
      }
      if (ragSpan?.id) {
        await telemetryTracerService.endSpan(ragSpan.id, { output: { hasAnswer: !!ragAnswer } }).catch(() => {});
      }

      // ── 3. Build full prompt with history ────────────────────────────────
      const prompt = this._buildPrompt(message, memCtx, ragAnswer, session, goalTurn?.promptBlock, {
        ambiguousCreateTurn,
      });
      const intentContext = this._buildIntentContext(memCtx, goalTurn?.activeGoal, { preClassified });
      // ── 4. CEOAgent process ───────────────────────────────────────────────
      const agent = await this._getOrCreateAgent(companyId);
      agent.setModelManager(aiRuntimeService.getModelManager());

      let agentSpan = null;
      if (trace?.id) {
        agentSpan = await telemetryTracerService.startSpan({ traceId: trace.id, name: 'agent-process', type: 'LLM' }).catch(() => null);
      }

      // Detect multi-agent orchestration requests (e.g., "عايز خطة تسويقية")
      let taskResult;
      const orchestration = await this._detectOrchestration(companyId, message, agent);
      if (orchestration) {
        taskResult = orchestration;
      } else {
        taskResult = await agent.processTask({
          description: prompt,
          currentMessage: message,
          intentMessage: message,
          intentContext,
          sessionId: session.id,
          conversationId,
          goalRun: goalTurn?.activeGoal || null,
        });
      }

      await agentGoalRunService.applyTaskResult(companyId, conversationId, taskResult).catch((error) => {
        console.warn('[AI-CHAT] Goal result update skipped:', error.message);
      });
      if (agentSpan?.id) {
        await telemetryTracerService.endSpan(agentSpan.id, { output: { status: taskResult?.status } }).catch(() => {});
      }

      const reply = this._extractReply(taskResult);
      if (!reply) {
        const error = new Error('AI agent returned an empty reply');
        error.code = taskResult?.errorCode || 'AI_AGENT_EMPTY_REPLY';
        error.reason = taskResult?.error || taskResult?.result?.error || '';
        error.modelSelection = this._extractModelSelection(taskResult, agent.getInfo());
        error.publicMessage = buildEmptyReplyPublicMessage(error.code, error.modelSelection, error.reason);
        throw error;
      }

      const agentInfo = agent.getInfo();
      const modelSelection = this._extractModelSelection(taskResult, agentInfo);

      // ── 5. Save assistant turn ────────────────────────────────────────────
      await workingMemoryService.addMessage(companyId, conversationId, {
        role: 'assistant',
        content: reply,
        modelSelection,
        intentTrace: buildIntentTraceFromTaskResult(taskResult),
      });
      await agentChatTranscriptService.appendMessage(companyId, userId, session, {
        role: 'assistant',
        content: reply,
      }).catch(() => {});
      const sessions = await this.listSessions(companyId, userId);
      const updatedSession = {
        ...session,
        updatedAt: new Date().toISOString(),
        title: !session.title || session.title === 'جلسة جديدة' ? message.slice(0, 42) : session.title,
      };
      await this._saveSessions(companyId, userId, sessions.map(item => (
        item.id === session.id ? { ...updatedSession, isActive: true } : { ...item, isActive: false }
      )));

      await safeEndTrace('SUCCESS');

      return {
        reply,
        agentInfo: {
          ...agentInfo,
          selectedModel: modelSelection?.model || agentInfo.selectedModel,
          selectedProvider: modelSelection?.provider || agentInfo.selectedProvider,
          lastModelSelection: modelSelection || agentInfo.lastModelSelection,
        },
        modelSelection,
        taskDetails: taskResult,
        conversationId,
        session: updatedSession,
      };
    } catch (error) {
      await safeEndTrace('ERROR');
      throw error;
    }
  }

  /**
   * Returns full conversation history for a merchant user.
   */
  async getHistory(companyId, userId, sessionId = null, user = null) {
    const session = await this.ensureSession(companyId, userId, sessionId, user);
    const conversationId = this._conversationId(companyId, userId, session.id);
    const ctx = await workingMemoryService.getContext(companyId, conversationId);
    const memoryMessages = filterDisplayMessages(ctx?.recentMessages || []);
    const transcriptMessages = memoryMessages.length > 0
      ? []
      : filterDisplayMessages(await agentChatTranscriptService.loadMessages(session.id));
    return {
      conversationId,
      session,
      messages: memoryMessages.length > 0 ? memoryMessages : transcriptMessages,
      summary: ctx?.summary || null,
    };
  }

  /**
   * Clears conversation history for a merchant user.
   */
  async clearHistory(companyId, userId, sessionId = null) {
    const sessions = await this.listSessions(companyId, userId);
    const targetSessionId = sessionId || sessions.find(item => item.isActive)?.id || sessions[0]?.id;
    if (!targetSessionId) return { cleared: true, deleted: false, conversationId: null };
    const conversationId = this._conversationId(companyId, userId, targetSessionId);
    await workingMemoryService.clearSession(companyId, conversationId);
    await agentGoalRunService.clearConversation(companyId, conversationId).catch(() => {});
    await agentChatTranscriptService.deleteSession(targetSessionId).catch(() => {});
    const remaining = sessions
      .filter(item => item.id !== targetSessionId)
      .map((item, index) => ({ ...item, isActive: index === 0 }));
    await this._saveSessions(companyId, userId, remaining);
    return { cleared: true, deleted: true, conversationId, sessionId: targetSessionId, sessions: remaining };
  }

  async listSessions(companyId, userId) {
    const key = this._sessionIndexKey(companyId, userId);
    const cached = await redisCacheService.get(key);
    if (Array.isArray(cached)) {
      this._sessionIndexes.set(key, cached);
      return cached;
    }
    const inMemory = this._sessionIndexes.get(key) || [];
    if (inMemory.length > 0) return inMemory;
    const durableSessions = await agentChatTranscriptService.listSessions(companyId, userId);
    if (durableSessions.length > 0) {
      this._sessionIndexes.set(key, durableSessions);
      await redisCacheService.set(key, durableSessions, SESSION_INDEX_TTL_SECONDS).catch(() => {});
    }
    return durableSessions;
  }

  async createSession(companyId, userId, user = {}, metadata = {}) {
    const sessions = await this.listSessions(companyId, userId);
    const now = new Date().toISOString();
    const session = {
      id: makeSessionId(),
      title: metadata.title || 'New Session',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      participant: {
        userId,
        name: getUserDisplayName(user),
        email: user.email || null,
        role: user.role || null,
      },
    };
    const nextSessions = [
      session,
      ...sessions.map(item => ({ ...item, isActive: false })),
    ].slice(0, 20);
    await this._saveSessions(companyId, userId, nextSessions);

    const conversationId = this._conversationId(companyId, userId, session.id);
    await workingMemoryService.initSession(companyId, conversationId);
    await agentChatTranscriptService.saveSession(companyId, userId, session).catch(() => {});
    return session;
  }

  async ensureSession(companyId, userId, sessionId = null, user = null) {
    const sessions = await this.listSessions(companyId, userId);
    const existing = sessionId
      ? sessions.find(item => item.id === sessionId)
      : sessions.find(item => item.isActive) || sessions[0];
    if (existing) {
      if (!existing.isActive) {
        await this._saveSessions(companyId, userId, sessions.map(item => ({
          ...item,
          isActive: item.id === existing.id,
        })));
      }
      return { ...existing, isActive: true };
    }
    return this.createSession(companyId, userId, user || {});
  }

  /**
   * Returns current agent info without starting a conversation.
   */
  async getAgentStatus(companyId) {
    try {
      const agent = await this._getOrCreateAgent(companyId);
      return {
        spawned: true,
        ...agent.getInfo(),
      };
    } catch {
      return { spawned: false };
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  _sessionIndexKey(companyId, userId) {
    return `agent:chat:sessions:${companyId}:${userId}`;
  }

  _conversationId(companyId, userId, sessionId) {
    return `${CHAT_PREFIX}:${companyId}:${userId}:${sessionId}`;
  }

  async _saveSessions(companyId, userId, sessions = []) {
    const key = this._sessionIndexKey(companyId, userId);
    const normalized = sessions.map((session, index) => ({
      ...session,
      isActive: Boolean(session.isActive && index === sessions.findIndex(item => item.isActive)),
      updatedAt: session.updatedAt || new Date().toISOString(),
    }));
    if (normalized.length > 0 && !normalized.some(item => item.isActive)) {
      normalized[0].isActive = true;
    }
    this._sessionIndexes.set(key, normalized);
    await redisCacheService.set(key, normalized, SESSION_INDEX_TTL_SECONDS);
    await agentChatTranscriptService.saveSessions(companyId, userId, normalized).catch(() => {});
    return normalized;
  }

  async _getOrCreateAgent(companyId) {
    let managerProfile = null;
    try {
      const agentManagerService = require('./agentManagerService');
      managerProfile = await agentManagerService.getManagerAgent(companyId);
    } catch (error) {
      console.warn('[AI-CHAT] Manager profile unavailable, using CEO template defaults:', error.message);
    }

    const profileSignature = managerProfile
      ? JSON.stringify({
        id: managerProfile.id,
        name: managerProfile.name,
        model: managerProfile.model,
        allowedTools: managerProfile.getTools?.() || [],
        allowedSkills: managerProfile.getSkills?.() || [],
        persona: managerProfile.persona || {},
        policies: managerProfile.policies || {},
      })
      : 'template-default';

    const cached = this._agents.get(companyId);
    if (cached && cached._profileSignature === profileSignature) {
      return cached;
    }

    const agent = new CEOAgent(companyId, managerProfile
      ? {
        id: managerProfile.id,
        name: managerProfile.name,
        model: managerProfile.model,
        allowedTools: managerProfile.getTools?.() || [],
        allowedSkills: managerProfile.getSkills?.() || [],
        persona: managerProfile.persona || {},
        policies: managerProfile.policies || {},
      }
      : {});
    agent._profileSignature = profileSignature;
    this._agents.set(companyId, agent);
    return agent;
  }

  _buildPrompt(userMessage, memCtx, ragAnswer, session = {}, goalPromptBlock = '', turnGuards = {}) {
    const parts = [];
    const participant = session.participant || {};

    parts.push([
      '[USER_IDENTITY]',
      `User name from account: ${participant.name || 'N/A'}`,
      `Email: ${participant.email || 'N/A'}`,
      `Role: ${participant.role || 'N/A'}`,
      'Do not confuse the agent name with the user name. If the user asks about their name, answer from the available user identity or ask for their preferred name if it is unclear.',
      'If the user corrects the identity or says you confused them with the agent, acknowledge the correction and ask for the name they prefer without inventing one.',
      'If the conversation is ongoing, do not start with a new greeting. Go directly to responding to the last message.',
      'If the user requests Egyptian colloquial, stick to it for the rest of the session unless they request otherwise.',
    ].join('\n'));

    if (memCtx?.summary) {
      parts.push(`[CONVERSATION_SUMMARY]\n${memCtx.summary}`);
    }
    
    const recentMessages = filterDisplayMessages(memCtx?.recentMessages || []);
  if (recentMessages.length > 1) {
    const history = recentMessages
      .slice(0, -1)
      .map(m => `${m.role === 'user' ? 'Manager' : 'CEO Agent'}: ${m.content}`)
      .join('\n');
    parts.push(`[CONVERSATION_HISTORY]\n${history}`);
  }
  
  if (ragAnswer) {
    parts.push(`[RELATED_DATA]\n${ragAnswer}`);
  }
  
  if (goalPromptBlock) {
    parts.push(goalPromptBlock);
  }
  
    if (turnGuards?.ambiguousCreateTurn) {
      parts.push([
        '[INTENT_GUARD]',
        'The user message requests "something new" without specifying the type.',
        'Do not use RAG data or old products/goals to guess the intent.',
        'Ask one specific clarification question to determine if the intended object is a product, order, agent, skill, or something else.',
      ].join('\n'));
    }
    
    parts.push(userMessage);
    return parts.join('\n\n');
  }

  _buildIntentContext(memCtx, activeGoal = null, { preClassified = null } = {}) {
    const recentMessages = filterDisplayMessages(memCtx?.recentMessages || [])
      .slice(-8)
      .map(message => ({
        role: message.role,
        content: String(message.content || '').slice(0, 700),
      }));

    const traceMessages = Array.isArray(memCtx?.recentMessages) ? memCtx.recentMessages : [];
    const lastIntentTrace = [...traceMessages]
      .reverse()
      .map(message => message?.intentTrace)
      .find(trace => trace && typeof trace === 'object');

    return {
      recentMessages,
      activeGoal,
      lastToolName: lastIntentTrace?.lastToolName || null,
      lastToolIntent: lastIntentTrace?.lastToolIntent || null,
      lastTools: Array.isArray(lastIntentTrace?.tools) ? lastIntentTrace.tools : [],
      preClassified: preClassified || null,
    };
  }

  /**
   * Detects if the merchant is requesting a multi-agent orchestration (e.g., marketing plan).
   * If so, runs CEOAgent.orchestrateMultiAgentWorkflow and returns the result directly.
   */
  async _detectOrchestration(companyId, message, agent) {
    const orchestrationIntent = this._isOrchestrationRequest(message);
    if (!orchestrationIntent) return null;

    const agentProvisioningService = require('./agentProvisioningService');
    const agents = agentProvisioningService.listAgents(companyId)
      .filter(a => a.status === 'ACTIVE' && ['SALES', 'MARKETING', 'INVENTORY', 'SUPPORT'].includes(a.role));

    if (agents.length === 0) return null;

    const orchestrationAgents = agents.map(a => ({
      agentId: a.id,
      role: a.role,
      task: orchestrationIntent.roleTasks[a.role] || `Provide input as ${a.role}`,
    }));

    try {
      const result = await agent.orchestrateMultiAgentWorkflow({
        goal: message,
        agents: orchestrationAgents,
        constraints: orchestrationIntent.constraints || {},
      });

      // Format the synthesized plan as a CEOAgent.processTask-compatible result
      const planText = [
        result.summary,
        '',
        result.plan,
        '',
        '---',
        ...result.actionItems.map(item => `- ${item.owner}: ${item.task} (${item.priority})`),
      ].join('\n');

      return {
        agentId: agent.id,
        role: agent.role,
        status: 'SUCCESS',
        result: {
          reply: planText,
          summary: result.summary,
          toolsUsed: true,
          toolRounds: result.sessions?.length || 0,
          tools: [],
          repaired: false,
          presentedFromToolResults: false,
          goalRun: null,
        },
        modelSelection: { model: result.modelUsed, provider: 'google' },
      };
    } catch (error) {
      console.warn('[AI-CHAT] Orchestration failed, falling back to normal process:', error.message);
      return null;
    }
  }

  /**
   * Checks if a merchant message is a multi-agent orchestration request.
   * Returns null if not, or an object with roleTasks if yes.
   */
  _isOrchestrationRequest(message = '') {
    const lower = message.toLowerCase();

    // Marketing plan patterns (English uses word boundaries)
    if (/\b(marketing|sales|campaign)\s+plan\b/i.test(lower)) {
      return {
        roleTasks: {
          SALES: 'What are our top-selling products and recent sales trends?',
          MARKETING: 'Which marketing channels and campaigns should we focus on?',
          INVENTORY: 'Do we have sufficient stock for a campaign push?',
        },
      };
    }

    // Inventory audit + restock plan
    if (/\b(restock|inventory)\s+plan\b/i.test(lower)) {
      return {
        roleTasks: {
          INVENTORY: 'Audit current stock levels and identify low-stock items.',
          SALES: 'Which products should we prioritize for restocking based on sales velocity?',
        },
      };
    }

    // Sales push / promotion
    if (/\b(promotion|discount)\s+plan\b/i.test(lower)) {
      return {
        roleTasks: {
          SALES: 'Which products have the highest margin for a discount campaign?',
          MARKETING: 'What channels and messaging should we use for this promotion?',
          INVENTORY: 'Ensure we have enough stock to meet expected demand.',
        },
      };
    }

    return null;
  }

  _extractReply(taskResult) {
    if (!taskResult) return '';
    if (typeof taskResult === 'string') return normalizeAgentReply(taskResult);
    return normalizeAgentReply(
      taskResult?.result?.reply ||
      taskResult?.result?.summary ||
      taskResult?.result?.response ||
      ''
    );
  }

  _extractModelSelection(taskResult, agentInfo = {}) {
    const selection = taskResult?.modelSelection || taskResult?.result?.modelSelection || agentInfo?.lastModelSelection || null;
    if (!selection || typeof selection !== 'object') {
      return agentInfo?.selectedModel || agentInfo?.selectedProvider
        ? {
          provider: agentInfo.selectedProvider || null,
          model: agentInfo.selectedModel || agentInfo.model || null,
        }
        : null;
    }
    return {
      provider: selection.provider || null,
      model: selection.model || null,
      keyId: selection.keyId || null,
      keyName: selection.keyName || null,
      selectedPool: selection.selectedPool || null,
      activeProvider: selection.activeProvider || null,
      manualOverride: selection.manualOverride || false,
      error: selection.error || null,
      message: selection.message || null,
      retryAfter: selection.retryAfter || null,
    };
  }
}

module.exports = new AiChatService();
