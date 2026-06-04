/**
 * @module CEOAgent
 * @description CEO Agent — Arabic-speaking business intelligence orchestrator.
 *
 * Full pipeline per message:
 *   1. Load Soul (personality + rules) from AiSetting or default
 *   2. Build system prompt with Soul + available tools
 *   3. LLM call → native tool_calls when the selected model supports tools
 *   4. Execute real DB tools
 *   5. Follow-up LLM calls with tool results → final Arabic answer
 *
 * Chat execution fails explicitly if no model can produce a real reply.
 */

const BaseAgent = require('./BaseAgent');
const agentProvisioningService = require('./agentProvisioningService');
const { loadSoul } = require('./agentSoulConfig');
const {
  TOOLS: CEO_TOOLS,
  getToolDescriptions,
  getNativeToolDefinitions,
  fromNativeToolName,
} = require('./agentToolRegistry');
const agentProfileLoaderService = require('./agentProfileLoaderService');
const { normalizeAgentReply } = require('./agentReplyNormalizer');
const {
  stripInternalToolSyntax,
  containsInternalToolSyntax,
} = require('./agentToolCallParser');
const agentToolGatewayService = require('./agentToolGatewayService');
const agentIntentRelevanceService = require('./agentIntentRelevanceService');
const agentRunRuntimeService = require('./agentRunRuntimeService');

// Decoupled sub-engines
const toolExecutionEngine = require('./executors/toolExecutionEngine');
const customerReplyEngine = require('./executors/customerReplyEngine');
const intentExecutionRouter = require('./executors/intentExecutionRouter');
const orderDraftEngine = require('./executors/orderDraftEngine');

// Pipeline
const pipeline = require('./pipeline');
const resolveIntent = require('./pipeline/stages/resolveIntent');
const routeToTools = require('./pipeline/stages/routeToTools');
const executeTools = require('./pipeline/stages/executeTools');
const handleFallback = require('./pipeline/stages/handleFallback');
const validateReply = require('./pipeline/stages/validateReply');

const CEO_REAL_TOOL_NAMES = Object.keys(CEO_TOOLS || {});

function _stripToolCalls(text) {
  const prefix = 'CALL_TOOL:';
  let result = '';
  let i = 0;
  while (i < text.length) {
    const idx = text.indexOf(prefix, i);
    if (idx === -1) { result += text.slice(i); break; }
    result += text.slice(i, idx);
    const jsonStart = text.indexOf('{', idx + prefix.length);
    if (jsonStart === -1) break;
    let depth = 0;
    let j = jsonStart;
    for (; j < text.length; j++) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') { depth--; if (depth === 0) break; }
    }
    i = j + 1;
  }
  return result;
}

