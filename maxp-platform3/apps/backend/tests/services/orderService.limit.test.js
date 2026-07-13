const mockEnsureWithinPlanLimit = jest.fn();
const mockCreateLimitExceededError = jest.fn();
const mockSafeQuery = jest.fn(async (operation) => operation());

const mockPrisma = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  order: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  customer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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
  pushOrderToProvider: jest.fn(() => Promise.resolve()),
  pushOrderToConsumer: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../services/customerBlocklistService', () => ({
  evaluateCustomerBlock: jest.fn(async () => ({ blocked: false })),
}));

jest.mock('../../services/orderConfirmationService', () => ({
  autoAssignOnCreation: jest.fn(async () => null),
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
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.$executeRaw.mockResolvedValue(1);
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

  test('creates a conversation order with required company, customer, item, and shipping relations', async () => {
    jest.spyOn(orderService, 'generateOrderNumber').mockResolvedValue('ORD-1');
    jest.spyOn(orderService, 'getDuplicateSettings').mockResolvedValue(null);
    jest.spyOn(orderService, 'calculateShipping').mockReturnValue(999);

    mockEnsureWithinPlanLimit.mockResolvedValue({ allowed: true });
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'product-1',
      name: 'Test Product',
    });
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'customer-new',
        firstName: 'Test',
        lastName: 'Customer',
        phone: '01000000040',
        status: 'LEAD',
      }]);
    mockPrisma.customer.findUnique.mockResolvedValue({
      id: 'customer-new',
      status: 'LEAD',
    });
    mockPrisma.customer.update.mockResolvedValue({ id: 'customer-new' });
    mockPrisma.order.create.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-1',
    });
    mockPrisma.order.findUnique.mockResolvedValue({
      id: 'order-1',
      orderNumber: 'ORD-1',
      customer: { id: 'customer-new' },
    });

    await expect(
      orderService.createOrderFromConversation({
        companyId: 'company-1',
        productName: 'Test Product',
        productPrice: 100,
        productColor: 'black',
        productSize: '42',
        quantity: 1,
        customerName: 'Test Customer',
        customerPhone: '01000000040',
        city: 'Cairo',
        shippingAmount: 35,
      }),
    ).resolves.toMatchObject({
      id: 'order-1',
      orderNumber: 'ORD-1',
    });

    expect(mockPrisma.customer.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    expect(mockPrisma.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderNumber: 'ORD-1',
        company: { connect: { id: 'company-1' } },
        customer: { connect: { id: 'customer-new' } },
        customerName: 'Test Customer',
        customerPhone: '01000000040',
        subtotal: 100,
        shipping: 35,
        total: 135,
        orderItems: {
          create: [
            expect.objectContaining({
              productId: 'product-1',
              productName: 'Test Product',
              productSize: '42',
              productColor: 'black',
              quantity: 1,
              price: 100,
              total: 100,
              extractionSource: 'ai',
            }),
          ],
        },
      }),
    });
    expect(orderService.calculateShipping).not.toHaveBeenCalled();
    expect(mockPrisma.product.create).not.toHaveBeenCalled();
  });

  test('finds a conversation customer using raw SQL to avoid stale Prisma Customer columns', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{
      id: 'customer-existing',
      firstName: 'Existing',
      lastName: 'Customer',
      email: 'existing@example.com',
      phone: '01000000050',
      status: 'ACTIVE',
    }]);

    await expect(
      orderService.findOrCreateConversationCustomer({
        companyId: 'company-1',
        customerId: 'customer-existing',
        customerName: 'Existing Customer',
        customerPhone: '01000000050',
        customerEmail: 'existing@example.com',
      }),
    ).resolves.toMatchObject({
      id: 'customer-existing',
      status: 'ACTIVE',
    });

    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    expect(mockPrisma.customer.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.customer.create).not.toHaveBeenCalled();
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
