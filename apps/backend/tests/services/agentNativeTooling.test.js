jest.mock('../../legacy-ai-agent/aiAgent/agentSoulConfig', () => ({
  loadSoul: jest.fn(async () => ({
    soul: 'You are the manager agent for {companyName}.',
    rules: 'Use tools for current system state.',
    companyName: 'TestCo',
    enabledTools: ['agent.list_agents'],
  })),
}));

const mockProviderGenerateResponse = jest.fn();
const mockReadState = jest.fn(async () => ({
  manager: { id: 'ceo_company_123456', name: 'CEO Agent', role: 'CEO' },
  agents: [{ id: 'ceo_company_123456', name: 'CEO Agent', role: 'CEO', status: 'ACTIVE' }],
}));
const mockHireAgent = jest.fn(async (_companyId, request = {}) => ({
  success: true,
  agent: {
    id: 'agent_inventory_1',
    name: request.name || 'مخزوني',
    role: request.role || 'INVENTORY',
    status: 'ACTIVE',
  },
}));
const mockRunAgentTask = jest.fn(async () => {
  throw new Error('MISSING_TOOL: product.create is required before an agent can create products');
});
const mockAssignTask = jest.fn(async (_companyId, request = {}) => ({
  success: true,
  task: {
    id: 'task_handoff_1',
    title: request.title,
    assignTo: request.assignTo,
    metadata: request.metadata || {},
  },
}));
const mockCreateSkill = jest.fn(async (_companyId, request = {}) => ({
  id: request.id || 'content-writing',
  displayName: request.displayName || 'Content Writing',
  description: request.description || 'Create marketing content.',
  allowedTools: request.allowedTools || [],
  assignedTo: request.assignToAgentId ? { id: request.assignToAgentId } : null,
}));
const mockCreateDraft = jest.fn(async (_companyId, request = {}) => ({
  success: true,
  draftId: 'approval_order_1',
  approvalCode: '1234',
  status: 'PENDING',
  toolName: request.toolName || 'order.create_draft',
  params: request.params || {},
}));
const mockGetTodayAttendance = jest.fn(async () => ({
  date: new Date('2026-05-22T00:00:00.000Z'),
  totalEmployees: 1,
  present: 0,
  late: 0,
  absent: 1,
  records: [],
}));
const mockGetOrderByNumber = jest.fn(async (orderNumber) => ({
  id: 'order_1',
  orderNumber: orderNumber || '1001',
  status: 'PENDING',
  shippingAddress: 'Old address',
  customerAddress: 'Old address',
}));
const mockUpdateOrderStatus = jest.fn(async () => ({
  id: 'order_1',
  orderNumber: '1001',
  status: 'CONFIRMED',
}));
const mockCreateOrderFromConversation = jest.fn(async (data = {}) => ({
  id: 'order_confirmed_1',
  orderNumber: 'ORD-2026-0001',
  status: 'PENDING',
  paymentStatus: 'PENDING',
  subtotal: Number(data.productPrice || 0) * Number(data.quantity || 1),
  shipping: 50,
  discount: 0,
  total: (Number(data.productPrice || 0) * Number(data.quantity || 1)) + 50,
  currency: 'EGP',
  customerName: data.customerName,
  customerPhone: data.customerPhone,
  customerId: data.customerId || null,
  customer: data.customerId ? { id: data.customerId } : null,
}));
const mockRagQuery = jest.fn(async () => ({
  answer: null,
  sources: [],
  finalSource: 'EXHAUSTED',
  retrievalMode: 'exhausted',
  grading: { avgRelevance: 0, sufficient: false },
}));

jest.mock('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory', () => ({
  getProvider: jest.fn(() => ({
    generateResponse: mockProviderGenerateResponse,
  })),
}));

jest.mock('../../legacy-ai-agent/aiAgent/agentManagerService', () => ({
  readState: mockReadState,
  hireAgent: mockHireAgent,
  runAgentTask: mockRunAgentTask,
  assignTask: mockAssignTask,
}));

jest.mock('../../legacy-ai-agent/aiAgent/agentSkillAuthoringService', () => ({
  createSkill: mockCreateSkill,
}));

jest.mock('../../legacy-ai-agent/aiAgent/draftProposalService', () => ({
  createDraft: mockCreateDraft,
}));

jest.mock('../../services/hr/attendanceService', () => ({
  getTodayAttendance: mockGetTodayAttendance,
}));

jest.mock('../../services/orderService', () => ({
  getOrderByNumber: mockGetOrderByNumber,
  updateOrderStatus: mockUpdateOrderStatus,
  createOrderFromConversation: mockCreateOrderFromConversation,
}));

jest.mock('../../services/rag/CorrectiveRAGEngine', () => ({
  query: (...args) => mockRagQuery(...args),
}));

jest.mock('../../services/sharedDatabase', () => {
  const aiProviderLog = {
    create: jest.fn(async ({ data }) => ({
      id: 'agent_audit_1',
      createdAt: new Date('2026-05-26T00:00:00.000Z'),
      ...data,
    })),
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    deleteMany: jest.fn(async () => ({ count: 0 })),
  };
  const aiToolApprovalRequest = {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    update: jest.fn(async ({ where, data }) => ({
      id: where.id,
      ...data,
    })),
  };
  const prisma = { aiProviderLog, aiToolApprovalRequest };

  return {
    getSharedPrismaClient: jest.fn(() => prisma),
    getSharedPrismaClientAsync: jest.fn(async () => prisma),
  };
});

const {
  getNativeToolDefinitions,
  fromNativeToolName,
  executeTool,
} = require('../../legacy-ai-agent/aiAgent/agentToolRegistry');
const { resolveToolPlan, isToolRelevant } = require('../../legacy-ai-agent/aiAgent/agentIntentRelevanceService');
const {
  CONTRACT_SCHEMA_VERSION,
  INTENT_CONTRACT_SCHEMA,
  INTENT_POLICIES,
  buildIntentContract,
  validateContract,
} = require('../../legacy-ai-agent/aiAgent/agentIntentPlannerService');
const { getModelCapabilities } = require('../../legacy-ai-agent/aiAgent/agentModelCapabilityService');
const { normalizeAgentReply } = require('../../legacy-ai-agent/aiAgent/agentReplyNormalizer');
const {
  parseTextToolCalls,
  stripInternalToolSyntax,
} = require('../../legacy-ai-agent/aiAgent/agentToolCallParser');
const CEOAgent = require('../../legacy-ai-agent/aiAgent/CEOAgent');
const agentProvisioningService = require('../../legacy-ai-agent/aiAgent/agentProvisioningService');
const agentToolGatewayService = require('../../legacy-ai-agent/aiAgent/agentToolGatewayService');
const agentAuditTrailService = require('../../legacy-ai-agent/aiAgent/agentAuditTrailService');
const agentGoalRunService = require('../../legacy-ai-agent/aiAgent/agentGoalRunService');
const agentIntentClassifierService = require('../../legacy-ai-agent/aiAgent/agentIntentClassifierService');

