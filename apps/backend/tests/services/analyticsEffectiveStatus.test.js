jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
  }));
}, { virtual: true });

jest.mock('../../services/sharedDatabase', () => {
  const mockPrisma = {
    $queryRawUnsafe: jest.fn(),
    order: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    guestOrder: {
      findMany: jest.fn(),
    },
  };
  return {
    getSharedPrismaClient: jest.fn(() => mockPrisma),
    mockPrisma,
  };
});

const analyticsService = require('../../services/analyticsService');
const { mockPrisma } = require('../../services/sharedDatabase');
const { computeEffectiveOrderStatus } = require('../../utils/orderEffectiveStatus');

describe('Analytics Effective Status Integration (Wave 2 Item 4 Batch 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyticsService.getOrderBreakdown', () => {
    test('queries effective order status via $queryRawUnsafe and tallies custom status orders', async () => {
      // Return effective statuses: DELIVERED, CUSTOM_DELIVERED (mapped), and CANCELLED
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { status: 'DELIVERED', count: 5 },
        { status: 'CUSTOM_VIP_DELIVERED', count: 3 },
        { status: 'CANCELLED', count: 2 },
      ]);
      mockPrisma.order.groupBy.mockResolvedValue([
        { paymentMethod: 'CASH', _count: { paymentMethod: 7 } },
        { paymentMethod: 'CARD', _count: { paymentMethod: 3 } },
      ]);
      mockPrisma.guestOrder.findMany.mockResolvedValue([]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await analyticsService.getOrderBreakdown(
        'comp-123',
        new Date('2026-10-01'),
        new Date('2026-10-10'),
        'none'
      );

      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalled();
      const sqlCall = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sqlCall).toContain('customStatusCode');
      expect(sqlCall).toContain('GROUP BY');

      expect(result.ordersByStatus.delivered).toBe(5);
      expect(result.ordersByStatus.custom_vip_delivered).toBe(3);
      expect(result.ordersByStatus.cancelled).toBe(2);
      expect(result.codOrders).toBe(7);
      expect(result.prepaidOrders).toBe(3);
    });

    test('falls back gracefully to prisma.order.groupBy if raw SQL query throws', async () => {
      mockPrisma.$queryRawUnsafe.mockRejectedValue(new Error('Syntax or column error'));
      mockPrisma.order.groupBy.mockImplementation(async ({ by }) => {
        if (by.includes('status')) {
          return [{ status: 'DELIVERED', _count: { status: 4 } }];
        }
        return [{ paymentMethod: 'CASH', _count: { paymentMethod: 4 } }];
      });
      mockPrisma.guestOrder.findMany.mockResolvedValue([]);
      mockPrisma.order.findMany.mockResolvedValue([]);

      const result = await analyticsService.getOrderBreakdown(
        'comp-123',
        new Date('2026-10-01'),
        new Date('2026-10-10'),
        'none'
      );

      expect(result.ordersByStatus.delivered).toBe(4);
    });
  });

  describe('computeEffectiveOrderStatus resolution in analytics items', () => {
    test('resolves custom status code over raw status', () => {
      const order = {
        id: 'ord-1',
        status: 'PENDING',
        customStatusCode: 'DELAYED_WITH_CAPTAIN',
        metadata: {},
      };
      expect(computeEffectiveOrderStatus(order)).toBe('DELAYED_WITH_CAPTAIN');
    });

    test('preserves terminal status even if preparationStatus is set in metadata', () => {
      const order = {
        id: 'ord-2',
        status: 'DELIVERED',
        customStatusCode: null,
        metadata: { preparationStatus: 'PROCESSING' },
      };
      expect(computeEffectiveOrderStatus(order)).toBe('DELIVERED');
    });
  });
});
