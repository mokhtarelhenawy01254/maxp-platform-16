/**
 * @module CEOAgent
 * @description CEO Agent — Arabic-speaking business intelligence orchestrator.
 *
 * Refactored 2026-06-02: Pipeline execution (processTask) and system prompt 
 * builder (_getSystemPrompt) moved to BaseAgent. CEOAgent now adds ONLY:
 *   - Multi-agent orchestration (discussWithAgent, orchestrateMultiAgentWorkflow)
 *   - Task decomposition and sub-agent delegation
 *   - CEO-specific configuration factory
 *
 * Full pipeline per message is now inherited from BaseAgent:
 *   1. Load Soul (personality + rules) from AiSetting or default
 *   2. Build system prompt with Soul + available tools
 *   3. LLM call → native tool_calls when the selected model supports tools
 *   4. Execute real DB tools
 *   5. Follow-up LLM calls with tool results → final Arabic answer
 */

const BaseAgent = require('./BaseAgent');
const agentProvisioningService = require('./agentProvisioningService');
const agentProfileLoaderService = require('./agentProfileLoaderService');
const { normalizeAgentReply } = require('./agentReplyNormalizer');
const agentRunRuntimeService = require('./agentRunRuntimeService');
const toolExecutionEngine = require('./executors/toolExecutionEngine');

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
      allowedTools: config.allowedTools || (role === 'CEO' ? [] : []),
      allowedSkills: [],
      persona: { tone: 'professional', language: 'arabic', authority: 'full', ...config.persona },
      policies: config.policies || {},
    };
  }
}

class CEOAgent extends BaseAgent {
  constructor(companyId, config = {}) {
    const runtimeConfig = buildCEOAgentConfig(companyId, config);
    const allowedTools = [...new Set([
      ...(runtimeConfig.allowedTools || []),
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
        agent = await agentProvisioningService.spawn(this.companyId, { role: task.assignTo, parentId: this.id });
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
    this._appendToTaskLog(assignments);
    return assignments;
  }

  async orchestrate(goal) {
    const tasks = this.decomposeGoal(goal);
    const assignments = await this.assignTasks(tasks);
    return { goal, taskCount: tasks.length, tasks, assignments };
  }

  // ── Multi-agent orchestration (conversation broker) ──────────────────────

  async discussWithAgent({ specialistAgentId, topic, initialTask, maxRounds = 3, context = {} }) {
    const agentConversationBroker = require('./agentConversationBroker');

    const session = await agentConversationBroker.openSession({
      companyId: this.companyId,
      parentAgentId: this.id,
      specialistAgentId,
      topic,
      context,
      maxTurns: maxRounds * 2,
    });

    await agentConversationBroker.sendMessage(session.id, {
      fromAgentId: this.id,
      content: initialTask,
      role: 'user',
    });

    const response = await agentConversationBroker.awaitResponse(session.id, {
      specialistAgentId,
      taskDescription: initialTask,
    });

    return {
      sessionId: session.id,
      specialistAgentId,
      reply: response.reply,
      history: await agentConversationBroker.getHistory(session.id),
    };
  }

  async reviewAndRefine({ sessionId, feedback, specialistAgentId }) {
    const agentConversationBroker = require('./agentConversationBroker');

    await agentConversationBroker.requestRevision(sessionId, {
      feedback,
      fromAgentId: this.id,
    });

    const response = await agentConversationBroker.awaitResponse(sessionId, {
      specialistAgentId,
      taskDescription: feedback,
    });

    return {
      sessionId,
      reply: response.reply,
      history: await agentConversationBroker.getHistory(sessionId),
    };
  }

  async orchestrateMultiAgentWorkflow({ goal, agents, constraints = {} }) {
    const agentConversationBroker = require('./agentConversationBroker');
    const planSynthesisEngine = require('./planSynthesisEngine');
    planSynthesisEngine.setModelManager(this._modelManager);

    const inputs = [];
    const sessions = [];

    for (const agentConfig of agents) {
      const { agentId, role, task } = agentConfig;
      const discussion = await this.discussWithAgent({
        specialistAgentId: agentId,
        topic: goal,
        initialTask: task,
        maxRounds: 2,
        context: { role, goal },
      });

      inputs.push({
        agentRole: role,
        agentName: agentId,
        output: discussion.reply,
      });

      sessions.push(discussion.sessionId);

      await agentConversationBroker.closeSession(discussion.sessionId);
    }

    const synthesis = await planSynthesisEngine.synthesizePlan({
      goal,
      inputs,
      constraints,
      companyId: this.companyId,
    });

    return {
      goal,
      sessions,
      inputs,
      plan: synthesis.plan,
      summary: synthesis.summary,
      actionItems: synthesis.actionItems || [],
      completeness: synthesis.completeness,
      gaps: synthesis.gaps || [],
      modelUsed: synthesis.modelUsed,
    };
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
}

module.exports = CEOAgent;
