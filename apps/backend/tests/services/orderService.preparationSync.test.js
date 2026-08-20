const mockSafeQuery = jest.fn(async (operation) => operation());

const mockPrisma = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  order: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  orderStatusHistory: {
    findFirst: jest.fn(),
  },
  orderStatusDefinition: {
    findUnique: jest.fn(),
  },
  customer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
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
  ensureWithinPlanLimit: jest.fn(async () => ({ allowed: true })),
  createLimitExceededError: jest.fn(() => null),
}));

const orderService = require('../../services/orderService');

describe('orderService.updateOrderStatus preparation metadata sync', () => {
  const baseOrder = {
    id: 'ord_1',
    orderNumber: 'ORD-100',
    companyId: 'comp_1',
    status: 'PACKAGED',
    metadata: JSON.stringify({ preparationStatus: 'PACKAGED' }),
    company: { orderWorkflowConfig: { enabled: false } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
    mockPrisma.order.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...baseOrder, ...data })
    );
  });

  test('syncs metadata.preparationStatus when target status is a preparation pipeline status', async () => {
    await orderService.updateOrderStatus(
      'ORD-100',
      'comp_1',
      'READY',
      null,
      'user_1',
      'Tester',
      baseOrder,
      false,
      { skipCallAttemptGuard: true, skipTransitionValidation: true }
    );

    expect(mockPrisma.order.update).toHaveBeenCalledTimes(1);
    const updateData = mockPrisma.order.update.mock.calls[0][0].data;
    expect(updateData.status).toBe('READY');
    const parsedMetadata = JSON.parse(updateData.metadata);
    expect(parsedMetadata.preparationStatus).toBe('READY');
  });

  test('does not overwrite metadata when target status is outside the preparation pipeline', async () => {
    await orderService.updateOrderStatus(
      'ORD-100',
      'comp_1',
      'CANCELLED',
      null,
      'user_1',
      'Tester',
      baseOrder,
      false,
      { skipCallAttemptGuard: true, skipTransitionValidation: true }
    );

    const updateData = mockPrisma.order.update.mock.calls[0][0].data;
    expect(updateData.status).toBe('CANCELLED');
    expect(updateData.metadata).toBeUndefined();
  });

  test('syncs metadata.preparationStatus when moving back to CONFIRMED (preparation page must reflect it)', async () => {
    const orderInPreparing = {
      ...baseOrder,
      status: 'PREPARING',
      metadata: JSON.stringify({ preparationStatus: 'PREPARING' }),
    };
    mockPrisma.order.findFirst.mockResolvedValue(orderInPreparing);

    await orderService.updateOrderStatus(
      'ORD-100',
      'comp_1',
      'CONFIRMED',
      null,
      'user_1',
      'Tester',
      orderInPreparing,
      false,
      { skipCallAttemptGuard: true, skipTransitionValidation: true }
    );

    const updateData = mockPrisma.order.update.mock.calls[0][0].data;
    expect(updateData.status).toBe('CONFIRMED');
    const parsedMetadata = JSON.parse(updateData.metadata);
    expect(parsedMetadata.preparationStatus).toBe('CONFIRMED');
  });
});
