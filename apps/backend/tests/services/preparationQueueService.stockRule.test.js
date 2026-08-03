const mockPrisma = {
  order: {
    findUnique: jest.fn(),
  },
  inventory: {
    findMany: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const {
  assertPreparationStockRule,
} = require('../../services/preparationQueueService');

describe('preparationQueueService.assertPreparationStockRule', () => {
  const baseOrder = {
    id: 'ord_1',
    orderNumber: 'ORD-1',
    status: 'PROCESSING',
    metadata: JSON.stringify({ preparationStatus: 'PREPARING' }),
    total: 100,
    orderItems: [
      { productId: 'p1', quantity: 2, productName: 'A' },
      { productId: 'p2', quantity: 1, productName: 'B' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder);
  });

  test('returns null (allowed) when target is a forward stage and stock is complete', async () => {
    // p1: available 5 >= 2, p2: available 3 >= 1
    mockPrisma.inventory.findMany.mockResolvedValue([
      { productId: 'p1', warehouseId: 'w1', quantity: 5, available: 5, reserved: 0 },
      { productId: 'p2', warehouseId: 'w1', quantity: 3, available: 3, reserved: 0 },
    ]);

    const result = await assertPreparationStockRule({
      orderId: 'ord_1',
      companyId: 'c1',
      targetStatus: 'PACKAGED',
      prepSettings: { requireStockBeforePreparing: true, allowPartialPreparation: false },
    });

    expect(result).toBeNull();
    expect(mockPrisma.inventory.findMany).toHaveBeenCalled();
  });

  test('throws 400 when moving forward with missing stock and partial prep disabled', async () => {
    // p1 available 0 < 2 → shortage
    mockPrisma.inventory.findMany.mockResolvedValue([
      { productId: 'p1', warehouseId: 'w1', quantity: 0, available: 0, reserved: 0 },
      { productId: 'p2', warehouseId: 'w1', quantity: 3, available: 3, reserved: 0 },
    ]);

    let caught = null;
    try {
      await assertPreparationStockRule({
        orderId: 'ord_1',
        companyId: 'c1',
        targetStatus: 'READY_TO_SHIP',
        prepSettings: { requireStockBeforePreparing: true, allowPartialPreparation: false, allowCrossWarehouseTransfer: false },
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).not.toBeNull();
    expect(caught.statusCode).toBe(400);
    expect(caught.message).toContain('ناقصة المخزون');
  });

  test('allows forward move with missing stock when allowPartialPreparation is true', async () => {
    mockPrisma.inventory.findMany.mockResolvedValue([
      { productId: 'p1', warehouseId: 'w1', quantity: 0, available: 0, reserved: 0 },
      { productId: 'p2', warehouseId: 'w1', quantity: 3, available: 3, reserved: 0 },
    ]);

    const result = await assertPreparationStockRule({
      orderId: 'ord_1',
      companyId: 'c1',
      targetStatus: 'QUALITY_CHECK',
      prepSettings: { requireStockBeforePreparing: true, allowPartialPreparation: true },
    });

    expect(result).toBeNull();
  });

  test('returns null when requireStockBeforePreparing is disabled', async () => {
    const result = await assertPreparationStockRule({
      orderId: 'ord_1',
      companyId: 'c1',
      targetStatus: 'PACKAGED',
      prepSettings: { requireStockBeforePreparing: false },
    });

    expect(result).toBeNull();
    expect(mockPrisma.inventory.findMany).not.toHaveBeenCalled();
  });
});
