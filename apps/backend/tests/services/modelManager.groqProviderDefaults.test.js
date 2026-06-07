jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const mockGetNextKey = jest.fn(async keys => keys[0] || null);
const mockPeekNextKey = jest.fn(async keys => keys[0] || null);
const mockGetAvailableKeys = jest.fn(async keys => keys || []);
const mockRotator = {
  getNextKey: mockGetNextKey,
  peekNextKey: mockPeekNextKey,
  getAvailableKeys: mockGetAvailableKeys,
  getStatus: jest.fn(() => ({ totalFailed: 0, failures: [] })),
  markFailed: jest.fn(),
  clearAll: jest.fn(),
};

jest.mock('../../legacy-ai-agent/aiAgent/SimpleKeyRotator', () => ({
  getSimpleKeyRotator: jest.fn(() => mockRotator),
}));

jest.mock('../../services/systemManager', () => ({}));
jest.mock('../../legacy-ai-agent/aiAgent/stateManager', () => ({}));
const mockGenerateResponse = jest.fn();
const mockGetProvider = jest.fn(() => ({
  generateResponse: mockGenerateResponse,
}));
jest.mock('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory', () => ({
  getProvider: mockGetProvider,
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const ModelManager = require('../../legacy-ai-agent/aiAgent/modelManager');

function createPrismaMock({ centralKeys = [], defaultProvider = 'GROQ', settings = null } = {}) {
  return {
    company: {
      findUnique: jest.fn().mockResolvedValue({ useCentralKeys: true }),
    },
    globalAiConfig: {
      findFirst: jest.fn().mockResolvedValue({
        defaultProvider,
        enableFailover: true,
        isActive: true,
        settings,
      }),
    },
    aiModelLimit: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    aiKey: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        if (where?.companyId === null && where?.keyType === 'CENTRAL') {
          return Promise.resolve(centralKeys);
        }
        return Promise.resolve([]);
      }),
      findUnique: jest.fn().mockResolvedValue({ usage: null }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

function cleanupManager(manager) {
  for (const interval of manager.cleanupIntervals || []) {
    clearInterval(interval);
  }
}

describe('ModelManager Groq provider defaults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('central Groq keys without model configs use the Groq default model', async () => {
    const centralGroqKey = {
      id: 'central-groq',
      name: 'Central Groq',
      apiKey: 'central-groq-secret',
      provider: 'GROQ',
      keyType: 'CENTRAL',
      companyId: null,
      priority: 1,
      baseUrl: 'https://api.groq.com/openai/v1',
      aiModelConfigs: [],
    };
    getSharedPrismaClient.mockReturnValue(createPrismaMock({
      centralKeys: [centralGroqKey],
    }));
    const manager = new ModelManager({});

    try {
      const result = await manager.getNextKeySimple('company-1');

      expect(result.provider).toBe('GROQ');
      expect(result.keyId).toBe('central-groq');
      expect(result.model).toBe('llama-3.3-70b-versatile');
      expect(mockGetNextKey).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'central-groq',
          provider: 'GROQ',
          modelName: 'llama-3.3-70b-versatile',
        }),
      ]);
    } finally {
      cleanupManager(manager);
    }
  });

  test('central NVIDIA keys without model configs use the NVIDIA NIM default model', async () => {
    const centralNvidiaKey = {
      id: 'central-nvidia',
      name: 'Central NVIDIA',
      apiKey: 'central-nvidia-secret',
      provider: 'NVIDIA',
      keyType: 'CENTRAL',
      companyId: null,
      priority: 1,
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      aiModelConfigs: [],
    };
    getSharedPrismaClient.mockReturnValue(createPrismaMock({
      centralKeys: [centralNvidiaKey],
      defaultProvider: 'NVIDIA',
    }));
    const manager = new ModelManager({});

    try {
      const result = await manager.getNextKeySimple('company-1');

      expect(result.provider).toBe('NVIDIA');
      expect(result.keyId).toBe('central-nvidia');
      expect(result.model).toBe('openai/gpt-oss-120b');
      expect(mockGetNextKey).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'central-nvidia',
          provider: 'NVIDIA',
          modelName: 'openai/gpt-oss-120b',
        }),
      ]);
    } finally {
      cleanupManager(manager);
    }
  });

  test('central Google keys without model configs use the stable Gemini default model', async () => {
    const centralGoogleKey = {
      id: 'central-google',
      name: 'Central Google',
      apiKey: 'central-google-secret',
      provider: 'GOOGLE',
      keyType: 'CENTRAL',
      companyId: null,
      priority: 1,
      baseUrl: null,
      aiModelConfigs: [],
    };
    const prisma = createPrismaMock({
      centralKeys: [centralGoogleKey],
      defaultProvider: 'GOOGLE',
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const manager = new ModelManager({});

    try {
      const result = await manager.getNextKeySimple('company-1');

      expect(result.provider).toBe('GOOGLE');
      expect(result.keyId).toBe('central-google');
      expect(result.model).toBe('gemini-2.5-flash');
      expect(mockGetNextKey).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'central-google',
          provider: 'GOOGLE',
          modelName: 'gemini-2.5-flash',
        }),
      ]);
      expect(prisma.aiKey.update).toHaveBeenCalledWith({
        where: { id: 'central-google' },
        data: {
          usage: expect.stringContaining('"lastSelectedModel":"gemini-2.5-flash"'),
        },
      });
    } finally {
      cleanupManager(manager);
    }
  });

  test('central Google keys honor a priority 1 manually typed Gemma model', async () => {
    const centralGoogleKey = {
      id: 'central-google-gemma',
      name: 'Central Google Gemma',
      apiKey: 'central-google-secret',
      provider: 'GOOGLE',
      keyType: 'CENTRAL',
      companyId: null,
      priority: 1,
      baseUrl: null,
      aiModelConfigs: [
        {
          id: 'old-model',
          modelName: 'gemini-2.5-flash',
          isEnabled: true,
          priority: 5,
        },
        {
          id: 'gemma-model',
          modelName: 'gemma-4-31b-it',
          isEnabled: true,
          priority: 1,
        },
      ],
    };
    const prisma = createPrismaMock({
      centralKeys: [centralGoogleKey],
      defaultProvider: 'GOOGLE',
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const manager = new ModelManager({});

    try {
      const result = await manager.getNextKeySimple('company-1');

      expect(result.provider).toBe('GOOGLE');
      expect(result.keyId).toBe('central-google-gemma');
      expect(result.model).toBe('gemma-4-31b-it');
      expect(result.modelId).toBe('gemma-model');
      expect(mockGetNextKey).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'central-google-gemma',
          provider: 'GOOGLE',
          modelName: 'gemma-4-31b-it',
          modelId: 'gemma-model',
        }),
      ]);
    } finally {
      cleanupManager(manager);
    }
  });

  test('records successful routing without exposing the raw key', async () => {
    const prisma = createPrismaMock();
    prisma.aiKey.findUnique.mockResolvedValue({
      usage: JSON.stringify({
        routing: {
          lastSelectedAt: '2026-05-05T04:00:00.000Z',
          selectionCount: 2,
        },
      }),
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const manager = new ModelManager({});

    try {
      await manager.recordRoutingSuccess(
        {
          keyId: 'central-google',
          keyName: 'Central Google',
          provider: 'GOOGLE',
          model: 'gemini-2.5-flash',
          selectedPool: 'primary',
          activeProvider: 'GOOGLE',
        },
        { companyId: 'company-1' }
      );

      expect(prisma.aiKey.update).toHaveBeenCalledWith({
        where: { id: 'central-google' },
        data: {
          usage: expect.stringContaining('"lastSucceededModel":"gemini-2.5-flash"'),
        },
      });
      expect(prisma.aiKey.update.mock.calls[0][0].data.usage).not.toContain('central-google-secret');
    } finally {
      cleanupManager(manager);
    }
  });

  test('preferred key overrides round-robin for the active provider', async () => {
    const centralGroqKey1 = {
      id: 'central-groq-1',
      name: 'Central Groq 1',
      apiKey: 'central-groq-secret-1',
      provider: 'GROQ',
      keyType: 'CENTRAL',
      companyId: null,
      priority: 1,
      baseUrl: 'https://api.groq.com/openai/v1',
      aiModelConfigs: [],
    };
    const centralGroqKey2 = {
      id: 'central-groq-2',
      name: 'Central Groq 2',
      apiKey: 'central-groq-secret-2',
      provider: 'GROQ',
      keyType: 'CENTRAL',
      companyId: null,
      priority: 2,
      baseUrl: 'https://api.groq.com/openai/v1',
      aiModelConfigs: [],
    };
    const prisma = createPrismaMock({
      centralKeys: [centralGroqKey1, centralGroqKey2],
      settings: JSON.stringify({
        preferredAiKeyIds: {
          GROQ: 'central-groq-2',
        },
      }),
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const manager = new ModelManager({});

    try {
      const result = await manager.getNextKeySimple('company-1');

      expect(result.provider).toBe('GROQ');
      expect(result.keyId).toBe('central-groq-2');
      expect(result.selectedPool).toBe('manual');
      expect(result.manualOverride).toBe(true);
      expect(result.preferredKeyId).toBe('central-groq-2');
      expect(mockGetAvailableKeys).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'central-groq-2',
          modelName: 'llama-3.3-70b-versatile',
        }),
      ]);
      expect(prisma.aiKey.update).toHaveBeenCalledWith({
        where: { id: 'central-groq-2' },
        data: {
          usage: expect.stringContaining('"lastSelectedPool":"manual"'),
        },
      });
    } finally {
      cleanupManager(manager);
    }
  });

  test('live key test records success without exposing the raw key', async () => {
    mockGenerateResponse.mockResolvedValue({
      text: () => 'KEY_OK',
      success: true,
    });
    const prisma = createPrismaMock();
    prisma.aiKey.findUnique.mockResolvedValue({
      id: 'central-google',
      name: 'Central Google',
      apiKey: 'central-google-secret',
      provider: 'GOOGLE',
      isActive: true,
      baseUrl: null,
      usage: null,
      aiModelConfigs: [
        {
          id: 'model-1',
          modelName: 'gemini-2.5-flash',
          isEnabled: true,
          priority: 1,
        },
      ],
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const manager = new ModelManager({});

    try {
      const result = await manager.testAiKey('central-google');

      expect(mockGetProvider).toHaveBeenCalledWith(
        'GOOGLE',
        'central-google-secret',
        null,
        'central-google',
      );
      expect(result).toEqual(expect.objectContaining({
        ok: true,
        status: 'success',
        keyId: 'central-google',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
      }));
      expect(JSON.stringify(result)).not.toContain('central-google-secret');
      expect(prisma.aiKey.update).toHaveBeenCalledWith({
        where: { id: 'central-google' },
        data: {
          usage: expect.stringContaining('"lastTestStatus":"success"'),
        },
      });
      expect(prisma.aiKey.update.mock.calls[0][0].data.usage).not.toContain('central-google-secret');
    } finally {
      cleanupManager(manager);
    }
  });
});
