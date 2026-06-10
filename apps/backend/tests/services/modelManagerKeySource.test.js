jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

jest.mock('../../legacy-ai-agent/aiAgent/stateManager', () => ({
  acquireLock: jest.fn(async () => true),
  releaseLock: jest.fn(async () => undefined),
}));

jest.mock('../../legacy-ai-agent/aiAgent/providers/AIProviderFactory', () => ({}));

jest.mock('../../services/systemManager', () => ({}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const ModelManager = require('../../legacy-ai-agent/aiAgent/modelManager');

const createKey = (overrides = {}) => ({
  id: 'key-central',
  apiKey: 'secret',
  name: 'Central Key',
  provider: 'GOOGLE',
  baseUrl: null,
  keyType: 'CENTRAL',
  companyId: null,
  aiModelConfigs: [
    {
      id: 'model-central',
      modelName: 'gemini-2.5-flash',
      isEnabled: true,
      priority: 1,
    }
  ],
  ...overrides
});

const createPrismaMock = () => ({
  globalAiConfig: {
    findFirst: jest.fn(async () => ({ defaultProvider: 'GOOGLE', enableFailover: false, settings: null })),
  },
  aiModelLimit: {
    findMany: jest.fn(async () => []),
  },
  aiKey: {
    findFirst: jest.fn(),
    findUnique: jest.fn().mockResolvedValue({ usage: null }),
    update: jest.fn().mockResolvedValue({}),
  },
  aiModelConfig: { findMany: jest.fn(async () => []) },
  excludedModel: { findFirst: jest.fn(), findMany: jest.fn(async () => []), deleteMany: jest.fn() },
  $transaction: jest.fn(async (cb) => {
    if (typeof cb === 'function') return cb(createPrismaMock());
    return cb;
  }),
});

function cleanupManager(manager) {
  for (const interval of manager.cleanupIntervals || []) {
    clearInterval(interval);
  }
}

describe('ModelManager AI key source selection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selects the first active CENTRAL key with its first enabled model', async () => {
    const prisma = createPrismaMock();
    const centralKey = createKey({ id: 'key-1', name: 'Central Gemini' });
    prisma.aiKey.findFirst.mockResolvedValueOnce(centralKey);
    getSharedPrismaClient.mockReturnValue(prisma);

    const manager = new ModelManager({});
    try {
      const result = await manager.getNextKeySimple('company-1');

      expect(result).toEqual(expect.objectContaining({
        keyId: 'key-1',
        keyName: 'Central Gemini',
        keyType: 'CENTRAL',
        provider: 'GOOGLE',
        model: 'gemini-2.5-flash',
      }));
      expect(prisma.aiKey.findFirst).toHaveBeenCalledTimes(1);
    } finally {
      cleanupManager(manager);
    }
  });

  it('returns error when no active CENTRAL key exists', async () => {
    const prisma = createPrismaMock();
    prisma.aiKey.findFirst.mockResolvedValueOnce(null);
    getSharedPrismaClient.mockReturnValue(prisma);

    const manager = new ModelManager({});
    try {
      const result = await manager.getNextKeySimple('company-1');
      expect(result.error).toBe('NO_ACTIVE_KEY');
    } finally {
      cleanupManager(manager);
    }
  });

  it('uses default model when key has no model configs', async () => {
    const prisma = createPrismaMock();
    const key = createKey({ provider: 'GROQ', aiModelConfigs: [] });
    prisma.aiKey.findFirst.mockResolvedValueOnce(key);
    getSharedPrismaClient.mockReturnValue(prisma);

    const manager = new ModelManager({});
    try {
      const result = await manager.getNextKeySimple('company-1');
      expect(result.provider).toBe('GROQ');
      expect(result.model).toBe('llama-3.3-70b-versatile');
    } finally {
      cleanupManager(manager);
    }
  });

  it('limits provider priority order to the first provider when failover is disabled', async () => {
    const prisma = createPrismaMock();
    getSharedPrismaClient.mockReturnValue(prisma);

    const manager = new ModelManager({});
    try {
      const order = await manager.getProviderPriorityOrder();
      expect(order.length).toBe(1);
    } finally {
      cleanupManager(manager);
    }
  });
});
