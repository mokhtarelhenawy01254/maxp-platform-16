const mockEnsureWithinPlanLimit = jest.fn();

const mockPrisma = {
  $transaction: jest.fn(async (callback) => callback(mockPrisma)),
  warehouse: {
    findFirst: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  productVariant: {
    create: jest.fn(),
  },
  inventory: {
    upsert: jest.fn(),
    aggregate: jest.fn(),
  },
  stockMovement: {
    create: jest.fn(),
  },
  merchantProduct: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn(async (operation) => operation()),
}));

jest.mock('../../services/merchantService', () => ({
  updateProductDropshippingPrice: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/merchantAccountScope', () => ({
  assertMerchantProductAccess: jest.fn(),
  assertMerchantWarehouseAccess: jest.fn(),
  ensureMerchantWarehouse: jest.fn(),
  getMerchantProductWhere: jest.fn(() => ({})),
  getMerchantWarehouseWhere: jest.fn(() => ({})),
  isMerchantUser: jest.fn(() => false),
  requireMerchantAccountForUser: jest.fn(),
  syncMerchantProductStock: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: (...args) => mockEnsureWithinPlanLimit(...args),
}));

const { createInventoryProduct } = require('../../controller/inventoryController');

const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('inventoryController.createInventoryProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockEnsureWithinPlanLimit.mockResolvedValue({ allowed: true });
    mockPrisma.warehouse.findFirst.mockResolvedValue({
      id: 'warehouse-1',
      name: 'Main Warehouse',
      companyId: 'company-1',
      merchantId: null,
    });
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockPrisma.product.create.mockImplementation(async ({ data }) => ({
      id: 'product-1',
      ...data,
      category: null,
    }));
    mockPrisma.productVariant.create.mockImplementation(async ({ data }) => ({
      id: `variant-${data.name}`,
      ...data,
    }));
    mockPrisma.inventory.upsert.mockImplementation(async ({ create }) => ({
      id: 'inventory-1',
      ...create,
    }));
    mockPrisma.stockMovement.create.mockImplementation(async ({ data }) => ({
      id: 'movement-1',
      ...data,
    }));
    mockPrisma.inventory.aggregate.mockResolvedValue({
      _sum: { available: 7 },
    });
    mockPrisma.product.update.mockImplementation(async ({ data }) => ({
      id: 'product-1',
      name: 'مخزون جديد',
      companyId: 'company-1',
      metadata: mockPrisma.product.create.mock.calls[0]?.[0]?.data?.metadata,
      isActive: false,
      ...data,
    }));
  });

  test('creates a review product with inventory, movement, and variant quantities', async () => {
    const req = {
      user: {
        id: 'user-1',
        role: 'MANAGER',
        companyId: 'company-1',
        name: 'Warehouse Lead',
      },
      body: {
        name: 'مخزون جديد',
        sku: 'INV-001',
        barcode: '123456',
        warehouseId: 'warehouse-1',
        wholesalePrice: '50',
        salePrice: '',
        quantity: '2',
        images: ['/uploads/products/one.webp'],
        variants: [
          { name: 'أسود', type: 'color', quantity: '3', sku: 'INV-001-BLK' },
          { name: 'أبيض', type: 'color', quantity: '4', sku: 'INV-001-WHT' },
        ],
        reorderPoint: '2',
        notes: 'دفعة أولى',
      },
    };
    const res = createMockResponse();

    await createInventoryProduct(req, res);

    expect(mockEnsureWithinPlanLimit).toHaveBeenCalledWith('company-1', 'products', 1);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'مخزون جديد',
          price: 50,
          cost: 50,
          sku: 'INV-001',
          stock: 7,
          trackInventory: true,
          isActive: false,
          isHidden: true,
          source: 'inventory-intake',
        }),
      }),
    );

    const metadata = JSON.parse(mockPrisma.product.create.mock.calls[0][0].data.metadata);
    expect(metadata.workflow.status).toBe('IN_REVIEW');
    expect(metadata.inventoryIntake.quantity).toBe(7);
    expect(metadata.inventoryIntake.hasVariants).toBe(true);

    expect(mockPrisma.productVariant.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.inventory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          quantity: 7,
          available: 7,
          reorderPoint: 2,
        }),
      }),
    );
    expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: 'product-1',
          warehouseId: 'warehouse-1',
          type: 'IN',
          reason: 'PURCHASE',
          quantity: 7,
        }),
      }),
    );
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'product-1' },
        data: expect.objectContaining({ stock: 7 }),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'تم إضافة المنتج من المخزن وإرساله للمراجعة',
      }),
    );
  });

  test('lets super admins derive the company from the selected warehouse', async () => {
    const req = {
      user: {
        id: 'super-1',
        role: 'SUPER_ADMIN',
        name: 'Super Admin',
      },
      body: {
        name: 'منتج سوبر من المخزن',
        sku: 'INV-SUPER-001',
        warehouseId: 'warehouse-1',
        wholesalePrice: '80',
        quantity: '5',
      },
    };
    const res = createMockResponse();

    await createInventoryProduct(req, res);

    expect(mockPrisma.warehouse.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'warehouse-1',
          isActive: true,
        },
      }),
    );
    expect(mockEnsureWithinPlanLimit).toHaveBeenCalledWith('company-1', 'products', 1);
    expect(mockPrisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'company-1',
          isActive: false,
          isHidden: true,
          source: 'inventory-intake',
        }),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('rejects users without inventory product creation permission', async () => {
    const req = {
      user: {
        id: 'user-2',
        role: 'AGENT',
        companyId: 'company-1',
      },
      body: {
        name: 'Not Allowed',
        warehouseId: 'warehouse-1',
        quantity: 1,
      },
    };
    const res = createMockResponse();

    await createInventoryProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'صلاحياتك لا تسمح بإضافة منتج من المخزن',
      }),
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
