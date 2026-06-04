jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const mockGetNextKey = jest.fn(async (keys) => keys[0] || null);
const mockGetStatus = jest.fn(() => ({ totalFailed: 0, failures: [] }));

jest.mock('../../services/aiAgent/SimpleKeyRotator', () => ({
  getSimpleKeyRotator: jest.fn(() => ({
    getNextKey: mockGetNextKey,
    getStatus: mockGetStatus
  }))
}));

jest.mock('../../services/aiAgent/stateManager', () => ({
  acquireLock: jest.fn(async () => true),
  releaseLock: jest.fn(async () => undefined),
  getLastUsedGlobalKeyId: jest.fn(async () => null),
  setLastUsedGlobalKeyId: jest.fn(async () => undefined)
}));

jest.mock('../../services/aiAgent/providers/AIProviderFactory', () => ({}));

jest.mock('../../services/systemManager', () => ({}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const ModelManager = require('../../services/aiAgent/modelManager');

const createKey = (overrides = {}) => ({
  id: 'key-company',
  apiKey: 'secret',
  name: 'Company Gemini',
  provider: 'GOOGLE',
  baseUrl: null,
  keyType: 'COMPANY',
  aiModelConfigs: [
    {
      id: 'model-company',
      modelName: 'gemini-2.5-flash'
    }
  ],
  ...overrides
});

const createPrismaMock = ({ useCentralKeys, defaultProvider = 'GOOGLE', enableFailover = true, settings = null }) => ({
  company: {
    findUnique: jest.fn(async () => ({ useCentralKeys }))
  },
  globalAiConfig: {
    findFirst: jest.fn(async () => ({
      defaultProvider,
      enableFailover,
      settings
    }))
  },
  aiModelLimit: {
    findMany: jest.fn(async () => [])
  },
  aiKey: {
    findMany: jest.fn()
  }
});

describe('ModelManager AI key source selection', () => {
  let manager;

  beforeEach(() => {
    mockGetNextKey.mockImplementation(async (keys) => keys[0] || null);
    mockGetStatus.mockReturnValue({ totalFailed: 0, failures: [] });
  });

  afterEach(() => {
    manager?.stop();
    manager = null;
    jest.clearAllMocks();
  });

  it('uses only central keys when company useCentralKeys is enabled', async () => {
    const prisma = createPrismaMock({ useCentralKeys: true });
    const centralKey = createKey({
      id: 'key-central',
      name: 'Central Gemini',
      keyType: 'CENTRAL',
      aiModelConfigs: [{ id: 'model-central', modelName: 'gemini-2.5-flash' }]
    });
    prisma.aiKey.findMany.mockResolvedValueOnce([centralKey]);
    getSharedPrismaClient.mockReturnValue(prisma);

    manager = new ModelManager();
    const result = await manager.getNextKeySimple('company-1');

    expect(result).toEqual(expect.objectContaining({
      keyId: 'key-central',
      keyName: 'Central Gemini',
      keyType: 'CENTRAL'
    }));
    expect(prisma.aiKey.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.aiKey.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        keyType: 'CENTRAL',
        companyId: null
      })
    }));
  });

  it('prefers active company keys when central-only mode is disabled', async () => {
    const prisma = createPrismaMock({ useCentralKeys: false });
    const companyKey = createKey();
    prisma.aiKey.findMany.mockResolvedValueOnce([companyKey]);
    getSharedPrismaClient.mockReturnValue(prisma);

    manager = new ModelManager();
    const result = await manager.getNextKeySimple('company-1');

    expect(result).toEqual(expect.objectContaining({
      keyId: 'key-company',
      keyName: 'Company Gemini',
      keyType: 'COMPANY'
    }));
    expect(prisma.aiKey.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.aiKey.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        companyId: 'company-1'
      })
    }));
    expect(prisma.aiKey.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        keyType: 'CENTRAL',
        companyId: null
      })
    }));
  });

  it('falls back to central keys when central-only mode is disabled and no company keys are active', async () => {
    const prisma = createPrismaMock({ useCentralKeys: false });
    const centralKey = createKey({
      id: 'key-central',
      name: 'Central Gemini',
      keyType: 'CENTRAL',
      aiModelConfigs: [{ id: 'model-central', modelName: 'gemini-2.5-flash' }]
    });
    prisma.aiKey.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([centralKey]);
    getSharedPrismaClient.mockReturnValue(prisma);

    manager = new ModelManager();
    const result = await manager.getNextKeySimple('company-1');

    expect(result).toEqual(expect.objectContaining({
      keyId: 'key-central',
      keyName: 'Central Gemini',
      keyType: 'CENTRAL'
    }));
    expect(prisma.aiKey.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.aiKey.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        keyType: 'CENTRAL',
        companyId: null
      })
    }));
  });

  it('prioritizes settings.providerPriority before using failover providers', async () => {
    const prisma = createPrismaMock({
      useCentralKeys: true,
      defaultProvider: 'GOOGLE',
      enableFailover: true,
      settings: JSON.stringify({ providerPriority: ['OPENROUTER', 'GOOGLE'] })
    });
    const googleKey = createKey({
      id: 'key-google',
      name: 'Central Google',
      keyType: 'CENTRAL',
      aiModelConfigs: [{ id: 'model-google', modelName: 'gemini-2.5-flash' }]
    });
    const openRouterKey = createKey({
      id: 'key-openrouter',
      name: 'Central OpenRouter',
      provider: 'OPENROUTER',
      baseUrl: 'https://openrouter.ai/api/v1',
      keyType: 'CENTRAL',
      aiModelConfigs: [{ id: 'model-openrouter', modelName: 'minimax/minimax-m2.5:free' }]
    });
    prisma.aiKey.findMany.mockResolvedValueOnce([googleKey, openRouterKey]);
    getSharedPrismaClient.mockReturnValue(prisma);

    manager = new ModelManager();
    const result = await manager.getNextKeySimple('company-1');

    expect(result).toEqual(expect.objectContaining({
      keyId: 'key-openrouter',
      provider: 'OPENROUTER',
      model: 'minimax/minimax-m2.5:free'
    }));
    expect(mockGetNextKey).toHaveBeenCalledTimes(1);
    expect(mockGetNextKey.mock.calls[0][0].map(key => key.provider)).toEqual(['OPENROUTER']);
  });

  it('falls back to the next settings.providerPriority provider only when the first has no available key', async () => {
    mockGetNextKey
      .mockResolvedValueOnce(null)
      .mockImplementationOnce(async (keys) => keys[0] || null);

    const prisma = createPrismaMock({
      useCentralKeys: true,
      defaultProvider: 'GOOGLE',
      enableFailover: true,
      settings: JSON.stringify({ providerPriority: ['OPENROUTER', 'GOOGLE'] })
    });
    const openRouterKey = createKey({
      id: 'key-openrouter',
      name: 'Central OpenRouter',
      provider: 'OPENROUTER',
      baseUrl: 'https://openrouter.ai/api/v1',
      keyType: 'CENTRAL',
      aiModelConfigs: [{ id: 'model-openrouter', modelName: 'minimax/minimax-m2.5:free' }]
    });
    const googleKey = createKey({
      id: 'key-google',
      name: 'Central Google',
      keyType: 'CENTRAL',
      aiModelConfigs: [{ id: 'model-google', modelName: 'gemini-2.5-flash' }]
    });
    prisma.aiKey.findMany.mockResolvedValueOnce([openRouterKey, googleKey]);
    getSharedPrismaClient.mockReturnValue(prisma);

    manager = new ModelManager();
    const result = await manager.getNextKeySimple('company-1');

    expect(result).toEqual(expect.objectContaining({
      keyId: 'key-google',
      provider: 'GOOGLE'
    }));
    expect(mockGetNextKey).toHaveBeenCalledTimes(2);
    expect(mockGetNextKey.mock.calls[0][0].map(key => key.provider)).toEqual(['OPENROUTER']);
    expect(mockGetNextKey.mock.calls[1][0].map(key => key.provider)).toEqual(['GOOGLE']);
  });

  it('does not use another provider when failover is disabled', async () => {
    const prisma = createPrismaMock({
      useCentralKeys: true,
      defaultProvider: 'GOOGLE',
      enableFailover: false,
      settings: JSON.stringify({ providerPriority: ['OPENROUTER', 'GOOGLE'] })
    });
    const googleKey = createKey({
      id: 'key-google',
      name: 'Central Google',
      keyType: 'CENTRAL',
      aiModelConfigs: [{ id: 'model-google', modelName: 'gemini-2.5-flash' }]
    });
    prisma.aiKey.findMany.mockResolvedValueOnce([googleKey]);
    getSharedPrismaClient.mockReturnValue(prisma);

    manager = new ModelManager();
    const result = await manager.getNextKeySimple('company-1');

    expect(result).toBeNull();
    expect(mockGetNextKey).not.toHaveBeenCalled();
  });

  it('limits provider priority order to the first provider when failover is disabled', async () => {
    const prisma = createPrismaMock({
      useCentralKeys: true,
      defaultProvider: 'GOOGLE',
      enableFailover: false,
      settings: JSON.stringify({ providerPriority: ['OPENROUTER', 'GOOGLE', 'GROQ'] })
    });
    getSharedPrismaClient.mockReturnValue(prisma);

    manager = new ModelManager();
    const order = await manager.getProviderPriorityOrder();

    expect(order).toEqual(['OPENROUTER']);
  });
});
