const mockEnsureWithinPlanLimit = jest.fn();
const mockTenantRun = jest.fn(async (_tenantId, callback) => callback());

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  customer: {
    upsert: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn(),
}));

jest.mock('../../services/wooCommerceAutoExportService', () => ({
  getWooCommerceAutoExportService: jest.fn(() => ({
    exportOrderAsync: jest.fn(),
  })),
}));

jest.mock('../../services/tenantContext', () => ({
  run: (...args) => mockTenantRun(...args),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: (...args) => mockEnsureWithinPlanLimit(...args),
}));

const internalSyncService = require('../../services/internalSyncService');

describe('internalSyncService plan limit enforcement', () => {
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('skips consumer order push when monthly order limit is reached', async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-1',
      subtotal: 120,
      shipping: 0,
      total: 120,
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH',
      shippingAddress: 'Cairo',
      customer: {
        firstName: 'Test',
        lastName: 'Customer',
        phone: '01000000000',
        email: 'test@example.com',
      },
      orderItems: [],
    });

    mockEnsureWithinPlanLimit.mockResolvedValue({
      allowed: false,
      payload: {
        error: 'LIMIT_EXCEEDED',
        message: 'Monthly order limit reached',
      },
    });

    await expect(
      internalSyncService.pushOrderToConsumer('order-1', 'provider-1', 'consumer-1'),
    ).resolves.toBeUndefined();

    expect(mockEnsureWithinPlanLimit).toHaveBeenCalledWith('consumer-1', 'orders', 1);
    expect(mockPrisma.customer.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });
});
