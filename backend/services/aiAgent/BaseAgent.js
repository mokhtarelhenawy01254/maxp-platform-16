/**
 * @module BaseAgent
 * @description Phase 14: BaseAgent - unified agent abstraction with persona,
 * policies, scoped tool permissions, and optional LLM engine integration.
 */

const DEFAULT_AGENT_LLM_TIMEOUT_MS = 90000;

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
    this.createdAt = new Date();
    this.status = config.status || 'ACTIVE';
    this._children = [];
    this._modelManager = null;
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
            }).catch(() => {});
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
            await this._modelManager.markKeyFailed(keyInfo.keyId, error.code || error.status || 'MODEL_CALL_FAILED', 30_000).catch(() => {});
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
   * Process a task using dynamically compiled agent context and LLM prompting.
   * Returns a failure when no real model response is available.
   */
  async processTask(task) {
    const taskDescription = typeof task === 'string' ? task : (task.description || JSON.stringify(task));
    
    // Compile agent context
    const contextPrompt = `
You are an AI Agent with the following identity and constraints:
- Name: ${this.name}
- Role: ${this.role}
- Company ID: ${this.companyId}
- Template: ${this.templateSlug || 'custom'} ${this.version || ''}
- Allowed Tools: ${Array.from(this.allowedTools).join(', ')}
- Allowed Skills: ${Array.from(this.allowedSkills).join(', ')}
- Persona: ${JSON.stringify(this.persona)}
- Policies: ${JSON.stringify(this.policies)}

Your task is: "${taskDescription}"

Based on your role, allowed tools, and persona, process this task and provide a JSON response summarizing your execution.
Return a JSON object matching this structure:
{
  "status": "SUCCESS" or "FAILED",
  "result": {
    "summary": "Detailed summary of what was accomplished",
    "details": {}
  },
  "error": null or "Error message if failed"
}
`;

    if (this._modelManager) {
      try {
        const response = await this.generateWithLLM(contextPrompt, { temperature: 0.3 });
        if (response) {
          let jsonText = response.trim();
          if (jsonText.includes('```')) {
            const matches = jsonText.match(/```(?:json)?([\s\S]+?)```/);
            if (matches && matches[1]) jsonText = matches[1].trim();
          }
          const parsed = JSON.parse(jsonText);
          return {
            agentId: this.id,
            role: this.role,
            status: parsed.status || 'SUCCESS',
            result: parsed.result || { summary: jsonText },
            error: parsed.error || null,
            task
          };
        }
      } catch (err) {
        console.warn(`[BaseAgent] LLM processTask failed for ${this.id}:`, err.message);
      }
    }

    return {
      agentId: this.id,
      role: this.role,
      status: 'FAILED',
      errorCode: 'AI_AGENT_LLM_UNAVAILABLE',
      result: {
        summary: '',
        error: 'No model response was available for this task'
      },
      task
    };
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
