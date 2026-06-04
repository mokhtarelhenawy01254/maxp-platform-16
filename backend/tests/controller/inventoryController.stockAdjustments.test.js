const mockSyncProductStockFromInventory = jest.fn(() => Promise.resolve());

const mockPrisma = {
  $transaction: jest.fn(async (callback) => callback(mockPrisma)),
  warehouse: {
    findFirst: jest.fn(),
  },
  inventory: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  stockMovement: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
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

jest.mock('../../utils/productInventorySync', () => ({
  syncProductStockFromInventory: (...args) =>
    mockSyncProductStockFromInventory(...args),
}));

const { approveMovement, updateStock } = require('../../controller/inventoryController');

const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const createRequest = (body = {}) => ({
  user: {
    id: 'user-1',
    name: 'Inventory Manager',
    role: 'MANAGER',
    companyId: 'company-1',
  },
  body,
});

describe('inventoryController stock adjustments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockPrisma.warehouse.findFirst.mockResolvedValue({
      id: 'warehouse-1',
      companyId: 'company-1',
      isActive: true,
    });
    mockPrisma.inventory.create.mockImplementation(async ({ data }) => ({
      id: 'inventory-created',
      ...data,
    }));
    mockPrisma.inventory.update.mockImplementation(async ({ data }) => ({
      id: 'inventory-1',
      ...data,
    }));
    mockPrisma.stockMovement.create.mockImplementation(async ({ data }) => ({
      id: 'movement-1',
      ...data,
    }));
    mockPrisma.stockMovement.update.mockImplementation(async ({ data }) => ({
      id: 'movement-1',
      ...data,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('adds stock with ADJUSTMENT_IN and records an approved movement', async () => {
    mockPrisma.inventory.findFirst.mockResolvedValue({
      id: 'inventory-1',
      productId: 'product-1',
      warehouseId: 'warehouse-1',
      quantity: 10,
      available: 7,
      reserved: 3,
    });
    const res = createMockResponse();

    await updateStock(
      createRequest({
        productId: 'product-1',
        warehouseId: 'warehouse-1',
        quantity: '5',
        type: 'ADJUSTMENT_IN',
        reason: 'ADJUSTMENT',
        notes: 'count gain',
      }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    expect(mockPrisma.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantity: 15,
          available: 12,
        }),
      }),
    );
    expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'IN',
          reason: 'ADJUSTMENT',
          quantity: 5,
          isApproved: true,
        }),
      }),
    );
  });

  test('deducts stock with ADJUSTMENT_OUT without touching reserved units', async () => {
    mockPrisma.inventory.findFirst.mockResolvedValue({
      id: 'inventory-1',
      productId: 'product-1',
      warehouseId: 'warehouse-1',
      quantity: 10,
      available: 7,
      reserved: 3,
    });
    const res = createMockResponse();

    await updateStock(
      createRequest({
        productId: 'product-1',
        warehouseId: 'warehouse-1',
        quantity: 4,
        type: 'ADJUSTMENT_OUT',
        reason: 'ADJUSTMENT',
        notes: 'count shortage',
      }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true }),
    );
    expect(mockPrisma.inventory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantity: 6,
          available: 3,
        }),
      }),
    );
    expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'OUT',
          reason: 'ADJUSTMENT',
          quantity: 4,
        }),
      }),
    );
  });

  test('rejects an outbound adjustment that exceeds available stock', async () => {
    mockPrisma.inventory.findFirst.mockResolvedValue({
      id: 'inventory-1',
      productId: 'product-1',
      warehouseId: 'warehouse-1',
      quantity: 5,
      available: 2,
      reserved: 3,
    });
    const res = createMockResponse();

    await updateStock(
      createRequest({
        productId: 'product-1',
        warehouseId: 'warehouse-1',
        quantity: 3,
        type: 'ADJUSTMENT_OUT',
        reason: 'ADJUSTMENT',
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('أكبر من الرصيد المتاح'),
      }),
    );
    expect(mockPrisma.inventory.update).not.toHaveBeenCalled();
    expect(mockPrisma.stockMovement.create).not.toHaveBeenCalled();
  });

  test('rejects approving a pending outbound adjustment if stock became insufficient', async () => {
    mockPrisma.stockMovement.findUnique.mockResolvedValue({
      id: 'movement-1',
      productId: 'product-1',
      warehouseId: 'warehouse-1',
      type: 'ADJUSTMENT_OUT',
      quantity: 6,
      isApproved: false,
      batchNumber: null,
      expiryDate: null,
      warehouse: {
        id: 'warehouse-1',
        companyId: 'company-1',
      },
    });
    mockPrisma.inventory.findFirst.mockResolvedValue({
      id: 'inventory-1',
      productId: 'product-1',
      warehouseId: 'warehouse-1',
      quantity: 8,
      available: 5,
      reserved: 3,
    });
    const res = createMockResponse();

    await approveMovement(
      createRequest({
        movementId: 'movement-1',
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('أكبر من الرصيد المتاح'),
      }),
    );
    expect(mockPrisma.inventory.update).not.toHaveBeenCalled();
    expect(mockPrisma.stockMovement.update).not.toHaveBeenCalled();
  });
});
