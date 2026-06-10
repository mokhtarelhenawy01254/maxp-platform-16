const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();
const mockQueryRaw = jest.fn().mockResolvedValue([]);
const mockQueryRawUnsafe = jest.fn();
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

const { executeTool } = require('../../legacy-ai-agent/aiAgent/agentToolRegistry');
const episodicMemoryService = require('../../legacy-ai-agent/aiAgent/episodicMemoryService');

const TEST_EMBEDDING = new Array(768).fill(0.01);

describe('agent product.search tool', () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockFindMany.mockReset();
    mockQueryRaw.mockReset().mockResolvedValue([]);
    mockQueryRawUnsafe.mockReset().mockResolvedValue([
      { id: 'prod_123', name: 'Platform Sneakers', sku: 'PLATFORM-41', price: 499 }
    ]);
    mockExecuteRaw.mockReset().mockResolvedValue(1);
    episodicMemoryService.generateEmbeddingAsync = jest.fn().mockResolvedValue(TEST_EMBEDDING);
    episodicMemoryService.generateMultimodalEmbeddingAsync = jest.fn().mockResolvedValue(TEST_EMBEDDING);

    // Reset DbVectorAdaptor detection cache
    require('../../legacy-ai-agent/aiAgent/utils/DbVectorAdaptor').resetDetection();
  });

  test('returns public image URLs for Messenger-visible catalog replies', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'prod_123',
        name: 'Platform Sneakers',
        sku: 'PLATFORM-41',
        price: 499,
        comparePrice: null,
        stock: 12,
        trackInventory: true,
        isActive: true,
        isFeatured: false,
        mainImage: '/uploads/products/platform-main.png',
        images: JSON.stringify(['/uploads/products/platform-side.png']),
        tags: 'sneakers',
        category: { name: 'Shoes' },
        productVariants: [
          {
            name: 'أسود - 41',
            type: 'combination',
            sku: 'PLATFORM-BLK-41',
            images: JSON.stringify(['/uploads/products/platform-black.png']),
            stock: 5,
            trackInventory: true,
            isActive: true,
            metadata: JSON.stringify({ attributeValues: { 'اللون': 'أسود', 'المقاس': 41 } }),
          },
        ],
      },
    ]);

    const result = await executeTool('company_123456', 'product.search', {
      query: 'Platform Sneakers',
      limit: 5,
    });

    expect(result.success).toBe(true);
    expect(result.result.products[0].images).toEqual([
      'https://maxp.online/uploads/products/platform-main.png',
      'https://maxp.online/uploads/products/platform-side.png',
      'https://maxp.online/uploads/products/platform-black.png',
    ]);
  });

  test('returns a structured missing-query result instead of searching blindly', async () => {
    const result = await executeTool('company_123456', 'product.search', {
      limit: 5,
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({
      found: false,
      code: 'MISSING_PRODUCT_QUERY',
      query: null,
      products: [],
      needsClarification: true,
    });
    expect(mockQueryRawUnsafe).not.toHaveBeenCalled();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  test('uses text-only search when vector search is disabled by the Python tool gateway', async () => {
    mockFindMany
      .mockResolvedValueOnce([
        {
          id: 'prod_123',
          name: 'Platform Sneakers',
          sku: 'PLATFORM-41',
          price: 499,
          stock: 12,
          trackInventory: true,
          isActive: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'prod_123',
          name: 'Platform Sneakers',
          sku: 'PLATFORM-41',
          price: 499,
          comparePrice: null,
          stock: 12,
          trackInventory: true,
          isActive: true,
          isFeatured: false,
          mainImage: null,
          images: null,
          tags: 'sneakers',
          category: { name: 'Shoes' },
          productVariants: [],
        },
      ]);

    const result = await executeTool('company_123456', 'product.search', {
      query: 'Platform Sneakers',
      limit: 5,
      useVector: false,
    });

    expect(result.success).toBe(true);
    expect(result.result.products[0]).toEqual(expect.objectContaining({
      name: 'Platform Sneakers',
      sku: 'PLATFORM-41',
    }));
    expect(mockFindMany).toHaveBeenCalledTimes(2);
    expect(episodicMemoryService.generateEmbeddingAsync).not.toHaveBeenCalled();
    expect(mockQueryRawUnsafe).not.toHaveBeenCalled();
  });

  test('passes previous-product references to the unified orchestrator', async () => {
    const workingMemoryService = require('../../legacy-ai-agent/aiAgent/workingMemoryService');
    await workingMemoryService.initSession('company_123456', 'conv_123');
    await workingMemoryService.updateSearchContext('company_123456', 'conv_123', {
      productIds: ['prod_123'],
    });

    mockFindMany.mockResolvedValueOnce([
      {
        id: 'prod_123',
        name: 'Swan High Skotch',
        sku: 'SWAN-HIGH',
        price: 499,
        comparePrice: null,
        stock: 12,
        trackInventory: true,
        isActive: true,
        isFeatured: false,
        mainImage: null,
        images: null,
        tags: null,
        category: null,
        productVariants: [],
      },
    ]);

    const result = await executeTool('company_123456', 'product.search', {
      referencesPreviousProduct: true,
      conversationId: 'conv_123',
      productSize: '42',
    });

    expect(result.success).toBe(true);
    expect(mockQueryRawUnsafe).toHaveBeenCalled();
    const sqlQuery = mockQueryRawUnsafe.mock.calls[0][0];
    expect(sqlQuery).toContain('products.id = ANY');
  });

  test('returns structured error when previous-product context is unavailable', async () => {
    const result = await executeTool('company_123456', 'product.search', {
      referencesPreviousProduct: true,
      conversationId: 'conv_without_products',
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({
      found: false,
      code: 'PREVIOUS_PRODUCT_CONTEXT_MISSING',
      query: null,
      products: [],
      needsClarification: true,
    });
    expect(mockQueryRawUnsafe).not.toHaveBeenCalled();
  });

  test('applies SQL-level variant EXISTS pre-filtering and dynamic parameterization for color and size', async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: 'prod_123',
        name: 'Swan High Skotch',
        sku: 'SWAN-HIGH',
        price: 499,
        stock: 12,
        productVariants: [],
      }
    ]);

    const result = await executeTool('company_123456', 'product.search', {
      query: 'Swan High Skotch',
      productSize: '42',
      productColor: 'أحمر',
    });

    expect(result.success).toBe(true);
    
    // Verify query raw unsafe parameters
    expect(mockQueryRawUnsafe).toHaveBeenCalled();
    const calls = mockQueryRawUnsafe.mock.calls;
    
    // We expect the query to contain the EXISTS clauses for both color and size variants
    const sqlQuery = calls[0][0];
    expect(sqlQuery).toContain('product_variants pv');
    expect(sqlQuery).toContain('pv."productId" = products.id');
    expect(sqlQuery).toContain('pv."isActive" = true');
    expect(sqlQuery).toContain('~* $5');
    expect(sqlQuery).toContain('ILIKE $6');

    // Verify parameter bindings
    const params = calls[0].slice(1);
    // $1: cleanQuery
    // $2: likeQuery
    // $3: companyId
    // $4: limit
    // $5: color (regex pattern containing synonyms like red, أحمر)
    // $6: size (%42%)
    expect(params[2]).toBe('company_123456');
    expect(params[4]).toContain('أحمر');
    expect(params[5]).toBe('%42%');
  });
});
