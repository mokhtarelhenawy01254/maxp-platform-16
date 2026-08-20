/**
 * Regression: RETURNED auto-notifications were silently skipped because
 * autoCreateReturnRequest threw a Prisma FK error (return_activity_logs_userId_fkey)
 * when the turbo sync passed userId='SYSTEM', crashing the background block before
 * the WhatsApp notification. See PRODUCTION-FIX (return-notification-gap).
 */

const mockSafeQuery = jest.fn(async (operation) => operation());

const mockPrisma = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  order: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  orderStatusHistory: { findFirst: jest.fn() },
  orderStatusDefinition: { findUnique: jest.fn() },
  orderStatusConfig: { findFirst: jest.fn() },
  returnRequest: { findFirst: jest.fn(), create: jest.fn() },
  returnReason: { findFirst: jest.fn(), create: jest.fn() },
  returnActivityLog: { create: jest.fn() },
  customer: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  product: { findFirst: jest.fn(), create: jest.fn() },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: (...args) => mockSafeQuery(...args),
}));

jest.mock('../../services/wooCommerceAutoExportService', () => ({
  getWooCommerceAutoExportService: jest.fn(() => ({ exportOrderAsync: jest.fn() })),
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

describe('orderService autoCreateReturnRequest userId FK guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.returnRequest.findFirst.mockResolvedValue(null);
    mockPrisma.returnReason.findFirst.mockResolvedValue({ id: 'reason-1' });
    mockPrisma.returnRequest.create.mockResolvedValue({ id: 'rr-1' });
    mockPrisma.returnActivityLog.create.mockResolvedValue({});
  });

  const baseOrder = {
    id: 'ord_1',
    orderNumber: 'ORD-100',
    companyId: 'comp_1',
    customerId: 'cust_1',
    total: 100,
    status: 'RETURNED',
  };

  test("system userId ('SYSTEM') must NOT be written to returnActivityLog (FK guard)", async () => {
    await orderService.autoCreateReturnRequest(baseOrder, 'SYSTEM', 'RETURNED');

    expect(mockPrisma.returnActivityLog.create).toHaveBeenCalledTimes(1);
    const data = mockPrisma.returnActivityLog.create.mock.calls[0][0].data;
    expect(data.userId).toBeUndefined();
  });

  test('a real user CUID is preserved in the activity log', async () => {
    await orderService.autoCreateReturnRequest(baseOrder, 'cmlrealuser0001abc123456', 'RETURNED');

    const data = mockPrisma.returnActivityLog.create.mock.calls[0][0].data;
    expect(data.userId).toBe('cmlrealuser0001abc123456');
  });

  test('does not crash when returnRequest already exists', async () => {
    mockPrisma.returnRequest.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(orderService.autoCreateReturnRequest(baseOrder, 'SYSTEM', 'RETURNED')).resolves.toBeUndefined();
    expect(mockPrisma.returnActivityLog.create).not.toHaveBeenCalled();
  });
});
