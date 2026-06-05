const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { resolveToolPlan } = require('../../legacy-ai-agent/aiAgent/agentIntentRelevanceService');
const agentIntentClassifierService = require('../../legacy-ai-agent/aiAgent/agentIntentClassifierService');


const SERVICE_PATH = path.join(__dirname, '../../legacy-ai-agent/aiAgent/agentIntentRelevanceService.js');

describe('agent intent architecture guard', () => {
  test('keeps the relevance service behind the typed intent planner contract', () => {
    const source = fs.readFileSync(SERVICE_PATH, 'utf8');

    expect(source).toContain("require('./agentIntentPlannerService')");
    expect(source).toContain('buildIntentContract');
    expect(source).toContain('toToolPlan');
  });

  test('runtime classifier gate disables broad tool access when classification is unavailable', async () => {
    const allTools = ['order.create_draft', 'order.summary', 'order.lookup', 'agent.spawn',
      'skill.create', 'agent.list_agents', 'agent.read_state', 'audit.read',
      'product.search', 'inventory.check', 'sales.revenue'];
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue(null);

    const cases = [
      'اعمل تقرير عن الطلبات',
      'راجع اخر حاجة عملها الايجنت',
      'عايز ايجنت للرد على رسايل الفيس بوك',
      'اعمل مهارة لتحليل المنافسين',
      'ازيك',
      'كم المبيعات النهارده',
    ];

    try {
      for (const message of cases) {
        const plan = await resolveToolPlan({
          message,
          availableTools: allTools,
          context: { companyId: 'company_123', useLLMClassifier: true },
        });

        expect(plan.validation.valid).toBe(true);
        expect(plan.source).toBe('llm-classifier');
        expect(plan.primaryTool).toBeNull();
        expect(plan.requiresTool).toBe(false);
        expect(plan.allowedTools).toEqual([]);
        expect(plan.blockedReason).toBe('INTENT_CLASSIFICATION_UNAVAILABLE');
      }
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('prevention script blocks customer keyword fallback regressions', () => {
    const scriptPath = path.join(__dirname, '../../scripts/customer-intent-architecture-guard.js');
    expect(() => execFileSync(process.execPath, [scriptPath], {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf8',
    })).not.toThrow();
  });

  test('customer chat channels never use local keyword routes when classifier is unavailable', async () => {
    const availableTools = ['agent.handoff', 'order.lookup', 'customer.info', 'shipping.rates'];
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue(null);

    try {
      const plan = await resolveToolPlan({
        message: 'I want to return the product and get a refund for order 12345',
        availableTools,
        context: {
          companyId: 'company_123',
          channel: 'FACEBOOK',
          useLLMClassifier: true,
        },
      });

      expect(classifySpy).toHaveBeenCalled();
      expect(plan.source).toBe('llm-classifier');
      expect(plan.intent).toBe('general.chat');
      expect(plan.primaryTool).toBeNull();
      expect(plan.requiresTool).toBe(false);
      expect(plan.allowedTools).toEqual([]);
      expect(plan.blockedReason).toBe('INTENT_CLASSIFICATION_UNAVAILABLE');
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('customer chat channel routes only from structured classifier output', async () => {
    const availableTools = ['agent.handoff', 'order.lookup', 'customer.info'];
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'support.refund',
        confidence: 0.94,
        ambiguous: false,
        slots: {},
      });

    try {
      const plan = await resolveToolPlan({
        message: 'I want to return the product and get a refund for order 12345',
        availableTools,
        context: {
          companyId: 'company_123',
          channel: 'FACEBOOK',
          useLLMClassifier: true,
        },
      });

      expect(classifySpy).toHaveBeenCalledWith(expect.objectContaining({
        message: 'I want to return the product and get a refund for order 12345',
        companyId: 'company_123',
        availableTools,
      }));
      expect(classifySpy.mock.calls[0][0].context.keywordPolicyHint).toBeUndefined();
      expect(plan.source).toBe('llm-classifier');
      expect(plan.intent).toBe('support.refund');
      expect(plan.primaryTool).toBe('agent.handoff');
      expect(plan.requiresTool).toBe(true);
      expect(plan.classification.intent).toBe('support.refund');
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('durable goal continuation: product goal routes to product.create when ready', () => {
    const availableTools = ['product.create', 'product.search', 'inventory.check'];
    const context = {
      activeGoal: {
        id: 'goal-001',
        type: 'create_product',
        status: 'ready_to_execute',
        nextStep: 'execute_tool',
        executionParams: { name: 'تيشرت', price: 150 },
      },
    };

    const plan = resolveToolPlan({ message: 'كمل', availableTools, context });

    expect(plan.intent).toBe('goals.create_product');
    expect(plan.primaryTool).toBe('product.create');
    expect(plan.goalRunId).toBe('goal-001');
  });

  test('durable goal continuation: agent goal routes to agent.spawn when ready', () => {
    const availableTools = ['agent.spawn', 'skill.create', 'agent.read_state'];
    const context = {
      activeGoal: {
        id: 'goal-002',
        type: 'create_agent_with_skill',
        status: 'ready_to_execute',
        nextStep: 'execute_tool',
        executionParams: { agent: { role: 'SALES', name: 'Sales Bot' } },
      },
    };

    const plan = resolveToolPlan({ message: 'نفذ', availableTools, context });

    expect(plan.intent).toBe('goals.create_agent_with_skill');
    expect(plan.primaryTool).toBe('agent.spawn');
    expect(plan.goalRunId).toBe('goal-002');
  });

  test('durable goal not active: runtime classifier gate keeps tools disabled without a schema decision', async () => {
    const availableTools = ['agent.spawn', 'product.create', 'order.summary'];
    const context = {
      companyId: 'company_123',
      useLLMClassifier: true,
      activeGoal: {
        id: 'goal-003',
        type: 'create_product',
        status: 'completed',
      },
    };
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue(null);

    try {
      const plan = await resolveToolPlan({ message: 'اعمل حاجة تانية', availableTools, context });

      expect(plan.source).toBe('llm-classifier');
      expect(plan.primaryTool).toBeNull();
      expect(plan.requiresTool).toBe(false);
      expect(plan.allowedTools).toEqual([]);
      expect(plan.blockedReason).toBe('INTENT_CLASSIFICATION_UNAVAILABLE');
    } finally {
      classifySpy.mockRestore();
    }
  });
});
