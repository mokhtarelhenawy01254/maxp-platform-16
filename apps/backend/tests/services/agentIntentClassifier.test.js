const { classifyIntentFromLLM } = require('../../legacy-ai-agent/aiAgent/agentIntentClassifierService');
const { resolveToolPlan } = require('../../legacy-ai-agent/aiAgent/agentIntentRelevanceService');
const aiRuntimeService = require('../../services/aiRuntimeService');
const AIProviderFactory = require('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory');

jest.mock('../../services/aiRuntimeService');
jest.mock('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory');

describe('agentIntentClassifierService', () => {
  let mockModelManager;
  let mockProvider;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProvider = {
      generateResponse: jest.fn(),
    };

    mockModelManager = {
      getNextKeySimple: jest.fn().mockResolvedValue({
        apiKey: 'test-key',
        model: 'gemini-2.5-flash',
        keyId: 'key1',
        keyName: 'test',
        provider: 'GOOGLE',
      }),
      recordRoutingSuccess: jest.fn().mockResolvedValue({}),
    };

    aiRuntimeService.getModelManager.mockReturnValue(mockModelManager);
    AIProviderFactory.getProvider.mockReturnValue(mockProvider);
  });

  test('successfully classifies clear Arabic message and extracts slots via LLM tool call', async () => {
    mockProvider.generateResponse.mockResolvedValue({
      success: true,
      text: () => '',
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: 'classify_intent',
                  args: {
                    intent: 'orders.create_draft',
                    confidence: 0.95,
                    ambiguous: false,
                    slots: {
                      productName: 'تيشرت عجينة',
                      productPrice: 150,
                      customerName: 'محمد أحمد',
                      customerPhone: '01012345678',
                    },
                  },
                },
              },
            ],
          },
        },
      ],
      toolCalls: [
        {
          id: 'classify_intent-1',
          type: 'function',
          function: {
            name: 'classify_intent',
            arguments: JSON.stringify({
              intent: 'orders.create_draft',
              confidence: 0.95,
              ambiguous: false,
              slots: {
                productName: 'تيشرت عجينة',
                productPrice: 150,
                customerName: 'محمد أحمد',
                customerPhone: '01012345678',
              },
            }),
          },
        },
      ],
      usageMetadata: { totalTokenCount: 150 },
      provider: 'GOOGLE',
      model: 'gemini-2.5-flash',
    });

    const result = await classifyIntentFromLLM({
      message: 'اعملي اوردر تيشرت عجينة بـ 150 جنيه للعميل محمد أحمد تليفون 01012345678',
      companyId: 'company_123',
      availableTools: ['order.create_draft'],
    });

    expect(result).not.toBeNull();
    expect(result.intent).toBe('orders.create_draft');
    expect(result.confidence).toBe(0.95);
    expect(result.ambiguous).toBe(false);
    expect(result.slots.productName).toBe('تيشرت عجينة');
    expect(result.slots.productPrice).toBe(150);
    expect(result.slots.customerName).toBe('محمد أحمد');
    expect(result.slots.customerPhone).toBe('01012345678');
  });

  test('successfully identifies ambiguous message and extracts clarification question', async () => {
    mockProvider.generateResponse.mockResolvedValue({
      success: true,
      text: () => '',
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: 'classify_intent',
                  args: {
                    intent: 'general.chat',
                    confidence: 0.8,
                    ambiguous: true,
                    clarificationQuestion: 'هل ترغب في إضافة منتج جديد أم تعيين وكيل جديد؟',
                    slots: {},
                  },
                },
              },
            ],
          },
        },
      ],
      toolCalls: [
        {
          id: 'classify_intent-1',
          type: 'function',
          function: {
            name: 'classify_intent',
            arguments: JSON.stringify({
              intent: 'general.chat',
              confidence: 0.8,
              ambiguous: true,
              clarificationQuestion: 'هل ترغب في إضافة منتج جديد أم تعيين وكيل جديد؟',
              slots: {},
            }),
          },
        },
      ],
      usageMetadata: { totalTokenCount: 120 },
      provider: 'GOOGLE',
      model: 'gemini-2.5-flash',
    });

    const result = await classifyIntentFromLLM({
      message: 'اعمل واحد جديد',
      companyId: 'company_123',
      availableTools: [],
    });

    expect(result).not.toBeNull();
    expect(result.intent).toBe('general.chat');
    expect(result.ambiguous).toBe(true);
    expect(result.clarificationQuestion).toBe('هل ترغب في إضافة منتج جديد أم تعيين وكيل جديد؟');
  });

  test('keeps generic create requests ambiguous when classifier guesses a write intent without slots', async () => {
    mockProvider.generateResponse.mockResolvedValue({
      success: true,
      text: () => '',
      toolCalls: [
        {
          id: 'classify_intent-1',
          type: 'function',
          function: {
            name: 'classify_intent',
            arguments: JSON.stringify({
              intent: 'products.manage',
              confidence: 0.93,
              ambiguous: false,
              slots: {},
            }),
          },
        },
      ],
      provider: 'GOOGLE',
      model: 'gemini-2.5-flash',
    });

    const plan = await resolveToolPlan({
      message: 'اعمل واحد جديد',
      availableTools: ['product.create', 'agent.spawn', 'skill.create'],
      context: { companyId: 'company_123', useLLMClassifier: true },
    });

    expect(plan.intent).toBe('general.chat');
    expect(plan.source).toBe('llm-classifier');
    expect(plan.ambiguous).toBe(true);
    expect(plan.decision).toBe('ask_followup');
    expect(plan.requiresTool).toBe(false);
    expect(plan.allowedTools).toEqual([]);
  });

  test('disables tool routing when LLM classifier throws instead of falling back to keywords', async () => {
    mockProvider.generateResponse.mockRejectedValue(new Error('API quota exceeded'));

    // Directly test resolveToolPlan which uses buildIntentContractAsync under the hood when companyId is provided
    const plan = await resolveToolPlan({
      message: 'عايز اضيف منتج جديد كوتشي',
      availableTools: ['product.create'],
      context: { companyId: 'company_123', useLLMClassifier: true },
    });

    expect(plan).not.toBeNull();
    expect(plan.intent).toBe('general.chat');
    expect(plan.requiresTool).toBe(false);
    expect(plan.allowedTools).toEqual([]);
    expect(plan.blockedReason).toBe('INTENT_CLASSIFICATION_UNAVAILABLE');
    expect(plan.source).toBe('llm-classifier');
  });

  test('uses model-generated JSON classification when a tool-capable provider returns text instead of a tool call', async () => {
    mockProvider.generateResponse
      .mockResolvedValueOnce({
        success: true,
        text: () => 'I can classify this but did not call the function.',
        content: 'I can classify this but did not call the function.',
        toolCalls: [],
        provider: 'GROQ',
        model: 'llama-3.3-70b-versatile',
      })
      .mockResolvedValueOnce({
        success: true,
        text: () => JSON.stringify({
          intent: 'inventory',
          confidence: 0.91,
          ambiguous: false,
          clarificationQuestion: null,
          slots: {
            productName: 'Platform Sneakers',
            productSize: '41',
            productColor: 'black',
          },
        }),
        content: JSON.stringify({
          intent: 'inventory',
          confidence: 0.91,
          ambiguous: false,
          clarificationQuestion: null,
          slots: {
            productName: 'Platform Sneakers',
            productSize: '41',
            productColor: 'black',
          },
        }),
        toolCalls: [],
        provider: 'GROQ',
        model: 'llama-3.3-70b-versatile',
      });

    const result = await classifyIntentFromLLM({
      message: 'Platform Sneakers black size 41 price and availability only',
      companyId: 'company_123',
      availableTools: ['inventory.check', 'product.search'],
      context: { channel: 'FACEBOOK' },
    });

    expect(result).toEqual(expect.objectContaining({
      intent: 'inventory',
      confidence: 0.91,
      ambiguous: false,
    }));
    expect(result.slots).toEqual(expect.objectContaining({
      productName: 'Platform Sneakers',
      productSize: '41',
      productColor: 'black',
    }));
    expect(mockProvider.generateResponse).toHaveBeenCalledTimes(2);
  });

  test('customer catalog questions can route through JSON fallback without keyword routing', async () => {
    mockProvider.generateResponse
      .mockResolvedValueOnce({
        success: true,
        text: () => 'No function call produced.',
        content: 'No function call produced.',
        toolCalls: [],
        provider: 'GROQ',
        model: 'llama-3.3-70b-versatile',
      })
      .mockResolvedValueOnce({
        success: true,
        text: () => '{"intent":"inventory","confidence":0.88,"ambiguous":false,"clarificationQuestion":null,"slots":{"productName":"Platform Sneakers","productSize":"41","productColor":"black","requestedProductImage":true}}',
        content: '{"intent":"inventory","confidence":0.88,"ambiguous":false,"clarificationQuestion":null,"slots":{"productName":"Platform Sneakers","productSize":"41","productColor":"black","requestedProductImage":true}}',
        toolCalls: [],
        provider: 'GROQ',
        model: 'llama-3.3-70b-versatile',
      });

    const plan = await resolveToolPlan({
      message: 'Platform Sneakers black size 41 price and availability only',
      availableTools: ['inventory.check', 'product.search', 'agent.handoff'],
      context: { companyId: 'company_123', channel: 'FACEBOOK' },
    });

    expect(plan.intent).toBe('inventory');
    expect(plan.source).toBe('llm-classifier');
    expect(plan.requiresTool).toBe(true);
    expect(plan.primaryTool).toBe('inventory.check');
    expect(plan.allowedTools).toEqual(expect.arrayContaining(['inventory.check', 'product.search']));
    expect(plan.slots).toEqual(expect.objectContaining({
      productName: 'Platform Sneakers',
      productSize: '41',
      productColor: 'black',
      requestedProductImage: true,
    }));
  });

  test('uses the schema-bound classifier path even when semantic router could match locally', async () => {
    mockProvider.generateResponse.mockResolvedValue({
      success: true,
      text: () => '',
      toolCalls: [],
      provider: 'GOOGLE',
      model: 'gemini-2.5-flash',
    });

    const plan = await resolveToolPlan({
      message: 'ازيك يا عباس',
      availableTools: [],
      context: { companyId: 'company_123', useLLMClassifier: true },
    });

    expect(plan.intent).toBe('general.chat');
    expect(plan.requiresTool).toBe(false);
    expect(plan.source).toBe('llm-classifier');
    expect(mockProvider.generateResponse).toHaveBeenCalled();
  });

  test('correctly disambiguates "ممكن اشوف البديله" as product search rather than exchange', async () => {
    mockProvider.generateResponse.mockResolvedValue({
      success: true,
      text: () => '',
      toolCalls: [
        {
          id: 'classify_intent-1',
          type: 'function',
          function: {
            name: 'classify_intent',
            arguments: JSON.stringify({
              intent: 'products',
              confidence: 0.95,
              ambiguous: false,
              slots: {},
            }),
          },
        },
      ],
      provider: 'GOOGLE',
      model: 'gemini-2.5-flash',
    });

    const result = await classifyIntentFromLLM({
      message: 'ممكن اشوف البديله',
      companyId: 'company_123',
      availableTools: ['product.search'],
      channel: 'FACEBOOK',
    });

    expect(result).not.toBeNull();
    expect(result.intent).toBe('products');
    expect(result.confidence).toBe(0.95);
  });
});
