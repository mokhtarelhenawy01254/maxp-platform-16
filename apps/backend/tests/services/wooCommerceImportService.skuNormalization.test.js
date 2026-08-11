const mockEnsureWithinPlanLimit = jest.fn();
const mockCreateLimitExceededError = jest.fn();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

jest.mock('../../services/wooCommerceStatusService', () => ({
  mapWooStatusToLocal: jest.fn(() => 'PENDING'),
  cleanLocationName: jest.fn((value) => value || null),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: (...args) => mockEnsureWithinPlanLimit(...args),
  createLimitExceededError: (...args) => mockCreateLimitExceededError(...args),
}));

const {
  importSingleOrder,
  importOrdersBatchOptimized,
} = require('../../services/wooCommerceImportService');

describe('wooCommerceImportService SKU normalization safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureWithinPlanLimit.mockResolvedValue({ allowed: true, payload: null });
  });

  test('single-order import matches a line item to a product by normalized SKU (case-insensitive)', async () => {
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'order-1',
          status: 'PENDING',
          orderNumber: 'WOO-1',
          wooCommerceId: '1',
        }),
      },
      orderItem: { create: jest.fn().mockResolvedValue({}) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
      customer: {
        findFirst: jest.fn().mockResolvedValue({ id: 'customer-1' }),
        create: jest.fn(),
      },
      productVariant: { findFirst: jest.fn().mockResolvedValue(null) },
      product: {
        findFirst: jest.fn().mockResolvedValue({ id: 'product-1', sku: 'SKU-1' }),
      },
    };

    await importSingleOrder(prisma, 'company-1', {
      id: '1',
      total: '100',
      billing: { first_name: 'A', last_name: 'B', email: 'a@b.com', phone: '01000000000' },
      line_items: [{ sku: ' sku-1 ', product_id: 1, name: 'Product', quantity: 1, price: '100', total: '100' }],
    });

    // The product lookup should have tried the trimmed + lowercased/uppercased variants (incl. 'SKU-1').
    const productLookupCall = prisma.product.findFirst.mock.calls.find(([args]) =>
      args.where && args.where.sku
    );
    expect(productLookupCall).toBeTruthy();
    expect(productLookupCall[0].where.sku).toEqual(
      expect.objectContaining({ in: expect.arrayContaining(['SKU-1']) })
    );
    expect(prisma.orderItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ productId: 'product-1' }) })
    );
  });

  test('batch import matches products by normalized SKU via pre-fetched lookups', async () => {
    const prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({
          id: 'order-1',
          status: 'PENDING',
          orderNumber: 'WOO-1',
          wooCommerceId: '1',
        }),
      },
      customer: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 'customer-1' }),
        create: jest.fn(),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([{ id: 'product-1', sku: 'SKU-1', wooCommerceId: '1' }]),
        findFirst: jest.fn(),
      },
      productVariant: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      orderItem: { create: jest.fn().mockResolvedValue({}) },
      orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    };

    const stats = await importOrdersBatchOptimized(prisma, 'company-1', [{
      id: '1',
      number: 'WOO-1',
      total: '100',
      billing: { first_name: 'A', last_name: 'B', email: 'a@b.com', phone: '01000000000' },
      line_items: [{ sku: 'sku-1', product_id: 1, name: 'Product', quantity: 1, price: '100', total: '100' }],
    }]);

    expect(stats.imported).toBe(1);
    expect(stats.failed).toBe(0);
    const itemCreate = prisma.orderItem.create.mock.calls[0][0];
    expect(itemCreate.data.productId).toBe('product-1');
    expect(itemCreate.data.productSku).toBe('sku-1');
  });
});
