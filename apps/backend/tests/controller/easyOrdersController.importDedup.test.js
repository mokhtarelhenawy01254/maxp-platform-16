const mockEnsureWithinPlanLimit = jest.fn();

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  executeWithRetry: jest.fn(async (operation) => operation()),
}));

jest.mock('../../utils/productMediaUtils', () => ({
  resolveProductMediaState: jest.fn(({ nextImages = [], nextMainImage = null }) => ({
    images: Array.isArray(nextImages) ? nextImages : [],
    mainImage: nextMainImage || null,
  })),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: (...args) => mockEnsureWithinPlanLimit(...args),
}));

const {
  importSelectedProducts,
  importProductsBulk,
  importProductFromEasyOrders,
} = require('../../controller/easyOrdersController');

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('easyOrdersController import dedup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureWithinPlanLimit.mockResolvedValue({ allowed: true, payload: null });
  });

  test('bulk import skips (never renames/creates) a product with a duplicate SKU', async () => {
    let existingBySku = null;

    mockPrisma.product.findFirst.mockImplementation(async ({ where }) => {
      if (where.sku) return existingBySku;
      if (where.easyOrdersId) return null;
      return null;
    });

    mockPrisma.product.create.mockImplementation(async ({ data }) => {
      const created = {
        id: 'product-1',
        name: data.name,
        price: data.price,
        sku: data.sku,
        companyId: data.companyId,
      };
      existingBySku = created;
      return created;
    });

    const req = {
      user: { companyId: 'company-1' },
      body: {
        products: [
          { name: 'Product A', price: 100, sku: 'SKU-DUP', easyOrdersId: 'eo-1' },
          { name: 'Product B', price: 100, sku: 'SKU-DUP', easyOrdersId: 'eo-2' },
        ],
      },
    };
    const res = createMockResponse();

    await importSelectedProducts(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.data.imported).toBe(1);
    expect(body.data.skipped).toBe(1);
    expect(body.data.failed).toBe(0);
    expect(body.data.details.skipped[0].reason).toBe('منتج بنفس رمز SKU موجود بالفعل');

    // Only ONE product should have been created — the duplicate must NOT be created or renamed.
    expect(mockPrisma.product.create).toHaveBeenCalledTimes(1);
    const createArgs = mockPrisma.product.create.mock.calls[0][0];
    expect(createArgs.data.sku).toBe('SKU-DUP');
    expect(mockPrisma.product.create.mock.calls.some(([args]) =>
      args.data && args.data.sku && args.data.sku.includes('-1')
    )).toBe(false);
  });

  test('importProductsBulk also skips a product with a duplicate SKU', async () => {
    let existingBySku = null;

    mockPrisma.product.findFirst.mockImplementation(async ({ where }) => {
      if (where.sku) return existingBySku;
      if (where.easyOrdersId) return null;
      return null;
    });

    mockPrisma.product.create.mockImplementation(async ({ data }) => {
      const created = { id: 'product-1', name: data.name, price: data.price, sku: data.sku };
      existingBySku = created;
      return created;
    });

    const req = {
      user: { companyId: 'company-1' },
      body: {
        products: [
          { name: 'Product A', price: 100, sku: 'SKU-DUP' },
          { name: 'Product B', price: 100, sku: 'SKU-DUP' },
        ],
      },
    };
    const res = createMockResponse();

    await importProductsBulk(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.data.imported).toBe(1);
    expect(body.data.skipped).toBe(1);
    expect(mockPrisma.product.create).toHaveBeenCalledTimes(1);
  });

  test('importProductFromEasyOrders rejects a duplicate SKU with 400 and filters deletedAt', async () => {
    mockPrisma.product.findFirst.mockImplementation(async ({ where }) => {
      if (where.sku) return { id: 'existing-1', sku: 'SKU-DUP' };
      return null;
    });

    const req = {
      user: { companyId: 'company-1' },
      body: {
        productData: { name: 'Product', price: 100, sku: 'SKU-DUP' },
      },
    };
    const res = createMockResponse();

    await importProductFromEasyOrders(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'رمز SKU موجود بالفعل. يرجى استخدام رمز مختلف.',
    }));

    const skuQuery = mockPrisma.product.findFirst.mock.calls.find(([args]) =>
      args.where && args.where.sku
    );
    expect(skuQuery).toBeTruthy();
    expect(skuQuery[0].where.deletedAt).toBe(null);
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });
});
