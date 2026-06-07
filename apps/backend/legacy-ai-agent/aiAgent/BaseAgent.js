/**
 * @module BaseAgent
 * @description Phase 14: BaseAgent - unified agent abstraction with persona,
 * policies, scoped tool permissions, and optional LLM engine integration.
 *
 * Refactored 2026-06-02: Now includes the full agent pipeline (resolveIntent → 
 * routeToTools → executeTools → handleFallback → validateReply) and system prompt 
 * builder. Previously these were duplicated in CEOAgent. Specialist agents extend 
 * BaseAgent directly and may override _getSystemPrompt() for role-specific prompts.
 */

const DEFAULT_AGENT_LLM_TIMEOUT_MS = 90000;
const MAX_TASK_LOG_ENTRIES = 500;

const axios = require('axios');

// Pipeline
const pipeline = require('./pipeline');
const resolveIntent = require('./pipeline/stages/resolveIntent');
const routeToTools = require('./pipeline/stages/routeToTools');
const executeTools = require('./pipeline/stages/executeTools');
const handleFallback = require('./pipeline/stages/handleFallback');
const validateReply = require('./pipeline/stages/validateReply');
const AgentEventEmitter = require('./AgentEventEmitter');

// Context / soul
const { loadSoul } = require('./agentSoulConfig');

// Tool descriptions for system prompt
const { getToolDescriptions } = require('./agentToolRegistry');

// Sub-engines
const agentToolGatewayService = require('./agentToolGatewayService');
const customerReplyEngine = require('./executors/customerReplyEngine');
const { getRunStateManager } = require('./RunStateManager');
const PauseRequiredError = require('./errors/PauseRequiredError');

// Utilities extracted from CEOAgent
const {
  _cleanBlock,
  _formatSkillInstructions,
  _formatPoliciesForPrompt,
} = require('./utils/agentPromptUtils');

class BaseAgent {
  /**
   * @param {Object} config
   * @param {string} config.id - Unique agent ID
   * @param {string} config.name - Agent display name
   * @param {string} config.role - Agent role (e.g. 'SALES', 'SUPPORT', 'SHIPPING', 'CEO')
   * @param {string} config.companyId - Tenant company ID
   * @param {string[]} config.allowedTools - List of tool names this agent can use
   * @param {string[]} [config.allowedSkills] - List of procedural skills this agent can use
   * @param {string} [config.templateSlug] - Source filesystem template slug
   * @param {string} [config.version] - Source template version
   * @param {string} [config.model] - Preferred AI model
   * @param {Object} [config.persona] - Persona configuration
   * @param {Object} [config.policies] - Agent-specific policy overrides
   */
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.companyId = config.companyId;
    this.allowedTools = new Set(config.allowedTools || []);
    this.allowedSkills = new Set(config.allowedSkills || []);
    this.templateSlug = config.templateSlug || config.persona?.templateSlug || null;
    this.version = config.version || config.persona?.version || null;
    this.parentId = config.parentId || config.persona?.parentId || null;
    this.modelSource = config.modelSource || config.persona?.modelSource || (config.model ? 'explicit' : 'runtime-default');
    this._hasExplicitModel = Boolean(config.model)
      && !['policy-default', 'runtime-default'].includes(String(this.modelSource || '').toLowerCase());
    this.model = config.model || 'gemini-2.5-flash';
    this.persona = config.persona || {};
    this.policies = config.policies || {};
    this._instructions = config.instructions || {};
    this._guardrails = config.policies?.guardrails || {};
    this.inputGuardrails = config.inputGuardrails || [];
    this.outputGuardrails = config.outputGuardrails || [];
    this.outputSchema = config.outputSchema || null;
    this.handoffs = config.handoffs || []; // Array of { agentId, role, description }
    this.createdAt = new Date();
    this.status = config.status || 'ACTIVE';
    this._children = [];
    this._modelManager = null;

