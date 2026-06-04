const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();
const mockQueryRaw = jest.fn().mockResolvedValue([]);
const mockQueryRawUnsafe = jest.fn().mockResolvedValue([]);
const mockExecuteRaw = jest.fn().mockResolvedValue(1);

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({
    product: {
      findFirst: mockFindFirst,
      findMany: mockFindMany,
    },
    $queryRaw: mockQueryRaw,
    $queryRawUnsafe: mockQueryRawUnsafe,
    $executeRaw: mockExecuteRaw,
    $executeRawUnsafe: mockExecuteRaw,
  })),
}));

// Mock Redis for WorkingMemoryService
const redisStore = {};
jest.mock('../../services/redisCacheService', () => ({
  get: jest.fn(async (key) => redisStore[key] || null),
  set: jest.fn(async (key, val) => { redisStore[key] = val; }),
  del: jest.fn(async (key) => { delete redisStore[key]; }),
}));

const unifiedOrchestrator = require('../../services/aiAgent/utils/UnifiedProductSearchOrchestrator');
const workingMemoryService = require('../../services/aiAgent/workingMemoryService');
const dbVectorAdaptor = require('../../services/aiAgent/utils/DbVectorAdaptor');

describe('Unified Search Orchestrator & Adaptor Fixes', () => {
  const companyId = 'company_test_123';
  const conversationId = 'conv_test_123';

  beforeEach(async () => {
    mockFindFirst.mockReset();
    mockFindMany.mockReset();
    mockQueryRaw.mockReset().mockResolvedValue([]);
    mockQueryRawUnsafe.mockReset().mockResolvedValue([
      {
        id: 'prod_123',
        name: 'Classic Platform Sneakers',
        sku: 'PLATFORM-1',
        price: 499,
        comparePrice: null,
        stock: 10,
        trackInventory: true,
        isActive: true,
        isFeatured: false,
        mainImage: '/platform-main.png',
        images: '[]',
        tags: 'sneakers',
        productVariants: []
      }
    ]);
    mockExecuteRaw.mockReset().mockResolvedValue(1);
    
    // Clear Redis mock store
    for (const key in redisStore) {
      delete redisStore[key];
    }

    dbVectorAdaptor.resetDetection();
  });

  test('1. Color Synonym Filtering: maps Arabic query color to POSIX regex pattern of synonyms', async () => {
    const result = await unifiedOrchestrator.search(companyId, 'كوتشي أسود', {
      intentSlots: { productColor: 'أسود' },
      skipLogging: true,
    });

    expect(result.products.length).toBe(1);
    expect(mockQueryRawUnsafe).toHaveBeenCalled();
    
    const sqlCall = mockQueryRawUnsafe.mock.calls[0];
    const sql = sqlCall[0];
    const params = sqlCall.slice(1);

    // Verify SQL POSIX regex operator for color pre-filtering
    expect(sql).toContain('~*');
    expect(sql).not.toContain('ILIKE $6'); // color should not use ILIKE on canonical key

    // Verify parameter bindings contain color regex synonyms of 'black'
    const colorParamIndex = params.findIndex(p => typeof p === 'string' && p.includes('اسود'));
    expect(colorParamIndex).toBeGreaterThan(-1);
    expect(params[colorParamIndex]).toContain('black');
    expect(params[colorParamIndex]).toContain('اسود');
    expect(params[colorParamIndex]).toContain('أسود');
    expect(params[colorParamIndex]).toContain('noir');
  });

  test('2. Pronoun Reference: restricts DB query to lastShownProductIds when query contains منه', async () => {
    // 1. Initialize session with last shown product ID
    await workingMemoryService.initSession(companyId, conversationId);
    await workingMemoryService.updateSearchContext(companyId, conversationId, {
      productIds: ['prod_999'],
      filters: { category: 'sneakers' }
    });

    // 2. Search with pronoun
    const result = await unifiedOrchestrator.search(companyId, 'هل متوفر مقاس 44 منه؟', {
      conversationId,
      intentSlots: { referencesPreviousProduct: true },
      skipLogging: true,
    });

    expect(mockQueryRawUnsafe).toHaveBeenCalled();
    const sqlCall = mockQueryRawUnsafe.mock.calls[0];
    const sql = sqlCall[0];
    const params = sqlCall.slice(1);

    // Verify ID restriction in SQL
    expect(sql).toContain('ANY(');
    
    // Verify that the bound product IDs array contains 'prod_999'
    const idParam = params.find(p => Array.isArray(p) && p.includes('prod_999'));
    expect(idParam).toBeDefined();
    expect(idParam).toEqual(['prod_999']);
  });

  test('3. Filter Bleeding: does not carry size 44 into a fresh unclassified search', async () => {
    // 1. Initialize session with active filters (category: sneakers, size: 44)
    await workingMemoryService.initSession(companyId, conversationId);
    await workingMemoryService.updateSearchContext(companyId, conversationId, {
      productIds: ['prod_123'],
      filters: { category: 'sneakers', size: '44' }
    });

    // 2. Search for shirt
    const result = await unifiedOrchestrator.search(companyId, 'قميص', {
      conversationId,
      skipLogging: true,
    });

    // Verify the parsed query does NOT contain size '44'
    expect(result.parsedQuery.size).toBeNull();
    // Fresh text-only searches do not derive category from local keyword dictionaries.
    expect(result.parsedQuery.category).toBeNull();
  });
});
