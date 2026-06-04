const mockFindFirst = jest.fn();
const mockQueryRaw = jest.fn().mockResolvedValue([]);
const mockQueryRawUnsafe = jest.fn();
const mockExecuteRaw = jest.fn().mockResolvedValue(1);

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => ({
    product: {
      findFirst: mockFindFirst,
      findUnique: jest.fn().mockImplementation((args) => mockFindFirst(args)),
    },
    $queryRaw: mockQueryRaw,
    $queryRawUnsafe: mockQueryRawUnsafe,
    $executeRaw: mockExecuteRaw,
    $executeRawUnsafe: mockExecuteRaw,
  })),
}));

const {
  executeTool,
  getNativeToolDefinitions,
} = require('../../services/aiAgent/agentToolRegistry');

describe('agent inventory.check tool', () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockQueryRaw.mockReset().mockResolvedValue([]);
    mockQueryRawUnsafe.mockReset().mockResolvedValue([
      { id: 'prod_123', name: 'Swan High Skotch', sku: 'SWAN-HIGH', price: 499 }
    ]);
    mockExecuteRaw.mockReset().mockResolvedValue(1);
    
    // Reset DbVectorAdaptor detection cache
    require('../../services/aiAgent/utils/DbVectorAdaptor').resetDetection();
  });

  test('exports a schema that matches the runtime handler inputs', () => {
    const [tool] = getNativeToolDefinitions(['inventory.check']);

    expect(tool.function.parameters.required).toEqual(
      expect.arrayContaining(['productNameOrSku'])
    );
    expect(tool.function.parameters.properties).toEqual(expect.objectContaining({
      productNameOrSku: expect.objectContaining({ type: 'string' }),
      productSize: expect.objectContaining({ type: 'string' }),
      productColor: expect.objectContaining({ type: 'string' }),
    }));
    expect(tool.function.parameters.properties.productId).toBeUndefined();
    expect(tool.function.parameters.properties.threshold).toBeUndefined();
  });

  test('returns structured missing-product result without fallback parsing', async () => {
    const result = await executeTool('company_123456', 'inventory.check', {
      productSize: '42',
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({
      found: false,
      code: 'MISSING_PRODUCT_NAME',
      productNameOrSku: null,
      needsClarification: true,
    });
    expect(mockQueryRawUnsafe).not.toHaveBeenCalled();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  test('allows previous-product inventory checks when memory context is explicit', async () => {
    const workingMemoryService = require('../../services/aiAgent/workingMemoryService');
    await workingMemoryService.initSession('company_123456', 'conv_123');
    await workingMemoryService.updateSearchContext('company_123456', 'conv_123', {
      productIds: ['prod_123'],
    });

    mockFindFirst.mockResolvedValueOnce({
      name: 'Swan High Skotch',
      sku: 'SWAN-HIGH',
      price: 499,
      stock: 12,
      trackInventory: true,
      productVariants: [
        { name: '42', type: 'size', sku: 'SWAN-HIGH-S42', stock: 3, trackInventory: true, isActive: true },
      ],
    });

    const result = await executeTool('company_123456', 'inventory.check', {
      referencesPreviousProduct: true,
      conversationId: 'conv_123',
      productSize: '42',
    });

    expect(result.success).toBe(true);
    expect(result.result.found).toBe(true);
    expect(mockQueryRawUnsafe).toHaveBeenCalled();
    const sqlQuery = mockQueryRawUnsafe.mock.calls[0][0];
    expect(sqlQuery).toContain('products.id = ANY');
  });

  test('returns structured error when previous-product inventory context is unavailable', async () => {
    const result = await executeTool('company_123456', 'inventory.check', {
      referencesPreviousProduct: true,
      conversationId: 'conv_without_products',
      productSize: '42',
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({
      found: false,
      code: 'PREVIOUS_PRODUCT_CONTEXT_MISSING',
      productNameOrSku: null,
      needsClarification: true,
    });
    expect(mockQueryRawUnsafe).not.toHaveBeenCalled();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  test('confirms requested size and color through product variants', async () => {
    mockFindFirst.mockResolvedValueOnce({
      name: 'Swan High Skotch',
      sku: 'SWAN-HIGH',
      mainImage: 'https://cdn.example.test/swan-main.jpg',
      images: JSON.stringify(['https://cdn.example.test/swan-side.jpg']),
      stock: 12,
      trackInventory: true,
      productVariants: [
        { name: '42', type: 'size', sku: 'SWAN-HIGH-S42', stock: 3, trackInventory: true, isActive: true },
        { name: '43', type: 'size', sku: 'SWAN-HIGH-S43', stock: 0, trackInventory: true, isActive: true },
        {
          name: 'أسود',
          type: 'color',
          sku: 'SWAN-HIGH-BLK',
          images: JSON.stringify(['https://cdn.example.test/swan-black.jpg']),
          stock: 7,
          trackInventory: true,
          isActive: true,
        },
      ],
    });

    const result = await executeTool('company_123456', 'inventory.check', {
      productNameOrSku: 'Swan High Skotch',
      productSize: '42',
      productColor: 'اسود',
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual(expect.objectContaining({
      found: true,
      productName: 'Swan High Skotch',
      requestedSize: '42',
      requestedColor: 'اسود',
      constraintAvailable: true,
    }));
    expect(result.result.constraintDetails.matched).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'SIZE', value: '42', status: 'LOW_STOCK', stock: 3 }),
      expect.objectContaining({ type: 'COLOR', value: 'أسود', status: 'AVAILABLE', stock: 7 }),
    ]));
    expect(result.result.availableSizes).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: '42', status: 'LOW_STOCK' }),
      expect.objectContaining({ value: '43', status: 'OUT_OF_STOCK' }),
    ]));
    expect(result.result.images).toEqual([
      'https://cdn.example.test/swan-main.jpg',
      'https://cdn.example.test/swan-side.jpg',
      'https://cdn.example.test/swan-black.jpg',
    ]);
  });

  test('returns public image URLs for Messenger replies when catalog images are relative', async () => {
    mockFindFirst.mockResolvedValueOnce({
      name: 'Platform Sneakers',
      sku: 'PLATFORM-41',
      mainImage: '/uploads/products/platform-main.png',
      images: JSON.stringify(['/uploads/products/platform-side.png']),
      stock: 12,
      trackInventory: true,
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
    });

    const result = await executeTool('company_123456', 'inventory.check', {
      productNameOrSku: 'Platform Sneakers',
      productSize: '41',
      productColor: 'اسود',
    });

    expect(result.success).toBe(true);
    expect(result.result.images).toEqual([
      'https://maxp.online/uploads/products/platform-main.png',
      'https://maxp.online/uploads/products/platform-side.png',
      'https://maxp.online/uploads/products/platform-black.png',
    ]);
  });

  test('reports a requested variant as unavailable instead of confirming generic product stock', async () => {
    mockFindFirst.mockResolvedValueOnce({
      name: 'Swan High Skotch',
      sku: 'SWAN-HIGH',
      stock: 12,
      trackInventory: true,
      productVariants: [
        { name: '42', type: 'size', sku: 'SWAN-HIGH-S42', stock: 3, trackInventory: true, isActive: true },
      ],
    });

    const result = await executeTool('company_123456', 'inventory.check', {
      productNameOrSku: 'Swan High Skotch',
      productSize: '43',
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual(expect.objectContaining({
      found: true,
      stock: 12,
      requestedSize: '43',
      constraintAvailable: false,
    }));
    expect(result.result.constraintDetails.missing).toEqual([
      { type: 'SIZE', requestedValue: '43', status: 'NOT_FOUND' },
    ]);
  });

  test('derives available sizes and colors from composite variant metadata', async () => {
    mockFindFirst.mockResolvedValueOnce({
      name: 'Swan High Skotch',
      sku: 'SWAN-HIGH',
      price: 499,
      stock: 12,
      trackInventory: true,
      productVariants: [
        {
          name: 'color: ابيض | size: 39',
          type: 'composite',
          sku: 'SWAN-HIGH-39-W',
          stock: 2,
          trackInventory: true,
          isActive: true,
          metadata: JSON.stringify({ attributeValues: { Color: 'ابيض', Size: 39 } }),
        },
        {
          name: 'color: ابيض | size: 40',
          type: 'composite',
          sku: 'SWAN-HIGH-40-W',
          stock: 6,
          trackInventory: true,
          isActive: true,
          metadata: JSON.stringify({ attributeValues: { Color: 'ابيض', Size: '40' } }),
        },
      ],
    });

    const result = await executeTool('company_123456', 'inventory.check', {
      productNameOrSku: 'Swan High Skotch',
      productSize: '39',
    });

    expect(result.success).toBe(true);
    expect(result.result.price).toEqual({ amount: 499, currency: 'EGP' });
    expect(result.result.constraintAvailable).toBe(true);
    expect(result.result.availableSizes).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: '39', stock: 2 }),
      expect.objectContaining({ value: '40', stock: 6 }),
    ]));
    expect(result.result.availableColors).toEqual(expect.arrayContaining([
      expect.objectContaining({ value: 'ابيض', stock: 8 }),
    ]));
  });
});
