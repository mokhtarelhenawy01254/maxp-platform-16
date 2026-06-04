jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const mockGetNextKey = jest.fn(async keys => keys[0] || null);
const mockGetAvailableKeys = jest.fn(async keys => keys || []);
const mockRotator = {
  getNextKey: mockGetNextKey,
  getAvailableKeys: mockGetAvailableKeys,
  getStatus: jest.fn(() => ({ totalFailed: 0, failures: [] })),
  markFailed: jest.fn(),
  clearAll: jest.fn(),
};

jest.mock('../../services/aiAgent/SimpleKeyRotator', () => ({
  getSimpleKeyRotator: jest.fn(() => mockRotator),
}));

jest.mock('../../services/systemManager', () => ({}));
jest.mock('../../services/aiAgent/stateManager', () => ({}));
jest.mock('../../services/aiAgent/providers/AIProviderFactory', () => ({}));

const mockCanRoute = jest.fn(async () => ({
  allowed: true,
  limited: false,
  reason: null,
  limits: {},
}));
const mockParseProviderLimits = jest.fn(() => ({}));

jest.mock('../../services/aiAgent/providerBudgetLedgerService', () => ({
  canRoute: mockCanRoute,
  parseProviderLimits: mockParseProviderLimits,
  recordAttempt: jest.fn(async () => ({ recorded: false })),
  recordUsage: jest.fn(async () => ({ recorded: false })),
  recordPenalty: jest.fn(async () => ({ recorded: false })),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const ModelManager = require('../../services/aiAgent/modelManager');

function createKey({
  id,
  name,
  provider,
  companyId = null,
  keyType = 'CENTRAL',
  priority = 1,
  modelName = 'test-model',
}) {
  return {
    id,
    name,
    apiKey: `${id}-secret`,
    provider,
    companyId,
    keyType,
    priority,
    baseUrl: provider === 'OPENROUTER' ? 'https://openrouter.ai/api/v1' : null,
    aiModelConfigs: [
      {
        id: `${id}-model`,
        modelName,
        isEnabled: true,
        priority: 1,
      },
    ],
  };
}

function createPrismaMock({
  defaultProvider = 'GOOGLE',
  enableFailover = true,
  settings = null,
  centralKeys = [],
} = {}) {
  return {
    globalAiConfig: {
      findFirst: jest.fn().mockResolvedValue({
        defaultProvider,
        enableFailover,
        isActive: true,
        settings,
      }),
    },
    aiModelLimit: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    aiKey: {
      findMany: jest.fn().mockResolvedValue(centralKeys),
    },
  };
}

function cleanupManager(manager) {
  for (const interval of manager.cleanupIntervals || []) {
    clearInterval(interval);
  }
}

describe('ModelManager central provider routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanRoute.mockResolvedValue({
      allowed: true,
      limited: false,
      reason: null,
      limits: {},
    });
  });

  test('follows settings.providerPriority for central key selection', async () => {
    const prisma = createPrismaMock({
      defaultProvider: 'GOOGLE',
      settings: JSON.stringify({ providerPriority: ['OPENROUTER', 'GOOGLE'] }),
      centralKeys: [
        createKey({
          id: 'central-openrouter',
          name: 'Central OpenRouter',
          provider: 'OPENROUTER',
          modelName: 'minimax/minimax-m2.5:free',
        }),
      ],
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const manager = new ModelManager({});

    try {
      const result = await manager.getNextKeySimple('company-1');

      expect(result.provider).toBe('OPENROUTER');
      expect(result.keyId).toBe('central-openrouter');
      expect(result.model).toBe('minimax/minimax-m2.5:free');
      expect(mockGetNextKey).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'central-openrouter',
          provider: 'OPENROUTER',
        }),
      ]);
    } finally {
      cleanupManager(manager);
    }
  });

  test('returns a precise agent-ready error when a preferred Google Gemma model needs tools', async () => {
    const prisma = createPrismaMock({
      defaultProvider: 'GOOGLE',
      settings: JSON.stringify({ providerPriority: ['GOOGLE'] }),
      centralKeys: [
        createKey({
          id: 'central-google-gemma',
          name: 'Central Google Gemma',
          provider: 'GOOGLE',
          modelName: 'gemma-4-31b-it',
        }),
      ],
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const manager = new ModelManager({});

    try {
      const result = await manager.getNextKeySimple('company-1', {
        preferredModel: 'gemma-4-31b-it',
        requireToolSupport: true,
      });

      expect(result).toEqual(expect.objectContaining({
        error: 'MODEL_NOT_AGENT_READY',
        provider: 'GOOGLE',
        model: 'gemma-4-31b-it',
        keyId: 'central-google-gemma',
        keyName: 'Central Google Gemma',
        rejectedKeyCount: 1,
      }));
      expect(result.agentSuitability).toEqual(expect.objectContaining({
        agentReady: false,
        label: 'Chat only',
      }));
      expect(mockGetNextKey).not.toHaveBeenCalled();
    } finally {
      cleanupManager(manager);
    }
  });

  test('skips keys that would exceed configured provider budgets before round-robin selection', async () => {
    const prisma = createPrismaMock({
      settings: JSON.stringify({ providerPriority: ['GROQ'] }),
      centralKeys: [
        createKey({
          id: 'central-groq-full',
          name: 'Central Groq Full',
          provider: 'GROQ',
          modelName: 'llama-3.3-70b-versatile',
        }),
        createKey({
          id: 'central-groq-open',
          name: 'Central Groq Open',
          provider: 'GROQ',
          priority: 2,
          modelName: 'llama-3.3-70b-versatile',
        }),
      ],
    });
    mockCanRoute.mockImplementation(async key => {
      if (key.id === 'central-groq-full') {
        return {
          allowed: false,
          limited: true,
          reason: 'RPD_LIMIT',
          retryAfterSeconds: 60,
          limits: { rpd: 1 },
        };
      }
      return {
        allowed: true,
        limited: true,
        reason: null,
        limits: { rpd: 1 },
      };
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const manager = new ModelManager({});

    try {
      const result = await manager.getNextKeySimple('company-1', {
        estimatedTokens: 42,
      });

      expect(result.keyId).toBe('central-groq-open');
      expect(mockGetNextKey).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'central-groq-open',
          budgetStatus: expect.objectContaining({ allowed: true }),
        }),
      ]);
      expect(mockGetNextKey.mock.calls[0][0]).toHaveLength(1);
      expect(mockCanRoute).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'central-groq-full' }),
        { estimatedTokens: 42 },
      );
    } finally {
      cleanupManager(manager);
    }
  });
});