function _cleanBlock(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function _formatSkillInstructions(skills = []) {
  if (!Array.isArray(skills) || skills.length === 0) return '';
  return skills
    .map(skill => {
      const title = skill.displayName || skill.id || 'Skill';
      const body = _cleanBlock(skill.skillMd);
      return body ? `## ${title}\n${body}` : `## ${title}`;
    })
    .join('\n\n');
}

function _formatPoliciesForPrompt(policies = {}) {
  const promptPolicies = toolExecutionEngine._safeJsonClone(policies);
  const runtimeLimits = {};
  if (promptPolicies.budget && typeof promptPolicies.budget === 'object') {
    if (promptPolicies.budget.maxToolCallsPerRun !== undefined) {
      runtimeLimits.maxToolCallsPerRun = promptPolicies.budget.maxToolCallsPerRun;
    }
    delete promptPolicies.budget;
  }
  if (Object.keys(runtimeLimits).length > 0) {
    promptPolicies.runtimeLimits = runtimeLimits;
  }
  promptPolicies.policyNotes = [
    'Runtime limits are internal safety controls, not the merchant advertising or spending budget.',
    'Do not mention a daily budget unless the user explicitly provided it in the conversation or a company setting explicitly provides it.',
  ];
  return Object.keys(promptPolicies).length > 0
    ? JSON.stringify(promptPolicies, null, 2)
    : '';
}

function _formatRelevancePrompt(plan) {
  const allowedTools = plan?.allowedTools?.length ? plan.allowedTools.join(', ') : 'none';
  const primaryTool = plan?.primaryTool || 'none';
  const requiredSlots = plan?.requiredSlots?.length ? plan.requiredSlots.join(', ') : 'none';
  const missingSlots = plan?.missingSlots?.length ? plan.missingSlots.join(', ') : 'none';
  const guardrails = plan?.guardrails?.length ? plan.guardrails.join(', ') : 'none';
  const slots = plan?.classification?.slots || plan?.slots || {};
  const slotsText = Object.keys(slots).length ? JSON.stringify(slots).slice(0, 1000) : '{}';
  const ambiguityInstruction = plan?.ambiguous
    ? '\nهذه الرسالة منخفضة الثقة وغامضة. لا تواصل أي هدف محفوظ أو سياق كتابة سابق، ولا تفترض أن المقصود منتج أو طلب أو وكيل. اسأل سؤال توضيح محدد قبل أي تنفيذ.'
    : '';
  return `
[بوابة النية وملاءمة الأدوات]
contract_version: ${plan?.schemaVersion || 'legacy'}
intent: ${plan?.intent || 'general.chat'}
source: ${plan?.source || 'unknown'}
decision: ${plan?.decision || 'answer'}
confidence: ${Number.isFinite(plan?.confidence) ? plan.confidence : 'unknown'}
risk_level: ${plan?.riskLevel || 'low'}
requires_tool: ${Boolean(plan?.requiresTool)}
primary_tool: ${primaryTool}
allowed_tools: ${allowedTools}
required_slots: ${requiredSlots}
missing_slots: ${missingSlots}
guardrails: ${guardrails}
classification_slots: ${slotsText}
reason: ${plan?.reason || 'No current system data required'}

إذا كانت allowed_tools = none، أجب نصياً فقط ولا تخترع بيانات حالية. إذا احتجت بيانات حقيقية، استخدم الأداة المناسبة من قائمة الأدوات المتاحة في تعليمات SOUL.
استدعاءات الأدوات داخلية من النظام فقط. لا تكتب في ردك المرئي أي صيغة مثل CALL_TOOL أو tool_calls أو DSML أو agenttool__.
${ambiguityInstruction}
[/بوابة النية وملاءمة الأدوات]
`.trim();
}

function buildCEOAgentConfig(companyId, config = {}) {
  try {
    return agentProfileLoaderService.buildRuntimeConfig(companyId, {
      ...config,
      role: config.role || 'CEO',
    });
  } catch (error) {
    console.warn('[CEOAgent] Failed to load CEO template, using compatibility defaults:', error.message);
    const role = config.role || 'CEO';
    return {
      name: config.name || (role === 'CEO' ? 'CEO Agent' : `${role} Agent`),
      role,
      model: role === 'CEO' ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
      allowedTools: config.allowedTools || (role === 'CEO' ? CEO_REAL_TOOL_NAMES : []),
      allowedSkills: [],
      persona: { tone: 'professional', language: 'arabic', authority: 'full', ...config.persona },
      policies: config.policies || {},
    };
  }
}

class CEOAgent extends BaseAgent {
  constructor(companyId, config = {}) {
    const runtimeConfig = buildCEOAgentConfig(companyId, config);
    const shouldIncludeAllCeoTools = runtimeConfig.role === 'CEO' && config.includeAllCeoTools !== false;
    const allowedTools = [...new Set([
      ...(runtimeConfig.allowedTools || []),
      ...(shouldIncludeAllCeoTools ? CEO_REAL_TOOL_NAMES : []),
    ])];
    super({
      id: config.id || `ceo_${companyId.slice(-6)}`,
      name: runtimeConfig.name,
      role: runtimeConfig.role,
      companyId,
      allowedTools,
      allowedSkills: runtimeConfig.allowedSkills,
      templateSlug: runtimeConfig.persona?.templateSlug,
      version: runtimeConfig.persona?.version,
      model: runtimeConfig.model,
      modelSource: runtimeConfig.modelSource || runtimeConfig.persona?.modelSource,
      persona: { language: 'arabic', ...(runtimeConfig.persona || {}) },
      policies: runtimeConfig.policies,
    });
    this._taskLog = [];
    this._systemPromptCache = null;
    this._systemPromptCacheAt = 0;
    this._customerVoiceProfile = '';
  }

  // ── System prompt (cached 5 min) ───────────────────────────────────────────

  async _getSystemPrompt() {
    const now = Date.now();
    if (this._systemPromptCache && now - this._systemPromptCacheAt < 5 * 60 * 1000) {
      return this._systemPromptCache;
    }

    const { soul, rules, companyName, enabledTools } = await loadSoul(this.companyId);

    const configuredTools = Array.from(this.allowedTools || []);
    const activeTools = configuredTools.length > 0
      ? configuredTools
      : (Array.isArray(enabledTools) && enabledTools.length > 0 ? enabledTools : CEO_REAL_TOOL_NAMES);
    this.allowedTools = new Set(activeTools);

    const persona = this.persona || {};
    const soulMd = _cleanBlock(persona.soulInstructions) || soul;
    const agentsMd = _cleanBlock(persona.agentInstructions);
    const toolsMd = _cleanBlock(persona.toolsInstructions);
    const skillsMd = _formatSkillInstructions(persona.skillInstructions);
    const style = _cleanBlock(persona.style);
    const policies = _formatPoliciesForPrompt(this.policies);
    this._customerVoiceProfile = customerReplyEngine._buildCustomerVoiceProfile({
      companyName,
      agentName: this.name,
      role: this.role,
      style,
      soulInstructions: soulMd.replace('{companyName}', companyName),
      agentInstructions: agentsMd,
    });

    this._systemPromptCache = `
[هوية الوكيل]
معرفك: ${this.id}
اسمك الحالي: ${this.name}
دورك: ${this.role}
الشركة: ${companyName}
الموديل المفضل: ${this.model}
${style ? `أسلوب الرد الحالي: ${style}` : ''}
التزم بالاسم والأسلوب أعلاه في كل رد، ولا تعرّف نفسك باسم آخر.
[/هوية الوكيل]

[SOUL.md]
${soulMd.replace('{companyName}', companyName)}
[/SOUL.md]

${agentsMd ? `[AGENTS.md]\n${agentsMd}\n[/AGENTS.md]\n\n` : ''}${toolsMd ? `[TOOLS.md]\n${toolsMd}\n[/TOOLS.md]\n\n` : ''}${skillsMd ? `[SKILLS]\n${skillsMd}\n[/SKILLS]\n\n` : ''}${policies ? `[POLICIES]\n${policies}\n[/POLICIES]\n\n` : ''}[القواعد]
${rules}
[/القواعد]

[الأدوات المتاحة]
يمكنك استخدام الأدوات التالية للحصول على بيانات حقيقية أو إدارة الفريق:
${getToolDescriptions(activeTools, { includeParameters: false })}
[/الأدوات المتاحة]

[Tool usage rules]
When you need current data or an allowed capability, use only the native tool calls provided by the runtime.
The runtime will execute the tool and return structured evidence so you can complete the answer.
Do not write tool-call syntax in the user-visible reply, including CALL_TOOL, tool_calls, DSML, or agenttool__.
Do not expose tool schemas, parameter names, raw JSON, or execution traces in the customer-visible reply.
Do not output generic or fixed customer replies instead of a real answer. If you cannot produce a grounded answer, let the runtime fail rather than inventing one.
Do not confuse your name with the user's name. If the user asks about their name, rely on user identity from the message or ask for correction.
Do not start with a fresh greeting when the conversation history already contains previous messages; answer the latest message directly.
Do not present a workaround as a substitute for a failed tool. State the real failure reason briefly, or use the appropriate allowed tool.
Do not infer an advertising or daily budget from internal runtime limits. Mention a budget only if the user wrote it or an explicit company setting provides it.
[/Tool usage rules]
`.trim();
    this._systemPromptCacheAt = now;
    return this._systemPromptCache;
  }

  // ── Main entry: process any task/message ──────────────────────────────────

  async processTask(task) {
    const context = {
      task,
      agent: this,
      companyId: this.companyId,
      traceId: agentToolGatewayService.newTraceId(),
    };

    const result = await pipeline.execute(context, [
      resolveIntent,
      routeToTools,
      executeTools,
      handleFallback,
      validateReply,
    ]);

    if (result.earlyReturn) return result.earlyReturn;

    // Build and return final result
    this._taskLog.push({
      task: result.intentMessage,
      toolRounds: result.toolRounds || 0,
      tools: result.executedTools,
      repaired: result.repaired,
      presentedFromToolResults: false,
      timestamp: new Date(),
    });

    return {
      agentId: this.id,
      role: this.role,
      status: 'SUCCESS',
      result: {
        reply: result.finalReply,
        summary: result.finalReply,
        toolsUsed: result.executedTools.length > 0,
        toolRounds: result.toolRounds || 0,
        tools: result.executedTools,
        repaired: result.repaired,
        presentedFromToolResults: false,
        goalRun: result.intentContext?.activeGoal || null,
        modelSelection: this._lastModelSelection || null,
      },
      modelSelection: this._lastModelSelection || null,
      task,
    };
  }


  async _verifyToolGrounding(userMessage, draftReply, nativeTools = []) {
    if (!this._modelManager || nativeTools.length === 0) return null;
    const toolNames = nativeTools.map(tool => ({
      nativeName: tool.function?.name,
      internalName: tool.metadata?.internalName,
      description: tool.function?.description,
    }));
    const prompt = [
      {
        role: 'system',
        content: 'You are a strict agent-runtime verifier. Return JSON only. Decide whether the draft answer needs live tool grounding because it discusses current system state, company data, agents, tasks, tools, orders, inventory, customers, or actions. Do not use keywords; reason semantically.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          userMessage,
          draftReply,
          availableTools: toolNames,
          responseSchema: {
            requiresTool: 'boolean',
            suggestedTool: 'internal tool name or null',
            suggestedParams: 'object',
            reason: 'short string',
          },
        }),
      },
    ];

    const result = await this.generateWithLLMResult(prompt, {
      temperature: 0,
      maxTokens: 350,
    });
    const text = result?.text || '';
    const jsonText = text.includes('```')
      ? (text.match(/```(?:json)?([\s\S]+?)```/)?.[1] || text)
      : text;
    const parsed = toolExecutionEngine._safeJsonParse(jsonText.trim(), null);
    if (!parsed || typeof parsed !== 'object') return null;
    const validTools = new Set(toolNames.map(tool => tool.internalName));
    return {
      requiresTool: Boolean(parsed.requiresTool),
      suggestedTool: validTools.has(parsed.suggestedTool) ? parsed.suggestedTool : null,
      suggestedParams: parsed.suggestedParams && typeof parsed.suggestedParams === 'object'
        ? parsed.suggestedParams
        : {},
      reason: parsed.reason || null,
    };
  }

  // ── Goal decomposition (unchanged from original) ──────────────────────────

  decomposeGoal(goal) {
    return this._deterministicDecompose(goal);
  }

  async decomposeGoalWithLLM(goal) {
    if (this._modelManager) {
      try {
        const prompt = `أنت CEO Agent. فكّك هذا الهدف التجاري إلى 3-5 مهام قابلة للتنفيذ:
الهدف: "${goal}"
أرجع مصفوفة JSON فقط حيث كل مهمة تحتوي على: description (بالعربية), assignTo (SALES|SUPPORT|INVENTORY|SHIPPING), priority (1-3).
أرجع JSON فقط بدون أي نص إضافي.`;

        const response = await this.generateWithLLM(prompt, { temperature: 0.3, maxTokens: 500 });
        if (response) {
          let jsonText = response.trim();
          if (jsonText.includes('```')) {
            const m = jsonText.match(/```(?:json)?([\s\S]+?)```/);
            if (m?.[1]) jsonText = m[1].trim();
          }
          const parsed = JSON.parse(jsonText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            let taskId = 0;
            return parsed.map(t => ({
              id: `task_${++taskId}`,
              description: t.description || '',
              assignTo: t.assignTo || 'SALES',
              priority: t.priority || 1,
              dependencies: t.dependencies || [],
              status: 'PENDING',
            }));
          }
        }
      } catch (error) {
        console.warn('[CEOAgent] LLM decomposition failed, using rule-based decomposition:', error.message);
      }
    }
    return this._deterministicDecompose(goal);
  }

  _deterministicDecompose(goal) {
    const goalLower = (goal || '').toLowerCase();
    const tasks = [];
    let taskId = 0;
    const makeTask = (desc, role, priority, deps = []) => {
      const t = { id: `task_${++taskId}`, description: desc, assignTo: role, priority, dependencies: deps, status: 'PENDING' };
      tasks.push(t);
      return t;
    };

    if (/(?:sale|بيع|revenue|ارباح|promote|ترويج|campaign|حملة)/i.test(goalLower)) {
      const t1 = makeTask('تحليل الكتالوج الحالي ومستويات المخزون', 'INVENTORY', 1);
      const t2 = makeTask('تحديد أكثر المنتجات مبيعاً وإعداد العروض', 'SALES', 2, [t1.id]);
      makeTask('تجهيز لوجستيات الشحن للحجم المتوقع من الطلبات', 'SHIPPING', 2, [t1.id]);
      makeTask('إنشاء عروض خصم على المنتجات ذات الهامش المرتفع', 'SALES', 3, [t2.id]);
    } else if (/(?:support|دعم|complaint|شكوى|refund|استرجاع)/i.test(goalLower)) {
      const t1 = makeTask('مراجعة شكاوى العملاء المعلقة', 'SUPPORT', 1);
      makeTask('معالجة طلبات الاسترجاع المؤهلة', 'SUPPORT', 2, [t1.id]);
      makeTask('متابعة العملاء بعد الحل', 'SUPPORT', 3, [t1.id]);
    } else if (/(?:inventory|مخزون|stock|restock|تجديد)/i.test(goalLower)) {
      const t1 = makeTask('تدقيق مستويات المخزون الحالية', 'INVENTORY', 1);
      makeTask('تحديد العناصر منخفضة المخزون وإعداد قائمة الطلب', 'INVENTORY', 2, [t1.id]);
      makeTask('تحديث توفر المنتجات على المتجر', 'SALES', 3, [t1.id]);
    } else {
      makeTask('تحليل الوضع الحالي المرتبط بالهدف', 'SALES', 1);
      makeTask('إعداد خطة العمل بناءً على التحليل', 'SALES', 2, ['task_1']);
      makeTask('تنفيذ الخطة ومتابعة النتائج', 'SUPPORT', 3, ['task_2']);
    }
    return tasks;
  }

  async assignTasks(tasks) {
    const assignments = [];
    for (const task of tasks) {
      let agent = agentProvisioningService.listAgents(this.companyId)
        .find(a => a.role === task.assignTo && a.status === 'ACTIVE');
      if (!agent) {
        agent = agentProvisioningService.spawn(this.companyId, { role: task.assignTo, parentId: this.id });
      }
      assignments.push({
        taskId: task.id,
        agentId: agent.id,
        agentRole: agent.role,
        description: task.description,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      });
    }
    this._taskLog.push(...assignments);
    return assignments;
  }

  async orchestrate(goal) {
    const tasks = this.decomposeGoal(goal);
    const assignments = await this.assignTasks(tasks);
    return { goal, taskCount: tasks.length, tasks, assignments };
  }

  _failedReply(errorCode, reason, metadata = {}) {
    return {
      agentId: this.id,
      role: this.role,
      status: 'FAILED',
      errorCode,
      error: reason,
      result: {
        reply: '',
        summary: '',
        errorCode,
        error: reason,
        modelSelection: this._lastModelSelection || null,
        ...metadata,
      },
      modelSelection: this._lastModelSelection || null,
    };
  }

  // ── Deterministic planning helpers (non-chat orchestration) ───────────────

  getTaskLog() { return [...this._taskLog]; }
}

module.exports = CEOAgent;
module.exports._formatRelevancePrompt = _formatRelevancePrompt;
