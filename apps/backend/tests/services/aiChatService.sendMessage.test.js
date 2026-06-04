const mockAddMessage = jest.fn(async () => ({}));
const mockGetContext = jest.fn(async () => ({ recentMessages: [] }));
const mockEnsureSessionMemory = jest.fn(async () => ({}));
const mockRedisCache = new Map();
let mockCeoProcessResult = null;
const mockProcessTaskPayloads = [];
const mockLogIntentPlan = jest.fn(async () => ({}));

jest.mock('../../services/aiAgent/workingMemoryService', () => ({
  addMessage: mockAddMessage,
  getContext: mockGetContext,
  initSession: mockEnsureSessionMemory,
  clearSession: jest.fn(async () => true),
}));

jest.mock('../../services/rag/CorrectiveRAGEngine', () => ({
  query: jest.fn(async () => null),
}));

jest.mock('../../services/aiAgent/telemetryTracerService', () => ({
  startTrace: jest.fn(async () => null),
  endTrace: jest.fn(async () => null),
  startSpan: jest.fn(async () => null),
  endSpan: jest.fn(async () => null),
}));

jest.mock('../../services/aiRuntimeService', () => ({
  getModelManager: jest.fn(() => ({ name: 'mock-model-manager' })),
}));

jest.mock('../../services/redisCacheService', () => ({
  get: jest.fn(async key => mockRedisCache.get(key) || null),
  set: jest.fn(async (key, value) => {
    mockRedisCache.set(key, value);
    return true;
  }),
  del: jest.fn(async key => {
    mockRedisCache.delete(key);
    return true;
  }),
}));

jest.mock('../../services/aiAgent/agentReplyNormalizer', () => ({
  normalizeAgentReply: value => String(value || '').trim(),
}));

jest.mock('../../services/aiAgent/agentToolCallParser', () => ({
  containsInternalToolSyntax: () => false,
}));

jest.mock('../../services/aiAgent/agentToolGatewayService', () => ({
  logIntentPlan: mockLogIntentPlan,
  newTraceId: jest.fn(() => 'trace_test_1'),
}));

jest.mock('../../services/aiAgent/agentChatTranscriptService', () => ({
  appendMessage: jest.fn(async () => ({})),
  saveSession: jest.fn(async () => ({})),
  saveSessions: jest.fn(async () => ({})),
  listSessions: jest.fn(async () => []),
}));

jest.mock('../../services/aiAgent/agentManagerService', () => ({
  getManagerAgent: jest.fn(async () => ({
    id: 'agent_ceo_1',
    name: 'CEO Agent',
    role: 'CEO',
    model: 'minimaxai/minimax-m2.7',
    persona: {},
    policies: {},
    getTools: () => ['agent.read_state'],
    getSkills: () => [],
  })),
}));

jest.mock('../../services/aiAgent/CEOAgent', () => class MockCEOAgent {
  constructor(companyId, config = {}) {
    this.companyId = companyId;
    this.id = config.id || 'agent_ceo_1';
    this.name = config.name || 'CEO Agent';
    this.role = config.role || 'CEO';
    this.model = config.model || 'minimaxai/minimax-m2.7';
    this.allowedTools = new Set(config.allowedTools || []);
  }

  setModelManager(modelManager) {
    this.modelManager = modelManager;
  }

  async processTask() {
    mockProcessTaskPayloads.push(arguments[0]);
    return mockCeoProcessResult || {
      agentId: this.id,
      role: this.role,
      status: 'SUCCESS',
      result: {
        reply: 'المهارات موجودة.',
        modelSelection: { provider: 'NVIDIA', model: 'minimaxai/minimax-m2.7' },
      },
      modelSelection: { provider: 'NVIDIA', model: 'minimaxai/minimax-m2.7' },
    };
  }

  getInfo() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      companyId: this.companyId,
      model: this.model,
      selectedProvider: 'NVIDIA',
      selectedModel: 'minimaxai/minimax-m2.7',
      hasLLM: Boolean(this.modelManager),
    };
  }
});

