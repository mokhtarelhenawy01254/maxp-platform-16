const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  planLimit: {
    findUnique: jest.fn(),
  },
  user: {
    count: jest.fn(),
  },
  customer: {
    count: jest.fn(),
  },
  product: {
    count: jest.fn(),
  },
  order: {
    count: jest.fn(),
  },
  conversation: {
    count: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn(async (operation) => operation()),
}));

jest.mock('../../services/platformSignupCouponService', () => ({
  applyServiceLimitBonuses: jest.fn((limits) => limits),
}));

const planLimitsService = require('../../services/planLimitsService');

describe('planLimitsService usage counting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('counts only current-month orders for order usage enforcement', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      plan: 'PRO',
    });
    mockPrisma.user.count.mockResolvedValue(3);
    mockPrisma.customer.count.mockResolvedValue(40);
    mockPrisma.product.count.mockResolvedValue(12);
    mockPrisma.order.count.mockResolvedValue(9);
    mockPrisma.conversation.count.mockResolvedValue(120);

    const usage = await planLimitsService.getCurrentUsage('company-1');

    expect(mockPrisma.order.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
      }),
    );

    const startOfMonth = mockPrisma.order.count.mock.calls[0][0].where.createdAt.gte;
    expect(startOfMonth.getDate()).toBe(1);
    expect(startOfMonth.getHours()).toBe(0);
    expect(startOfMonth.getMinutes()).toBe(0);
    expect(startOfMonth.getSeconds()).toBe(0);

    expect(usage).toMatchObject({
      users: 3,
      customers: 40,
      products: 12,
      orders: 9,
      conversations: 120,
      plan: 'PRO',
    });
  });
});
