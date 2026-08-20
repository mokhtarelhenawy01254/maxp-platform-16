const mockPrisma = {
  product: {
    findMany: jest.fn(),
  },
  inventory: {
    updateMany: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
  },
  orderItem: {
    findMany: jest.fn(),
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

const {
  getReorderPoints,
  updateReorderPoint,
  bulkUpdateReorderPoints,
} = require('../../controller/inventoryController');

const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const createRequest = (query = {}, params = {}, body = {}) => ({
  user: {
    id: 'user-1',
    name: 'Inventory Manager',
    role: 'MANAGER',
    companyId: 'company-1',
  },
  query,
  params,
  body,
});

const buildProduct = ({
  id,
  name,
  sku,
  price = 0,
  cost = 0,
  trackInventory = true,
  isPreOrder = false,
  preOrderDate = null,
  preOrderMessage = '',
  images = null,
  mainImage = null,
  category = null,
  inventories = [],
}) => ({
  id,
  name,
  sku,
  price,
  cost,
  trackInventory,
  isPreOrder,
  preOrderDate,
  preOrderMessage,
  images,
  mainImage,
  category,
  inventories,
});

const buildInventoryRecord = ({
  id,
  productId,
  warehouseId = 'w-1',
  warehouseName = 'Main',
  quantity = 0,
  available = 0,
  reserved = 0,
  reorderPoint = 0,
  minStock = 0,
  batchNumber = null,
}) => ({
  id,
  productId,
  warehouseId,
  quantity,
  available,
  reserved,
  reorderPoint,
  minStock,
  batchNumber,
  warehouse: { id: warehouseId, name: warehouseName },
});

describe('inventoryController reorder points', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getReorderPoints', () => {
    beforeEach(() => {
      mockPrisma.product.findMany.mockResolvedValue([
        buildProduct({
          id: 'p-1',
          name: 'T-Shirt',
          sku: 'TSHIRT-1',
          price: 100,
          cost: 40,
          category: { id: 'c-1', name: 'Clothes' },
          inventories: [
            buildInventoryRecord({
              id: 'inv-1',
              productId: 'p-1',
              quantity: 10,
              available: 10,
              reorderPoint: 5,
              minStock: 3,
            }),
          ],
        }),
        buildProduct({
          id: 'p-2',
          name: 'Jacket',
          sku: 'JACKET-1',
          price: 250,
          cost: 90,
          isPreOrder: true,
          preOrderDate: new Date(Date.now() + 86400000).toISOString(),
          category: { id: 'c-2', name: 'Outerwear' },
          inventories: [
            buildInventoryRecord({
              id: 'inv-2',
              productId: 'p-2',
              quantity: 0,
              available: 0,
              reorderPoint: 8,
              minStock: 4,
            }),
          ],
        }),
      ]);
      mockPrisma.order.findMany.mockResolvedValue([{ id: 'o-1' }]);
      mockPrisma.orderItem.findMany.mockResolvedValue([
        { productId: 'p-1', quantity: 30 },
      ]);
    });

    test('returns aggregated product view with summary', async () => {
      const res = createMockResponse();
      await getReorderPoints(createRequest({ view: 'product' }), res);

      expect(res.status).not.toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalled();
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.items).toHaveLength(2);
      expect(payload.data.summary.totalProducts).toBe(2);
      expect(payload.data.summary.lowStockCount).toBe(0);
      expect(payload.data.summary.outOfStockCount).toBe(1);
      expect(payload.data.summary.preOrderCount).toBe(1);
    });

    test('computes low stock status when available <= reorderPoint', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        buildProduct({
          id: 'p-3',
          name: 'Socks',
          sku: 'SOCKS-1',
          price: 15,
          cost: 4,
          inventories: [
            buildInventoryRecord({
              id: 'inv-3',
              productId: 'p-3',
              quantity: 3,
              available: 3,
              reorderPoint: 5,
              minStock: 2,
            }),
          ],
        }),
      ]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const res = createMockResponse();
      await getReorderPoints(createRequest({ view: 'product', stockFilter: 'low' }), res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data.items).toHaveLength(1);
      expect(payload.data.items[0].status).toBe('low');
      expect(payload.data.summary.lowStockCount).toBe(1);
    });

    test('preorder view returns only pre-order products', async () => {
      const res = createMockResponse();
      await getReorderPoints(createRequest({ view: 'preorder' }), res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data.items).toHaveLength(1);
      expect(payload.data.items[0].productId).toBe('p-2');
    });

    test('includes products with no inventory records (e.g. fresh pre-order / untracked)', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        buildProduct({
          id: 'p-9',
          name: 'New Pre-Order Item',
          sku: 'NEW-PO-1',
          price: 120,
          isPreOrder: true,
          preOrderDate: new Date(Date.now() + 86400000).toISOString(),
          inventories: [],
        }),
        buildProduct({
          id: 'p-10',
          name: 'Untracked Product',
          sku: 'UNTRACKED-1',
          price: 50,
          trackInventory: false,
          inventories: [],
        }),
      ]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const res = createMockResponse();
      await getReorderPoints(createRequest({ view: 'product' }), res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data.items).toHaveLength(2);
      const newPreOrder = payload.data.items.find((item) => item.productId === 'p-9');
      const untracked = payload.data.items.find((item) => item.productId === 'p-10');
      expect(newPreOrder.available).toBe(0);
      expect(newPreOrder.status).toBe('out');
      expect(newPreOrder.isPreOrder).toBe(true);
      expect(untracked.status).toBe('untracked');
      expect(payload.data.summary.totalProducts).toBe(2);
    });

    test('warehouse view returns one row per inventory record', async () => {
      const res = createMockResponse();
      await getReorderPoints(createRequest({ view: 'warehouse' }), res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data.items).toHaveLength(2);
      expect(payload.data.items[0]).toHaveProperty('inventoryId');
      expect(payload.data.items[0]).toHaveProperty('warehouseName');
    });

    test('warehouse view excludes products with no inventory records', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        buildProduct({
          id: 'p-9',
          name: 'No Inventory Item',
          sku: 'NO-INV-1',
          inventories: [],
        }),
        buildProduct({
          id: 'p-1',
          name: 'T-Shirt',
          sku: 'TSHIRT-1',
          inventories: [
            buildInventoryRecord({ id: 'inv-1', productId: 'p-1', available: 5 }),
          ],
        }),
      ]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const res = createMockResponse();
      await getReorderPoints(createRequest({ view: 'warehouse' }), res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data.items).toHaveLength(1);
      expect(payload.data.items[0].productId).toBe('p-1');
    });

    test('atRiskValue uses product price for out-of-stock gap', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        buildProduct({
          id: 'p-4',
          name: 'Watch',
          sku: 'WATCH-1',
          price: 300,
          cost: 100,
          inventories: [
            buildInventoryRecord({
              id: 'inv-4',
              productId: 'p-4',
              available: 0,
              reorderPoint: 10,
              minStock: 5,
            }),
          ],
        }),
      ]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const res = createMockResponse();
      await getReorderPoints(createRequest({ view: 'product' }), res);

      const payload = res.json.mock.calls[0][0];
      // gap = 10 - 0 = 10, price = 300 ΓåÆ 3000
      expect(payload.data.summary.atRiskValue).toBe(3000);
      expect(payload.data.items[0].price).toBe(300);
    });

    test('out-of-stock row reports daysUntilStockout=0 and critical urgency', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        buildProduct({
          id: 'p-5',
          name: 'Bag',
          sku: 'BAG-1',
          price: 80,
          cost: 30,
          inventories: [
            buildInventoryRecord({
              id: 'inv-5',
              productId: 'p-5',
              available: 0,
              reorderPoint: 5,
              minStock: 2,
            }),
          ],
        }),
      ]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const res = createMockResponse();
      await getReorderPoints(createRequest({ view: 'product' }), res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data.items[0].status).toBe('out');
      expect(payload.data.items[0].daysUntilStockout).toBe(0);
      expect(payload.data.items[0].urgency).toBe('critical');
    });

    test('summary counts are computed before stockFilter is applied', async () => {
      // Two products: p-1 (10 available, point 5 ΓåÆ safe), p-2 (0 available ΓåÆ out)
      mockPrisma.order.findMany.mockResolvedValue([]);

      const res = createMockResponse();
      await getReorderPoints(
        createRequest({ view: 'product', stockFilter: 'out' }),
        res,
      );

      const payload = res.json.mock.calls[0][0];
      // Items filtered to out only, but summary reflects full dataset
      expect(payload.data.items).toHaveLength(1);
      expect(payload.data.items[0].status).toBe('out');
      expect(payload.data.summary.totalProducts).toBe(2);
      expect(payload.data.summary.outOfStockCount).toBe(1);
      expect(payload.data.summary.lowStockCount).toBe(0);
    });

    test('warehouse view includes sales stats and price per row', async () => {
      mockPrisma.order.findMany.mockResolvedValue([{ id: 'o-1' }]);
      mockPrisma.orderItem.findMany.mockResolvedValue([
        { productId: 'p-1', quantity: 30 },
      ]);

      const res = createMockResponse();
      await getReorderPoints(createRequest({ view: 'warehouse' }), res);

      const payload = res.json.mock.calls[0][0];
      const row = payload.data.items.find((item) => item.productId === 'p-1');
      expect(row.price).toBe(100);
      expect(row.dailyAvgSales).toBe(1);
      expect(row.daysUntilStockout).toBe(10);
    });

    test('pagination works', async () => {
      const res = createMockResponse();
      await getReorderPoints(createRequest({ view: 'product', page: 2, limit: 1 }), res);

      const payload = res.json.mock.calls[0][0];
      expect(payload.data.pagination.total).toBe(2);
      expect(payload.data.pagination.limit).toBe(1);
      expect(payload.data.items).toHaveLength(1);
    });

    test('handles errors gracefully', async () => {
      mockPrisma.product.findMany.mockRejectedValue(new Error('boom'));
      const res = createMockResponse();
      await getReorderPoints(createRequest({}), res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('updateReorderPoint', () => {
    beforeEach(() => {
      mockPrisma.inventory.updateMany.mockResolvedValue({ count: 2 });
    });

    test('updates reorderPoint for a product', async () => {
      const res = createMockResponse();
      await updateReorderPoint(
        createRequest({}, { productId: 'p-1' }, { reorderPoint: 10, minStock: 4 }),
        res,
      );

      expect(mockPrisma.inventory.updateMany).toHaveBeenCalled();
      const { where, data } = mockPrisma.inventory.updateMany.mock.calls[0][0];
      expect(where).toHaveProperty('productId', 'p-1');
      expect(data.reorderPoint).toBe(10);
      expect(data.minStock).toBe(4);
      expect(res.json.mock.calls[0][0].data.count).toBe(2);
    });

    test('updates single inventory record', async () => {
      const res = createMockResponse();
      await updateReorderPoint(
        createRequest({}, { inventoryId: 'inv-1' }, { reorderPoint: 7 }),
        res,
      );

      const { where } = mockPrisma.inventory.updateMany.mock.calls[0][0];
      expect(where).toHaveProperty('id', 'inv-1');
    });

    test('rejects when no values provided', async () => {
      const res = createMockResponse();
      await updateReorderPoint(createRequest({}, { productId: 'p-1' }, {}), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 when nothing matched', async () => {
      mockPrisma.inventory.updateMany.mockResolvedValue({ count: 0 });
      const res = createMockResponse();
      await updateReorderPoint(
        createRequest({}, { productId: 'p-1' }, { reorderPoint: 5 }),
        res,
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('clamps negative values to zero', async () => {
      const res = createMockResponse();
      await updateReorderPoint(
        createRequest({}, { productId: 'p-1' }, { reorderPoint: -3 }),
        res,
      );
      const { data } = mockPrisma.inventory.updateMany.mock.calls[0][0];
      expect(data.reorderPoint).toBe(0);
    });
  });

  describe('bulkUpdateReorderPoints', () => {
    beforeEach(() => {
      mockPrisma.inventory.updateMany.mockResolvedValue({ count: 1 });
    });

    test('updates multiple items', async () => {
      const res = createMockResponse();
      await bulkUpdateReorderPoints(
        createRequest({}, {}, {
          items: [
            { inventoryId: 'inv-1', reorderPoint: 5 },
            { productId: 'p-2', reorderPoint: 9, minStock: 2 },
          ],
        }),
        res,
      );

      expect(mockPrisma.inventory.updateMany).toHaveBeenCalledTimes(2);
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.updatedCount).toBe(2);
    });

    test('rejects empty items array', async () => {
      const res = createMockResponse();
      await bulkUpdateReorderPoints(createRequest({}, {}, { items: [] }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('tracks failures per item', async () => {
      mockPrisma.inventory.updateMany.mockRejectedValue(new Error('db error'));
      const res = createMockResponse();
      await bulkUpdateReorderPoints(
        createRequest({}, {}, { items: [{ productId: 'p-1', reorderPoint: 3 }] }),
        res,
      );
      const payload = res.json.mock.calls[0][0];
      expect(payload.success).toBe(true);
      expect(payload.data.updatedCount).toBe(0);
      expect(payload.data.failures).toHaveLength(1);
    });
  });
});
