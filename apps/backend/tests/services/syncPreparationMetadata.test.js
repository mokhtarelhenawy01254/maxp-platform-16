/**
 * 🚨 PRODUCTION-FIX (notifications-fix-plan §5.2) — regression tests:
 * syncPreparationMetadata keeps metadata.preparationStatus in sync for orders
 * that move through paths bypassing orderService.updateOrderStatus (e.g. the
 * advanced workflow's raw prisma.order.update). It must only write for
 * PREPARATION_PIPELINE_STATUSES and be idempotent in value.
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
  orderStatusHistory: { findFirst: jest.fn() },
  orderStatusDefinition: { findUnique: jest.fn() },
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

// syncPreparationMetadata(orderId, status, prismaClient) accepts a prisma client
// directly — we pass a focused mock (no sharedDatabase dependency needed).
describe('orderService.syncPreparationMetadata (§5.2)', () => {
  let focusedPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    focusedPrisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          metadata: JSON.stringify({ preparationStatus: 'PREPARING', customerNote: 'x' }),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
  });

  test('updates metadata.preparationStatus when status is in the preparation pipeline', async () => {
    await orderService.syncPreparationMetadata('o1', 'PROCESSING', focusedPrisma);
    expect(focusedPrisma.order.update).toHaveBeenCalledTimes(1);
    const data = focusedPrisma.order.update.mock.calls[0][0].data;
    const parsed = JSON.parse(data.metadata);
    expect(parsed.preparationStatus).toBe('PROCESSING');
  });

  test('preserves existing metadata fields when syncing', async () => {
    await orderService.syncPreparationMetadata('o1', 'QUALITY_CHECK', focusedPrisma);
    const data = focusedPrisma.order.update.mock.calls[0][0].data;
    const parsed = JSON.parse(data.metadata);
    expect(parsed.preparationStatus).toBe('QUALITY_CHECK');
    expect(parsed.customerNote).toBe('x');
    expect(parsed.preparationStatusUpdatedAt).toBeDefined();
  });

  test('clears stale preparationStatus when status is outside the preparation pipeline', async () => {
    await orderService.syncPreparationMetadata('o1', 'CANCELLED', focusedPrisma);
    expect(focusedPrisma.order.update).toHaveBeenCalledTimes(1);
    const data = focusedPrisma.order.update.mock.calls[0][0].data;
    const parsed = JSON.parse(data.metadata);
    expect(parsed.preparationStatus).toBeUndefined();
    expect(parsed.customerNote).toBe('x');
  });

  test('reads the order when status is outside the pipeline to check for stale metadata', async () => {
    await orderService.syncPreparationMetadata('o1', 'DELIVERED', focusedPrisma);
    expect(focusedPrisma.order.findUnique).toHaveBeenCalled();
  });

  test('idempotent in value: calling twice with the same status writes the same preparationStatus', async () => {
    await orderService.syncPreparationMetadata('o1', 'PROCESSING', focusedPrisma);
    await orderService.syncPreparationMetadata('o1', 'PROCESSING', focusedPrisma);
    expect(focusedPrisma.order.update).toHaveBeenCalledTimes(2);
    const first = JSON.parse(focusedPrisma.order.update.mock.calls[0][0].data.metadata);
    const second = JSON.parse(focusedPrisma.order.update.mock.calls[1][0].data.metadata);
    expect(first.preparationStatus).toBe('PROCESSING');
    expect(second.preparationStatus).toBe('PROCESSING');
    expect(second).toEqual(first);
  });

  test('order not found → no update, returns null', async () => {
    focusedPrisma.order.findUnique.mockResolvedValue(null);
    const result = await orderService.syncPreparationMetadata('missing', 'PROCESSING', focusedPrisma);
    expect(focusedPrisma.order.update).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('is case-insensitive on the status code', async () => {
    await orderService.syncPreparationMetadata('o1', 'processing', focusedPrisma);
    const data = focusedPrisma.order.update.mock.calls[0][0].data;
    expect(JSON.parse(data.metadata).preparationStatus).toBe('PROCESSING');
  });
});
