const mockClearAllCaches = jest.fn();
const mockPreviewNextKeySimple = jest.fn();
const mockTestAiKey = jest.fn();
const mockGetEmbeddingFailureSnapshot = jest.fn();
const mockInvalidateEmbeddingConfigCache = jest.fn();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  safeQuery: jest.fn(async callback => callback()),
}));

jest.mock('../../services/aiRuntimeService', () => ({
  getModelManager: jest.fn(() => ({
    clearAllCaches: mockClearAllCaches,
    previewNextKeySimple: mockPreviewNextKeySimple,
    testAiKey: mockTestAiKey,
  })),
}));

jest.mock('../../legacy-ai-agent/aiAgent/episodicMemoryService', () => ({
  getEmbeddingFailureSnapshot: mockGetEmbeddingFailureSnapshot,
  invalidateConfigCache: mockInvalidateEmbeddingConfigCache,
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const superAdminAiController = require('../../controller/superAdminAiController');

const FULL_PROVIDER_PRIORITY = [
  'OPENROUTER',
  'GROQ',
  'GOOGLE',
  'CEREBRAS',
  'NVIDIA',
  'MISTRAL',
  'SAMBANOVA',
  'GITHUB',
  'DEEPSEEK',
  'OPENAI',
  'ANTHROPIC',
  'HUGGINGFACE',
  'OLLAMA',
];

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

describe('superAdminAiController Groq key creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmbeddingFailureSnapshot.mockReturnValue(null);
  });

  test('adds Groq keys with default base URL and model config', async () => {
    const createdKey = {
      id: 'key-1',
      name: 'Central Groq',
      provider: 'GROQ',
      baseUrl: 'https://api.groq.com/openai/v1',
      aiModelConfigs: [
        {
          id: 'model-1',
          modelName: 'llama-3.3-70b-versatile',
          isEnabled: true,
          priority: 1,
        },
      ],
    };
    const prisma = {
      aiKey: {
        create: jest.fn().mockResolvedValue(createdKey),
      },
      globalAiConfig: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.addNewAIKey({
      body: {
        name: ' Central Groq ',
        provider: 'groq',
        apiKey: 'groq-test-key',
      },
    }, res);

    expect(prisma.aiKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Central Groq',
        provider: 'GROQ',
        apiKey: 'groq-test-key',
        baseUrl: 'https://api.groq.com/openai/v1',
        keyType: 'CENTRAL',
        aiModelConfigs: {
          create: [
            expect.objectContaining({
              modelName: 'llama-3.3-70b-versatile',
              priority: 1,
              isEnabled: true,
            }),
          ],
        },
      }),
      include: { aiModelConfigs: true },
    });
    expect(mockClearAllCaches).toHaveBeenCalledTimes(1);
    expect(prisma.globalAiConfig.updateMany).toHaveBeenCalledWith({
      data: { updatedAt: expect.any(Date) },
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: createdKey });
  });

  test('adds NVIDIA keys with default NIM base URL and model config', async () => {
    const createdKey = {
      id: 'key-nvidia-1',
      name: 'Central NVIDIA',
      provider: 'NVIDIA',
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      aiModelConfigs: [
        {
          id: 'model-nvidia-1',
          modelName: 'openai/gpt-oss-120b',
          isEnabled: true,
          priority: 1,
        },
      ],
    };
    const prisma = {
      aiKey: {
        create: jest.fn().mockResolvedValue(createdKey),
      },
      globalAiConfig: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.addNewAIKey({
      body: {
        name: ' Central NVIDIA ',
        provider: 'nvidia',
        apiKey: 'nvidia-test-key',
      },
    }, res);

    expect(prisma.aiKey.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Central NVIDIA',
        provider: 'NVIDIA',
        apiKey: 'nvidia-test-key',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        keyType: 'CENTRAL',
        aiModelConfigs: {
          create: [
            expect.objectContaining({
              modelName: 'openai/gpt-oss-120b',
              priority: 1,
              isEnabled: true,
            }),
          ],
        },
      }),
      include: { aiModelConfigs: true },
    });
    expect(mockClearAllCaches).toHaveBeenCalledTimes(1);
    expect(prisma.globalAiConfig.updateMany).toHaveBeenCalledWith({
      data: { updatedAt: expect.any(Date) },
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, data: createdKey });
  });

  test('rejects unsupported providers before calling Prisma', async () => {
    const res = createResponse();

    await superAdminAiController.addNewAIKey({
      body: {
        name: 'Bad Provider',
        provider: 'unknown-provider',
        apiKey: 'test-key',
      },
    }, res);

    expect(getSharedPrismaClient).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unsupported AI provider: unknown-provider',
    });
  });

  test('returns parsed routing status with AI keys', async () => {
    const prisma = {
      aiKey: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'key-google-1',
            name: 'Central Google 1',
            provider: 'GOOGLE',
            apiKey: 'secret',
            usage: JSON.stringify({
              used: 0,
              limit: 1000000,
              routing: {
                lastSelectedAt: '2026-05-05T03:52:55.000Z',
                lastSelectedProvider: 'GOOGLE',
                lastSelectedModel: 'gemini-2.5-flash',
                lastSelectedPool: 'primary',
                lastSucceededAt: '2026-05-05T03:53:10.000Z',
                lastSucceededProvider: 'GOOGLE',
                lastSucceededModel: 'gemini-2.5-flash',
                lastSucceededPool: 'primary',
                lastTestedAt: '2026-05-05T04:05:00.000Z',
                lastTestStatus: 'success',
                lastTestProvider: 'GOOGLE',
                lastTestModel: 'gemini-2.5-flash',
                lastTestLatencyMs: 321,
                selectionCount: 3,
                successCount: 2,
                testCount: 1,
              },
            }),
            aiModelConfigs: [],
          },
        ]),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.getAllAIKeys({}, res);

    expect(prisma.aiKey.findMany).toHaveBeenCalledWith({
      include: { aiModelConfigs: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [
        expect.objectContaining({
          id: 'key-google-1',
          routingStatus: expect.objectContaining({
            lastSelectedAt: '2026-05-05T03:52:55.000Z',
            lastSelectedProvider: 'GOOGLE',
            lastSelectedModel: 'gemini-2.5-flash',
            lastSelectedPool: 'primary',
            lastSucceededAt: '2026-05-05T03:53:10.000Z',
            lastSucceededProvider: 'GOOGLE',
            lastSucceededModel: 'gemini-2.5-flash',
            lastSucceededPool: 'primary',
            selectionCount: 3,
            successCount: 2,
            lastTestedAt: '2026-05-05T04:05:00.000Z',
            lastTestStatus: 'success',
            lastTestProvider: 'GOOGLE',
            lastTestModel: 'gemini-2.5-flash',
            lastTestLatencyMs: 321,
            testCount: 1,
          }),
        }),
      ],
    });
  });

  test('returns embedding health diagnostics with global AI config', async () => {
    const prisma = {
      globalAiConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'global-config-1',
          defaultProvider: 'GOOGLE',
          enableFailover: true,
          isActive: true,
          settings: JSON.stringify({
            embedding: {
              mode: 'SYSTEM_DEFAULT',
              model: 'gemini-embedding-001',
              dimension: 3072,
              aiKeyId: null,
            },
          }),
        }),
      },
      aiKey: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    mockGetEmbeddingFailureSnapshot.mockReturnValue({
      context: 'product_search',
      reason: 'GEMINI_EMBEDDING_API_ERROR',
      consecutiveFailures: 2,
      repeated: true,
      lastAt: '2026-06-02T02:22:53.005Z',
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.getGlobalAIConfig({}, res);

    expect(prisma.aiKey.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        provider: true,
        isActive: true,
      },
    });
    expect(mockGetEmbeddingFailureSnapshot).toHaveBeenCalledWith({
      model: 'gemini-embedding-2',
      dimension: 768,
      contexts: ['product_search', 'product_search_multimodal'],
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(res.body).toEqual({
      success: true,
      data: expect.objectContaining({
        embedding: {
          mode: 'SYSTEM_DEFAULT',
          model: 'gemini-embedding-001',
          dimension: 3072,
          aiKeyId: null,
        },
        embeddingHealth: expect.objectContaining({
          status: 'DEGRADED',
          reason: 'NO_ACTIVE_GOOGLE_KEY',
          provider: 'GOOGLE',
          requiredModel: 'gemini-embedding-2',
          requiredDimension: 768,
          configuredModel: 'gemini-embedding-001',
          configuredDimension: 3072,
          fallback: 'TEXT_ONLY_SEARCH',
          runtimeFailure: {
            context: 'product_search',
            reason: 'GEMINI_EMBEDDING_API_ERROR',
            consecutiveFailures: 2,
            repeated: true,
            lastAt: '2026-06-02T02:22:53.005Z',
          },
          warnings: expect.arrayContaining([
            'MODEL_OVERRIDDEN_TO_GEMINI_EMBEDDING_2',
            'DIMENSION_OVERRIDDEN_TO_768',
          ]),
        }),
      }),
    });
  });

  test('returns AI key details diagnostics without exposing the raw API key', async () => {
    const prisma = {
      aiKey: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'google-key-1',
          name: 'Google Primary',
          provider: 'GOOGLE',
          apiKey: 'AIza-secret-value',
          baseUrl: null,
          isActive: true,
          companyId: 'company-1',
          company: {
            id: 'company-1',
            name: 'Wofod',
            email: 'ops@example.com',
            isActive: true,
          },
          keyType: 'CENTRAL',
          usage: JSON.stringify({
            used: 10,
            limit: 100,
            routing: {
              lastSelectedAt: '2026-05-05T03:52:55.000Z',
              lastSelectedModel: 'gemini-1.5-flash',
              lastSucceededAt: '2026-05-05T03:53:10.000Z',
              lastSucceededModel: 'gemini-1.5-flash',
              lastTestedAt: '2026-05-05T04:05:00.000Z',
              lastTestStatus: 'failed',
              lastTestError: 'apiKey: realsecret quota exceeded',
              lastTestLatencyMs: 500,
              selectionCount: 4,
              successCount: 3,
              testCount: 2,
            },
          }),
          currentUsage: 10,
          maxRequestsPerDay: 100,
          priority: 1,
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-05T00:00:00.000Z',
          aiModelConfigs: [
            {
              id: 'model-old',
              modelName: 'gemini-1.5-flash',
              isEnabled: true,
              priority: 1,
              usage: null,
              createdAt: '2026-05-01T00:00:00.000Z',
              updatedAt: '2026-05-01T00:00:00.000Z',
            },
          ],
        }),
      },
      globalAiConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'global-config-1',
          defaultProvider: 'GOOGLE',
          isActive: true,
          enableFailover: true,
          settings: JSON.stringify({
            preferredAiKeyIds: {
              GOOGLE: 'google-key-1',
            },
          }),
        }),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.getAIKeyDetails({
      params: { id: 'google-key-1' },
    }, res);

    expect(prisma.aiKey.findUnique).toHaveBeenCalledWith({
      where: { id: 'google-key-1' },
      include: expect.objectContaining({
        aiModelConfigs: expect.any(Object),
        company: expect.any(Object),
      }),
    });
    expect(res.status).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain('AIza-secret-value');
    expect(JSON.stringify(res.body)).not.toContain('realsecret');
    expect(res.body.data.key.maskedApiKey).toBe('AIza...alue');
    expect(res.body.data.activeModel.modelName).toBe('gemini-1.5-flash');
    expect(res.body.data.usage.successRate).toBe(75);
    expect(res.body.data.routing.isPreferredForProvider).toBe(true);
    expect(res.body.data.routing.isActiveProvider).toBe(true);
    expect(res.body.data.health.status).toBe('critical');
    expect(res.body.data.health.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining(['RETIRED_GEMINI_MODEL', 'LAST_TEST_FAILED']),
    );
  });

  test('flags Gemini latest aliases as production-unsafe in key diagnostics', async () => {
    const prisma = {
      aiKey: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'google-key-latest',
          name: 'Google Latest Alias',
          provider: 'GOOGLE',
          apiKey: 'AIza-secret-value',
          baseUrl: null,
          isActive: true,
          companyId: null,
          company: null,
          keyType: 'CENTRAL',
          usage: JSON.stringify({ routing: {} }),
          currentUsage: 0,
          maxRequestsPerDay: 100,
          priority: 1,
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-05T00:00:00.000Z',
          aiModelConfigs: [
            {
              id: 'model-latest',
              modelName: 'gemini-flash-latest',
              isEnabled: true,
              priority: 1,
              usage: null,
              createdAt: '2026-05-01T00:00:00.000Z',
              updatedAt: '2026-05-01T00:00:00.000Z',
            },
          ],
        }),
      },
      globalAiConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'global-config-1',
          defaultProvider: 'GOOGLE',
          isActive: true,
          enableFailover: true,
          settings: '{}',
        }),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.getAIKeyDetails({
      params: { id: 'google-key-latest' },
    }, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.body.data.health.status).toBe('critical');
    expect(res.body.data.health.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining(['UNSTABLE_GEMINI_ALIAS_MODEL']),
    );
  });

  test('returns 404 for missing AI key details', async () => {
    const prisma = {
      aiKey: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      globalAiConfig: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.getAIKeyDetails({
      params: { id: 'missing-key' },
    }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'AI key not found',
    });
  });

  test('previews current routing without exposing API keys', async () => {
    mockPreviewNextKeySimple.mockResolvedValue({
      keyId: 'key-openrouter-1',
      keyName: 'Central OpenRouter',
      provider: 'OPENROUTER',
      model: 'openrouter/free',
      modelId: 'model-1',
      baseUrl: 'https://openrouter.ai/api/v1',
      keyType: 'CENTRAL',
      selectedPool: 'primary',
      activeProvider: 'OPENROUTER',
      preferredKeyId: 'key-openrouter-1',
      manualOverride: true,
      apiKey: 'must-not-leak',
      dryRun: true,
    });
    const res = createResponse();

    await superAdminAiController.previewAIRouting({
      body: {
        companyId: 'company-1',
        provider: 'openrouter',
      },
    }, res);

    expect(mockPreviewNextKeySimple).toHaveBeenCalledWith('company-1', {
      preferredProvider: 'OPENROUTER',
      strictProvider: false,
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        keyId: 'key-openrouter-1',
        keyName: 'Central OpenRouter',
        provider: 'OPENROUTER',
        model: 'openrouter/free',
        modelId: 'model-1',
        baseUrl: 'https://openrouter.ai/api/v1',
        keyType: 'CENTRAL',
        selectedPool: 'primary',
        activeProvider: 'OPENROUTER',
        preferredKeyId: 'key-openrouter-1',
        manualOverride: true,
        dryRun: true,
      },
    });
  });

  test('sets a preferred AI key and switches the active provider', async () => {
    const prisma = {
      aiKey: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'groq-key-2',
          name: 'Groq Backup',
          provider: 'GROQ',
          isActive: true,
        }),
      },
      globalAiConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'global-config-1',
          defaultProvider: 'GOOGLE',
          enableFailover: true,
          isActive: true,
          settings: JSON.stringify({
            visionProvider: 'OPENROUTER',
            preferredAiKeyIds: {
              GOOGLE: 'google-key-1',
            },
          }),
        }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({
          id: 'global-config-1',
          defaultProvider: data.defaultProvider,
          enableFailover: true,
          isActive: data.isActive,
          settings: data.settings,
        })),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.setPreferredAIKey({
      params: { id: 'groq-key-2' },
    }, res);

    expect(prisma.globalAiConfig.update).toHaveBeenCalledWith({
      where: { id: 'global-config-1' },
      data: expect.objectContaining({
        defaultProvider: 'GROQ',
        isActive: true,
        settings: expect.stringContaining('"GROQ":"groq-key-2"'),
      }),
    });
    expect(mockClearAllCaches).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'AI routing now prefers Groq Backup',
      data: expect.objectContaining({
        defaultProvider: 'GROQ',
        preferredAiKeyIds: expect.objectContaining({
          GOOGLE: 'google-key-1',
          GROQ: 'groq-key-2',
        }),
      }),
      preferredKey: {
        id: 'groq-key-2',
        name: 'Groq Backup',
        provider: 'GROQ',
      },
    });
  });

  test('tests an AI key without exposing the raw API key', async () => {
    mockTestAiKey.mockResolvedValue({
      ok: true,
      status: 'success',
      keyId: 'google-key-1',
      keyName: 'Google Primary',
      provider: 'GOOGLE',
      model: 'gemini-2.5-flash',
      latencyMs: 120,
      testedAt: '2026-05-05T04:30:00.000Z',
      message: 'Key responded successfully',
    });
    const res = createResponse();

    await superAdminAiController.testAIKey({
      params: { id: 'google-key-1' },
    }, res);

    expect(mockTestAiKey).toHaveBeenCalledWith('google-key-1');
    expect(JSON.stringify(res.body)).not.toContain('apiKey');
    expect(JSON.stringify(res.body)).not.toContain('secret');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'AI key test succeeded',
      data: expect.objectContaining({
        ok: true,
        keyId: 'google-key-1',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
      }),
    });
  });

  test('tests embedding keys against Gemini Embedding 2 at 768 dimensions', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        embedding: {
          values: Array.from({ length: 768 }, () => 0.125),
        },
      }),
      text: async () => '',
    });
    global.fetch = fetchMock;
    const prisma = {
      aiKey: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'google-embedding-key',
          name: 'Google Embedding',
          provider: 'GOOGLE',
          apiKey: 'AIza-secret-value',
          isActive: true,
        }),
      },
      globalAiConfig: {
        findFirst: jest.fn().mockResolvedValue({
          settings: JSON.stringify({
            embedding: {
              mode: 'SYSTEM_DEFAULT',
              model: 'gemini-embedding-001',
              dimension: 3072,
            },
          }),
        }),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    try {
      await superAdminAiController.testEmbeddingKey({
        body: {
          keyId: 'google-embedding-key',
          text: 'blue sneakers',
        },
      }, res);
    } finally {
      global.fetch = originalFetch;
    }

    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toContain('/gemini-embedding-2:embedContent');
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      model: 'models/gemini-embedding-2',
      outputDimensionality: 768,
    }));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.body).toEqual({
      success: true,
      data: expect.objectContaining({
        model: 'gemini-embedding-2',
        dimension: 768,
        keyName: 'Google Embedding',
      }),
    });
  });

  test('stores Product Landing image generation with an active NVIDIA key', async () => {
    const prisma = {
      aiKey: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'nvidia-image-key',
          provider: 'NVIDIA',
          isActive: true,
        }),
      },
      globalAiConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'global-config-1',
          defaultProvider: 'GOOGLE',
          enableFailover: true,
          isActive: true,
          settings: JSON.stringify({
            facebookAdsGeneration: { mode: 'SYSTEM_DEFAULT', aiKeyId: null },
          }),
        }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({
          id: 'global-config-1',
          defaultProvider: data.defaultProvider,
          enableFailover: data.enableFailover,
          isActive: true,
          settings: data.settings,
        })),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.updateGlobalAIConfig({
      body: {
        defaultProvider: 'GOOGLE',
        enableFailover: true,
        productLandingImageGeneration: {
          mode: 'SPECIFIC_MODEL',
          provider: 'NVIDIA',
          aiKeyId: 'nvidia-image-key',
          model: 'black-forest-labs/flux.1-dev',
        },
      },
    }, res);

    expect(prisma.aiKey.findUnique).toHaveBeenCalledWith({
      where: { id: 'nvidia-image-key' },
      select: { id: true, isActive: true, provider: true },
    });
    expect(prisma.globalAiConfig.update).toHaveBeenCalledWith({
      where: { id: 'global-config-1' },
      data: expect.objectContaining({
        settings: expect.stringContaining('"productLandingImageGeneration"'),
      }),
    });
    expect(mockClearAllCaches).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        productLandingImageGeneration: {
          mode: 'SPECIFIC_MODEL',
          provider: 'NVIDIA',
          aiKeyId: 'nvidia-image-key',
          model: 'black-forest-labs/flux.1-dev',
        },
      }),
    });
  });

  test('rejects Product Landing image generation keys from non-NVIDIA providers', async () => {
    const prisma = {
      aiKey: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'google-key',
          provider: 'GOOGLE',
          isActive: true,
        }),
      },
      globalAiConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'global-config-1',
          defaultProvider: 'GOOGLE',
          enableFailover: true,
          isActive: true,
          settings: '{}',
        }),
        update: jest.fn(),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.updateGlobalAIConfig({
      body: {
        defaultProvider: 'GOOGLE',
        productLandingImageGeneration: {
          mode: 'SPECIFIC_MODEL',
          provider: 'NVIDIA',
          aiKeyId: 'google-key',
          model: 'black-forest-labs/flux.1-dev',
        },
      },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Selected Product Landing image key must be an active NVIDIA key',
    });
    expect(prisma.globalAiConfig.update).not.toHaveBeenCalled();
  });

  test('updates a manually typed Google/Gemma model and invalidates other processes', async () => {
    const tx = {
      aiModelConfig: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'model-gemma-4',
          modelName: 'gemma-4-31b-it',
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async callback => callback(tx)),
      globalAiConfig: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.updateKeyActiveModel({
      params: { id: 'google-key-1' },
      body: { modelName: ' gemma-4-31b-it ' },
    }, res);

    expect(tx.aiModelConfig.updateMany).toHaveBeenCalledWith({
      where: { keyId: 'google-key-1' },
      data: { priority: 5 },
    });
    expect(tx.aiModelConfig.findUnique).toHaveBeenCalledWith({
      where: {
        keyId_modelName: {
          keyId: 'google-key-1',
          modelName: 'gemma-4-31b-it',
        },
      },
    });
    expect(tx.aiModelConfig.create).toHaveBeenCalledWith({
      data: {
        keyId: 'google-key-1',
        modelName: 'gemma-4-31b-it',
        priority: 1,
        isEnabled: true,
      },
    });
    expect(mockClearAllCaches).toHaveBeenCalledTimes(1);
    expect(prisma.globalAiConfig.updateMany).toHaveBeenCalledWith({
      data: { updatedAt: expect.any(Date) },
    });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Active model updated successfully',
      modelName: 'gemma-4-31b-it',
    });
  });

  test('returns provider-priority settings with per-provider routing diagnostics', async () => {
    const prisma = {
      globalAiConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'global-config-1',
          defaultProvider: 'GOOGLE',
          enableFailover: true,
          updatedAt: '2026-05-19T08:00:00.000Z',
          settings: JSON.stringify({ providerPriority: ['OPENROUTER', 'GOOGLE'] }),
        }),
      },
      aiKey: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'openrouter-key-1',
            name: 'Central OpenRouter',
            provider: 'OPENROUTER',
            isActive: true,
            priority: 1,
            createdAt: '2026-05-19T07:00:00.000Z',
            usage: JSON.stringify({ routing: { selectionCount: 3, successCount: 2 } }),
            aiModelConfigs: [{ modelName: 'openrouter/auto', isEnabled: true, priority: 1 }],
          },
          {
            id: 'google-key-1',
            name: 'Central Google',
            provider: 'GOOGLE',
            isActive: true,
            priority: 1,
            createdAt: '2026-05-19T07:05:00.000Z',
            usage: '{}',
            aiModelConfigs: [{ modelName: 'gemini-2.5-flash', isEnabled: true, priority: 1 }],
          },
        ]),
      },
      aiInteraction: {
        findMany: jest.fn().mockResolvedValue([
          {
            keyId: 'openrouter-key-1',
            responseTime: 240,
            metadata: JSON.stringify({ provider: 'OPENROUTER' }),
          },
        ]),
      },
      aiFailureLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            errorType: '429',
            errorMessage: 'rate limit',
            context: JSON.stringify({ provider: 'GOOGLE' }),
          },
        ]),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.getProviderPriority({}, res);

    expect(prisma.globalAiConfig.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.aiKey.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        aiModelConfigs: expect.any(Object),
      }),
    }));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        providerPriority: expect.arrayContaining(['OPENROUTER', 'GOOGLE']),
        enableFailover: true,
        defaultProvider: 'GOOGLE',
        providers: expect.arrayContaining([
          expect.objectContaining({
            provider: 'OPENROUTER',
            priority: 1,
            activeKeyName: 'Central OpenRouter',
            activeModel: 'openrouter/auto',
            stats24h: expect.objectContaining({
              success: 1,
              avgResponseTimeMs: 240,
            }),
            routing: expect.objectContaining({
              selectionCount: 3,
              successCount: 2,
            }),
          }),
          expect.objectContaining({
            provider: 'GOOGLE',
            priority: 2,
            activeKeyName: 'Central Google',
            stats24h: expect.objectContaining({
              failure: 1,
              rateLimit: 1,
            }),
          }),
        ]),
      }),
    }));
    expect(res.body.data.providerPriority.slice(0, 2)).toEqual(['OPENROUTER', 'GOOGLE']);
    expect(res.body.data.providers.slice(0, 2).map(provider => provider.provider))
      .toEqual(['OPENROUTER', 'GOOGLE']);
  });

  test('persists provider-priority settings and clears ModelManager caches', async () => {
    const prisma = {
      globalAiConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'global-config-1',
          defaultProvider: 'GOOGLE',
          enableFailover: true,
          isActive: true,
          settings: JSON.stringify({
            visionProvider: 'GOOGLE',
            preferredAiKeyIds: { GOOGLE: 'google-key-1' },
          }),
        }),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({
          id: 'global-config-1',
          defaultProvider: data.defaultProvider,
          enableFailover: data.enableFailover,
          isActive: data.isActive,
          settings: data.settings,
          updatedAt: '2026-05-19T08:10:00.000Z',
        })),
      },
      aiKey: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      aiInteraction: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      aiFailureLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    getSharedPrismaClient.mockReturnValue(prisma);
    const res = createResponse();

    await superAdminAiController.updateProviderPriority({
      body: {
        providerPriority: ['openrouter', 'groq', 'google'],
        enableFailover: false,
      },
    }, res);

    expect(prisma.globalAiConfig.update).toHaveBeenCalledWith({
      where: { id: 'global-config-1' },
      data: {
        defaultProvider: 'OPENROUTER',
        isActive: true,
        enableFailover: false,
        settings: JSON.stringify({
          visionProvider: 'GOOGLE',
          preferredAiKeyIds: { GOOGLE: 'google-key-1' },
          providerPriority: FULL_PROVIDER_PRIORITY,
        }),
      },
    });
    expect(mockClearAllCaches).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.body).toEqual({
      success: true,
      message: 'Provider priority updated successfully',
      data: expect.objectContaining({
        providerPriority: FULL_PROVIDER_PRIORITY,
        enableFailover: false,
        defaultProvider: 'OPENROUTER',
      }),
    });
  });
});
