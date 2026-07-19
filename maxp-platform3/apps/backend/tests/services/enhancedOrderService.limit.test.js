const mockEnsureWithinPlanLimit = jest.fn();
const mockSafeQuery = jest.fn(async (operation) => operation());
const mockGetDuplicateSettings = jest.fn();
const mockFindDuplicateOrder = jest.fn();

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
  },
  customer: {
    update: jest.fn(),
  },
  company: {
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

jest.mock('../../services/orderService', () => ({
  getDuplicateSettings: (...args) => mockGetDuplicateSettings(...args),
  findDuplicateOrder: (...args) => mockFindDuplicateOrder(...args),
}));

jest.mock('../../services/internalSyncService', () => ({
  pushOrderToProvider: jest.fn(),
}));

jest.mock('../../utils/planLimitPayloads', () => ({
  ensureWithinPlanLimit: (...args) => mockEnsureWithinPlanLimit(...args),
}));

const EnhancedOrderService = require('../../services/enhancedOrderService');

describe('EnhancedOrderService plan limit enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDuplicateSettings.mockResolvedValue(null);
    mockFindDuplicateOrder.mockResolvedValue(null);
  });

  test('returns a limit payload before preparing a new order when monthly order limit is reached', async () => {
    const payload = {
      success: false,
      error: 'LIMIT_EXCEEDED',
      message: 'تم تجاوز حد الطلبات المسموح به في خطتك الحالية',
    };

    mockEnsureWithinPlanLimit.mockResolvedValue({
      allowed: false,
      payload,
    });

    const service = new EnhancedOrderService();
    const prepareSpy = jest.spyOn(service, 'prepareOrderData');
    const createSpy = jest.spyOn(service, 'createOrderInDatabase');

    jest.spyOn(service, 'findOrCreateCustomer').mockResolvedValue({
      id: 'customer-1',
      phone: '01000000000',
    });
    jest.spyOn(service, 'findConversation').mockResolvedValue({
      id: 'conversation-1',
    });
    jest.spyOn(service, 'generateOrderNumber').mockResolvedValue('ORD-1');
    jest.spyOn(service, 'calculateOrderCosts').mockResolvedValue({
      subtotal: 100,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 100,
    });

    const result = await service.createEnhancedOrder({
      companyId: 'company-1',
      conversationId: 'conversation-1',
      customerId: 'customer-1',
      customerName: 'Test Customer',
      customerPhone: '01000000000',
      productName: 'Test Product',
      productPrice: 100,
      quantity: 1,
    });

    expect(mockEnsureWithinPlanLimit).toHaveBeenCalledWith('company-1', 'orders', 1);
    expect(result).toEqual(payload);
    expect(prepareSpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
  });
});