describe('Native agent tooling', () => {
  beforeEach(() => {
    mockProviderGenerateResponse.mockReset();
    mockReadState.mockClear();
    mockHireAgent.mockClear();
    mockRunAgentTask.mockClear();
    mockAssignTask.mockClear();
    mockCreateSkill.mockClear();
    mockCreateDraft.mockClear();
    mockGetTodayAttendance.mockClear();
    mockGetOrderByNumber.mockClear();
    mockUpdateOrderStatus.mockClear();
    mockCreateOrderFromConversation.mockClear();
    mockRagQuery.mockReset();
    mockRagQuery.mockResolvedValue({
      answer: null,
      sources: [],
      finalSource: 'EXHAUSTED',
      retrievalMode: 'exhausted',
      grading: { avgRelevance: 0, sufficient: false },
    });
    agentProvisioningService._reset();
  });

  const expectResolvedIntent = async ({ message, availableTools, context = {}, intent, primaryTool, allowedTools = [] }) => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent,
        confidence: 0.8,
        ambiguous: false,
        slots: {},
      });
    try {
      const plan = await resolveToolPlan({
        message,
        availableTools,
        context: { companyId: 'company_123', useLLMClassifier: true, ...context }
      });
      expect(plan.intent).toBe(intent);
      if (primaryTool !== undefined) {
        expect(plan.primaryTool).toBe(primaryTool);
      }
      if (allowedTools && allowedTools.length) {
        for (const t of allowedTools) {
          expect(plan.allowedTools).toContain(t);
        }
      }
      return plan;
    } finally {
      classifySpy.mockRestore();
    }
  };

  test('classifies agent-ready model capabilities conservatively', () => {
    expect(getModelCapabilities('NVIDIA', 'openai/gpt-oss-120b').agentReady).toBe(true);
    expect(getModelCapabilities('NVIDIA', 'minimaxai/minimax-m2.7').agentReady).toBe(true);
    expect(getModelCapabilities('NVIDIA', 'meta/llama-3.1-8b-instruct').agentReady).toBe(false);
    const googleGemma = getModelCapabilities('GOOGLE', 'gemma-4-31b-it');
    expect(googleGemma.agentReady).toBe(false);
    expect(googleGemma.label).toBe('Chat only');
    expect(googleGemma.warnings.join(' ')).toContain('direct chat diagnostics');
    expect(getModelCapabilities('OPENROUTER', 'openrouter/free').agentReady).toBe(false);
    expect(getModelCapabilities('OLLAMA', 'llama3').nativeToolCalling).toBe(false);
  });

  test('exports safe native tool schemas mapped to internal tool names', () => {
    const tools = getNativeToolDefinitions(['agent.list_agents']);

    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe('agenttool__agent_list_agents');
    expect(fromNativeToolName(tools[0].function.name)).toBe('agent.list_agents');
    expect(tools[0].function.parameters.type).toBe('object');
  });

  test('exports audit.read as a structured read tool', () => {
    const tools = getNativeToolDefinitions(['audit.read']);

    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe('agenttool__audit_read');
    expect(tools[0].metadata.readOnly).toBe(true);
    expect(tools[0].function.parameters.properties.limit.type).toBe('integer');
  });

  test('exports product.create as a structured write tool schema', () => {
    const tools = getNativeToolDefinitions(['product.create']);

    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe('agenttool__product_create');
    expect(tools[0].metadata.readOnly).toBe(false);
    expect(tools[0].function.parameters.properties.colors.type).toBe('array');
    expect(tools[0].function.parameters.properties.sizes.type).toBe('array');
  });

  test('exports skill.create as a structured write tool schema', () => {
    const tools = getNativeToolDefinitions(['skill.create']);

    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe('agenttool__skill_create');
    expect(tools[0].metadata.readOnly).toBe(false);
    expect(tools[0].function.parameters.required).toEqual(
      expect.arrayContaining(['displayName', 'description'])
    );
    expect(tools[0].function.parameters.properties.triggerPhrases.type).toBe('array');
    expect(tools[0].function.parameters.properties.allowedTools.type).toBe('array');
  });

  test('exports agent.handoff as a structured human-in-the-loop tool schema', () => {
    const tools = getNativeToolDefinitions(['agent.handoff']);

    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe('agenttool__agent_handoff');
    expect(tools[0].metadata.readOnly).toBe(false);
    expect(tools[0].function.parameters.required).toEqual(
      expect.arrayContaining(['targetType', 'reason'])
    );
  });

  test('exports order.create_draft as a structured approval write tool schema', () => {
    const tools = getNativeToolDefinitions(['order.create_draft']);

    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe('agenttool__order_create_draft');
    expect(tools[0].metadata.readOnly).toBe(false);
    expect(tools[0].function.parameters.required).toEqual(
      expect.arrayContaining(['productName', 'productPrice', 'customerName', 'customerPhone'])
    );
    expect(tools[0].function.parameters.properties.productPrice.type).toBe('number');
    expect(tools[0].function.parameters.properties.quantity.type).toBe('integer');
  });

  test('exports order.create_confirmed as a direct structured order write schema', () => {
    const tools = getNativeToolDefinitions(['order.create_confirmed']);

    expect(tools).toHaveLength(1);
    expect(tools[0].function.name).toBe('agenttool__order_create_confirmed');
    expect(tools[0].metadata.readOnly).toBe(false);
    expect(tools[0].function.parameters.required).toEqual(
      expect.arrayContaining([
        'productName',
        'productPrice',
        'customerName',
        'customerPhone',
        'city',
        'confirmedByCustomer',
      ])
    );
    expect(tools[0].function.parameters.properties.productPrice.type).toBe('number');
    expect(tools[0].function.parameters.properties.quantity.type).toBe('integer');
    expect(tools[0].function.parameters.properties.confirmedByCustomer.type).toBe('boolean');
  });

  test('executes order.create_confirmed as a real order and returns structured evidence', async () => {
    const result = await executeTool('company_123456', 'order.create_confirmed', {
      conversationId: 'conv_fb_confirmed',
      customerId: 'cust_fb_confirmed',
      productName: 'Swan High Skotch',
      productPrice: 499,
      quantity: 1,
      productSize: '42',
      customerName: 'Ahmed Confirmed',
      customerPhone: '01000000000',
      city: 'Cairo',
      confirmedByCustomer: true,
      notes: 'Messenger confirmed order.',
    });

    expect(result.success).toBe(true);
    expect(mockCreateOrderFromConversation).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'company_123456',
      conversationId: 'conv_fb_confirmed',
      customerId: 'cust_fb_confirmed',
      productName: 'Swan High Skotch',
      productPrice: 499,
      quantity: 1,
      productSize: '42',
      customerName: 'Ahmed Confirmed',
      customerPhone: '01000000000',
      city: 'Cairo',
    }));
    expect(result.result).toEqual(expect.objectContaining({
      status: 'ORDER_CREATED',
      orderCreated: true,
      draft: false,
      requiresApproval: false,
      orderId: 'order_confirmed_1',
      orderNumber: 'ORD-2026-0001',
      orderStatus: 'PENDING',
      paymentStatus: 'PENDING',
      total: 549,
      currency: 'EGP',
      customerName: 'Ahmed Confirmed',
      customerPhone: '01000000000',
    }));
    expect(result.result).not.toHaveProperty('approvalCode');
    expect(result.result).not.toHaveProperty('draftId');
  });

  test('does not create a real order until customer confirmation is explicit', async () => {
    const result = await executeTool('company_123456', 'order.create_confirmed', {
      productName: 'Swan High Skotch',
      productPrice: 499,
      quantity: 1,
      customerName: 'Ahmed Confirmed',
      customerPhone: '01000000000',
      city: 'Cairo',
      confirmedByCustomer: false,
    });

    expect(result.success).toBe(true);
    expect(mockCreateOrderFromConversation).not.toHaveBeenCalled();
    expect(result.result).toEqual(expect.objectContaining({
      status: 'NEEDS_CUSTOMER_CONFIRMATION',
      orderCreated: false,
      draft: false,
      requiresApproval: false,
      missingFields: ['confirmedByCustomer'],
    }));
  });

  test('cleans Messenger test prefixes and availability words from inventory parameters', async () => {
    const productName = '\u0628\u0644\u0627\u062a\u0641\u0648\u0631\u0645 \u0633\u0646\u064a\u0643\u0631\u0632 Platform Sneakers';
    const productColor = '\u0627\u0633\u0648\u062f \u0641\u064a \u0627\u0628\u064a\u0636';
    const message = [
      '\u0627\u062e\u062a\u0628\u0627\u0631 \u0628\u0639\u062f \u0627\u0644\u0646\u0634\u0631 b050c9ce:',
      productName,
      '\u0645\u0642\u0627\u0633 42',
      `\u0644\u0648\u0646 ${productColor} \u0645\u0648\u062c\u0648\u062f\u061f`,
    ].join(' ');
    const executeSpy = jest.spyOn(agentToolGatewayService, 'execute').mockResolvedValue({
      success: true,
      readOnly: true,
      result: {
        status: 'AVAILABLE',
        productName,
        availableSizes: ['41'],
        requestedSize: '42',
      },
    });
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'inventory',
        confidence: 0.96,
        ambiguous: false,
        slots: {},
      });
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [{
          id: 'call_inventory_1',
          type: 'function',
          function: {
            name: 'agenttool__inventory_check',
            arguments: JSON.stringify({
              productNameOrSku: productName,
              productSize: '42',
              productColor,
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'Based on system data, size 42 is not available.',
        text: () => 'Based on system data, size 42 is not available.',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      id: 'agent_facebook',
      name: 'Facebook Agent',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['inventory.check', 'product.search'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask({
        description: message,
        currentMessage: message,
        intentMessage: message,
        intentContext: { channel: 'FACEBOOK' },
      });

      expect(result.status).toBe('SUCCESS');
      expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({
        tool: 'inventory.check',
        params: {
          productNameOrSku: productName,
          productSize: '42',
          productColor,
        },
      }));
    } finally {
      executeSpy.mockRestore();
      classifySpy.mockRestore();
    }
  });

  test('order lifecycle write tools create approval drafts instead of directly changing orders', async () => {
    const cases = [
      ['order.confirm', { orderId: '1001', notes: 'customer confirmed' }],
      ['order.cancel', { orderId: '1001', reason: 'customer requested cancellation' }],
      ['order.refund', { orderId: '1001', refundAmount: 25, reason: 'damaged item' }],
      ['shipping.update', { orderId: '1001', address: 'New address' }],
    ];

    for (const [toolName, params] of cases) {
      const result = await executeTool('company_123456', toolName, params);
      expect(result.success).toBe(true);
      expect(result.result).toEqual(expect.objectContaining({
        draft: true,
        requiresApproval: true,
        toolName,
      }));
    }

    expect(mockCreateDraft).toHaveBeenCalledTimes(cases.length);
    expect(mockCreateDraft.mock.calls.map((call) => call[1].toolName)).toEqual(
      cases.map(([toolName]) => toolName)
    );
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
  });

  test('routes attendance questions only to the HR attendance tool', async () => {
    await expectResolvedIntent({
      message: 'عندنا موظفين محضروش النهارده؟',
      availableTools: ['agent.list_agents', 'company.snapshot', 'hr.attendance_today'],
      intent: 'hr.attendance.today',
      primaryTool: 'hr.attendance_today',
      allowedTools: ['hr.attendance_today'],
    });
  });

  test('routes employee count today questions to HR attendance data', async () => {
    await expectResolvedIntent({
      message: 'عايز اعرف احنا عندنا كم موظف النهارده',
      availableTools: ['agent.list_agents', 'company.snapshot', 'hr.attendance_today'],
      intent: 'hr.attendance.today',
      allowedTools: ['hr.attendance_today'],
    });
  });

  test('routes audit trail questions to audit.read instead of agent lists', async () => {
    const plan = await expectResolvedIntent({
      message: 'اعرض آخر 5 عمليات قام بها الوكلاء اليوم واذكر الأداة أو القرار',
      availableTools: ['audit.read', 'agent.list_agents', 'agent.read_state'],
      intent: 'audit.read',
      primaryTool: 'audit.read',
      allowedTools: ['audit.read'],
    });
    expect(plan.blockedTools).toEqual(['agent.list_agents', 'agent.read_state']);
  });

  test('routes natural audit follow-ups to audit.read instead of agent roster reads', async () => {
    const variants = [
      'راجع اخر حاجة عملها الايجنت',
      'راجع آخر حاجة عملها الوكيل',
    ];

    for (const message of variants) {
      const plan = await expectResolvedIntent({
        message,
        availableTools: ['audit.read', 'agent.list_agents', 'agent.read_state'],
        intent: 'audit.read',
        primaryTool: 'audit.read',
        allowedTools: ['audit.read'],
      });
      expect(plan.blockedTools).toEqual(['agent.list_agents', 'agent.read_state']);
    }
  });

  test('keeps explicit HR questions from being treated as pending agent follow-ups', async () => {
    await expectResolvedIntent({
      message: 'مين الموظفين اللي محضروش النهارده؟',
      availableTools: ['agent.list_agents', 'agent.read_state', 'company.snapshot', 'hr.attendance_today'],
      context: {
        recentMessages: [
          { role: 'user', content: 'عندنا كام ايجنت حاليا؟' },
          { role: 'assistant', content: 'قرأت قائمة الوكلاء من النظام الحالي.' },
        ],
      },
      intent: 'hr.attendance.today',
      primaryTool: 'hr.attendance_today',
      allowedTools: ['hr.attendance_today'],
    });
  });

  test('keeps agent-management intent isolated from old HR summary text', async () => {
    const availableTools = [
      'hr.attendance_today',
      'agent.list_agents',
      'agent.read_state',
      'agent.spawn',
      'agent.update_profile',
      'agent.assign_task',
      'agent.run_task',
    ];
    await expectResolvedIntent({
      message: 'تمام اعمل وكيل للمخزون وسمية وقولي اسمه ايه وخلي يقوم بالاعمال دي',
      availableTools,
      context: {
        recentMessages: [
          { role: 'user', content: 'عايز اعرف مين اللي غايب النهارده؟' },
          { role: 'assistant', content: 'تقرير الحضور: يوجد موظف غائب.' },
        ],
      },
      intent: 'agents.manage',
      allowedTools: ['agent.spawn'],
    });
  });

  test('inherits recent agent proposal for short confirmation turns', async () => {
    const plan = await expectResolvedIntent({
      message: 'تمام ابدء بعد ما تنشاء عرفني هقولك تفاصيل المنتج اللي عايز اضيفه',
      availableTools: [
        'agent.list_agents',
        'agent.read_state',
        'agent.spawn',
        'product.search',
        'inventory.check',
      ],
      context: {
        recentMessages: [
          {
            role: 'assistant',
            content: 'اسم الوكيل المقترح: "مخزوني". الدور: INVENTORY. هل توافق على الاسم والمهام؟',
          },
          {
            role: 'user',
            content: 'تمام ابدء بعد ما تنشاء عرفني هقولك تفاصيل المنتج اللي عايز اضيفه',
          },
        ],
      },
      intent: 'agents.manage',
      allowedTools: ['agent.spawn'],
    });
    expect(plan.allowedTools).not.toContain('product.search');
  });

  test('keeps product-image upload wording out of implementation advice', async () => {
    const plan = await expectResolvedIntent({
      message: 'عايز نضيف كوتشي حريمي جديد اسمه كوتشي سوان، وبعد ما تخلص اديني لينك المنتج وبالنسبه للصور هبقي ارفعها لك',
      availableTools: [
        'agent.list_agents',
        'agent.read_state',
        'agent.assign_task',
        'agent.run_task',
        'agent.spawn',
        'agent.update_profile',
        'product.create',
        'product.search',
      ],
      context: {
        recentMessages: [
          {
            role: 'assistant',
            content: 'تم إنشاء الوكيل الجديد Wofod Product Creator. الوكيل جاهز يشتغل دلوقتي. عايز تطلب منه يضيف منتج؟',
          },
        ],
      },
      intent: 'agents.run_task',
      allowedTools: ['agent.run_task'],
    });
    expect(plan.allowedTools).not.toContain('product.search');
  });

  test('routes direct product creation to product.create', async () => {
    await expectResolvedIntent({
      message: 'عايز نضيف كوتشي جديد اسمه كوتشي سوان بسعر 449',
      availableTools: ['product.create', 'product.search', 'inventory.check'],
      intent: 'products.manage',
      primaryTool: 'product.create',
      allowedTools: ['product.create'],
    });
  });

  test('routes direct order creation to order.create_draft', async () => {
    await expectResolvedIntent({
      message: 'اعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1',
      availableTools: ['order.create_draft', 'order.summary', 'order.lookup', 'product.search', 'customer.info'],
      intent: 'orders.create_draft',
      primaryTool: 'order.create_draft',
      allowedTools: ['order.create_draft', 'product.search', 'customer.info'],
    });
  });

  test('routes confirmed Facebook customer orders to order.create_confirmed', async () => {
    await expectResolvedIntent({
      message: 'تمام أكد الطلب على نفس البيانات: Swan High Skotch مقاس 42، اسمي أحمد، رقمي 01000000000، القاهرة.',
      availableTools: ['order.create_confirmed', 'order.create_draft', 'order.lookup', 'product.search', 'customer.info'],
      context: { channel: 'FACEBOOK' },
      intent: 'orders.create_confirmed',
      primaryTool: 'order.create_confirmed',
      allowedTools: ['order.create_confirmed', 'product.search', 'customer.info'],
    });
  });

  test('routes order report requests to order.summary instead of order draft creation', async () => {
    const variants = [
      'اعمل تقرير عن الطلبات',
      'تقرير الطلبات النهارده',
      'هات ملخص الطلبات',
      'اعمل report عن orders',
    ];

    for (const message of variants) {
      const plan = await expectResolvedIntent({
        message,
        availableTools: ['order.create_draft', 'order.summary', 'order.lookup', 'order.recentList'],
        intent: 'orders',
        primaryTool: 'order.summary',
        allowedTools: ['order.summary', 'order.lookup', 'order.recentList'],
      });
      expect(plan.allowedTools).not.toContain('order.create_draft');
      expect(plan.missingSlots).toEqual([]);
    }
  });

  test('keeps non-channel local routes for order status, shipping, and support-sensitive admin checks', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValueOnce({ intent: 'orders', confidence: 0.95, ambiguous: false, slots: {} })
      .mockResolvedValueOnce({ intent: 'shipping.rates', confidence: 0.95, ambiguous: false, slots: {} })
      .mockResolvedValueOnce({ intent: 'support.refund', confidence: 0.95, ambiguous: false, slots: {} })
      .mockResolvedValueOnce({ intent: 'support.refund', confidence: 0.95, ambiguous: false, slots: {} })
      .mockResolvedValueOnce({ intent: 'support.complaint', confidence: 0.95, ambiguous: false, slots: {} });

    try {
      const orderPlan = await resolveToolPlan({
        message: 'عايز أعرف الأوردر TEST-123 وصل فين؟',
        availableTools: ['order.summary', 'order.lookup', 'order.recentList'],
        context: { companyId: 'company_123', useLLMClassifier: true },
      });
      expect(orderPlan.intent).toBe('orders');
      expect(orderPlan.primaryTool).toBe('order.lookup');
      expect(orderPlan.requiresTool).toBe(true);

      const shippingPlan = await resolveToolPlan({
        message: 'الشحن للقاهرة كام وبيوصل في قد إيه؟',
        availableTools: ['shipping.rates'],
        context: { companyId: 'company_123', useLLMClassifier: true },
      });
      expect(shippingPlan.intent).toBe('shipping.rates');
      expect(shippingPlan.primaryTool).toBe('shipping.rates');
      expect(shippingPlan.requiresTool).toBe(true);

      const refundPlan = await resolveToolPlan({
        message: 'عايز أرجع المنتج واسترد فلوسي.',
        availableTools: ['agent.handoff', 'order.lookup', 'customer.info'],
        context: { companyId: 'company_123', useLLMClassifier: true },
      });
      expect(refundPlan.intent).toBe('support.refund');
      expect(refundPlan.primaryTool).toBe('agent.handoff');
      expect(refundPlan.decision).toBe('delegate');

      const returnInsteadOfExchangePlan = await resolveToolPlan({
        message: 'طيب خلاص انا غيرت رأيي، عايز ارتجاع بدل الاستبدال. الجزمة مش مناسبة والفلوس بترجع ازاي؟',
        availableTools: ['agent.handoff', 'order.lookup', 'customer.info'],
        context: { companyId: 'company_123', useLLMClassifier: true },
      });
      expect(returnInsteadOfExchangePlan.intent).toBe('support.refund');
      expect(returnInsteadOfExchangePlan.primaryTool).toBe('agent.handoff');
      expect(returnInsteadOfExchangePlan.decision).toBe('delegate');

      const complaintPlan = await resolveToolPlan({
        message: 'FB-043-COMPLAINT-FIX-173015: المنتج وصل بايظ والخامة وحشة، أعمل إيه؟',
        availableTools: ['agent.handoff', 'product.create', 'order.lookup', 'customer.info'],
        context: { companyId: 'company_123', useLLMClassifier: true },
      });
      expect(complaintPlan.intent).toBe('support.complaint');
      expect(complaintPlan.primaryTool).toBe('agent.handoff');
      expect(complaintPlan.decision).toBe('delegate');
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent uses a compact customer prompt after Messenger handoff tools', async () => {
    const largePersonaMarker = 'FULL_PERSONA_MARKER '.repeat(600);
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'support.exchange',
        confidence: 0.95,
        ambiguous: false,
        slots: {},
      });
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_handoff_1',
          type: 'function',
          function: {
            name: 'agenttool__agent_handoff',
            arguments: JSON.stringify({
              targetType: 'human',
              reason: 'customer_exchange_request',
              summary: 'OLD_IMAGE_MARKER hallucinated order ID fb6ea73a from stale context.',
              conversationId: 'conv_fb_exchange_1',
              customerId: 'cust_fb_exchange_1',
              priority: 'medium',
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'Support will review your exchange request.',
        text: () => 'Support will review your exchange request.',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'Facebook Sales Support',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['agent.handoff', 'order.lookup', 'customer.info'],
      persona: {
        agentInstructions: largePersonaMarker,
        toolsInstructions: largePersonaMarker,
        skillInstructions: [],
      },
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask({
        description: 'Previous customer request OLD_IMAGE_MARKER asked for product photos.\nCustomer: I want to exchange the order because the size is too tight.',
        currentMessage: 'I want to exchange the order because the size is too tight.',
        intentMessage: 'I want to exchange the order because the size is too tight.',
        conversationId: 'conv_fb_exchange_1',
        intentContext: { channel: 'FACEBOOK', customerId: 'cust_fb_exchange_1' },
      });

      expect(result.status).toBe('SUCCESS');
      expect(mockAssignTask).toHaveBeenCalledWith('company_123456', expect.objectContaining({
        assignTo: 'HUMAN',
      }));
      const handoffRequest = mockAssignTask.mock.calls[0][1];
      expect(handoffRequest.description).toContain('I want to exchange the order because the size is too tight.');
      expect(JSON.stringify(handoffRequest)).not.toContain('OLD_IMAGE_MARKER');
      expect(JSON.stringify(handoffRequest)).not.toContain('fb6ea73a');
      const promptArg = mockProviderGenerateResponse.mock.calls[1][0];
      const renderedPrompt = JSON.stringify(promptArg);
      expect(renderedPrompt).not.toContain('FULL_PERSONA_MARKER');
      expect(renderedPrompt).not.toContain('OLD_IMAGE_MARKER');
      expect(renderedPrompt).toContain('I want to exchange the order because the size is too tight.');
      expect(renderedPrompt).toContain('do not start with a fresh greeting');
      expect(renderedPrompt).toContain('multiple distinct customer-visible asks');
      expect(renderedPrompt).toContain('do not silently collapse the reply to only the primary tool action');
      expect(renderedPrompt).toContain('also address any other latest-message ask');
      expect(renderedPrompt.length).toBeLessThan(6000);
      expect(renderedPrompt).toContain('customer-facing');
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent adds RAG policy evidence to multi-ask Messenger handoff replies', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'support.exchange',
        confidence: 0.95,
        ambiguous: false,
        slots: {},
      });
    mockRagQuery.mockResolvedValue({
      answer: 'Based on available information: Returns can be requested within 7 days if the item is unused.',
      sources: [{
        content: 'Policy content: Returns can be requested within 7 days if the item is unused.',
        source: 'HYBRID_KNOWLEDGE',
        relevance: 0.91,
        metadata: {
          type: 'policy',
          id: 'policy-return-window',
          title: 'Returns policy',
          category: 'returns',
          version: 2,
        },
      }],
      finalSource: 'HYBRID_KNOWLEDGE',
      retrievalMode: 'hybrid',
      grading: { avgRelevance: 0.91, sufficient: true },
    });
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_handoff_multi_ask_1',
          type: 'function',
          function: {
            name: 'agenttool__agent_handoff',
            arguments: JSON.stringify({
              targetType: 'human',
              reason: 'customer_exchange_request',
              summary: 'Customer wants exchange support and asks about the return policy.',
              conversationId: 'conv_fb_multi_ask_1',
              customerId: 'cust_fb_multi_ask_1',
              priority: 'medium',
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'Support will review the exchange request and the return policy evidence is available.',
        text: () => 'Support will review the exchange request and the return policy evidence is available.',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'Facebook Sales Support',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['agent.handoff', 'order.lookup', 'customer.info'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const currentMessage = 'I need to exchange size 41 for 42, and if 42 is unavailable explain the return policy.';
      const result = await agent.processTask({
        description: `Customer: ${currentMessage}`,
        currentMessage,
        intentMessage: currentMessage,
        conversationId: 'conv_fb_multi_ask_1',
        intentContext: { channel: 'FACEBOOK', customerId: 'cust_fb_multi_ask_1' },
      });

      expect(result.status).toBe('SUCCESS');
      expect(mockRagQuery).toHaveBeenCalledWith(
        'company_123456',
        currentMessage,
        expect.objectContaining({
          customerId: 'cust_fb_multi_ask_1',
          sourceOrder: ['HYBRID_KNOWLEDGE', 'FAQ_DB', 'POLICY_DB'],
        }),
      );
      const promptArg = mockProviderGenerateResponse.mock.calls[1][0];
      const renderedPrompt = JSON.stringify(promptArg);
      expect(renderedPrompt).toContain('knowledge.retrieve');
      expect(renderedPrompt).toContain('Returns can be requested within 7 days');
      expect(renderedPrompt).toContain('HYBRID_KNOWLEDGE');
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent repairs customer handoff execution when the first reply model call is unavailable', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'support.exchange',
        confidence: 0.9,
        ambiguous: false,
        slots: {},
      });
    const agent = new CEOAgent('company_123456', {
      name: 'Facebook Sales Support',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['agent.handoff', 'order.lookup', 'customer.info'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });
    const generationSpy = jest.spyOn(agent, 'generateWithLLMResult')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        text: 'Support will review your exchange request.',
        toolCalls: [],
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
      });

    try {
      const result = await agent.processTask({
        description: 'Previous customer request OLD_IMAGE_MARKER asked for product photos.\nCustomer: I need to exchange size 41 for 42.',
        currentMessage: 'I need to exchange size 41 for 42.',
        intentMessage: 'I need to exchange size 41 for 42.',
        conversationId: 'conv_fb_exchange_repair_1',
        intentContext: { channel: 'FACEBOOK', customerId: 'cust_fb_exchange_repair_1' },
      });

      expect(result.status).toBe('SUCCESS');
      expect(mockAssignTask).toHaveBeenCalledWith('company_123456', expect.objectContaining({
        assignTo: 'HUMAN',
      }));
      expect(result.result.tools).toEqual([
        expect.objectContaining({ tool: 'agent.handoff', success: true, modelClassified: true, repaired: true }),
      ]);
      const repairPrompt = JSON.stringify(generationSpy.mock.calls[1][0]);
      expect(repairPrompt).toContain('I need to exchange size 41 for 42.');
      expect(repairPrompt).not.toContain('OLD_IMAGE_MARKER');
    } finally {
      generationSpy.mockRestore();
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent does not block customer return handoff replies as product creation claims', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'support.refund',
        confidence: 0.96,
        ambiguous: false,
        slots: {},
      });
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_handoff_refund_1',
          type: 'function',
          function: {
            name: 'agenttool__agent_handoff',
            arguments: JSON.stringify({
              targetType: 'human',
              reason: 'customer_refund_request',
              summary: 'Customer wants to return the product and get a refund.',
              conversationId: 'conv_fb_refund_1',
              customerId: 'cust_fb_refund_1',
              priority: 'medium',
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'تم إرسال طلب ارتجاع المنتج لفريق الدعم لمراجعته. هنحتاج مراجعة الطلب وحالة المنتج قبل تأكيد الخطوة التالية.',
        text: () => 'تم إرسال طلب ارتجاع المنتج لفريق الدعم لمراجعته. هنحتاج مراجعة الطلب وحالة المنتج قبل تأكيد الخطوة التالية.',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'Facebook Sales Support',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['agent.handoff', 'order.lookup', 'customer.info'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask({
        description: 'عايز أرجع المنتج واسترد فلوسي.',
        currentMessage: 'عايز أرجع المنتج واسترد فلوسي.',
        conversationId: 'conv_fb_refund_1',
        intentContext: { channel: 'FACEBOOK', customerId: 'cust_fb_refund_1' },
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.result.reply).toContain('ارتجاع');
      expect(mockAssignTask).toHaveBeenCalledWith('company_123456', expect.objectContaining({
        assignTo: 'HUMAN',
      }));
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('routes explicit specialist delegation to agent.run_task instead of a new agent goal', async () => {
    await expectResolvedIntent({
      message: 'كلف وكيل مبيعات فيسبوك يعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1',
      availableTools: ['agent.run_task', 'agent.list_agents', 'agent.read_state', 'order.create_draft'],
      intent: 'agents.run_task',
      primaryTool: 'agent.run_task',
      allowedTools: ['agent.run_task', 'agent.list_agents', 'agent.read_state'],
    });
  });

  test('keeps scored router evidence for mixed-intent decisions', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'agents.run_task',
        confidence: 0.92,
        ambiguous: false,
        slots: {},
        alternatives: [{ intent: 'orders.create_draft', confidence: 0.82 }],
      });

    try {
      const plan = await resolveToolPlan({
        message: 'كلف وكيل مبيعات فيسبوك يعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1',
        availableTools: ['agent.run_task', 'agent.list_agents', 'agent.read_state', 'order.create_draft'],
        context: { companyId: 'company_123456', useLLMClassifier: true },
      });

      expect(plan.source).toBe('llm-classifier');
      expect(plan.classification).toEqual(expect.objectContaining({
        intent: 'agents.run_task',
        confidence: 0.92,
      }));
      expect(plan.selectionScore).toBe(92);
      expect(plan.alternatives).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ intent: 'orders.create_draft', confidence: 0.82 }),
        ])
      );
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('runtime intent gateway disables keyword tool execution when classifier is unavailable', async () => {
    const agentIntentClassifierService = require('../../legacy-ai-agent/aiAgent/agentIntentClassifierService');
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValueOnce(null);

    try {
      const plan = await resolveToolPlan({
        message: 'عندنا كام ايجنت حاليا؟',
        availableTools: ['agent.list_agents', 'agent.read_state'],
        context: {
          companyId: 'company_123456',
          useLLMClassifier: true,
        },
      });

      expect(classifySpy).toHaveBeenCalled();
      expect(plan.source).toBe('llm-classifier');
      expect(plan.requiresTool).toBe(false);
      expect(plan.allowedTools).toEqual([]);
      expect(plan.blockedReason).toBe('INTENT_CLASSIFICATION_UNAVAILABLE');
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('returns a typed 2026 intent contract for approval-required order drafts', async () => {
    const plan = await expectResolvedIntent({
      message: 'اعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1',
      availableTools: ['order.create_draft', 'product.search', 'customer.info'],
      intent: 'orders.create_draft',
    });

    expect(plan.schemaVersion).toBe(CONTRACT_SCHEMA_VERSION);
    expect(plan.contract).toEqual(expect.objectContaining({
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      intent: 'orders.create_draft',
      decision: 'execute_tool',
      actionType: 'write',
      riskLevel: 'high',
      nextState: 'create_order_draft_pending_approval',
      validation: { valid: true, errors: [] },
    }));
    expect(plan.requiredSlots).toEqual([
      'productName',
      'productPrice',
      'customerName',
      'customerPhone',
    ]);
    expect(plan.guardrails).toEqual(expect.arrayContaining([
      'tool_allowlist',
      'schema_validation',
      'human_approval',
      'conflict_check',
      'audit_trail',
    ]));
  });

  test('intent relevance accepts schema tool params that fill classifier-missing slots', () => {
    const plan = {
      intent: 'orders.create_draft',
      primaryTool: 'order.create_draft',
      allowedTools: ['order.create_draft', 'product.search', 'customer.info'],
      blockedTools: [],
      missingSlots: ['productPrice'],
      validation: { valid: true, errors: [] },
    };

    expect(isToolRelevant(plan, 'order.create_draft', {
      readOnly: false,
      params: { productPrice: 499 },
    })).toBe(true);
    expect(isToolRelevant(plan, 'order.create_draft', {
      readOnly: false,
      params: {},
    })).toBe(false);
    expect(isToolRelevant(plan, 'product.search', {
      readOnly: true,
      params: { query: 'Swan High Skotch' },
    })).toBe(true);
  });

  test('keeps the intent contract policy registry explicit and schema-backed', () => {
    expect(INTENT_CONTRACT_SCHEMA.required).toEqual(expect.arrayContaining([
      'intent',
      'confidence',
      'decision',
      'riskLevel',
      'requiredSlots',
      'missingSlots',
      'guardrails',
    ]));
    expect(INTENT_POLICIES['agents.run_task']).toEqual(expect.objectContaining({
      actionType: 'handoff',
      riskLevel: 'medium',
      nextState: 'delegate_to_specialist',
    }));
    expect(INTENT_POLICIES['orders.create_draft']).toEqual(expect.objectContaining({
      actionType: 'write',
      riskLevel: 'high',
    }));
    expect(INTENT_POLICIES['orders.create_confirmed']).toEqual(expect.objectContaining({
      actionType: 'write',
      riskLevel: 'high',
      nextState: 'create_confirmed_order',
    }));

    const invalid = validateContract({
      schemaVersion: 'bad',
      intent: 'orders.refund',
      confidence: 7,
      source: 'bad-source',
      decision: 'bad-decision',
      actionType: 'bad-action',
      riskLevel: 'bad-risk',
      requiresTool: true,
      route: {
        primaryTool: 'order.refund',
        allowedTools: ['order.refund'],
        blockedTools: [],
      },
      requiredSlots: [],
      missingSlots: [],
      guardrails: [],
      reason: 'probe',
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toEqual(expect.arrayContaining([
      'schemaVersion is invalid',
      'intent orders.refund has no typed policy',
      'confidence must be between 0 and 1',
      'source is invalid',
      'decision is invalid',
      'actionType is invalid',
      'riskLevel is invalid',
    ]));
  });

  test('does not expose direct write tools when required slots are missing', async () => {
    const plan = await expectResolvedIntent({
      message: 'اعمل مهارة جديدة',
      availableTools: ['skill.create', 'agent.read_state'],
      intent: 'skills.manage',
      primaryTool: 'skill.create',
    });

    expect(plan.requiresTool).toBe(false);
    expect(plan.missingSlots).toEqual(['displayName', 'description']);
    expect(plan.blockedReason).toBe('MISSING_REQUIRED_SLOTS');
  });

  test('requires exact typed policies for every emitted non-chat intent', async () => {
    const scenarios = [
      ['اعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1', ['order.create_draft', 'product.search', 'customer.info'], 'orders.create_draft'],
      ['تمام أكد الطلب على Swan High Skotch سعره 499، اسمي أحمد ورقمي 01000000000 والقاهرة', ['order.create_confirmed', 'product.search', 'customer.info'], 'orders.create_confirmed'],
      ['كلف وكيل مبيعات فيسبوك يعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1', ['agent.run_task', 'agent.list_agents', 'agent.read_state'], 'agents.run_task'],
      ['أنشئ مهارة جديدة فقط. الاسم: Skill Smoke. الوصف: تقرأ حالة الوكلاء.', ['skill.create', 'agent.read_state'], 'skills.manage'],
      ['مين الموظفين اللي محضروش النهارده؟', ['hr.attendance_today'], 'hr.attendance.today'],
      ['اعرض آخر 5 عمليات قام بها الوكلاء اليوم', ['audit.read', 'agent.list_agents'], 'audit.read'],
      ['عايز اعرف المنتجات الناقصة', ['product.lowStock', 'product.search'], 'inventory'],
      ['الشحن للقاهرة كام؟', ['shipping.rates'], 'shipping.rates'],
      ['عايز أبدل المقاس لو سمحت', ['agent.handoff', 'order.lookup', 'customer.info'], 'support.refund'],
      ['ارفع التعديلات على GitHub و main', ['agent.read_state'], 'implementation.advice'],
    ];

    for (const [message, availableTools, expectedIntent] of scenarios) {
      const plan = await expectResolvedIntent({ message, availableTools, intent: expectedIntent });
      expect(INTENT_POLICIES[plan.intent]).toBeDefined();
      expect(plan.validation.valid).toBe(true);
    }
  });

  test('blocked tools are enforced even when they are also allowed', () => {
    const contract = buildIntentContract({
      message: 'اقرا حالة الوكلاء',
      policyPlan: {
        intent: 'agents.read',
        requiresTool: true,
        primaryTool: 'agent.read_state',
        allowedTools: ['agent.read_state'],
        blockedTools: ['agent.read_state'],
        reason: 'test overlap',
      },
    });
    const plan = {
      ...contract,
      primaryTool: contract.route.primaryTool,
      allowedTools: contract.route.allowedTools,
      blockedTools: contract.route.blockedTools,
    };

    expect(contract.validation.valid).toBe(false);
    expect(resolveToolPlan({
      message: 'اقرا حالة الوكلاء',
      availableTools: ['agent.read_state'],
    }).allowedTools).toContain('agent.read_state');
    const { isToolRelevant } = require('../../legacy-ai-agent/aiAgent/agentIntentRelevanceService');
    expect(isToolRelevant(plan, 'agent.read_state')).toBe(false);
  });

  test('Tool Gateway audit logs the typed intent contract metadata', async () => {
    const oldNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const auditSpy = jest.spyOn(agentAuditTrailService, 'logDecision').mockResolvedValue({ id: 'audit_1' });
    const plan = resolveToolPlan({
      message: 'اعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1',
      availableTools: ['order.create_draft', 'product.search', 'customer.info'],
    });

    try {
      await agentToolGatewayService.logIntentPlan('company_123456', {
        traceId: 'trace_contract_1',
        agentId: 'agent_ceo_1',
        relevancePlan: plan,
        intentMessage: 'اعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1',
        context: {},
        sessionId: 'session_1',
        conversationId: 'conversation_1',
      });

      expect(auditSpy).toHaveBeenCalledWith('company_123456', expect.objectContaining({
        action: 'AGENT_INTENT_PLAN',
        decision: 'orders.create_draft',
        metadata: expect.objectContaining({
          schemaVersion: CONTRACT_SCHEMA_VERSION,
          policyVersion: expect.any(String),
          source: 'tool-policy-gate',
          decision: 'execute_tool',
          actionType: 'write',
          riskLevel: 'high',
          selectionScore: expect.any(Number),
          classification: expect.objectContaining({ mode: 'strict-rules-first' }),
          alternatives: expect.any(Array),
          ambiguous: false,
          guardrails: expect.arrayContaining(['human_approval', 'schema_validation', 'audit_trail']),
          contractValid: true,
          contractErrors: [],
        }),
      }));
    } finally {
      auditSpy.mockRestore();
      process.env.NODE_ENV = oldNodeEnv;
    }
  });

  test('routes confirmed active product goal to product.create', () => {
    const plan = resolveToolPlan({
      message: 'كمل',
      availableTools: ['product.create', 'product.search', 'inventory.check'],
      context: {
        activeGoal: {
          id: 'goal_1',
          type: 'create_product',
          status: 'ready_to_execute',
          nextStep: 'execute_tool',
          executionParams: {
            name: 'كوتشي حريمي',
            price: 499,
            stock: 100,
          },
        },
      },
    });

    expect(plan.intent).toBe('goals.create_product');
    expect(plan.requiresTool).toBe(true);
    expect(plan.primaryTool).toBe('product.create');
    expect(plan.allowedTools).toEqual(['product.create']);
    expect(plan.goalRunId).toBe('goal_1');
  });

  test('asks for clarification on generic create requests instead of guessing a write tool', () => {
    const plan = resolveToolPlan({
      message: 'اعمل واحد جديد',
      availableTools: ['product.create', 'order.create_draft', 'agent.spawn', 'skill.create'],
    });

    expect(plan.intent).toBe('general.chat');
    expect(plan.requiresTool).toBe(false);
    expect(plan.primaryTool).toBeNull();
    expect(plan.allowedTools).toEqual([]);
    expect(plan.ambiguous).toBe(true);
    expect(plan.decision).toBe('ask_followup');
    expect(plan.confidence).toBeLessThan(0.5);
  });

  test('does not let stale active product goals capture generic create requests', () => {
    const plan = resolveToolPlan({
      message: 'اختبار كودكس بعد النشر: اعمل واحد جديد',
      availableTools: ['product.create', 'product.search', 'inventory.check'],
      context: {
        activeGoal: {
          id: 'goal_stale_product',
          type: 'create_product',
          status: 'ready_to_execute',
          nextStep: 'execute_tool',
          executionParams: {
            name: 'Sneakers',
            price: 499,
            stock: 100,
          },
        },
      },
    });

    expect(plan.intent).toBe('general.chat');
    expect(plan.requiresTool).toBe(false);
    expect(plan.primaryTool).toBeNull();
    expect(plan.allowedTools).toEqual([]);
    expect(plan.goalRunId).toBeNull();
    expect(plan.ambiguous).toBe(true);
    expect(plan.decision).toBe('ask_followup');
  });

  test('detaches stale product goal runs before an ambiguous create request reaches chat generation', async () => {
    const companyId = 'company_ambiguous_goal';
    const userId = 'user_ambiguous_goal';
    const conversationId = `conversation_ambiguous_goal_${Date.now()}`;
    const sessionId = 'session_ambiguous_goal';

    await agentGoalRunService.clearConversation(companyId, conversationId);
    const initial = await agentGoalRunService.processTurn({
      companyId,
      userId,
      conversationId,
      sessionId,
      message: 'عايز اضيف منتج جديد اسمه Sneakers بسعر 499',
    });
    expect(initial.activeGoal?.type).toBe('create_product');
    expect(initial.activeGoal?.status).not.toBe('cancelled');

    const ambiguous = await agentGoalRunService.processTurn({
      companyId,
      userId,
      conversationId,
      sessionId,
      message: 'اعمل واحد جديد',
    });

    expect(ambiguous.activeGoal).toBeNull();
    expect(agentGoalRunService.buildStateReply(ambiguous.activeGoal)).toBeNull();
    await agentGoalRunService.clearConversation(companyId, conversationId);
  });

  test('routes confirmed active agent-and-skill goal to the agent planner tools', () => {
    const plan = resolveToolPlan({
      message: 'ابدأ التنفيذ بس خلي الاسم شرين',
      availableTools: ['agent.spawn', 'skill.create', 'agent.read_state', 'agent.update_profile'],
      context: {
        activeGoal: {
          id: 'goal_agent_1',
          type: 'create_agent_with_skill',
          status: 'ready_to_execute',
          nextStep: 'execute_tool',
          executionParams: {
            agent: { role: 'SALES', name: 'شرين' },
            skill: { displayName: 'بيع عبر الفيسبوك', description: 'Sales workflow.' },
          },
        },
      },
    });

    expect(plan.intent).toBe('goals.create_agent_with_skill');
    expect(plan.requiresTool).toBe(true);
    expect(plan.primaryTool).toBe('agent.spawn');
    expect(plan.allowedTools).toEqual(['agent.spawn', 'skill.create', 'agent.read_state', 'agent.update_profile']);
    expect(plan.goalRunId).toBe('goal_agent_1');
  });

  test('routes natural new-agent requests to agent creation instead of agent roster reads', async () => {
    const plan = await expectResolvedIntent({
      message: 'عايز ايجنت للرد على رسايل الفيس بوك وقادر يعمل الاوردرات',
      availableTools: ['agent.spawn', 'skill.create', 'agent.list_agents', 'agent.read_state', 'order.summary'],
      intent: 'agents.manage',
      primaryTool: 'agent.spawn',
    });

    expect(plan.requiresTool).toBe(true);
    expect(plan.missingSlots).toEqual([]);
    expect(plan.allowedTools).toContain('skill.create');
  });

  test('asks for an agent role before allowing generic agent creation', async () => {
    const plan = await expectResolvedIntent({
      message: 'عايز ايجنت',
      availableTools: ['agent.spawn', 'skill.create', 'agent.list_agents', 'agent.read_state'],
      intent: 'agents.manage',
      primaryTool: 'agent.spawn',
    });

    expect(plan.requiresTool).toBe(false);
    expect(plan.decision).toBe('ask_followup');
    expect(plan.blockedReason).toBe('MISSING_REQUIRED_SLOTS');
    expect(plan.missingSlots).toEqual(['role']);
  });

  test('routes skill creation requests to skill.create', async () => {
    await expectResolvedIntent({
      message: 'عايز CEO Agent يعمل مهارة جديدة لمراجعة اعلانات فيسبوك',
      availableTools: ['agent.read_state', 'agent.update_profile', 'skill.create'],
      context: {
        recentMessages: [
          { role: 'assistant', content: 'CEO Agent يقدر يدير الوكلاء والمهارات.' },
        ],
      },
      intent: 'skills.manage',
      primaryTool: 'skill.create',
      allowedTools: ['skill.create'],
    });
  });

  test('asks for missing skill details instead of reporting execute_tool for incomplete skill writes', async () => {
    const plan = await expectResolvedIntent({
      message: 'اعمل مهارة لتحليل المنافسين وفرص السوق',
      availableTools: ['skill.create', 'agent.read_state', 'agent.update_profile'],
      intent: 'skills.manage',
    });

    expect(plan.requiresTool).toBe(false);
    expect(plan.decision).toBe('ask_followup');
    expect(plan.blockedReason).toBe('MISSING_REQUIRED_SLOTS');
    expect(plan.missingSlots).toEqual(expect.arrayContaining(['displayName', 'description']));
    expect(plan.confidence).toBeLessThan(0.9);
  });

  test('routes explicit skill-only creation ahead of stale active agent goals', async () => {
    await expectResolvedIntent({
      message: 'أنشئ مهارة جديدة فقط. id: codex-smoke-skill. الاسم: Skill Smoke. الوصف: تقرأ حالة الوكلاء.',
      availableTools: ['agent.spawn', 'skill.create', 'agent.read_state', 'agent.update_profile'],
      context: {
        activeGoal: {
          id: 'goal_agent_old',
          type: 'create_agent_with_skill',
          status: 'collecting',
          nextStep: 'collect_missing_fields',
        },
      },
      intent: 'skills.manage',
      primaryTool: 'skill.create',
    });
  });

  test('routes Arabic noun-form skill creation to skill.create', async () => {
    await expectResolvedIntent({
      message: 'اختبار كودكس سيناريو إنشاء مهارة فقط. id: codex-smoke-skill. الاسم: مهارة اختبار كودكس. الوصف: تقرأ حالة الوكلاء وقائمة الفريق فقط. الأدوات المسموحة: agent.read_state, agent.list_agents.',
      availableTools: ['agent.spawn', 'skill.create', 'agent.read_state', 'agent.list_agents'],
      intent: 'skills.manage',
      primaryTool: 'skill.create',
      allowedTools: ['skill.create'],
    });
  });

  test('CEO Agent executes structured skill-only requests through the action parser', async () => {
    mockProviderGenerateResponse.mockResolvedValueOnce({
      success: true,
      content: 'تم إنشاء المهارة Skill Smoke من نتيجة الأداة.',
      text: () => 'تم إنشاء المهارة Skill Smoke من نتيجة الأداة.',
      provider: 'NVIDIA',
      model: 'minimaxai/minimax-m2.7',
      toolCalls: [],
    });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['skill.create', 'agent.read_state', 'agent.list_agents'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const skillOnlyMessage = 'اختبار كودكس سيناريو إنشاء مهارة فقط. id: codex-smoke-skill. الاسم: مهارة اختبار كودكس. الوصف: تقرأ حالة الوكلاء فقط. الأدوات المسموحة: agent.read_state, agent.list_agents.';
    const result = await agent.processTask({
      description: skillOnlyMessage,
      currentMessage: skillOnlyMessage,
      intentMessage: skillOnlyMessage,
      intentContext: { recentMessages: [] },
    });

    expect(result.status).toBe('SUCCESS');
    expect(mockCreateSkill).toHaveBeenCalledWith(
      'company_123456',
      expect.objectContaining({
        id: 'codex-smoke-skill',
        displayName: 'مهارة اختبار كودكس',
        description: 'تقرأ حالة الوكلاء فقط',
        allowedTools: ['agent.read_state', 'agent.list_agents'],
      })
    );
    expect(result.result.tools).toEqual([
      expect.objectContaining({
        tool: 'skill.create',
        success: true,
        deterministic: true,
      }),
    ]);
  });

  test('still treats GitHub upload wording as implementation work', async () => {
    await expectResolvedIntent({
      message: 'ارفع التعديلات على GitHub و main',
      availableTools: ['agent.list_agents', 'agent.read_state'],
      intent: 'implementation.advice',
      allowedTools: [],
    });
  });

  test('reads agent capability when product capability is asked in agent context', async () => {
    await expectResolvedIntent({
      message: 'هل عنده القدره انه يعمل منتج جديد؟',
      availableTools: ['agent.list_agents', 'agent.read_state', 'product.search'],
      context: {
        recentMessages: [
          {
            role: 'assistant',
            content: 'وكيل المخازن Wofod Inventory Agent شغال وأدواته للبحث في المنتجات والمخزون.',
          },
        ],
      },
      intent: 'agents.read',
      allowedTools: ['agent.read_state', 'agent.list_agents'],
    });
  });

  test('treats new agent requests as agent management actions', async () => {
    await expectResolvedIntent({
      message: 'طيب عايز نعمل ايجنت جديد للمخازن',
      availableTools: ['agent.list_agents', 'agent.read_state', 'agent.spawn'],
      intent: 'agents.manage',
      allowedTools: ['agent.spawn'],
    });
  });

  test('routes new-agent-with-skill requests to agent.spawn before skill.create', async () => {
    const plan = await expectResolvedIntent({
      message: 'اعمل وكيل جديد لفيسبوك بمهارة بيع وإنشاء مسودات طلبات',
      availableTools: ['agent.spawn', 'skill.create', 'agent.read_state', 'agent.update_profile'],
      intent: 'agents.manage',
      primaryTool: 'agent.spawn',
    });
    expect(plan.allowedTools[0]).toBe('agent.spawn');
    expect(plan.allowedTools).toContain('skill.create');
  });

  test('inherits pending HR result follow-up from recent context', async () => {
    await expectResolvedIntent({
      message: 'فين النتيجة؟',
      availableTools: ['hr.attendance_today', 'agent.list_agents', 'agent.read_state'],
      context: {
        recentMessages: [
          { role: 'assistant', content: 'خليني أجيبلك الحضور النهاردة من نظام HR. دقيقة واحدة بس.' },
        ],
      },
      intent: 'hr.attendance.today',
      allowedTools: ['hr.attendance_today'],
    });
  });

  test('inherits pending HR follow-up from structured tool context', async () => {
    await expectResolvedIntent({
      message: 'فين',
      availableTools: ['hr.attendance_today', 'agent.list_agents', 'agent.read_state'],
      context: {
        lastToolIntent: 'hr.attendance.today',
        lastToolName: 'hr.attendance_today',
      },
      intent: 'hr.attendance.today',
      primaryTool: 'hr.attendance_today',
      allowedTools: ['hr.attendance_today'],
    });
  });

  test('routes named specialist follow-up to agent management tools', async () => {
    await expectResolvedIntent({
      message: 'شوف شيرين',
      availableTools: ['agent.list_agents', 'agent.read_state', 'agent.assign_task', 'agent.run_task'],
      context: {
        recentMessages: [
          { role: 'assistant', content: 'ممكن أشوفلك شيرين وكيلة الدعم الفني عشان تتابع الموضوع.' },
        ],
      },
      intent: 'agents.run_task',
      allowedTools: ['agent.read_state', 'agent.run_task'],
    });
  });

  test('does not treat الموظفين as a named-agent follow-up through substring matching', async () => {
    const plan = await expectResolvedIntent({
      message: 'الموظفين',
      availableTools: ['agent.list_agents', 'agent.read_state'],
      context: {
        recentMessages: [
          { role: 'assistant', content: 'وكيل شيرين جاهز لمتابعة المهام.' },
        ],
      },
      intent: 'hr.attendance.today',
    });
    expect(plan.allowedTools).toEqual([]);
  });

  test('normalizes quoted model replies without allowing synthetic fallback text', () => {
    expect(normalizeAgentReply('"اسمي عباس"')).toBe('اسمي عباس');
    expect(normalizeAgentReply('Task processed. No specific reply generated.')).toBe('');
  });

  test('parses and strips leaked DSML/native tool-call text', () => {
    const leaked = [
      'تمام يا mokhtar، خليني أقرأ بيانات الوكلاء.',
      '< DSML || tool_calls || >',
      '< "DSML || invoke name=\\"agenttool__agent_list_agents\\" || >',
      '< DSML || invoke || />',
      '< DSML || tool_calls || />',
    ].join('\n');

    const calls = parseTextToolCalls(leaked);

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tool: 'agent.list_agents', nativeName: 'agenttool__agent_list_agents' }),
      ])
    );
    expect(stripInternalToolSyntax(leaked)).toBe('تمام يا mokhtar، خليني أقرأ بيانات الوكلاء.');
  });

  test('CEO Agent executes native tool calls before answering live state questions', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'agents.read',
        confidence: 0.95,
        ambiguous: false,
        slots: {},
      });
    
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [{
          id: 'call_1',
          type: 'function',
          function: {
            name: 'agenttool__agent_list_agents',
            arguments: '{}',
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'لدينا حالياً وكيل واحد: CEO Agent بدور CEO.',
        text: () => 'لدينا حالياً وكيل واحد: CEO Agent بدور CEO.',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['agent.list_agents'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask('عندنا كام ايجنت حاليا ودور كل واحد ايه؟');

      expect(result.result.toolsUsed).toBe(true);
      expect(result.result.tools.map(tool => tool.tool)).toContain('agent.list_agents');
      expect(result.result.reply).toContain('وكيل');
      expect(mockReadState).toHaveBeenCalledWith('company_123456', ['agents']);
      expect(mockProviderGenerateResponse).toHaveBeenCalledTimes(2);
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent gates tools by raw current message instead of prompt history', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'agents.manage',
        confidence: 0.95,
        ambiguous: false,
        slots: {},
      });
    
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [{
          id: 'call_spawn',
          type: 'function',
          function: {
            name: 'agenttool__agent_spawn',
            arguments: JSON.stringify({ role: 'INVENTORY', name: 'مخزوني' }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'تم إنشاء وكيل المخزون "مخزوني".',
        text: () => 'تم إنشاء وكيل المخزون "مخزوني".',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['hr.attendance_today', 'agent.list_agents', 'agent.read_state', 'agent.spawn'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask({
        description: [
          '[ملخص المحادثة السابقة]',
          'Compressed 1 msgs: [user]: عايز اعرف مين اللي غايب النهارده ؟',
          '',
          'تمام اعمل وكيل للمخزون وسمية وقولي اسمه ايه وخلي يقوم بالاعمال دي',
        ].join('\n'),
        currentMessage: 'تمام اعمل وكيل للمخزون وسمية وقولي اسمه ايه وخلي يقوم بالاعمال دي',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.result.tools).toEqual(
        expect.arrayContaining([expect.objectContaining({ tool: 'agent.spawn', success: true })])
      );
      expect(mockHireAgent).toHaveBeenCalledWith(
        'company_123456',
        expect.objectContaining({ role: 'INVENTORY', name: 'مخزوني' })
      );
      expect(mockGetTodayAttendance).not.toHaveBeenCalled();
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent fails explicitly when the model ignores successful HR tool evidence', async () => {
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: 'مش ظاهر عندي أداة الحضور.',
        text: () => 'مش ظاهر عندي أداة الحضور.',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'من بيانات النظام الحالي: عندنا 1 موظف، 0 حضروا، و1 غائب اليوم.',
        text: () => 'من بيانات النظام الحالي: عندنا 1 موظف، 0 حضروا، و1 غائب اليوم.',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['agent.list_agents', 'company.snapshot', 'hr.attendance_today'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const result = await agent.processTask('عندنا موظفين محضروش النهارده؟');

    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('AI_AGENT_UNGROUNDED_REPLY');
    expect(result.result.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tool: 'hr.attendance_today', success: true, deterministic: true }),
      ])
    );
    expect(mockGetTodayAttendance).toHaveBeenCalledWith('company_123456');
    expect(mockReadState).not.toHaveBeenCalled();
    expect(mockProviderGenerateResponse).toHaveBeenCalledTimes(1);
  });

  test('CEO Agent fails explicitly when a model pivots from HR evidence to irrelevant agent tools', async () => {
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [{
          id: 'call_wrong',
          type: 'function',
          function: {
            name: 'agenttool__agent_list_agents',
            arguments: '{}',
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'تم منع أداة غير مناسبة.',
        text: () => 'تم منع أداة غير مناسبة.',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'من بيانات HR الحالية: يوجد 1 موظف غائب اليوم.',
        text: () => 'من بيانات HR الحالية: يوجد 1 موظف غائب اليوم.',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['agent.list_agents', 'company.snapshot', 'hr.attendance_today'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const result = await agent.processTask('مين الموظفين اللي محضروش النهارده؟');

    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('AI_AGENT_UNGROUNDED_REPLY');
    expect(result.result.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tool: 'hr.attendance_today', success: true, deterministic: true }),
        expect.objectContaining({ tool: 'agent.list_agents', success: false }),
      ])
    );
    expect(mockReadState).not.toHaveBeenCalled();
    expect(mockGetTodayAttendance).toHaveBeenCalledWith('company_123456');
    expect(mockProviderGenerateResponse).toHaveBeenCalledTimes(2);
  });

  test('CEO Agent does not expose business tools for implementation advice messages', async () => {
    mockProviderGenerateResponse.mockResolvedValueOnce({
      success: true,
      content: 'الحل برمجياً هو إضافة أداة HR للبوابة وربطها بخطة النية.',
      text: () => 'الحل برمجياً هو إضافة أداة HR للبوابة وربطها بخطة النية.',
      provider: 'NVIDIA',
      model: 'openai/gpt-oss-120b',
      toolCalls: [],
    });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['agent.list_agents', 'company.snapshot', 'hr.attendance_today'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const result = await agent.processTask('ايه التصحيح البرمجي عشان سؤال الحضور يستخدم الاداة الصح؟');

    expect(result.status).toBe('SUCCESS');
    expect(result.result.toolsUsed).toBe(false);
    expect(mockReadState).not.toHaveBeenCalled();
    expect(mockGetTodayAttendance).not.toHaveBeenCalled();
    expect(mockProviderGenerateResponse).toHaveBeenCalledTimes(1);
    const firstCallOptions = mockProviderGenerateResponse.mock.calls[0][1];
    expect(firstCallOptions.tools).toBeUndefined();
  });

  test('CEO Agent fails explicitly when a model emits leaked DSML tool-call text', async () => {
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '< DSML || tool_calls || >\n< "DSML || invoke name=\\"agenttool__agent_list_agents\\" || >',
        text: () => '< DSML || tool_calls || >\n< "DSML || invoke name=\\"agenttool__agent_list_agents\\" || >',
        provider: 'DEEPSEEK',
        model: 'deepseek-chat',
        toolCalls: [],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'عندنا وكيل واحد حاليا: CEO Agent.',
        text: () => 'عندنا وكيل واحد حاليا: CEO Agent.',
        provider: 'DEEPSEEK',
        model: 'deepseek-chat',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'deepseek-chat',
      allowedTools: ['agent.list_agents'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'deepseek-chat',
        keyId: 'key1',
        keyName: 'test',
        provider: 'DEEPSEEK',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const result = await agent.processTask('اختار اسم لكل وكيل');

    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('AI_AGENT_TOOL_CALL_LEAK');
    expect(result.result.tools.map(tool => tool.tool)).toContain('agent.list_agents');
    expect(mockReadState).toHaveBeenCalledWith('company_123456', ['agents']);
  });

  test('CEO Agent fails explicitly if a model keeps leaking internal tool syntax after execution', async () => {
    const leaked = '< DSML || tool_calls || >\n< "DSML || invoke name=\\"agenttool__agent_list_agents\\" || >';
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: leaked,
        text: () => leaked,
        provider: 'DEEPSEEK',
        model: 'deepseek-chat',
        toolCalls: [],
      })
      .mockResolvedValueOnce({
        success: true,
        content: leaked,
        text: () => leaked,
        provider: 'DEEPSEEK',
        model: 'deepseek-chat',
        toolCalls: [],
      })
      .mockResolvedValueOnce({
        success: true,
        content: leaked,
        text: () => leaked,
        provider: 'DEEPSEEK',
        model: 'deepseek-chat',
        toolCalls: [],
      })
      .mockResolvedValueOnce({
        success: true,
        content: leaked,
        text: () => leaked,
        provider: 'DEEPSEEK',
        model: 'deepseek-chat',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'deepseek-chat',
      allowedTools: ['agent.list_agents'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'deepseek-chat',
        keyId: 'key1',
        keyName: 'test',
        provider: 'DEEPSEEK',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const result = await agent.processTask('اختار اسم لكل وكيل');

    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('AI_AGENT_TOOL_CALL_LEAK');
  });

  test('CEO Agent fails explicitly when the model leaves final answer empty after tools', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'agents.read',
        confidence: 0.95,
        ambiguous: false,
        slots: {},
      });

    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [{
          id: 'call_1',
          type: 'function',
          function: {
            name: 'agenttool__agent_list_agents',
            arguments: '{}',
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['agent.list_agents'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask('عندنا كام ايجنت حاليا ودور كل واحد ايه؟');

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('AI_AGENT_EMPTY_REPLY');
      expect(result.result.tools).toEqual(
        expect.arrayContaining([expect.objectContaining({ tool: 'agent.list_agents', success: true })])
      );
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent fails explicitly when the selected model times out after planner execution', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'agents.read',
        confidence: 0.95,
        ambiguous: false,
        slots: {},
      });

    const previousTimeout = process.env.AGENT_LLM_TIMEOUT_MS;
    process.env.AGENT_LLM_TIMEOUT_MS = '10';
    mockProviderGenerateResponse.mockImplementation(() => new Promise(() => {}));

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['agent.list_agents', 'agent.read_state'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask('عندنا كام ايجنت حاليا؟');

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('AI_AGENT_LLM_UNAVAILABLE');
      expect(result.result.tools).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ tool: 'agent.list_agents', success: true, deterministic: true }),
        ])
      );
    } finally {
      classifySpy.mockRestore();
      if (previousTimeout === undefined) {
        delete process.env.AGENT_LLM_TIMEOUT_MS;
      } else {
        process.env.AGENT_LLM_TIMEOUT_MS = previousTimeout;
      }
    }
  });

  test('CEO Agent fails clearly when a non-tool selected model call times out', async () => {
    const previousTimeout = process.env.AGENT_LLM_TIMEOUT_MS;
    process.env.AGENT_LLM_TIMEOUT_MS = '10';
    mockProviderGenerateResponse.mockImplementation(() => new Promise(() => {}));

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['agent.list_agents', 'agent.read_state'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask('صباح الخير');

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('AI_AGENT_LLM_UNAVAILABLE');
    } finally {
      if (previousTimeout === undefined) {
        delete process.env.AGENT_LLM_TIMEOUT_MS;
      } else {
        process.env.AGENT_LLM_TIMEOUT_MS = previousTimeout;
      }
    }
  });

  test('CEO Agent does not silently switch away from the selected model when routing fails', async () => {
    const getNextKeySimple = jest.fn(async () => ({
      error: 'ALL_KEYS_UNAVAILABLE',
      message: 'selected model is unavailable',
    }));
    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['agent.list_agents'],
    });
    agent.setModelManager({
      getNextKeySimple,
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const result = await agent.processTask('صباح الخير');

    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('AI_AGENT_LLM_UNAVAILABLE');
    expect(getNextKeySimple).toHaveBeenCalledTimes(1);
    expect(result.modelSelection.model).toBe('minimaxai/minimax-m2.7');
    expect(result.modelSelection.error).toBe('ALL_KEYS_UNAVAILABLE');
  });

  test('CEO Agent replaces ungrounded agent-count claims with the real tool result', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'agents.read',
        confidence: 0.95,
        ambiguous: false,
        slots: {},
      });

    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [{
          id: 'call_1',
          type: 'function',
          function: {
            name: 'agenttool__agent_list_agents',
            arguments: '{}',
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'عندنا 6 وكلاء نشطين: عباس، شيرين، المبيعات، المخزون، التسويق، والدعم.',
        text: () => 'عندنا 6 وكلاء نشطين: عباس، شيرين، المبيعات، المخزون، التسويق، والدعم.',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['agent.list_agents', 'agent.read_state'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask('مين الوكلاء اللي عندنا؟');

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('AI_AGENT_UNGROUNDED_REPLY');
      expect(result.result.grounding.reason).toContain('Model claimed');
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent blocks ungrounded agent creation even when the reply contains words like المهام', async () => {
    mockProviderGenerateResponse.mockResolvedValueOnce({
      success: true,
      content: 'تم إنشاء الوكيل بنجاح. الوكيل جاهز لاستقبال المهام وتحويلها لمسودات طلبات تحتاج موافقة.',
      text: () => 'تم إنشاء الوكيل بنجاح. الوكيل جاهز لاستقبال المهام وتحويلها لمسودات طلبات تحتاج موافقة.',
      provider: 'DEEPSEEK',
      model: 'deepseek-chat',
      toolCalls: [],
    });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'deepseek-chat',
      allowedTools: ['agent.spawn', 'skill.create', 'agent.read_state', 'agent.list_agents'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'deepseek-chat',
        keyId: 'key1',
        keyName: 'test',
        provider: 'DEEPSEEK',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const result = await agent.processTask('أنشئ وكيل مبيعات فيسبوك جديد وجهزه لمسودات الطلبات');

    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('AI_AGENT_UNGROUNDED_REPLY');
    expect(result.result.grounding.reason).toBe('Model claimed agent creation without successful agent.spawn evidence');
    expect(result.result.tools).toEqual([]);
  });

  test('CEO Agent records missing product-create capability instead of claiming delegated execution', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'agents.run_task',
        confidence: 0.95,
        ambiguous: false,
        slots: {},
      });

    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [{
          id: 'call_run',
          type: 'function',
          function: {
            name: 'agenttool__agent_run_task',
            arguments: JSON.stringify({
              agentId: 'agent_inventory_1',
              task: 'نضيف منتج جديد اسمه كوتشي سوان بسعر 449 جنيه',
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'ماقدرش أقول إن المنتج اتضاف؛ الوكيل محتاج أداة product.create قبل تنفيذ إنشاء المنتجات.',
        text: () => 'ماقدرش أقول إن المنتج اتضاف؛ الوكيل محتاج أداة product.create قبل تنفيذ إنشاء المنتجات.',
        provider: 'NVIDIA',
        model: 'openai/gpt-oss-120b',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['agent.list_agents', 'agent.read_state', 'agent.run_task'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask({
        description: 'عايز نضيف كوتشي حريمي جديد اسمه كوتشي سوان بسعر 449',
        currentMessage: 'عايز نضيف كوتشي حريمي جديد اسمه كوتشي سوان بسعر 449',
        intentContext: {
          recentMessages: [
            { role: 'assistant', content: 'الوكيل Wofod Product Creator جاهز يشتغل دلوقتي. عايز تطلب منه يضيف منتج؟' },
          ],
        },
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.result.reply).toContain('product.create');
      expect(result.result.tools).toEqual(
        expect.arrayContaining([expect.objectContaining({ tool: 'agent.run_task', success: false })])
      );
      expect(mockRunAgentTask).toHaveBeenCalled();
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent executes a confirmed product goal through the gateway before writing the reply', async () => {
    const executeSpy = jest.spyOn(agentToolGatewayService, 'execute').mockResolvedValue({
      success: true,
      readOnly: false,
      result: {
        productId: 'product_1',
        name: 'كوتشي حريمي',
        draft: true,
      },
    });
    mockProviderGenerateResponse.mockResolvedValueOnce({
      success: true,
      content: 'تم إنشاء مسودة المنتج كوتشي حريمي وجاهزة للمراجعة.',
      text: () => 'تم إنشاء مسودة المنتج كوتشي حريمي وجاهزة للمراجعة.',
      provider: 'NVIDIA',
      model: 'openai/gpt-oss-120b',
      toolCalls: [],
    });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['product.create'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask({
        description: 'كمل',
        currentMessage: 'كمل',
        intentContext: {
          activeGoal: {
            id: 'goal_product_1',
            type: 'create_product',
            status: 'ready_to_execute',
            nextStep: 'execute_tool',
            executionParams: {
              name: 'كوتشي حريمي',
              description: 'وصف المنتج',
              price: 499,
              stock: 100,
              colors: ['ابيض', 'اسود', 'احمر'],
              sizes: ['27', '28'],
            },
          },
        },
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.result.reply).toContain('مسودة المنتج');
      expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({
        tool: 'product.create',
        source: 'goal-run-planner',
        params: expect.objectContaining({
          name: 'كوتشي حريمي',
          price: 499,
          stock: 100,
        }),
      }));
      expect(result.result.tools).toEqual([
        expect.objectContaining({
          tool: 'product.create',
          success: true,
          planned: true,
          goalRunId: 'goal_product_1',
        }),
      ]);
      expect(mockProviderGenerateResponse).toHaveBeenCalledTimes(1);
    } finally {
      executeSpy.mockRestore();
    }
  });

  test('CEO Agent fails explicitly when confirmed product post-tool model answer is unavailable', async () => {
    const executeSpy = jest.spyOn(agentToolGatewayService, 'execute').mockResolvedValue({
      success: true,
      readOnly: false,
      result: {
        productId: 'product_1',
        name: 'كوتشي حريمي',
        sku: 'QA-1',
        price: 499,
        stock: 100,
        draft: true,
        adminReviewPath: '/admin/products/product_1',
      },
    });
    mockProviderGenerateResponse.mockRejectedValueOnce(new Error('post-tool model unavailable'));

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['product.create'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask({
        description: 'كمل',
        currentMessage: 'كمل',
        intentContext: {
          activeGoal: {
            id: 'goal_product_2',
            type: 'create_product',
            status: 'ready_to_execute',
            nextStep: 'execute_tool',
            executionParams: {
              name: 'كوتشي حريمي',
              description: 'وصف المنتج',
              price: 499,
              stock: 100,
            },
          },
        },
      });

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('AI_AGENT_LLM_UNAVAILABLE');
      expect(result.result.tools).toEqual([
        expect.objectContaining({
          tool: 'product.create',
          success: true,
          planned: true,
          goalRunId: 'goal_product_2',
        }),
      ]);
    } finally {
      executeSpy.mockRestore();
    }
  });

  test('CEO Agent executes a confirmed agent-and-skill goal through the gateway sequence', async () => {
    const executeSpy = jest.spyOn(agentToolGatewayService, 'execute')
      .mockResolvedValueOnce({
        success: true,
        readOnly: false,
        result: {
          id: 'agent_sales_1',
          name: 'شرين',
          role: 'SALES',
          status: 'ACTIVE',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        readOnly: false,
        result: {
          id: 'facebook-sales-conversion',
          displayName: 'بيع وإنشاء مسودات طلبات عبر فيسبوك',
          assignedTo: { id: 'agent_sales_1' },
        },
      });
    mockProviderGenerateResponse.mockResolvedValueOnce({
      success: true,
      content: 'تم إنشاء الوكيل شرين وربط مهارة بيع وإنشاء مسودات طلبات عبر فيسبوك به.',
      text: () => 'تم إنشاء الوكيل شرين وربط مهارة بيع وإنشاء مسودات طلبات عبر فيسبوك به.',
      provider: 'NVIDIA',
      model: 'openai/gpt-oss-120b',
      toolCalls: [],
    });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'openai/gpt-oss-120b',
      allowedTools: ['agent.spawn', 'skill.create', 'agent.read_state', 'agent.update_profile'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'openai/gpt-oss-120b',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    try {
      const result = await agent.processTask({
        description: 'لبدء ف التنفيذ بس خلي الاسم شرين',
        currentMessage: 'لبدء ف التنفيذ بس خلي الاسم شرين',
        intentContext: {
          activeGoal: {
            id: 'goal_agent_1',
            type: 'create_agent_with_skill',
            status: 'ready_to_execute',
            nextStep: 'execute_tool',
            executionParams: {
              agent: {
                role: 'SALES',
                name: 'شرين',
                templateSlug: 'sales-agent',
                persona: { style: 'ودود، هادي، ومباشر مع العميل' },
              },
              skill: {
                id: 'facebook-sales-conversion',
                displayName: 'بيع وإنشاء مسودات طلبات عبر فيسبوك',
                description: 'تحويل محادثات فيسبوك إلى طلبات مؤكدة.',
                allowedTools: ['product.search', 'customer.info', 'order.create_draft'],
                overwrite: true,
                assignToAgentId: '$createdAgentId',
              },
            },
          },
        },
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.result.reply).toContain('شرين');
      expect(executeSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        tool: 'agent.spawn',
        source: 'goal-run-planner',
        params: expect.objectContaining({ role: 'SALES', name: 'شرين' }),
      }));
      expect(executeSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
        tool: 'skill.create',
        source: 'goal-run-planner',
        params: expect.objectContaining({
          displayName: 'بيع وإنشاء مسودات طلبات عبر فيسبوك',
          assignToAgentId: 'agent_sales_1',
        }),
      }));
      expect(result.result.tools).toEqual([
        expect.objectContaining({ tool: 'agent.spawn', success: true, planned: true, goalRunId: 'goal_agent_1' }),
        expect.objectContaining({ tool: 'skill.create', success: true, planned: true, goalRunId: 'goal_agent_1' }),
      ]);
      expect(mockProviderGenerateResponse).toHaveBeenCalledTimes(1);
    } finally {
      executeSpy.mockRestore();
    }
  });

  test('CEO Agent action parser creates approval-required order drafts when details are complete', async () => {
    mockProviderGenerateResponse.mockResolvedValueOnce({
      success: true,
      content: 'تم تجهيز مسودة طلب معلقة للموافقة.',
      text: () => 'تم تجهيز مسودة طلب معلقة للموافقة.',
      provider: 'NVIDIA',
      model: 'minimaxai/minimax-m2.7',
      toolCalls: [],
    });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['order.create_draft', 'product.search', 'customer.info'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const result = await agent.processTask({
      description: 'اعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 2',
      currentMessage: 'اعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 2',
      intentContext: { recentMessages: [] },
    });

    expect(result.status).toBe('SUCCESS');
    expect(mockCreateDraft).toHaveBeenCalledWith('company_123456', expect.objectContaining({
      toolName: 'order.create_draft',
      params: expect.objectContaining({
        productName: 'كوتشي اختبار',
        productPrice: 100,
        quantity: 2,
        customerName: 'أحمد',
        customerPhone: '01000000000',
      }),
    }));
    expect(result.result.tools).toEqual([
      expect.objectContaining({ tool: 'order.create_draft', success: true, deterministic: true }),
    ]);
  });

  test('CEO Agent can create Facebook order drafts when structured tool params satisfy classifier-missing slots', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'orders.create_draft',
        confidence: 0.95,
        ambiguous: false,
        slots: {
          productName: 'Swan High Skotch',
          customerName: 'أحمد اختبار',
          customerPhone: '01000000000',
        },
      });
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_order_draft_fb_1',
          type: 'function',
          function: {
            name: 'agenttool__order_create_draft',
            arguments: JSON.stringify({
              conversationId: 'conv_fb_1',
              customerId: 'cust_fb_1',
              productName: 'Swan High Skotch',
              productPrice: 499,
              quantity: 1,
              productSize: '42',
              customerName: 'أحمد اختبار',
              customerPhone: '01000000000',
              city: 'القاهرة',
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'تم تجهيز مسودة طلب معلقة للموافقة.',
        text: () => 'تم تجهيز مسودة طلب معلقة للموافقة.',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'Facebook Sales Support',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['order.create_draft', 'product.search', 'customer.info'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const currentMessage = 'عايز أعمل أوردر واحد Swan High Skotch مقاس 42، اسمي أحمد اختبار، رقمي 01000000000، القاهرة، مدينة نصر شارع اختبار.';
    const executionMessage = [
      'Previous conversation:',
      'Assistant: سعر الكوتش Swan High Skotch هو 499 جنيه.',
      '',
      `Customer message: ${currentMessage}`,
    ].join('\n');

    try {
      const result = await agent.processTask({
        description: executionMessage,
        currentMessage,
        intentMessage: currentMessage,
        conversationId: 'conv_fb_1',
        intentContext: { channel: 'FACEBOOK', customerId: 'cust_fb_1' },
      });

      expect(result.status).toBe('SUCCESS');
      expect(mockCreateDraft).toHaveBeenCalledWith('company_123456', expect.objectContaining({
        toolName: 'order.create_draft',
        params: expect.objectContaining({
          conversationId: 'conv_fb_1',
          customerId: 'cust_fb_1',
          productName: 'Swan High Skotch',
          productPrice: 499,
          quantity: 1,
          productSize: '42',
          customerName: 'أحمد اختبار',
          customerPhone: '01000000000',
          city: 'القاهرة',
        }),
      }));
      expect(result.result.tools).toEqual([
        expect.objectContaining({ tool: 'order.create_draft', success: true }),
      ]);
      expect(result.result.tools[0]).not.toEqual(expect.objectContaining({ deterministic: true }));
      const finalCustomerPrompt = JSON.stringify(mockProviderGenerateResponse.mock.calls[1][0]);
      expect(finalCustomerPrompt).not.toContain('approval_order_1');
      expect(finalCustomerPrompt).not.toContain('approvalCode');
      expect(finalCustomerPrompt).not.toContain('1234');
      expect(finalCustomerPrompt).toContain('pending store/merchant team review');
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent creates confirmed Facebook orders without approval drafts after explicit customer confirmation', async () => {
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'orders.create_confirmed',
        confidence: 0.96,
        ambiguous: false,
        slots: {
          productName: 'Swan High Skotch',
          productPrice: 499,
          quantity: 1,
          productSize: '42',
          customerName: 'Ahmed Confirmed',
          customerPhone: '01000000000',
          city: 'Cairo',
          confirmedByCustomer: true,
        },
      });
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_order_confirmed_fb_1',
          type: 'function',
          function: {
            name: 'agenttool__order_create_confirmed',
            arguments: JSON.stringify({
              productName: 'Swan High Skotch',
              productPrice: 499,
              quantity: 1,
              productSize: '42',
              customerName: 'Ahmed Confirmed',
              customerPhone: '01000000000',
              city: 'Cairo',
              confirmedByCustomer: true,
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'تم تأكيد طلبك رقم ORD-2026-0001.',
        text: () => 'تم تأكيد طلبك رقم ORD-2026-0001.',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'Facebook Sales Support',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['order.create_confirmed', 'product.search', 'customer.info'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const currentMessage = 'تمام أكد الطلب على نفس البيانات: Swan High Skotch مقاس 42، اسمي أحمد، رقمي 01000000000، القاهرة.';
    const executionMessage = [
      'Previous conversation:',
      'Assistant: Swan High Skotch is available in size 42 for 499 EGP.',
      '',
      `Customer message: ${currentMessage}`,
    ].join('\n');

    try {
      const result = await agent.processTask({
        description: executionMessage,
        currentMessage,
        intentMessage: currentMessage,
        conversationId: 'conv_fb_confirmed_1',
        intentContext: { channel: 'FACEBOOK', customerId: 'cust_fb_confirmed_1' },
      });

      expect(result.status).toBe('SUCCESS');
      expect(mockCreateOrderFromConversation).toHaveBeenCalledWith(expect.objectContaining({
        companyId: 'company_123456',
        conversationId: 'conv_fb_confirmed_1',
        customerId: 'cust_fb_confirmed_1',
        productName: 'Swan High Skotch',
        productPrice: 499,
        quantity: 1,
        productSize: '42',
        customerName: 'Ahmed Confirmed',
        customerPhone: '01000000000',
        city: 'Cairo',
      }));
      expect(mockCreateDraft).not.toHaveBeenCalled();
      expect(result.result.tools).toEqual([
        expect.objectContaining({ tool: 'order.create_confirmed', success: true }),
      ]);
      const finalCustomerPrompt = JSON.stringify(mockProviderGenerateResponse.mock.calls[1][0]);
      expect(finalCustomerPrompt).toContain('ORD-2026-0001');
      expect(finalCustomerPrompt).not.toContain('approval_order_1');
      expect(finalCustomerPrompt).not.toContain('approvalCode');
    } finally {
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent lets the model look up product price for Messenger order context', async () => {
    const executeSpy = jest.spyOn(agentToolGatewayService, 'execute')
      .mockResolvedValueOnce({
        success: true,
        readOnly: true,
        result: [
          { الاسم: 'Swan High Skotch', السعر: '499 جنيه', المخزون: 10 },
        ],
      });
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'products',
        confidence: 0.9,
        ambiguous: false,
        slots: { productName: 'Swan High Skotch' },
      });
    const agent = new CEOAgent('company_123456', {
      name: 'Facebook Sales Support',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['order.create_draft', 'product.search', 'customer.info'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_product_search_1',
          type: 'function',
          function: {
            name: 'agenttool__product_search',
            arguments: JSON.stringify({ query: 'Swan High Skotch', limit: 3 }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'سعر Swan High Skotch هو 499 جنيه. أكد لي لو تحب أجهز مسودة الطلب.',
        text: () => 'سعر Swan High Skotch هو 499 جنيه. أكد لي لو تحب أجهز مسودة الطلب.',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      });

    try {
      const currentMessage = 'عايز أعمل أوردر واحد Swan High Skotch مقاس 42، اسمي أحمد اختبار، رقمي 01000000000، القاهرة، مدينة نصر شارع اختبار.';
      const result = await agent.processTask({
        description: `Customer message: ${currentMessage}`,
        currentMessage,
        intentMessage: currentMessage,
        conversationId: 'conv_fb_2',
        intentContext: { channel: 'FACEBOOK', customerId: 'cust_fb_2' },
      });

      expect(result.status).toBe('SUCCESS');
      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({
        tool: 'product.search',
        source: 'native-tool-call',
        params: { query: 'Swan High Skotch', limit: 3 },
      }));
      expect(result.result.tools).toEqual([
        expect.objectContaining({ tool: 'product.search', success: true }),
      ]);
      expect(result.result.tools[0]).not.toEqual(expect.objectContaining({ deterministic: true }));
      expect(result.result.reply).toContain('499');
      expect(mockProviderGenerateResponse).toHaveBeenCalled();
    } finally {
      executeSpy.mockRestore();
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent repairs Messenger image replies when available image URLs are omitted', async () => {
    const imageUrl = 'https://maxp.online/uploads/products/platform-main.png';
    const executeSpy = jest.spyOn(agentToolGatewayService, 'execute')
      .mockResolvedValueOnce({
        success: true,
        readOnly: true,
        result: {
          found: true,
          count: 1,
          query: 'Platform Sneakers',
          products: [
            {
              name: 'Platform Sneakers',
              price: { amount: 499, currency: 'EGP' },
              status: 'AVAILABLE',
              images: [imageUrl],
            },
          ],
        },
      });
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'products',
        confidence: 0.9,
        ambiguous: false,
        slots: {
          productName: 'Platform Sneakers',
          productSize: '41',
          productColor: 'black',
          requestedProductImage: true,
        },
      });
    const agent = new CEOAgent('company_123456', {
      name: 'Facebook Sales Support',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['product.search', 'inventory.check'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_product_image_1',
          type: 'function',
          function: {
            name: 'agenttool__product_search',
            arguments: JSON.stringify({ query: 'Platform Sneakers', limit: 5 }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'Platform Sneakers is available in black size 41 for 499 EGP.',
        text: () => 'Platform Sneakers is available in black size 41 for 499 EGP.',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      })
      .mockResolvedValueOnce({
        success: true,
        content: `Platform Sneakers is available. Image: ${imageUrl}`,
        text: () => `Platform Sneakers is available. Image: ${imageUrl}`,
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      });

    try {
      const currentMessage = 'Please send an image link for Platform Sneakers black size 41.';
      const result = await agent.processTask({
        description: `Customer message: ${currentMessage}`,
        currentMessage,
        intentMessage: currentMessage,
        conversationId: 'conv_fb_image_link',
        intentContext: { channel: 'FACEBOOK', customerId: 'cust_fb_image_link' },
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.result.reply).toContain(imageUrl);
      expect(result.result.repaired).toBe(true);
      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(mockProviderGenerateResponse).toHaveBeenCalledTimes(3);
    } finally {
      executeSpy.mockRestore();
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent repairs customer catalog replies from structured classifier read evidence when the model skips tools', async () => {
    const executeSpy = jest.spyOn(agentToolGatewayService, 'execute')
      .mockResolvedValueOnce({
        success: true,
        readOnly: true,
        result: {
          found: true,
          productName: 'Platform Sneakers',
          price: '499 جنيه',
          constraintAvailable: true,
          constraintStatuses: [
            { type: 'SIZE', value: '41', status: 'AVAILABLE', stock: 8 },
            { type: 'COLOR', value: 'أسود', status: 'AVAILABLE', stock: 8 },
          ],
          images: ['https://example.test/platform-black.jpg'],
        },
      });
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'inventory',
        confidence: 0.93,
        ambiguous: false,
        slots: {
          productName: 'Platform Sneakers',
          productSize: '41',
          productColor: 'أسود',
        },
      });

    const agent = new CEOAgent('company_123456', {
      name: 'Facebook Sales Support',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['inventory.check', 'product.search', 'customer.info'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: 'هل يمكنني أن أسأل عن اسمك ورقم هاتفك لكي أتمكن من مساعدتك بشكل أفضل؟',
        text: () => 'هل يمكنني أن أسأل عن اسمك ورقم هاتفك لكي أتمكن من مساعدتك بشكل أفضل؟',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'Platform Sneakers متوفر باللون الأسود مقاس 41 وسعره 499 جنيه. أقدر أبعتلك الصورة المتاحة للمنتج.',
        text: () => 'Platform Sneakers متوفر باللون الأسود مقاس 41 وسعره 499 جنيه. أقدر أبعتلك الصورة المتاحة للمنتج.',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      });

    try {
      const currentMessage = 'مساء الخير، الكوتشي البلاتفورم سنيكرز ده موجود اسود مقاس 41؟ وسعره كام؟';
      const result = await agent.processTask({
        description: `Customer message: ${currentMessage}`,
        currentMessage,
        intentMessage: currentMessage,
        conversationId: 'conv_fb_inventory_repair',
        intentContext: { channel: 'FACEBOOK', customerId: 'cust_fb_inventory_repair' },
      });

      expect(result.status).toBe('SUCCESS');
      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({
        tool: 'inventory.check',
        source: 'model-classified-read-repair',
        params: {
          productNameOrSku: 'Platform Sneakers',
          productSize: '41',
          productColor: 'أسود',
        },
      }));
      expect(result.result.tools).toEqual([
        expect.objectContaining({
          tool: 'inventory.check',
          success: true,
          modelClassified: true,
          repaired: true,
        }),
      ]);
      expect(result.result.reply).toContain('499');
      expect(result.result.reply).not.toContain('اسمك');
      expect(result.result.reply).not.toContain('رقم هاتفك');
    } finally {
      executeSpy.mockRestore();
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent returns a customer-visible missing-price reply when Messenger product lookup cannot resolve price', async () => {
    const executeSpy = jest.spyOn(agentToolGatewayService, 'execute')
      .mockResolvedValueOnce({
        success: true,
        readOnly: true,
        result: { found: false, message: 'لا توجد منتجات مطابقة لـ "Swan High Skotch"' },
      });
    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'products',
        confidence: 0.88,
        ambiguous: false,
        slots: { productName: 'Swan High Skotch' },
      });

    const agent = new CEOAgent('company_123456', {
      name: 'Facebook Sales Support',
      role: 'FACEBOOK_SALES_SUPPORT',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['order.create_draft', 'product.search', 'customer.info'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_product_search_missing_price_1',
          type: 'function',
          function: {
            name: 'agenttool__product_search',
            arguments: JSON.stringify({ query: 'Swan High Skotch', limit: 3 }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'محتاج السعر المؤكد قبل تجهيز مسودة الطلب.',
        text: () => 'محتاج السعر المؤكد قبل تجهيز مسودة الطلب.',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      });

    try {
      const currentMessage = 'عايز أعمل أوردر واحد Swan High Skotch مقاس 42، اسمي أحمد اختبار، رقمي 01000000000، القاهرة، مدينة نصر شارع اختبار.';
      const result = await agent.processTask({
        description: `Customer message: ${currentMessage}`,
        currentMessage,
        intentMessage: currentMessage,
        conversationId: 'conv_fb_3',
        intentContext: { channel: 'FACEBOOK', customerId: 'cust_fb_3' },
      });

      expect(result.status).toBe('SUCCESS');
      expect(executeSpy).toHaveBeenCalledTimes(1);
      expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({
        tool: 'product.search',
        source: 'native-tool-call',
      }));
      expect(result.result.reply).toContain('محتاج السعر المؤكد');
      expect(result.result.reply).not.toContain('order.create_draft');
      expect(mockProviderGenerateResponse).toHaveBeenCalled();
    } finally {
      executeSpy.mockRestore();
      classifySpy.mockRestore();
    }
  });

  test('CEO Agent action parser runs an existing specialist by name for delegated order-draft tasks', async () => {
    mockRunAgentTask.mockResolvedValueOnce({
      success: true,
      agent: { id: 'agent_sales_fb', name: 'وكيل مبيعات فيسبوك', role: 'SALES', status: 'ACTIVE' },
      result: {
        success: true,
        result: {
          draftId: 'approval_order_2',
          orderDraft: {
            productName: 'كوتشي اختبار',
            productPrice: 100,
            quantity: 1,
            customerName: 'أحمد',
            customerPhone: '01000000000',
          },
        },
      },
    });
    mockProviderGenerateResponse.mockResolvedValueOnce({
      success: true,
      content: 'تم تجهيز مسودة طلب عن طريق وكيل مبيعات فيسبوك.',
      text: () => 'تم تجهيز مسودة طلب عن طريق وكيل مبيعات فيسبوك.',
      provider: 'NVIDIA',
      model: 'minimaxai/minimax-m2.7',
      toolCalls: [],
    });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['agent.run_task', 'agent.list_agents', 'agent.read_state'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'agents.run_task',
        confidence: 0.95,
        ambiguous: false,
        slots: {},
      });

    let result;
    try {
      result = await agent.processTask({
        description: 'كلف وكيل مبيعات فيسبوك يعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1',
        currentMessage: 'كلف وكيل مبيعات فيسبوك يعمل مسودة اوردر للعميل أحمد 01000000000 منتج كوتشي اختبار سعر 100 كمية 1',
        intentContext: { recentMessages: [] },
      });
    } finally {
      classifySpy.mockRestore();
    }

    expect(result.status).toBe('SUCCESS');
    expect(mockRunAgentTask).toHaveBeenCalledWith('company_123456', expect.objectContaining({
      agentName: 'وكيل مبيعات فيسبوك',
      task: expect.stringContaining('مسودة اوردر'),
    }));
    expect(result.result.tools).toEqual([
      expect.objectContaining({ tool: 'agent.run_task', success: true, deterministic: true }),
    ]);
  });

  test('CEO Agent can continue native tool rounds for agent and skill creation', async () => {
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_spawn',
          type: 'function',
          function: {
            name: 'agenttool__agent_spawn',
            arguments: JSON.stringify({ role: 'MARKETING', name: 'Wofod Content Agent' }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_skill',
          type: 'function',
          function: {
            name: 'agenttool__skill_create',
            arguments: JSON.stringify({
              id: 'content-writing',
              displayName: 'Content Writing',
              description: 'Create marketing content for products and offers.',
              allowedTools: ['product.search'],
              assignToAgentId: 'agent_inventory_1',
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'تم إنشاء الوكيل والمهارة وتسجيلهم في النظام.',
        text: () => 'تم إنشاء الوكيل والمهارة وتسجيلهم في النظام.',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['agent.spawn', 'skill.create', 'agent.list_agents'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'agents.manage',
        confidence: 0.95,
        ambiguous: false,
        slots: {},
      });

    let result;
    try {
      result = await agent.processTask({
        description: 'تمام نفذ فريق التسويق والمهارات المطلوبة',
        currentMessage: 'تمام نفذ',
        intentContext: {
          recentMessages: [
            { role: 'assistant', content: 'هأنشئ Wofod Content Agent ومهارة Content Writing.' },
          ],
        },
      });
    } finally {
      classifySpy.mockRestore();
    }

    expect(result.status).toBe('SUCCESS');
    expect(mockHireAgent).toHaveBeenCalledWith(
      'company_123456',
      expect.objectContaining({ role: 'MARKETING', name: 'Wofod Content Agent' })
    );
    expect(mockCreateSkill).toHaveBeenCalledWith(
      'company_123456',
      expect.objectContaining({ displayName: 'Content Writing' })
    );
    expect(result.result.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tool: 'agent.spawn', success: true }),
        expect.objectContaining({ tool: 'skill.create', success: true }),
      ])
    );
  });

  test('CEO Agent can finish three sequential skill.create rounds before replying', async () => {
    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_skill_1',
          type: 'function',
          function: {
            name: 'agenttool__skill_create',
            arguments: JSON.stringify({
              id: 'content-writing',
              displayName: 'Content Writing',
              description: 'Create marketing content for products and offers.',
              allowedTools: ['product.search'],
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_skill_2',
          type: 'function',
          function: {
            name: 'agenttool__skill_create',
            arguments: JSON.stringify({
              id: 'social-media-scheduling',
              displayName: 'Social Media Scheduling',
              description: 'Prepare social media publishing plans.',
              allowedTools: ['product.search'],
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: '',
        text: () => '',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [{
          id: 'call_skill_3',
          type: 'function',
          function: {
            name: 'agenttool__skill_create',
            arguments: JSON.stringify({
              id: 'competitor-analysis',
              displayName: 'Competitor Analysis',
              description: 'Compare product positioning against approved market context.',
              allowedTools: ['product.search'],
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'تم إنشاء المهارات الثلاث وتسجيلها في النظام.',
        text: () => 'تم إنشاء المهارات الثلاث وتسجيلها في النظام.',
        provider: 'NVIDIA',
        model: 'minimaxai/minimax-m2.7',
        toolCalls: [],
      });

    const agent = new CEOAgent('company_123456', {
      name: 'CEO Agent',
      model: 'minimaxai/minimax-m2.7',
      allowedTools: ['skill.create', 'agent.read_state'],
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        apiKey: 'test-key',
        model: 'minimaxai/minimax-m2.7',
        keyId: 'key1',
        keyName: 'test',
        provider: 'NVIDIA',
      })),
      recordRoutingSuccess: jest.fn(async () => {}),
    });

    const classifySpy = jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'skills.manage',
        confidence: 0.95,
        ambiguous: false,
        slots: {},
      });

    let result;
    try {
      result = await agent.processTask({
        description: 'أنشئ مهارات content-writing و social-media-scheduling و competitor-analysis.',
        currentMessage: 'أنشئ ثلاث مهارات جديدة للتسويق',
        intentContext: { recentMessages: [] },
      });
    } finally {
      classifySpy.mockRestore();
    }

    expect(result.status).toBe('SUCCESS');
    expect(mockCreateSkill).toHaveBeenCalledTimes(3);
    expect(result.result.reply).toContain('المهارات الثلاث');
    expect(result.result.tools.filter(entry => entry.tool === 'skill.create')).toHaveLength(3);
  });
});
