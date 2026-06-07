const mockGatewayExecute = jest.fn();
const mockProviderGenerateResponse = jest.fn();

jest.mock('../../legacy-ai-agent/aiAgent/agentSoulConfig', () => ({
  loadSoul: jest.fn(async () => ({
    soul: 'You answer for {companyName}.',
    rules: 'Use tools for current inventory questions.',
    companyName: 'TestCo',
    enabledTools: ['inventory.check', 'product.search', 'product.lowStock'],
  })),
}));

jest.mock('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory', () => ({
  getProvider: jest.fn(() => ({
    generateResponse: mockProviderGenerateResponse,
  })),
}));

jest.mock('../../legacy-ai-agent/aiAgent/agentToolGatewayService', () => ({
  newTraceId: jest.fn(() => 'trace_inventory_1'),
  logIntentPlan: jest.fn(async () => null),
  logReplyBlocked: jest.fn(async () => null),
  execute: mockGatewayExecute,
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
    closeSharedDatabase: jest.fn(async () => null),
  };
});

const { resolveToolPlan } = require('../../legacy-ai-agent/aiAgent/agentIntentRelevanceService');
const agentIntentClassifierService = require('../../legacy-ai-agent/aiAgent/agentIntentClassifierService');
const CEOAgent = require('../../legacy-ai-agent/aiAgent/CEOAgent');

