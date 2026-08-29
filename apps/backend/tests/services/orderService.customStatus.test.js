/**
 * Regression: updateOrderStatus must resolve custom statuses (not in OrderStatus enum)
 * through their mapsToSystem — store the valid enum value on order.status, keep the custom
 * code for statusHistory + WhatsApp notification. See PRODUCTION-FIX (custom-status-enum).
 */

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
  orderStatusConfig: {
    findFirst: jest.fn(),
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

describe('orderService.updateOrderStatus custom-status resolution', () => {
  const baseOrder = {
    id: 'ord_1',
    orderNumber: 'ORD-100',
    companyId: 'comp_1',
    status: 'SHIPPED',
    metadata: null,
    company: { orderWorkflowConfig: { enabled: false } },
    customer: { phone: '201000000000' },
    orderItems: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
    mockPrisma.order.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...baseOrder, ...data })
    );
  });

  test('stores the mapped enum value but keeps the custom code in statusHistory', async () => {
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue({ mapsToSystem: 'ON_HOLD' });

    await orderService.updateOrderStatus(
      'ORD-100',
      'comp_1',
      'DELAYED-WITH-CAPTAIN',
      null,
      'user_1',
      'Tester',
      baseOrder,
      false,
      { skipCallAttemptGuard: true, skipTransitionValidation: true }
    );

    expect(mockPrisma.order.update).toHaveBeenCalledTimes(1);
    const updateData = mockPrisma.order.update.mock.calls[0][0].data;
    // Stored status must be the valid enum value
    expect(updateData.status).toBe('ON_HOLD');
    // History keeps the custom code for display
    expect(updateData.statusHistory.create.status).toBe('DELAYED-WITH-CAPTAIN');
  });

  test('PRODUCTION-FIX (custom-status-persist): persists customStatusCode next to the enum', async () => {
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue({ mapsToSystem: 'ON_HOLD' });

    await orderService.updateOrderStatus(
      'ORD-100',
      'comp_1',
      'DELAYED-WITH-CAPTAIN',
      null,
      'user_1',
      'Tester',
      baseOrder,
      false,
      { skipCallAttemptGuard: true, skipTransitionValidation: true }
    );

    const updateData = mockPrisma.order.update.mock.calls[0][0].data;
    expect(updateData.customStatusCode).toBe('DELAYED-WITH-CAPTAIN');
    expect(updateData.status).toBe('ON_HOLD');
  });

  test('PRODUCTION-FIX (custom-status-persist): clears customStatusCode when a plain enum status is set', async () => {
    const orderWithCustom = { ...baseOrder, status: 'ON_HOLD', customStatusCode: 'DELAYED-WITH-CAPTAIN' };
    mockPrisma.order.findFirst.mockResolvedValue(orderWithCustom);

    await orderService.updateOrderStatus(
      'ORD-100',
      'comp_1',
      'PENDING',
      null,
      'user_1',
      'Tester',
      orderWithCustom,
      false,
      { skipCallAttemptGuard: true, skipTransitionValidation: true }
    );

    const updateData = mockPrisma.order.update.mock.calls[0][0].data;
    expect(updateData.status).toBe('PENDING');
    expect(updateData.customStatusCode).toBeNull();
  });

  test('PRODUCTION-FIX (custom-status-noop): custom status on an order already at its mapsToSystem value is NOT a no-op', async () => {
    // قبل الإصلاح: currentStatus === storedStatus كان بيرجع مبكرًا — لا تحديث ولا تاريخ
    // ولا إشعار واتساب (تحديث صامت لا يعمل شيء). دلوقتي لازم يكمّل ويخزّن الكود المخصص.
    const orderAtMappingTarget = { ...baseOrder, status: 'ON_HOLD', customStatusCode: null };
    mockPrisma.order.findFirst.mockResolvedValue(orderAtMappingTarget);
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue({ mapsToSystem: 'ON_HOLD' });

    await orderService.updateOrderStatus(
      'ORD-100',
      'comp_1',
      'DELAYED-WITH-CAPTAIN',
      null,
      'user_1',
      'Tester',
      orderAtMappingTarget,
      false,
      { skipCallAttemptGuard: true, skipTransitionValidation: true }
    );

    expect(mockPrisma.order.update).toHaveBeenCalledTimes(1);
    const updateData = mockPrisma.order.update.mock.calls[0][0].data;
    expect(updateData.status).toBe('ON_HOLD');
    expect(updateData.customStatusCode).toBe('DELAYED-WITH-CAPTAIN');
    expect(updateData.statusHistory.create.status).toBe('DELAYED-WITH-CAPTAIN');
  });

  test('PRODUCTION-FIX (custom-status-noop): re-applying the SAME custom status stays a no-op', async () => {
    const orderWithCustom = { ...baseOrder, status: 'ON_HOLD', customStatusCode: 'DELAYED-WITH-CAPTAIN' };
    mockPrisma.order.findFirst.mockResolvedValue(orderWithCustom);
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue({ mapsToSystem: 'ON_HOLD' });

    const result = await orderService.updateOrderStatus(
      'ORD-100',
      'comp_1',
      'DELAYED-WITH-CAPTAIN',
      null,
      'user_1',
      'Tester',
      orderWithCustom,
      false,
      { skipCallAttemptGuard: true, skipTransitionValidation: true }
    );

    expect(mockPrisma.order.update).not.toHaveBeenCalled();
    expect(result).toBe(orderWithCustom);
  });

  test('PRODUCTION-FIX (custom-status-noop): setting the mapped enum explicitly replaces the custom status', async () => {
    // التاجر رجّع الطلب للحالة النظامية ON_HOLD مباشرة — لازم يشيل الكود المخصص
    const orderWithCustom = { ...baseOrder, status: 'ON_HOLD', customStatusCode: 'DELAYED-WITH-CAPTAIN' };
    mockPrisma.order.findFirst.mockResolvedValue(orderWithCustom);

    await orderService.updateOrderStatus(
      'ORD-100',
      'comp_1',
      'ON_HOLD',
      null,
      'user_1',
      'Tester',
      orderWithCustom,
      false,
      { skipCallAttemptGuard: true, skipTransitionValidation: true }
    );

    expect(mockPrisma.order.update).toHaveBeenCalledTimes(1);
    const updateData = mockPrisma.order.update.mock.calls[0][0].data;
    expect(updateData.customStatusCode).toBeNull();
  });

  test('rejects a custom status with no valid mapsToSystem with a clean Arabic error (not a Prisma 500)', async () => {
    mockPrisma.orderStatusConfig.findFirst.mockResolvedValue({ mapsToSystem: '' });

    await expect(
      orderService.updateOrderStatus(
        'ORD-100',
        'comp_1',
        'DELAYED-WITH-CAPTAIN',
        null,
        'user_1',
        'Tester',
        baseOrder,
        false,
        { skipCallAttemptGuard: true, skipTransitionValidation: true }
      )
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  test('standard enum statuses are untouched by resolution', async () => {
    await orderService.updateOrderStatus(
      'ORD-100',
      'comp_1',
      'DELIVERED',
      null,
      'user_1',
      'Tester',
      baseOrder,
      false,
      { skipCallAttemptGuard: true, skipTransitionValidation: true }
    );

    const updateData = mockPrisma.order.update.mock.calls[0][0].data;
    expect(updateData.status).toBe('DELIVERED');
    expect(updateData.statusHistory.create.status).toBe('DELIVERED');
  });
});
