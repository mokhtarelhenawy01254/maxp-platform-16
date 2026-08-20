const mockEnsureWithinPlanLimit = jest.fn();

const mockPrisma = {
  product: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  category: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  productVariant: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  executeWithRetry: jest.fn(async (operation) => operation()),
}));

jest.mock('../../services/wooCommerceClientService', () => ({
  createWooClient: jest.fn(),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: (...args) => mockEnsureWithinPlanLimit(...args),
}));

const { importSelectedProducts } = require('../../controller/wooCommerceController');

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

const existingProduct = {
  id: 'existing-1',
  name: 'Old Name',
  sku: 'SKU-1',
  price: 10,
  description: '',
  comparePrice: null,
  stock: 5,
  trackInventory: true,
  categoryId: null,
  images: null,
  tags: null,
  weight: null,
  dimensions: null,
  wooCommerceUrl: null,
  isFeatured: false,
  isActive: true,
  saleStartDate: null,
  saleEndDate: null,
  productVariants: [],
};

describe('wooCommerceController import dedup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureWithinPlanLimit.mockResolvedValue({ allowed: true, payload: null });
  });

  test('skips (never duplicates) a product whose SKU matches an existing product even when wooCommerceId differs', async () => {
    mockPrisma.product.findFirst.mockImplementation(async ({ where }) => {
      if (where.wooCommerceId) return null;
      if (where.sku && where.sku === 'SKU-1') return existingProduct;
      return null;
    });

    const req = {
      user: { companyId: 'company-1' },
      body: {
        products: [
          { name: 'Incoming Product', price: 25, sku: 'SKU-1', wooCommerceId: '9999' },
        ],
      },
    };
    const res = createMockResponse();

    await importSelectedProducts(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.data.skipped).toBe(1);
    expect(body.data.created).toBe(0);
    expect(body.data.updated).toBe(0);
    expect(body.data.details.skipped[0].reason).toBe('المنتج موجود بالفعل (نفس SKU)');
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });

  test('skips when wooCommerceId is missing but the SKU already exists', async () => {
    mockPrisma.product.findFirst.mockImplementation(async ({ where }) => {
      if (where.sku && where.sku === 'SKU-1') return existingProduct;
      return null;
    });

    const req = {
      user: { companyId: 'company-1' },
      body: {
        products: [
          { name: 'No Woo ID', price: 25, sku: 'SKU-1' },
        ],
      },
    };
    const res = createMockResponse();

    await importSelectedProducts(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.data.skipped).toBe(1);
    expect(body.data.details.skipped[0].reason).toBe('المنتج موجود بالفعل (نفس SKU)');
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });

  test('updates the existing product (same SKU) when updateExisting is enabled', async () => {
    mockPrisma.product.findFirst.mockImplementation(async ({ where }) => {
      if (where.wooCommerceId) return null;
      if (where.sku && where.sku === 'SKU-1') return existingProduct;
      return null;
    });
    mockPrisma.product.update.mockResolvedValue({ ...existingProduct, name: 'Updated Name' });

    const req = {
      user: { companyId: 'company-1' },
      body: {
        updateExisting: true,
        products: [
          { name: 'Updated Name', price: 25, sku: 'SKU-1', wooCommerceId: '9999' },
        ],
      },
    };
    const res = createMockResponse();

    await importSelectedProducts(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.data.updated).toBe(1);
    expect(body.data.created).toBe(0);
    expect(body.data.skipped).toBe(0);
    expect(mockPrisma.product.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'existing-1' } })
    );
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });
});
