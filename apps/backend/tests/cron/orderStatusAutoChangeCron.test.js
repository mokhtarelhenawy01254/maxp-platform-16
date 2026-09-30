/**
 * Tests for orderStatusAutoChangeCron — Actual status engine & timer from status entry.
 */

jest.mock('../../services/sharedDatabase', () => {
  const mockPrisma = {
    orderStatusAutoChangeRule: {
      findMany: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  };
  return {
    getSharedPrismaClient: () => mockPrisma,
    __esModule: true,
  };
});

jest.mock('../../services/orderService', () => {
  const mockOrderService = {
    setCompanyId: jest.fn().mockReturnThis(),
    updateOrderStatus: jest.fn().mockResolvedValue({ id: 'ord_1', status: 'ON_HOLD' }),
  };
  return mockOrderService;
});

jest.mock('../../services/socketService', () => ({
  broadcastToCompany: jest.fn(),
}));

const sharedDatabase = require('../../services/sharedDatabase');
const orderService = require('../../services/orderService');
const socketService = require('../../services/socketService');
const { runOrderStatusAutoChange } = require('../../cron/orderStatusAutoChangeCron');

const mockPrisma = sharedDatabase.getSharedPrismaClient();

describe('orderStatusAutoChangeCron — Engine Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('custom status rule: queries customStatusCode without Prisma enum error & triggers transition + delayed signal', async () => {
    // 1. Setup active rule on custom status
    mockPrisma.orderStatusAutoChangeRule.findMany.mockResolvedValue([
      {
        id: 'rule_custom_1',
        companyId: 'company_swan',
        fromStatus: 'WITH_THE_CAPTAIN',
        toStatus: 'DELAYED-WITH-CAPTAIN',
        waitTime: 2,
        timeUnit: 'Days',
        isActive: true,
      },
    ]);

    // 2. Mock raw SQL returning an order that entered WITH_THE_CAPTAIN 3 days ago,
    // even if note was updated 1 minute ago!
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'ord_swan_101',
        status: 'SHIPPED', // mapsToSystem
        customStatusCode: 'WITH_THE_CAPTAIN',
        orderNumber: 'SWAN-1001',
        createdAt: threeDaysAgo,
        statusEnteredAt: threeDaysAgo,
      },
    ]);

    // 3. Run cron job
    await runOrderStatusAutoChange();

    // 4. Verify SQL query was invoked with customStatusCode check and company isolation
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('LOWER(o."customStatusCode") = LOWER($2)'),
      'company_swan',
      'WITH_THE_CAPTAIN',
      expect.any(Date)
    );

    // 5. Verify official updateOrderStatus was invoked
    expect(orderService.setCompanyId).toHaveBeenCalledWith('company_swan');
    expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
      'ord_swan_101',
      'company_swan',
      'DELAYED-WITH-CAPTAIN',
      expect.stringContaining('Auto-changed by rule'),
      'SYSTEM_AUTO',
      'System Automation',
      null,
      false,
      expect.objectContaining({
        skipTransitionValidation: true,
        skipCallAttemptGuard: true,
      })
    );

    // 6. Verify shipping-agent delayed order signal was emitted via socket
    expect(socketService.broadcastToCompany).toHaveBeenCalledWith(
      'company_swan',
      'shipping:delayed_order',
      expect.objectContaining({
        orderId: 'ord_swan_101',
        orderNumber: 'SWAN-1001',
        status: 'DELAYED-WITH-CAPTAIN',
        suggestedAction: 'shipping_ticket_create',
      })
    );
  });

  test('system status rule: queries status enum and filters out orders with customStatusCode', async () => {
    mockPrisma.orderStatusAutoChangeRule.findMany.mockResolvedValue([
      {
        id: 'rule_sys_1',
        companyId: 'company_swan',
        fromStatus: 'CONFIRMED',
        toStatus: 'SHIPPED',
        waitTime: 30,
        timeUnit: 'Minutes',
        isActive: true,
      },
    ]);

    mockPrisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'ord_sys_202',
        status: 'CONFIRMED',
        customStatusCode: null,
        orderNumber: 'SWAN-2002',
        createdAt: new Date(Date.now() - 40 * 60 * 1000),
        statusEnteredAt: new Date(Date.now() - 40 * 60 * 1000),
      },
    ]);

    await runOrderStatusAutoChange();

    // Verify it used system status enum query with empty customStatusCode guard
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('o.status = $2::"OrderStatus"'),
      'company_swan',
      'CONFIRMED',
      expect.any(Date)
    );

    expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
      'ord_sys_202',
      'company_swan',
      'SHIPPED',
      expect.any(String),
      'SYSTEM_AUTO',
      'System Automation',
      null,
      false,
      expect.any(Object)
    );
  });

  test('multi-tenant isolation: rules from company A do not process company B orders', async () => {
    mockPrisma.orderStatusAutoChangeRule.findMany.mockResolvedValue([
      {
        id: 'rule_comp_a',
        companyId: 'company_A',
        fromStatus: 'CONFIRMED',
        toStatus: 'PROCESSING',
        waitTime: 1,
        timeUnit: 'Hours',
        isActive: true,
      },
      {
        id: 'rule_comp_b',
        companyId: 'company_B',
        fromStatus: 'PROCESSING',
        toStatus: 'SHIPPED',
        waitTime: 2,
        timeUnit: 'Hours',
        isActive: true,
      },
    ]);

    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

    await runOrderStatusAutoChange();

    // Verify company_A query had company_A and company_B query had company_B
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.any(String),
      'company_A',
      'CONFIRMED',
      expect.any(Date)
    );
    expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledWith(
      expect.any(String),
      'company_B',
      'PROCESSING',
      expect.any(Date)
    );
  });
});