describe('model-classified inventory availability replies', () => {
  beforeEach(() => {
    mockGatewayExecute.mockReset();
    mockProviderGenerateResponse.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('routes product availability with a requested size to inventory.check from the structured classifier', async () => {
    jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'inventory',
        confidence: 0.96,
        ambiguous: false,
        slots: {
          productNameOrSku: 'Swan High Skotch',
          productSize: '42',
        },
      });

    const plan = await resolveToolPlan({
      message: 'اختبار كودكس LIVE-123: هل Swan High Skotch متاح مقاس 42؟ رد عليا بتوفر المقاس نفسه.',
      availableTools: ['inventory.check', 'product.search', 'product.lowStock'],
      context: { companyId: 'company_123456', channel: 'FACEBOOK' },
    });

    expect(plan.intent).toBe('inventory');
    expect(plan.requiresTool).toBe(true);
    expect(plan.primaryTool).toBe('inventory.check');
    expect(plan.allowedTools).toContain('inventory.check');
    expect(plan.source).toBe('llm-classifier');
    expect(plan.slots).toEqual(expect.objectContaining({
      productNameOrSku: 'Swan High Skotch',
      productSize: '42',
    }));
  });

  test('CEO Agent answers requested size availability from model-classified slots and the inventory tool result', async () => {
    jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'inventory',
        confidence: 0.96,
        ambiguous: false,
        slots: {
          productNameOrSku: 'Swan High Skotch',
          productSize: '42',
        },
      });
    mockGatewayExecute.mockResolvedValueOnce({
      success: true,
      readOnly: true,
      result: {
        found: true,
        productName: 'Swan High Skotch',
        requestedSize: '42',
        status: 'AVAILABLE_LOW_STOCK',
        quantity: 3,
      },
    });

    const agent = new CEOAgent('company_123456', {
      allowedTools: ['inventory.check', 'product.search', 'product.lowStock'],
      includeAllCeoTools: false,
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({
        provider: 'test',
        model: 'test-model',
        apiKey: 'test-key',
      })),
      recordRoutingSuccess: jest.fn(async () => null),
    });

    mockProviderGenerateResponse.mockResolvedValueOnce({
      success: true,
      content: 'هراجع التوفر لحضرتك.',
      text: () => 'هراجع التوفر لحضرتك.',
    }).mockResolvedValueOnce({
      success: true,
      content: 'Swan High Skotch متاح مقاس 42. المقاس 42: مخزون منخفض (3)',
      text: () => 'Swan High Skotch متاح مقاس 42. المقاس 42: مخزون منخفض (3)',
    });

    const result = await agent.processTask({
      description: 'اختبار كودكس LIVE-123: هل Swan High Skotch متاح مقاس 42؟ رد عليا بتوفر المقاس نفسه.',
      currentMessage: 'اختبار كودكس LIVE-123: هل Swan High Skotch متاح مقاس 42؟ رد عليا بتوفر المقاس نفسه.',
      intentContext: { channel: 'FACEBOOK' },
    });

    expect(mockGatewayExecute).toHaveBeenCalledWith(expect.objectContaining({
      tool: 'inventory.check',
      params: {
        productNameOrSku: 'Swan High Skotch',
        productSize: '42',
      },
    }));
    expect(mockProviderGenerateResponse).toHaveBeenCalled();
    expect(result.status).toBe('SUCCESS');
    expect(result.result.reply).toBe('Swan High Skotch متاح مقاس 42. المقاس 42: مخزون منخفض (3)');
    expect(result.result.toolsUsed).toBe(true);
  });

  test('answers product price and available sizes from catalog inventory data selected by the structured classifier', async () => {
    jest.spyOn(agentIntentClassifierService, 'classifyIntentFromLLM')
      .mockResolvedValue({
        intent: 'inventory',
        confidence: 0.93,
        ambiguous: false,
        slots: {
          productNameOrSku: 'Swan High Skotch',
        },
      });

    const plan = await resolveToolPlan({
      message: 'سعر Swan High Skotch كام ومتاح منه مقاسات ايه؟',
      availableTools: ['inventory.check', 'product.search'],
      context: { companyId: 'company_123456', channel: 'FACEBOOK' },
    });

    expect(plan.intent).toBe('inventory');
    expect(plan.primaryTool).toBe('inventory.check');

    mockGatewayExecute.mockResolvedValueOnce({
      success: true,
      readOnly: true,
      result: {
        found: true,
        productName: 'Swan High Skotch',
        price: '350 EGP',
        availableSizes: [
          { size: '39', quantity: 4, status: 'LOW_STOCK' },
          { size: '40', quantity: 9, status: 'AVAILABLE' },
        ],
      },
    });

    const agent = new CEOAgent('company_123456', {
      allowedTools: ['inventory.check', 'product.search'],
      includeAllCeoTools: false,
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({ provider: 'test', model: 'test-model', apiKey: 'test-key' })),
      recordRoutingSuccess: jest.fn(async () => null),
    });

    mockProviderGenerateResponse.mockResolvedValueOnce({
      success: true,
      content: 'هراجع السعر والمقاسات المتاحة.',
      text: () => 'هراجع السعر والمقاسات المتاحة.',
    }).mockResolvedValueOnce({
      success: true,
      content: 'Swan High Skotch سعره 350 EGP... المقاسات المسجلة: 39 مخزون منخفض (4)، 40 متوفر (9)',
      text: () => 'Swan High Skotch سعره 350 EGP... المقاسات المسجلة: 39 مخزون منخفض (4)، 40 متوفر (9)',
    });

    const result = await agent.processTask({
      description: 'سعر Swan High Skotch كام ومتاح منه مقاسات ايه؟',
      currentMessage: 'سعر Swan High Skotch كام ومتاح منه مقاسات ايه؟',
      intentContext: { channel: 'FACEBOOK' },
    });

    expect(mockGatewayExecute).toHaveBeenCalledWith(expect.objectContaining({
      tool: 'inventory.check',
      params: { productNameOrSku: 'Swan High Skotch' },
    }));
    expect(mockProviderGenerateResponse).toHaveBeenCalled();
    expect(result.result.reply).toContain('Swan High Skotch سعره 350 EGP');
    expect(result.result.reply).toContain('المقاسات المسجلة: 39 مخزون منخفض (4)، 40 متوفر (9)');
  });

  test('answers order lookup and shipping rates deterministically when the message has enough slots', async () => {
    mockGatewayExecute
      .mockResolvedValueOnce({
        success: true,
        readOnly: true,
        result: {
          found: false,
          message: 'لم يُعثر على طلب رقم TEST-123',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        readOnly: true,
        result: {
          found: true,
          governorate: 'القاهرة',
          price: '55 EGP',
          deliveryTime: '2-3 أيام',
          message: 'سعر الشحن لـ القاهرة هو 55 EGP ويستغرق التوصيل حوالي 2-3 أيام',
        },
      });

    const agent = new CEOAgent('company_123456', {
      allowedTools: ['order.lookup', 'order.summary', 'order.recentList', 'shipping.rates'],
      includeAllCeoTools: false,
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({ provider: 'test', model: 'test-model', apiKey: 'test-key' })),
      recordRoutingSuccess: jest.fn(async () => null),
    });

    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: 'لم يُعثر على طلب رقم TEST-123',
        text: () => 'لم يُعثر على طلب رقم TEST-123',
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'سعر الشحن لـ القاهرة هو 55 EGP ويستغرق التوصيل حوالي 2-3 أيام',
        text: () => 'سعر الشحن لـ القاهرة هو 55 EGP ويستغرق التوصيل حوالي 2-3 أيام',
      });

    const orderResult = await agent.processTask({
      description: 'عايز أعرف الأوردر TEST-123 وصل فين؟',
      currentMessage: 'عايز أعرف الأوردر TEST-123 وصل فين؟',
      forceDeterministicReplies: true,
    });
    const shippingResult = await agent.processTask({
      description: 'الشحن للقاهرة كام وبيوصل في قد إيه؟',
      currentMessage: 'الشحن للقاهرة كام وبيوصل في قد إيه؟',
      forceDeterministicReplies: true,
    });

    expect(mockGatewayExecute).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tool: 'order.lookup',
      params: { orderNumber: 'TEST-123' },
    }));
    expect(mockGatewayExecute).toHaveBeenNthCalledWith(2, expect.objectContaining({
      tool: 'shipping.rates',
      params: { governorate: 'القاهرة' },
    }));
    expect(mockProviderGenerateResponse).toHaveBeenCalled();
    expect(orderResult.result.reply).toBe('لم يُعثر على طلب رقم TEST-123');
    expect(shippingResult.result.reply).toContain('سعر الشحن لـ القاهرة هو 55 EGP');
  });

  test('hands refund and complaint requests to human support without waiting for a model', async () => {
    mockGatewayExecute
      .mockResolvedValueOnce({
        success: true,
        readOnly: false,
        result: {
          handoff: true,
          task: { id: 'task_1' },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        readOnly: false,
        result: {
          handoff: true,
          task: { id: 'task_2' },
        },
      });

    const agent = new CEOAgent('company_123456', {
      allowedTools: ['agent.handoff', 'order.lookup', 'customer.info'],
      includeAllCeoTools: false,
    });
    agent.setModelManager({
      getNextKeySimple: jest.fn(async () => ({ provider: 'test', model: 'test-model', apiKey: 'test-key' })),
      recordRoutingSuccess: jest.fn(async () => null),
    });

    mockProviderGenerateResponse
      .mockResolvedValueOnce({
        success: true,
        content: 'حوّلت المحادثة لفريق الدعم، استرداد الفلوس محتاج مراجعة بشرية.',
        text: () => 'حوّلت المحادثة لفريق الدعم، استرداد الفلوس محتاج مراجعة بشرية.',
      })
      .mockResolvedValueOnce({
        success: true,
        content: 'حوّلت المحادثة لفريق الدعم، ارفع صورة واضحة للمشكلة.',
        text: () => 'حوّلت المحادثة لفريق الدعم، ارفع صورة واضحة للمشكلة.',
      });

    const refundResult = await agent.processTask({
      description: 'عايز أرجع المنتج واسترد فلوسي.',
      currentMessage: 'عايز أرجع المنتج واسترد فلوسي.',
      conversationId: 'conversation_1',
      intentContext: { customerId: 'customer_1' },
      forceDeterministicReplies: true,
    });

    const complaintResult = await agent.processTask({
      description: 'FB-043-COMPLAINT-FIX-173015: المنتج وصل بايظ والخامة وحشة، أعمل إيه؟',
      currentMessage: 'FB-043-COMPLAINT-FIX-173015: المنتج وصل بايظ والخامة وحشة، أعمل إيه؟',
      conversationId: 'conversation_1',
      intentContext: { customerId: 'customer_1' },
      forceDeterministicReplies: true,
    });

    expect(mockGatewayExecute).toHaveBeenNthCalledWith(1, expect.objectContaining({
      tool: 'agent.handoff',
      params: expect.objectContaining({
        targetType: 'human',
        reason: 'customer_refund_request',
        conversationId: 'conversation_1',
        customerId: 'customer_1',
      }),
    }));
    expect(mockGatewayExecute).toHaveBeenNthCalledWith(2, expect.objectContaining({
      tool: 'agent.handoff',
      params: expect.objectContaining({
        targetType: 'human',
        reason: 'customer_complaint_or_damage',
        conversationId: 'conversation_1',
        customerId: 'customer_1',
        priority: 'high',
      }),
    }));
    expect(mockProviderGenerateResponse).toHaveBeenCalled();
    expect(refundResult.result.reply).toContain('حوّلت المحادثة لفريق الدعم');
    expect(refundResult.result.reply).toContain('استرداد الفلوس محتاج مراجعة بشرية');
    expect(complaintResult.result.reply).toContain('حوّلت المحادثة لفريق الدعم');
    expect(complaintResult.result.reply).toContain('صورة واضحة للمشكلة');
  });
});