const aiChatService = require('../../services/aiAgent/aiChatService');
const CorrectiveRAGEngine = require('../../services/rag/CorrectiveRAGEngine');

describe('aiChatService.sendMessage', () => {
  beforeEach(() => {
    mockCeoProcessResult = null;
    mockRedisCache.clear();
    mockProcessTaskPayloads.length = 0;
    mockAddMessage.mockClear();
    mockGetContext.mockClear();
    mockLogIntentPlan.mockClear();
    CorrectiveRAGEngine.query.mockClear();
  });

  test('saves assistant reply with model selection metadata', async () => {
    const result = await aiChatService.sendMessage(
      'company_1',
      'user_1',
      'هل المهارات موجودة؟',
      { user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    );

    expect(result.reply).toBe('المهارات موجودة.');
    expect(result.modelSelection).toEqual({ provider: 'NVIDIA', model: 'minimaxai/minimax-m2.7', keyId: null, keyName: null, selectedPool: null, activeProvider: null, manualOverride: false, error: null, message: null, retryAfter: null });
    expect(mockAddMessage).toHaveBeenCalledWith(
      'company_1',
      expect.stringContaining('company_1:user_1:'),
      expect.objectContaining({
        role: 'assistant',
        content: 'المهارات موجودة.',
        modelSelection: expect.objectContaining({ provider: 'NVIDIA', model: 'minimaxai/minimax-m2.7' }),
      })
    );
  });

  test('does not inject RAG context for generic ambiguous create turns', async () => {
    CorrectiveRAGEngine.query.mockResolvedValue({
      answer: 'Platform Sneakers بسعر 499 من سياق قديم',
    });

    await aiChatService.sendMessage(
      'company_ambiguous_guard',
      'user_ambiguous_guard',
      'اعمل واحد جديد',
      { user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    );

    expect(CorrectiveRAGEngine.query).not.toHaveBeenCalled();
    expect(mockProcessTaskPayloads).toHaveLength(1);
    expect(mockProcessTaskPayloads[0].description).toContain('[حارس النية لهذه الرسالة]');
    expect(mockProcessTaskPayloads[0].description).toContain('لا تستخدم بيانات RAG');
    expect(mockProcessTaskPayloads[0].description).not.toContain('Platform Sneakers');
  });

  test('explains when a direct-chat model is not agent-ready for tool routing', async () => {
    mockCeoProcessResult = {
      agentId: 'agent_ceo_1',
      role: 'CEO',
      status: 'FAILED',
      errorCode: 'AI_AGENT_LLM_UNAVAILABLE',
      result: {
        reply: '',
        modelSelection: {
          provider: 'GOOGLE',
          model: 'gemma-4-31b-it',
          error: 'MODEL_NOT_AGENT_READY',
        },
      },
      modelSelection: {
        provider: 'GOOGLE',
        model: 'gemma-4-31b-it',
        error: 'MODEL_NOT_AGENT_READY',
      },
    };

    await expect(aiChatService.sendMessage(
      'company_1',
      'user_1',
      'مين فريق التسويق؟',
      { user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    )).rejects.toMatchObject({
      code: 'AI_AGENT_LLM_UNAVAILABLE',
      publicMessage: expect.stringContaining('AI_AGENT_LLM_UNAVAILABLE'),
      modelSelection: expect.objectContaining({
        provider: 'GOOGLE',
        model: 'gemma-4-31b-it',
        error: 'MODEL_NOT_AGENT_READY',
      }),
    });
  });

  test('keeps short product follow-ups attached to the active goal run', async () => {
    const first = await aiChatService.sendMessage(
      'company_1',
      'user_1',
      'عايز نعمل منتج جديد\nكوتشي حريمي من 27 ل 41 المقاس\nالالوان ابيض اسود احمر\nأعمل وصف كويس ليه عشان هعمل عليه اعلان',
      { user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    );

    const price = await aiChatService.sendMessage('company_1', 'user_1', '499', {
      sessionId: first.session.id,
      user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' },
    });
    const stock = await aiChatService.sendMessage('company_1', 'user_1', 'اعمل لكل متغير 100', {
      sessionId: first.session.id,
      user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' },
    });
    await aiChatService.sendMessage('company_1', 'user_1', 'كمل', {
      sessionId: first.session.id,
      user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' },
    });

    expect(first.taskDetails.plannerOnly).toBeUndefined();
    expect(price.taskDetails.plannerOnly).toBeUndefined();
    expect(stock.taskDetails.plannerOnly).toBeUndefined();
    expect(mockProcessTaskPayloads).toHaveLength(4);

    const goalStates = [
      mockProcessTaskPayloads[0].intentContext.activeGoal,
      mockProcessTaskPayloads[1].intentContext.activeGoal,
      mockProcessTaskPayloads[2].intentContext.activeGoal,
      mockProcessTaskPayloads[3].intentContext.activeGoal,
    ];
    expect(goalStates[0]).toEqual(expect.objectContaining({
      type: 'create_product',
      status: 'collecting',
      missingFields: ['price'],
    }));
    expect(goalStates[1]).toEqual(expect.objectContaining({
      status: 'waiting_for_confirmation',
      collected: expect.objectContaining({ price: 499 }),
      nextStep: 'confirm_create_draft',
    }));
    expect(goalStates[2]).toEqual(expect.objectContaining({
      status: 'waiting_for_confirmation',
      collected: expect.objectContaining({ stockPerVariant: 100 }),
    }));
    expect(goalStates[3]).toEqual(expect.objectContaining({
      status: 'ready_to_execute',
      nextStep: 'execute_tool',
      executionParams: expect.objectContaining({
        name: 'كوتشي حريمي',
        price: 499,
        stock: 100,
        colors: ['ابيض', 'اسود', 'احمر'],
      }),
    }));
  });

  test('keeps agent creation corrections attached until explicit execution', async () => {
    const first = await aiChatService.sendMessage(
      'company_1',
      'user_1',
      [
        'عايز نعمل ايجنت يكون متخصص ف الرد علي رسايل الفيس بوك',
        'وعايز تخلي اسمه شرية',
        'والطريقة بتاعته في ود',
        'وكمان خلي عنده مهارة البيع ويكون شاطر ويحط هدف مع العميل اللي هو عمل اوردر ويمشي عليه لحد ما يوصل ليه',
      ].join('\n'),
      { user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    );

    const correction = await aiChatService.sendMessage('company_1', 'user_1', 'تمام بس اسمه شرين', {
      sessionId: first.session.id,
      user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' },
    });
    const question = await aiChatService.sendMessage('company_1', 'user_1', '؟', {
      sessionId: first.session.id,
      user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' },
    });
    await aiChatService.sendMessage('company_1', 'user_1', 'لبدء ف التنفيذ بس خلي الاسم شرين', {
      sessionId: first.session.id,
      user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' },
    });

    expect(first.taskDetails.plannerOnly).toBeUndefined();
    expect(correction.taskDetails.plannerOnly).toBeUndefined();
    expect(question.taskDetails.plannerOnly).toBeUndefined();
    expect(mockProcessTaskPayloads).toHaveLength(4);
    expect(mockLogIntentPlan).not.toHaveBeenCalled();

    const goalStates = [
      mockProcessTaskPayloads[0].intentContext.activeGoal,
      mockProcessTaskPayloads[1].intentContext.activeGoal,
      mockProcessTaskPayloads[2].intentContext.activeGoal,
      mockProcessTaskPayloads[3].intentContext.activeGoal,
    ];
    expect(goalStates[0]).toEqual(expect.objectContaining({
      type: 'create_agent_with_skill',
      status: 'waiting_for_confirmation',
      nextStep: 'confirm_agent_and_skill',
      collected: expect.objectContaining({
        agentName: 'شرية',
        role: 'SALES',
        channel: 'facebook',
      }),
      executionParams: expect.objectContaining({
        agent: expect.objectContaining({ name: 'شرية', role: 'SALES' }),
        skill: expect.objectContaining({ displayName: 'بيع وإنشاء مسودات طلبات عبر فيسبوك' }),
      }),
    }));
    expect(goalStates[1]).toEqual(expect.objectContaining({
      status: 'waiting_for_confirmation',
      nextStep: 'confirm_agent_and_skill',
      collected: expect.objectContaining({ agentName: 'شرين' }),
    }));
    expect(goalStates[2]).toEqual(expect.objectContaining({
      status: 'waiting_for_confirmation',
      nextStep: 'confirm_agent_and_skill',
      collected: expect.objectContaining({ agentName: 'شرين' }),
    }));
    expect(goalStates[3]).toEqual(expect.objectContaining({
      status: 'ready_to_execute',
      nextStep: 'execute_tool',
      collected: expect.objectContaining({ agentName: 'شرين' }),
      executionParams: expect.objectContaining({
        agent: expect.objectContaining({ name: 'شرين', role: 'SALES' }),
        skill: expect.objectContaining({
          displayName: 'بيع وإنشاء مسودات طلبات عبر فيسبوك',
          assignToAgentId: '$createdAgentId',
          allowedTools: ['product.search', 'customer.info', 'order.create_draft'],
          overwrite: true,
        }),
      }),
      plan: ['agent.spawn', 'skill.create'],
    }));
  });

  test('infers a Facebook sales agent name and order-draft skill without asking for the name', async () => {
    const first = await aiChatService.sendMessage(
      'company_1',
      'user_1',
      'عايز ايجنت للرد علي رسايل الفيس بوك وقادر علي عمل الاوردرات',
      { user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    );

    expect(first.taskDetails.plannerOnly).toBeUndefined();
    expect(mockProcessTaskPayloads).toHaveLength(1);
    expect(mockProcessTaskPayloads[0].intentContext.activeGoal).toEqual(expect.objectContaining({
      type: 'create_agent_with_skill',
      status: 'waiting_for_confirmation',
      missingFields: [],
      collected: expect.objectContaining({
        agentName: 'وكيل مبيعات فيسبوك',
        role: 'SALES',
        channel: 'facebook',
      }),
      executionParams: expect.objectContaining({
        agent: expect.objectContaining({
          name: 'وكيل مبيعات فيسبوك',
          role: 'SALES',
          templateSlug: 'sales-agent',
        }),
        skill: expect.objectContaining({
          displayName: 'بيع وإنشاء مسودات طلبات عبر فيسبوك',
          allowedTools: ['product.search', 'customer.info', 'order.create_draft'],
          overwrite: true,
        }),
      }),
    }));
  });

  test('executes ready agent goals when a long same-turn request says to use the tool now', async () => {
    const result = await aiChatService.sendMessage(
      'company_1',
      'user_1',
      'أنشئ وكيل اختبار باسم Codex Inline Agent. بدور SALES للرد على رسائل فيسبوك وتجهيز مسودات الطلبات فقط. الأدوات product.search, customer.info, order.create_draft. نفذ بالأداة ثم اذكر النتيجة.',
      { user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    );

    expect(result.taskDetails.plannerOnly).toBeUndefined();
    expect(mockProcessTaskPayloads).toHaveLength(1);
    expect(mockProcessTaskPayloads[0].intentContext.activeGoal).toEqual(expect.objectContaining({
      type: 'create_agent_with_skill',
      status: 'ready_to_execute',
      nextStep: 'execute_tool',
      collected: expect.objectContaining({
        agentName: 'Codex Inline Agent',
        role: 'SALES',
        channel: 'facebook',
      }),
      executionParams: expect.objectContaining({
        agent: expect.objectContaining({
          name: 'Codex Inline Agent',
          role: 'SALES',
        }),
        skill: expect.objectContaining({
          allowedTools: ['product.search', 'customer.info', 'order.create_draft'],
          assignToAgentId: '$createdAgentId',
        }),
      }),
      plan: ['agent.spawn', 'skill.create'],
    }));
  });

  test('passes goal state into the CEO Agent instead of writing planner-only replies', async () => {
    const first = await aiChatService.sendMessage(
      'company_1',
      'user_1',
      'عايز ايجنت للرد علي رسايل الفيس بوك وقادر علي عمل الاوردرات',
      { user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    );

    expect(first.taskDetails.plannerOnly).toBeUndefined();
    expect(mockLogIntentPlan).not.toHaveBeenCalled();
    expect(mockProcessTaskPayloads).toHaveLength(1);
    expect(mockProcessTaskPayloads[0].intentContext.activeGoal).toEqual(expect.objectContaining({
      type: 'create_agent_with_skill',
      status: 'waiting_for_confirmation',
      nextStep: 'confirm_agent_and_skill',
    }));
  });

  test('does not reopen agent creation when the user delegates a task to an existing agent', async () => {
    const result = await aiChatService.sendMessage(
      'company_1',
      'user_1',
      'كلف وكيل مبيعات فيسبوك يعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1',
      { user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    );

    expect(result.taskDetails?.plannerOnly).not.toBe(true);
    expect(result.taskDetails?.goalRun?.type).not.toBe('create_agent_with_skill');
    expect(mockProcessTaskPayloads).toHaveLength(1);
    expect(mockProcessTaskPayloads[0]).toEqual(expect.objectContaining({
      currentMessage: expect.stringContaining('كلف وكيل مبيعات فيسبوك'),
    }));
  });

  test('detaches a stale agent-creation goal when the next turn delegates to an existing agent', async () => {
    const first = await aiChatService.sendMessage(
      'company_1',
      'user_1',
      'عايز ايجنت للرد علي رسايل الفيس بوك وقادر علي عمل الاوردرات',
      { user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    );

    const delegated = await aiChatService.sendMessage(
      'company_1',
      'user_1',
      'كلف وكيل مبيعات فيسبوك يعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1',
      { sessionId: first.session.id, user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    );

    expect(first.taskDetails.plannerOnly).toBeUndefined();
    expect(delegated.taskDetails?.plannerOnly).not.toBe(true);
    expect(delegated.taskDetails?.goalRun?.type).not.toBe('create_agent_with_skill');
    expect(mockProcessTaskPayloads).toHaveLength(2);
    expect(mockProcessTaskPayloads[1].currentMessage).toContain('كلف وكيل مبيعات فيسبوك');
    expect(mockProcessTaskPayloads[1].intentContext.activeGoal).toBeNull();
  });

  test('detaches stale agent goal when the next turn is skill-only creation', async () => {
    const first = await aiChatService.sendMessage(
      'company_1',
      'user_1',
      [
        'عايز نعمل ايجنت يكون متخصص ف الرد علي رسايل الفيس بوك',
        'وعايز تخلي اسمه شرية',
        'وكمان خلي عنده مهارة البيع',
      ].join('\n'),
      { user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' } }
    );

    const skillOnly = await aiChatService.sendMessage(
      'company_1',
      'user_1',
      'اختبار إنشاء مهارة فعلية: أنشئ مهارة جديدة فقط. id: codex-smoke-skill. الاسم: Skill Smoke. الوصف: تقرأ حالة الوكلاء فقط. الأدوات المسموحة: agent.read_state, agent.list_agents.',
      {
        sessionId: first.session.id,
        user: { email: 'owner@example.com', role: 'COMPANY_ADMIN' },
      }
    );

    expect(first.taskDetails.plannerOnly).toBeUndefined();
    expect(skillOnly.taskDetails.plannerOnly).toBeUndefined();
    expect(mockProcessTaskPayloads).toHaveLength(2);
    expect(mockProcessTaskPayloads[1].intentContext.activeGoal).toBeNull();
  });
});
