const mockClearAllCaches = jest.fn();
const mockListProviderLogs = jest.fn();
const mockGetProviderLogSummary = jest.fn();
const mockRecordProviderEvent = jest.fn();
const mockGetProvider = jest.fn();
const mockGetBudgetSnapshot = jest.fn();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  safeQuery: jest.fn(async callback => callback()),
}));

jest.mock('../../services/aiRuntimeService', () => ({
  getModelManager: jest.fn(() => ({
    clearAllCaches: mockClearAllCaches,
  })),
}));

jest.mock('../../legacy-ai-agent/aiAgent/providerLogService', () => ({
  listProviderLogs: mockListProviderLogs,
  getProviderLogSummary: mockGetProviderLogSummary,
  recordProviderEvent: mockRecordProviderEvent,
}));

jest.mock('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory', () => ({
  getProvider: mockGetProvider,
}));

jest.mock('../../legacy-ai-agent/aiAgent/providerBudgetLedgerService', () => ({
  getBudgetSnapshot: mockGetBudgetSnapshot,
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const superAdminAiController = require('../../controller/superAdminAiController');

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status: jest.fn(function setStatus(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function sendJson(payload) {
      this.body = payload;
      return this;
    }),
  };
}

describe('superAdmin AI provider diagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBudgetSnapshot.mockResolvedValue({
      limited: false,
      allowed: true,
      reason: null,
      limits: {},
      usage: {
        minute: { requests: 0, tokens: 0 },
        day: { requests: 0, tokens: 0 },
      },
      penalty: null,
      budgetKey: 'budget-key',
    });
  });

  test('returns provider logs with filters and summary for the global logs page', async () => {
    const logs = [
      {
        id: 'log-1',
        provider: 'GOOGLE',
        keyId: 'key-1',
        action: 'generation_success',
        status: 'success',
        latencyMs: 480,
        createdAt: '2026-05-19T10:00:00.000Z',
      },
    ];
    const summary = {
      total: 1,
      success: 1,
      failed: 0,
      warning: 0,
      avgLatencyMs: 480,
    };
    mockListProviderLogs.mockResolvedValue(logs);
    mockGetProviderLogSummary.mockResolvedValue(summary);
    const res = createResponse();

    await superAdminAiController.getProviderLogs({
      query: {
        provider: 'google',
        keyId: 'key-1',
        action: 'generation_success',
        status: 'success',
        sinceHours: '24',
        limit: '50',
      },
    }, res);

    expect(mockListProviderLogs).toHaveBeenCalledWith({
      provider: 'google',
      keyId: 'key-1',
      companyId: undefined,
      action: 'generation_success',
      status: 'success',
      scope: undefined,
      sinceHours: '24',
      limit: '50',
    });
    expect(mockGetProviderLogSummary).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'google',
      keyId: 'key-1',
      action: 'generation_success',
    }));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.body).toEqual({
      success: true,
      data: {
        logs,
        summary,
        filters: expect.objectContaining({
          provider: 'GOOGLE',
          keyId: 'key-1',
          action: 'generation_success',
          status: 'success',
          sinceHours: '24',
        }),
      },
    });
  });

  test('returns provider dashboard with catalog, budget, logs, and fallback order', async () => {
    const prisma = {
      globalAiConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'global-config',
          defaultProvider: 'GROQ',
          isActive: true,
          enableFailover: true,
          settings: JSON.stringify({ providerPriority: ['GROQ', 'GOOGLE'] }),
        }),
      },
      aiKey: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'key-groq',
            name: 'Central Groq',
            provider: 'GROQ',
            apiKey: 'gsk_secret',
            baseUrl: 'https://api.groq.com/openai/v1',
            isActive: true,
            keyType: 'CENTRAL',
            companyId: null,
            priority: 1,
            usage: JSON.stringify({
              routing: {
                lastSucceededAt: '2026-05-20T09:00:00.000Z',
                lastSucceededModel: 'llama-3.3-70b-versatile',
                successCount: 2,
                selectionCount: 3,
              },
            }),
            currentUsage: 0,
            maxRequestsPerDay: 1000,
            createdAt: '2026-05-20T08:00:00.000Z',
            updatedAt: '2026-05-20T08:00:00.000Z',
            aiModelConfigs: [
              {
                id: 'model-groq',
                modelName: 'llama-3.3-70b-versatile',
                isEnabled: true,
                priority: 1,
                usage: JSON.stringify({ limits: { rpd: 1000 } }),
                createdAt: '2026-05-20T08:00:00.000Z',
                updatedAt: '2026-05-20T08:00:00.000Z',
              },
            ],
          },
        ]),
      },
    };
    mockListProviderLogs.mockResolvedValue([
      {
        id: 'log-1',
        provider: 'GROQ',
        action: 'generation_success',
        status: 'success',
        latencyMs: 120,
        createdAt: '2026-05-20T09:01:00.000Z',
      },
      {
        id: 'log-2',
        provider: 'GROQ',
        action: 'routing_budget_skip',
        status: 'warning',
        message: 'budget warning',
        createdAt: '2026-05-20T09:02:00.000Z',
      },
    ]);
    mockGetBudgetSnapshot.mockResolvedValue({
      limited: true,
      allowed: true,
      reason: null,
      limits: { rpd: 1000 },
      usage: {
        minute: { requests: 0, tokens: 0 },
        day: { requests: 2, tokens: 200 },
      },
      penalty: null,
      budgetKey: 'budget-groq',
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.getProviderDashboard({
      query: { sinceHours: '24' },
    }, res);

    expect(prisma.aiKey.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ aiModelConfigs: expect.any(Object) }),
    }));
    expect(mockListProviderLogs).toHaveBeenCalledWith({
      sinceHours: 24,
      limit: 500,
    });
    expect(mockGetBudgetSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      id: 'key-groq',
      provider: 'GROQ',
      modelName: 'llama-3.3-70b-versatile',
    }));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        summary: expect.objectContaining({
          activeKeys: 1,
          limitedKeys: 1,
          requests24h: 2,
        }),
        providerPriority: expect.arrayContaining(['GROQ', 'GOOGLE']),
        providers: expect.arrayContaining([
          expect.objectContaining({
            provider: 'GROQ',
            label: 'Groq',
            activeKeyCount: 1,
            stats24h: expect.objectContaining({ success: 1 }),
          }),
        ]),
        keys: [
          expect.objectContaining({
            id: 'key-groq',
            maskedApiKey: 'gsk_...cret',
            budget: expect.objectContaining({
              limited: true,
              severity: 'ready',
            }),
          }),
        ],
      }),
    }));
    expect(JSON.stringify(res.body)).not.toContain('gsk_secret');
  });

  test('runs a direct key diagnostic chat for Wofod without exposing or delivering customer messages', async () => {
    const prisma = {
      aiKey: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'key-wofod-google',
          name: 'Wofod Google',
          provider: 'GOOGLE',
          apiKey: 'AIza-secret-value',
          baseUrl: null,
          isActive: true,
          aiModelConfigs: [{ modelName: 'gemini-2.5-flash' }],
        }),
      },
      company: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'company-wofod',
          name: 'Wofod',
          email: 'ops@wofod.example',
        }),
      },
    };
    const generateResponse = jest.fn().mockResolvedValue({
      text: 'تمام، أقدر أوضحلك الفرق باختصار.',
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    mockGetProvider.mockReturnValue({ generateResponse });
    mockRecordProviderEvent.mockResolvedValue(null);
    const res = createResponse();

    await superAdminAiController.testAIKeyChat({
      params: { id: 'key-wofod-google' },
      body: {
        message: 'مش عارف أشتري ولا لا',
        companyName: 'Wofod',
      },
    }, res);

    expect(prisma.aiKey.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'key-wofod-google' },
    }));
    expect(prisma.company.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([
          { id: 'Wofod' },
          { name: { contains: 'Wofod' } },
          { email: { contains: 'Wofod' } },
        ]),
      }),
    }));
    expect(mockGetProvider).toHaveBeenCalledWith(
      'GOOGLE',
      'AIza-secret-value',
      null,
      'key-wofod-google',
    );
    expect(generateResponse).toHaveBeenCalledWith(
      expect.stringContaining('Company context for tone only: Wofod.'),
      expect.objectContaining({
        model: 'gemini-2.5-flash',
        temperature: 0.2,
      }),
    );
    expect(mockRecordProviderEvent).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'GOOGLE',
      keyId: 'key-wofod-google',
      action: 'key_test_chat',
      status: 'success',
      model: 'gemini-2.5-flash',
    }));
    expect(JSON.stringify(res.body)).not.toContain('AIza-secret-value');
    expect(res.body).toEqual(expect.objectContaining({
      success: true,
      message: 'AI key chat succeeded',
      data: expect.objectContaining({
        ok: true,
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
        reply: 'تمام، أقدر أوضحلك الفرق باختصار.',
        company: expect.objectContaining({ name: 'Wofod' }),
      }),
    }));
  });

  test('records failed diagnostic chat when the selected key is inactive', async () => {
    const prisma = {
      aiKey: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'key-inactive',
          name: 'Inactive Google',
          provider: 'GOOGLE',
          apiKey: 'AIza-secret-value',
          baseUrl: null,
          isActive: false,
          aiModelConfigs: [{ modelName: 'gemini-2.5-flash' }],
        }),
      },
      company: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.testAIKeyChat({
      params: { id: 'key-inactive' },
      body: { message: 'اختبار المفتاح', companyName: 'Wofod' },
    }, res);

    expect(mockGetProvider).not.toHaveBeenCalled();
    expect(mockRecordProviderEvent).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'GOOGLE',
      keyId: 'key-inactive',
      action: 'key_test_chat',
      status: 'failed',
      message: 'AI key is inactive',
    }));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      success: false,
      message: 'AI key is inactive',
    });
  });
});
