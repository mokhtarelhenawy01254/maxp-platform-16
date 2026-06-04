const mockEnsureWithinPlanLimit = jest.fn();
const mockCreateLimitExceededError = jest.fn();
const mockSafeQuery = jest.fn(async (operation) => operation());

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: (...args) => mockSafeQuery(...args),
}));

jest.mock('../../services/wooCommerceAutoExportService', () => ({
  getWooCommerceAutoExportService: jest.fn(() => ({
    exportOrderAsync: jest.fn(),
  })),
}));

jest.mock('../../services/walletService', () => jest.fn());

jest.mock('../../services/internalSyncService', () => ({
  pushOrderToProvider: jest.fn(),
}));

jest.mock('../../services/hr/customerLoyaltyService', () => ({
  getCustomerActiveRewards: jest.fn(async () => null),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: (...args) => mockEnsureWithinPlanLimit(...args),
  createLimitExceededError: (...args) => mockCreateLimitExceededError(...args),
}));

const orderService = require('../../services/orderService');

describe('orderService plan limit enforcement', () => {
  let warnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('throws a limit error before creating a conversation order when monthly order limit is reached', async () => {
    const payload = {
      success: false,
      error: 'LIMIT_EXCEEDED',
      message: 'تم تجاوز حد الطلبات المسموح به في خطتك الحالية',
    };
    const limitError = new Error(payload.message);
    limitError.statusCode = 400;
    limitError.payload = payload;

    jest.spyOn(orderService, 'generateOrderNumber').mockResolvedValue('ORD-1');
    jest.spyOn(orderService, 'getDuplicateSettings').mockResolvedValue(null);
    jest.spyOn(orderService, 'calculateShipping').mockReturnValue(0);

    mockEnsureWithinPlanLimit.mockResolvedValue({
      allowed: false,
      payload,
    });
    mockCreateLimitExceededError.mockReturnValue(limitError);

    await expect(
      orderService.createOrderFromConversation({
        conversationId: 'conversation-1',
        customerId: 'customer-1',
        companyId: 'company-1',
        productName: 'Test Product',
        productPrice: 100,
        quantity: 1,
        customerName: 'Test Customer',
        customerPhone: '01000000000',
        city: 'Cairo',
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      payload: expect.objectContaining({
        error: 'LIMIT_EXCEEDED',
      }),
    });

    expect(mockEnsureWithinPlanLimit).toHaveBeenCalledWith('company-1', 'orders', 1);
    expect(mockCreateLimitExceededError).toHaveBeenCalledWith(payload);
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });

  test('returns null before auto-creating a product when product limit is reached', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockEnsureWithinPlanLimit.mockResolvedValue({
      allowed: false,
      payload: {
        error: 'LIMIT_EXCEEDED',
        message: 'Product limit reached',
      },
    });

    await expect(
      orderService.findOrCreateProduct('Auto Product', 'company-1'),
    ).resolves.toBeNull();

    expect(mockEnsureWithinPlanLimit).toHaveBeenCalledWith('company-1', 'products', 1);
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });
});