    // Pipeline / prompt cache state
    this._taskLog = [];
    this._systemPromptCache = null;
    this._systemPromptCacheAt = 0;
    this._customerVoiceProfile = '';
  }

  /**
   * Factory: create agent from template + runtime overrides.
   * OpenAI Agents SDK pattern: Agent is config, not class.
   */
  static fromTemplate(templateSlug, companyId, overrides = {}) {
    const agentProfileLoaderService = require('./agentProfileLoaderService');
    const profile = agentProfileLoaderService.loadProfile(templateSlug);

    const config = {
      id: overrides.id || `${profile.role}_${companyId.slice(-6)}_${Date.now()}`,
      name: overrides.name || profile.name,
      role: profile.role,
      companyId,
      allowedTools: overrides.allowedTools || profile.allowedTools,
      allowedSkills: overrides.allowedSkills || profile.allowedSkills,
      templateSlug,
      version: profile.version,
      model: overrides.model || profile.modelPolicy?.default || profile.modelPolicy?.model,
      modelSource: overrides.modelSource || profile.modelPolicy,
      persona: {
        language: profile.personaMeta?.language || 'arabic',
        dialect: profile.personaMeta?.dialect || null,
        tone: profile.personaMeta?.tone || 'professional',
        formality: profile.personaMeta?.formality || 'formal',
        ...(overrides.persona || {}),
      },
      policies: {
        maxToolCallsPerRun: profile.budget?.maxToolCallsPerRun || 10,
        modelPolicy: profile.modelPolicy,
        guardrails: profile.guardrails || {},
        ...(overrides.policies || {}),
      },
      instructions: {
        agents: profile.instructions?.agents || '',
        soul: profile.instructions?.soul || '',
        tools: profile.instructions?.tools || '',
        persona: profile.instructions?.persona || '',
        ...(overrides.instructions || {}),
      },
      outputSchema: overrides.outputSchema || profile.outputSchema || null,
      status: overrides.status || 'ACTIVE',
      handoffs: overrides.handoffs || profile.handoffs || [],
    };

    return new BaseAgent(config);
  }

  /**
   * Inject the ModelManager for LLM-backed generation.
   */
  setModelManager(modelManager) {
    this._modelManager = modelManager;
  }

  /**
   * Generates a response using the LLM engine (if available).
   * Returns null if no modelManager is set, allowing callers to fall back.
   */
  async generateWithLLMResult(prompt, options = {}) {
    if (!this._modelManager) return null;

    try {
      const requestTimeoutMs = Number(
        options.timeoutMs
        || options.timeout_ms
        || process.env.AGENT_LLM_TIMEOUT_MS
        || DEFAULT_AGENT_LLM_TIMEOUT_MS
      );
      const modelPolicy = this.policies?.modelPolicy || this.persona?.modelPolicy || {};
      const hasExplicitModelPreference = Boolean(options.preferredModel || modelPolicy.model || this._hasExplicitModel);
      const preferredModel = options.preferredModel
        || modelPolicy.model
        || (this._hasExplicitModel ? this.model : null)
        || modelPolicy.default
        || this.model
        || null;
      const fallbackModels = [
        modelPolicy.fallback,
        ...(Array.isArray(modelPolicy.fallbacks) ? modelPolicy.fallbacks : []),
      ].filter(Boolean);
      const requiresToolSupport = Array.isArray(options.tools) && options.tools.length > 0;
      const allowModelFallback = options.allowModelFallback === true || modelPolicy.allowModelFallback === true;
      const baseRoutingOptions = {
        preferredProvider: options.preferredProvider || modelPolicy.provider || null,
        preferredKeyId: options.preferredKeyId || modelPolicy.keyId || null,
        estimatedTokens: options.estimatedTokens || options.predictedTokens || 0,
        requireToolSupport: requiresToolSupport,
      };
      const routingAttempts = [
        {
          ...baseRoutingOptions,
          preferredModel,
          label: 'preferred',
        },
      ];
      if (allowModelFallback) {
        for (const fallbackModel of fallbackModels) {
          routingAttempts.push({
            ...baseRoutingOptions,
            preferredModel: fallbackModel,
            label: 'model-fallback',
          });
        }
        const providerFailoverAttempts = Math.max(
          1,
          Math.min(Number(options.providerFailoverAttempts || modelPolicy.providerFailoverAttempts || 2), 3)
        );
        for (let attempt = 0; attempt < providerFailoverAttempts; attempt += 1) {
          routingAttempts.push({
            ...baseRoutingOptions,
            preferredProvider: null,
            preferredKeyId: null,
            preferredModel: null,
            label: attempt === 0 ? 'provider-failover' : `provider-failover-retry-${attempt}`,
          });
        }
      }

      let lastFailure = null;
      let attemptedProviderCall = false;
      for (const routingOptions of routingAttempts) {
        let keyInfo = await this._modelManager.getNextKeySimple(this.companyId, routingOptions).catch(error => ({
          error: 'ROUTING_EXCEPTION',
          message: error.message || 'Routing failed',
        }));

        if (!keyInfo || keyInfo.error) {
          lastFailure = keyInfo || { error: 'NO_MODEL_KEY_AVAILABLE' };
          this._lastModelSelection = {
            provider: keyInfo?.provider || routingOptions.preferredProvider || null,
            model: keyInfo?.model || routingOptions.preferredModel || null,
            keyId: keyInfo?.keyId || routingOptions.preferredKeyId || null,
            keyName: keyInfo?.keyName || null,
            selectedPool: keyInfo?.selectedPool || null,
            activeProvider: keyInfo?.activeProvider || routingOptions.preferredProvider || null,
            error: keyInfo?.error || 'NO_MODEL_KEY_AVAILABLE',
            message: keyInfo?.message || null,
            retryAfter: keyInfo?.retryAfter || null,
            agentSuitability: keyInfo?.agentSuitability || null,
            allowModelFallback,
            fallbackAttempt: routingOptions.label,
          };
          if (!attemptedProviderCall && hasExplicitModelPreference && routingOptions.label === 'preferred') {
            break;
          }
          continue;
        }

        this._lastModelSelection = {
          provider: keyInfo.provider,
          model: keyInfo.model,
          keyId: keyInfo.keyId,
          keyName: keyInfo.keyName,
          selectedPool: keyInfo.selectedPool,
          activeProvider: keyInfo.activeProvider,
          manualOverride: keyInfo.manualOverride,
          fallbackAttempt: routingOptions.label,
        };

        try {
          attemptedProviderCall = true;
          const AIProviderFactory = require('./providers/AIProviderFactory');
          const provider = AIProviderFactory.getProvider(keyInfo.provider, keyInfo.apiKey, keyInfo.baseUrl, keyInfo.keyId);
          const providerRequest = provider.generateResponse(prompt, {
            model: keyInfo.model,
            temperature: options.temperature || 0.3,
            max_tokens: options.maxTokens || 500,
            maxOutputTokens: options.maxTokens || 500,
            timeoutMs: requestTimeoutMs,
            timeout_ms: requestTimeoutMs,
            tools: options.tools,
            tool_choice: options.tool_choice,
            toolConfig: options.toolConfig,
          });
          const result = await this._withTimeout(providerRequest, requestTimeoutMs, `${keyInfo.provider || 'AI'} ${keyInfo.model || 'model'}`);

          const text = this._extractProviderText(result);
          const toolCalls = this._extractProviderToolCalls(result);
          if (!text && toolCalls.length === 0 && options.allowEmptyResponse !== true) {
            const error = new Error('Provider returned an empty assistant response');
            error.code = 'EMPTY_MODEL_RESPONSE';
            throw error;
          }
          if (typeof this._modelManager.recordRoutingSuccess === 'function') {
            await this._modelManager.recordRoutingSuccess(keyInfo, {
              companyId: this.companyId,
              model: result?.model || keyInfo.model,
              usage: {
                totalTokens: result?.usageMetadata?.totalTokenCount || result?.usage?.total_tokens || 0,
              },
            }).catch(err => console.warn('[BaseAgent] recordRoutingSuccess failed:', err.message));
          }
          return {
            text,
            toolCalls,
            raw: result,
            keyInfo,
            model: result?.model || keyInfo.model,
            provider: result?.provider || keyInfo.provider,
            modelSelection: this._lastModelSelection,
          };
        } catch (error) {
          lastFailure = error;
          this._lastModelSelection = {
            ...this._lastModelSelection,
            error: error.code || error.status || 'MODEL_CALL_FAILED',
            message: error.message || null,
            failedAt: new Date().toISOString(),
          };
          console.warn(`[BaseAgent] LLM generation failed for ${this.id}:`, error.message);
          if (allowModelFallback && typeof this._modelManager.markKeyFailed === 'function' && keyInfo.keyId) {
            await this._modelManager.markKeyFailed(keyInfo.keyId, error.code || error.status || 'MODEL_CALL_FAILED', 30_000).catch(err => console.warn('[BaseAgent] markKeyFailed failed:', err.message));
          }
        }
      }

      if (!this._lastModelSelection) {
        this._lastModelSelection = {
          provider: baseRoutingOptions.preferredProvider || null,
          model: preferredModel || null,
          keyId: baseRoutingOptions.preferredKeyId || null,
          error: lastFailure?.code || lastFailure?.error || 'NO_MODEL_KEY_AVAILABLE',
          message: lastFailure?.message || null,
          allowModelFallback,
        };
      }
      return null;
    } catch (error) {
      if (this._lastModelSelection) {
        this._lastModelSelection = {
          ...this._lastModelSelection,
          error: error.code || error.status || 'MODEL_CALL_FAILED',
          message: error.message || null,
          failedAt: new Date().toISOString(),
        };
      }
      console.warn(`[BaseAgent] LLM generation failed for ${this.id}:`, error.message);
      return null;
    }
  }

  async _withTimeout(promise, timeoutMs, label = 'AI model') {
    const ms = Number(timeoutMs);
    if (!Number.isFinite(ms) || ms <= 0) return promise;

    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(`${label} timed out after ${ms}ms`);
        error.code = 'AI_AGENT_MODEL_TIMEOUT';
        reject(error);
      }, ms);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async generateWithLLM(prompt, options = {}) {
    const result = await this.generateWithLLMResult(prompt, options);
    return result?.text || null;
  }

  _extractProviderText(result) {
    if (!result) return '';
    if (typeof result.text === 'function') return result.text();
    if (typeof result.text === 'string') return result.text;
    if (typeof result.content === 'string') return result.content;
    const candidateText = result.candidates?.[0]?.content?.parts?.find(part => typeof part.text === 'string')?.text;
    return typeof candidateText === 'string' ? candidateText : '';
  }

  _extractProviderToolCalls(result) {
    if (!result) return [];
    if (Array.isArray(result.toolCalls)) return result.toolCalls;
    const parts = result.candidates?.[0]?.content?.parts || [];
    return parts
      .filter(part => part?.functionCall?.name)
      .map((part, index) => ({
        id: `${part.functionCall.name}-${index + 1}`,
        type: 'function',
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args || {}),
        },
      }));
  }

  /**
   * Checks if this agent can use a given tool.
   */
  canUseTool(toolName) {
    return this.allowedTools.has(toolName);
  }

  /**
   * Checks if this agent can use a given skill.
   */
  canUseSkill(skillId) {
    return this.allowedSkills.has(skillId);
  }

  /**
   * Returns the list of allowed tools.
   */
  getTools() {
    return [...this.allowedTools];
  }

  /**
   * Returns the list of allowed skills.
   */
  getSkills() {
    return [...this.allowedSkills];
  }

  /**
   * Convert this agent into a tool callable by another agent.
   * Mirrors OpenAI SDK's agent.as_tool() pattern.
   */
  asTool() {
    return {
      name: `agent_${this.role.toLowerCase()}_${this.id.slice(-8)}`,
      description: `Delegate tasks to ${this.name} (${this.role}). Best for: ${this.getCapabilitiesDescription()}`,
      handler: async (companyId, params, context) => {
        const { task, handoffContext } = params;

        // Run this agent as a sub-agent
        const subTask = {
          description: task,
          currentMessage: task,
          intentMessage: task,
          parentRunId: context.runId,
          context: handoffContext,
        };

        const result = await this.processTask(subTask);
        return {
          status: result.status,
          reply: result.result?.reply || result.result?.summary || '',
          agentName: this.name,
          agentRole: this.role,
        };
      },
      params: {
        task: 'The task to delegate to this agent',
        handoffContext: 'JSON context from the parent agent (optional)',
      },
    };
  }

  getCapabilitiesDescription() {
    const tools = this.getTools();
    if (tools.includes('product.search')) return 'product searches, catalog queries, inventory checks';
    if (tools.includes('order.lookup')) return 'order tracking, refunds, shipping updates, customer support';
    if (tools.includes('agent.spawn')) return 'orchestration, multi-agent workflows, strategic planning';
    return 'general assistance';
  }

  addHandoff(targetAgentConfig) {
    this.handoffs.push({
      agentId: targetAgentConfig.id || targetAgentConfig.agentId,
      role: targetAgentConfig.role,
      name: targetAgentConfig.name || targetAgentConfig.role,
      description: targetAgentConfig.description || `Delegate to ${targetAgentConfig.role}`,
    });
  }

  getHandoffDescriptions() {
    return this.handoffs.map(h =>
      `- transfer_to_${h.role.toLowerCase()}: ${h.description}`
    ).join('\n');
  }

  addInputGuardrail(guardrail) {
    this.inputGuardrails.push(guardrail);
  }

  addOutputGuardrail(guardrail) {
    this.outputGuardrails.push(guardrail);
  }

  async runInputGuardrails(context, input) {
    const results = await Promise.all(
      this.inputGuardrails.map(g => g.check(context, this, input))
    );
    const blocked = results.filter(r => r.tripwireTriggered);
    return { allowed: blocked.length === 0, violations: blocked };
  }

  async runOutputGuardrails(context, output) {
    const results = await Promise.all(
      this.outputGuardrails.map(g => g.check(context, this, output))
    );
    const blocked = results.filter(r => r.tripwireTriggered);
    return { allowed: blocked.length === 0, violations: blocked };
  }

  // ── System prompt (cached 5 min) ───────────────────────────────────────────

  _getSystemPrompt(context = {}) {
    const companyName = this.companyId || 'Unknown';
    const toolsList = [...(this.allowedTools || [])].sort();

    const resolveInstruction = (instruction) => {
      if (typeof instruction === 'function') {
        return instruction({ agent: this, context });
      }
      return instruction || '';
    };

    const handoffsSection = this.handoffs?.length > 0
      ? `[HANDOFFS]\nYou can delegate to these specialist agents by using the transfer_to_[role] tool:\n${this.getHandoffDescriptions()}\n[/HANDOFFS]`
      : '';

    const sections = [
      resolveInstruction(this._instructions.soul) ? `[SOUL]\n${resolveInstruction(this._instructions.soul)}\n[/SOUL]` : '',
      resolveInstruction(this._instructions.persona) ? `[PERSONA]\n${resolveInstruction(this._instructions.persona)}\n[/PERSONA]` : '',
      resolveInstruction(this._instructions.agents) ? `[AGENT_RULES]\n${resolveInstruction(this._instructions.agents)}\n[/AGENT_RULES]` : '',
      resolveInstruction(this._instructions.tools) ? `[TOOL_INSTRUCTIONS]\n${resolveInstruction(this._instructions.tools)}\n[/TOOL_INSTRUCTIONS]` : '',
      `[AGENT_IDENTITY]\nYour ID: ${this.id}\nYour name: ${this.name}\nYour role: ${this.role}\nCompany: ${companyName}\n[/AGENT_IDENTITY]`,
      handoffsSection,
      `[AVAILABLE_TOOLS]\n${toolsList.map(t => `- ${t}`).join('\n')}\n[/AVAILABLE_TOOLS]`,
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  setDynamicInstruction(key, fn) {
    if (typeof fn !== 'function') {
      throw new Error('Dynamic instruction must be a function');
    }
    this._instructions[key] = fn;
    this.clearPromptCache();
  }

  /**
   * Generate structured output matching outputSchema.
   * Falls back to free text if no schema or provider doesn't support it.
   */
  async generateStructuredOutput(prompt, schema = this.outputSchema) {
    if (!schema || !this._modelManager) {
      // Fallback: generate free text and try JSON parse
      const text = await this.generateWithLLM(prompt);
      try {
        return JSON.parse(text);
      } catch {
        return { text, _parseError: true };
      }
    }

    // Provider-native structured output
    const provider = this._modelManager.getProviderForModel(this.model);
    if (provider?.generateStructured) {
      return await provider.generateStructured(prompt, schema);
    }

    // Fallback: instruct LLM to return JSON
    const jsonPrompt = `${prompt}\n\nRespond ONLY with a JSON object matching this schema:\n${JSON.stringify(schema, null, 2)}`;
    const text = await this.generateWithLLM(jsonPrompt, { temperature: 0.1 });

    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = text.trim();
      const codeBlockMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)```/);
      if (codeBlockMatch) jsonText = codeBlockMatch[1].trim();
      return JSON.parse(jsonText);
    } catch (error) {
      console.warn('[BaseAgent] Structured output parse failed, retrying once:', error.message);
      // One retry with stronger prompt
      const retryPrompt = `${jsonPrompt}\n\nIMPORTANT: Return valid JSON only. No markdown, no explanations.`;
      const retryText = await this.generateWithLLM(retryPrompt, { temperature: 0.0 });
      try {
        return JSON.parse(retryText);
      } catch {
        return { text, _parseError: true, _raw: retryText };
      }
    }
  }

  // ── Main entry: process any task/message via pipeline ────────────────────────

  async processTask(task) {
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN || 'test_token';

    try {
      const response = await axios.post(`${AI_SERVICE_URL}/chat`, {
        message: task.currentMessage || task.description,
        thread_id: task.sessionId || task.conversationId || null,
      }, {
        headers: { 
          'Authorization': `Bearer ${AI_SERVICE_TOKEN}`,
          'x-company-id': this.companyId,
          'x-customer-id': task.userId || 'test-user-456',
        },
        timeout: DEFAULT_AGENT_LLM_TIMEOUT_MS,
      });

      const data = response.data;
      
      return {
        agentId: this.id,
        role: this.role,
        status: data.status === 'ok' ? 'SUCCESS' : (data.status === 'awaiting_approval' ? 'PAUSED' : 'ERROR'),
        result: {
          reply: data.reply,
          summary: data.reply,
          toolsUsed: false,
          toolRounds: 0,
          tools: [],
          repaired: false,
          presentedFromToolResults: false,
          goalRun: null,
          status: data.status,
          thread_id: data.thread_id,
          draft_id: data.draft_id,
        },
        modelSelection: null,
        task,
      };
    } catch (error) {
      console.error(`[BaseAgent] AI Service call failed for ${this.id}:`, error.response?.data || error.message);
      throw error;
    }
  }


  /**
   * Event-driven agent execution. Yields events instead of returning final result.
   * Mirrors OpenAI Agents SDK's Runner.run_streamed().
   */
  async *processTaskStreamed(task) {
    const runId = `run_${crypto.randomUUID()}`;
    const emitter = new AgentEventEmitter(runId);

    emitter.emit('agent_start', { agentId: this.id, agentName: this.name, task: task.description || task });

    try {
      const context = {
        task,
        agent: this,
        companyId: this.companyId,
        traceId: agentToolGatewayService.newTraceId(),
        runId,
        emitter,
      };

      const prompt = this._getSystemPrompt(context);

      // Stage 1: Resolve Intent
      emitter.emit('agent_thinking', { stage: 'resolve_intent', message: 'Understanding customer message...' });
      const ctx1 = await resolveIntent(context);

      if (ctx1.earlyReturn) {
        const reply = ctx1.earlyReturn?.result?.reply || ctx1.earlyReturn?.result?.summary || '';
        emitter.emit('agent_reply', { reply, isIncremental: false, modelUsed: this.model });
        emitter.emit('run_complete', { runId, reply, toolCalls: [] });
        yield* emitter.stream();
        return;
      }

      // Stage 2: Route to tools
      emitter.emit('agent_thinking', { stage: 'route_tools', message: 'Planning actions...' });
      const ctx2 = await routeToTools(ctx1);

      const executionPlan = ctx2.executionPlan || {};
      const plannedToolNames = [];
      if (executionPlan.plannedExecutions?.length) {
        plannedToolNames.push(...executionPlan.plannedExecutions.map(p => p.tool));
      }
      if (executionPlan.deterministicReadExecution) {
        plannedToolNames.push(executionPlan.deterministicReadExecution.tool);
      }
      if (executionPlan.deterministicActionExecution) {
        plannedToolNames.push(executionPlan.deterministicActionExecution.tool);
      }
      if (executionPlan.contextOrderDraftParams) {
        plannedToolNames.push('product.search', 'order.create_draft');
      }

      if (plannedToolNames.length > 0) {
        emitter.emit('tool_calling', { tools: plannedToolNames });
      }

      let emittedToolCount = 0;

      // Stage 3: Execute tools
      emitter.emit('agent_thinking', { stage: 'execute_tools', message: 'Executing tools...' });
      const ctx3 = await executeTools(ctx2);

      if (ctx3.executedTools && ctx3.executedTools.length > emittedToolCount) {
        for (let i = emittedToolCount; i < ctx3.executedTools.length; i++) {
          const tool = ctx3.executedTools[i];
          emitter.emit('tool_executing', { tool: tool.tool, params: tool.params });
          emitter.emit('tool_result', { tool: tool.tool, result: tool.result, success: tool.success, error: tool.error });
        }
        emittedToolCount = ctx3.executedTools.length;
      }

      // Stage 4: Handle fallback
      emitter.emit('agent_thinking', { stage: 'generate_reply', message: 'Formulating response...' });
      const ctx4 = await handleFallback(ctx3);

      if (ctx4.earlyReturn) {
        const reply = ctx4.earlyReturn?.result?.reply || ctx4.earlyReturn?.result?.summary || '';
        emitter.emit('agent_reply', { reply, isIncremental: false, modelUsed: this.model });
        emitter.emit('run_complete', { runId, reply, toolCalls: (ctx4.executedTools || []).map(t => ({ name: t.tool })) });
        yield* emitter.stream();
        return;
      }

      if (ctx4.executedTools && ctx4.executedTools.length > emittedToolCount) {
        for (let i = emittedToolCount; i < ctx4.executedTools.length; i++) {
          const tool = ctx4.executedTools[i];
          emitter.emit('tool_executing', { tool: tool.tool, params: tool.params });
          emitter.emit('tool_result', { tool: tool.tool, result: tool.result, success: tool.success, error: tool.error });
        }
        emittedToolCount = ctx4.executedTools.length;
      }

      // Stage 5: Validate reply
      const ctx5 = await validateReply(ctx4);

      if (ctx5.earlyReturn) {
        const reply = ctx5.earlyReturn?.result?.reply || ctx5.earlyReturn?.result?.summary || '';
        emitter.emit('agent_reply', { reply, isIncremental: false, modelUsed: this.model });
        emitter.emit('run_complete', { runId, reply, toolCalls: (ctx5.executedTools || []).map(t => ({ name: t.tool })) });
        yield* emitter.stream();
        return;
      }

      const finalReply = ctx5.finalReply || '';
      const toolCalls = (ctx5.executedTools || []).map(t => ({
        name: t.tool,
        success: t.success,
        result: t.result,
        error: t.error,
      }));

      emitter.emit('agent_reply', { reply: finalReply, isIncremental: false, modelUsed: this.model });
      emitter.emit('run_complete', { runId, reply: finalReply, toolCalls });

    } catch (error) {
      if (error.name === 'PauseRequiredError') {
        emitter.emit('agent_reply', { reply: error.reason, isIncremental: false, modelUsed: this.model });
        emitter.emit('run_complete', { runId, reply: error.reason, toolCalls: [] });
        yield* emitter.stream();
        return;
      }
      emitter.emit('run_error', { error: error.message, stack: error.stack });
      yield* emitter.stream();
      throw error;
    }

    yield* emitter.stream();
  }

  // ── Task log ─────────────────────────────────────────────────────────────

  getTaskLog() { return [...this._taskLog]; }

  _appendToTaskLog(entries) {
    if (!Array.isArray(entries)) entries = [entries];
    this._taskLog.push(...entries);
    if (this._taskLog.length > MAX_TASK_LOG_ENTRIES) {
      this._taskLog.splice(0, this._taskLog.length - MAX_TASK_LOG_ENTRIES);
    }
  }

  /**
   * Clears the cached system prompt so the next call rebuilds it.
   * Call this after updating persona, policies, or tools via the UI.
   */
  clearPromptCache() {
    this._systemPromptCache = null;
    this._systemPromptCacheAt = 0;
  }

  /**
   * Returns agent info for observability.
   */
  getInfo() {
    return {
      id: this.id, name: this.name, role: this.role,
      companyId: this.companyId, model: this.model,
      templateSlug: this.templateSlug, version: this.version,
      parentId: this.parentId,
      toolCount: this.allowedTools.size, skillCount: this.allowedSkills.size,
      status: this.status,
      childCount: this._children.length, createdAt: this.createdAt,
      hasLLM: !!this._modelManager,
      selectedModel: this._lastModelSelection?.model || null,
      selectedProvider: this._lastModelSelection?.provider || null,
      lastModelSelection: this._lastModelSelection || null,
    };
  }

  addChild(agent) { this._children.push(agent); }
  getChildren() { return [...this._children]; }

  deactivate() { this.status = 'INACTIVE'; }
  activate() { this.status = 'ACTIVE'; }
}

module.exports = BaseAgent;
