const mockSafeQuery = jest.fn(async (operation) => operation());

const mockPrisma = {
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
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  conversation: {
    findUnique: jest.fn(),
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

jest.mock('../../services/walletService', () => ({
  createWallet: jest.fn(),
}));

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
  ensureWithinPlanLimit: jest.fn(async () => true),
  createLimitExceededError: jest.fn(),
}));

const orderService = require('../../services/orderService');

describe('OrderService.createOrderFromConversation - Prisma Relation Mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.customer.findFirst.mockResolvedValue({
      id: 'cust-123',
      companyId: 'comp-123',
      metadata: '{}',
    });

    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'prod-123',
      sku: 'SKU-123',
      price: 299,
      isActive: true,
    });

    mockPrisma.order.create.mockImplementation(async ({ data }) => ({
      id: 'order-created-123',
      orderNumber: data.orderNumber,
      total: data.total,
      ...data,
    }));
  });

  test('should NOT pass conversationId scalar or conversation relation when conversationId is omitted (e.g. manual order)', async () => {
    const payload = {
      customerId: 'cust-123',
      companyId: 'comp-123',
      productName: 'تيشيرت قطن كلاسيك',
      productPrice: 299,
      quantity: 1,
      customerName: 'عميل اختبار',
      customerPhone: '01000000000',
      city: 'القاهرة',
    };

    const order = await orderService.createOrderFromConversation(payload);

    expect(order).toBeDefined();
    expect(mockPrisma.order.create).toHaveBeenCalledTimes(1);

    const createArgs = mockPrisma.order.create.mock.calls[0][0];
    const data = createArgs.data;

    // Must NOT contain scalar conversationId
    expect(data.conversationId).toBeUndefined();
    expect('conversationId' in data).toBe(false);

    // Must NOT connect non-existent conversation
    expect(data.conversation).toBeUndefined();

    // Relations company and customer must be connected
    expect(data.company).toEqual({ connect: { id: 'comp-123' } });
    expect(data.customer).toEqual({ connect: { id: 'cust-123' } });
  });

  test('should connect conversation relation when valid conversationId exists in database', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-real-777',
      channel: 'FACEBOOK',
      metadata: JSON.stringify({ adId: 'ad-999' }),
    });

    const payload = {
      conversationId: 'conv-real-777',
      customerId: 'cust-123',
      companyId: 'comp-123',
      productName: 'تيشيرت قطن كلاسيك',
      productPrice: 299,
      quantity: 1,
      customerName: 'عميل فيسبوك',
      customerPhone: '01000000000',
      city: 'القاهرة',
    };

    const order = await orderService.createOrderFromConversation(payload);

    expect(order).toBeDefined();
    expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith({
      where: { id: 'conv-real-777' },
      select: { id: true, channel: true, metadata: true },
    });

    const createArgs = mockPrisma.order.create.mock.calls[0][0];
    const data = createArgs.data;

    // Must connect relation
    expect(data.conversation).toEqual({ connect: { id: 'conv-real-777' } });

    // Must NOT contain scalar conversationId
    expect('conversationId' in data).toBe(false);
  });

  test('should omit conversation relation and NOT crash when conversationId is not found in database', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue(null);

    const payload = {
      conversationId: 'conv-non-existent-999',
      customerId: 'cust-123',
      companyId: 'comp-123',
      productName: 'تيشيرت قطن كلاسيك',
      productPrice: 299,
      quantity: 1,
      customerName: 'عميل مجهول',
      customerPhone: '01000000000',
      city: 'القاهرة',
    };

    const order = await orderService.createOrderFromConversation(payload);

    expect(order).toBeDefined();
    const createArgs = mockPrisma.order.create.mock.calls[0][0];
    const data = createArgs.data;

    // Must NOT crash and must NOT attempt connect
    expect(data.conversation).toBeUndefined();
    expect('conversationId' in data).toBe(false);

    // But metadata should still record the original conversationId for tracing
    const meta = JSON.parse(data.metadata);
    expect(meta.conversationId).toBe('conv-non-existent-999');
  });
});
