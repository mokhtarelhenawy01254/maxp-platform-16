jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/systemManager', () => ({}));
jest.mock('../../legacy-ai-agent/aiAgent/stateManager', () => ({}));
jest.mock('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory', () => ({}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const ModelManager = require('../../legacy-ai-agent/aiAgent/modelManager');

function createKey({
  id, name, provider, companyId = null, keyType = 'CENTRAL',
  priority = 1, modelName = 'test-model', isEnabled = true,
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
      { id: `${id}-model`, modelName, isEnabled, priority: 1 },
    ],
  };
}

function createPrismaMock({ centralKeys = [] } = {}) {
  return {
    globalAiConfig: {
      findFirst: jest.fn().mockResolvedValue({ defaultProvider: 'GOOGLE', enableFailover: false, settings: null }),
    },
    aiModelLimit: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    aiKey: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where?.keyType === 'CENTRAL' && where?.companyId === null) {
          return Promise.resolve(centralKeys[0] || null);
        }
        return Promise.resolve(null);
      }),
      findUnique: jest.fn().mockResolvedValue({ usage: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    aiModelConfig: { findMany: jest.fn(async () => []) },
    excludedModel: { findFirst: jest.fn(), findMany: jest.fn(async () => []), deleteMany: jest.fn() },
    $transaction: jest.fn(async (cb) => {
      if (typeof cb === 'function') return cb(createPrismaMock());
      return cb;
    }),
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
  });

  test('selects the first active CENTRAL key', async () => {
    const prisma = createPrismaMock({
      centralKeys: [
        createKey({ id: 'central-google', name: 'Central Google', provider: 'GOOGLE' }),
      ],
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const manager = new ModelManager({});

    try {
      const result = await manager.getNextKeySimple('company-1');

      expect(result.provider).toBe('GOOGLE');
      expect(result.keyId).toBe('central-google');
      expect(result.model).toBe('test-model');
    } finally {
      cleanupManager(manager);
    }
  });

  test('returns error when no central keys exist', async () => {
    const prisma = createPrismaMock({ centralKeys: [] });
    getSharedPrismaClient.mockReturnValue(prisma);

    const manager = new ModelManager({});
    try {
      const result = await manager.getNextKeySimple('company-1');
      expect(result.error).toBe('NO_ACTIVE_KEY');
    } finally {
      cleanupManager(manager);
    }
  });

  test('preferredModel filters model configs', async () => {
    const prisma = createPrismaMock({
      centralKeys: [
        createKey({
          id: 'central-gemma', name: 'Central Gemma', provider: 'GOOGLE',
          modelName: 'gemma-4-31b-it',
        }),
      ],
    });
    getSharedPrismaClient.mockReturnValue(prisma);
    const manager = new ModelManager({});

    try {
      const result = await manager.getNextKeySimple('company-1', {
        preferredModel: 'gemma-4-31b-it',
      });

      expect(result.model).toBe('gemma-4-31b-it');
      expect(prisma.aiKey.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            aiModelConfigs: expect.objectContaining({
              where: expect.objectContaining({
                modelName: 'gemma-4-31b-it',
              }),
            }),
          }),
        }),
      );
    } finally {
      cleanupManager(manager);
    }
  });
});
