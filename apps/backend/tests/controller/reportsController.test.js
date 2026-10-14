jest.mock('date-fns-tz', () => ({
  formatInTimeZone: jest.fn((d) => new Date(d).toISOString().slice(0, 10)),
  fromZonedTime: jest.fn((d) => new Date(d)),
}), { virtual: true });

jest.mock('date-fns', () => ({
  startOfDay: jest.fn((d) => new Date(d)),
  endOfDay: jest.fn((d) => new Date(d)),
  subDays: jest.fn((d, n) => new Date(new Date(d).getTime() - n * 86400000)),
}), { virtual: true });

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  initializeSharedDatabase: jest.fn(),
  executeWithRetry: jest.fn((fn) => fn()),
}));

const { getDetailedOrderReport, getSalesReport, getOrderStatusAnalytics } = require('../../controller/reportsController');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('reportsController - getDetailedOrderReport & getSalesReport', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({ timezone: 'Africa/Cairo' }),
      },
      order: {
        count: jest.fn().mockResolvedValue(10),
        aggregate: jest.fn().mockResolvedValue({ _sum: { total: 1000 } }),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      customOrderStatus: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      guestOrder: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      orderItem: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 10 } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    };
    getSharedPrismaClient.mockReturnValue(mockPrisma);
  });

  describe('getDetailedOrderReport', () => {
    test('unifies regular and guest orders, deduplicating twins and summing pieces and revenue', async () => {
      const regularOrders = [
        {
          id: 'reg-1',
          orderNumber: 'ORD-100',
          status: 'DELIVERED',
          customStatusCode: null,
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          total: 500,
          subtotal: 450,
          shipping: 50,
          governorate: 'القاهرة',
          city: 'مدينة نصر',
          turboBranchName: 'فرع القاهرة',
          turboShipmentId: 'TRB-1',
          turboShipmentStatus: 'delivered',
          turboTrackingNumber: 'TRK-1',
          createdAt: new Date('2026-10-10T10:00:00Z'),
          shipments: [],
        },
        {
          id: 'reg-2',
          orderNumber: 'ORD-101',
          status: 'PENDING',
          customStatusCode: null,
          paymentMethod: 'CASH',
          paymentStatus: 'PENDING',
          total: 300,
          subtotal: 250,
          shipping: 50,
          governorate: 'الجيزة',
          city: 'الدقي',
          turboBranchName: null,
          turboShipmentId: null,
          turboShipmentStatus: null,
          turboTrackingNumber: null,
          createdAt: new Date('2026-10-10T11:00:00Z'),
          shipments: [],
        },
      ];

      const guestOrders = [
        // Twin order: same orderNumber as reg-1, should be deduplicated
        {
          id: 'gst-twin',
          orderNumber: 'ORD-100',
          status: 'pending',
          paymentMethod: 'cash_on_delivery',
          paymentStatus: 'PENDING',
          total: 500,
          finalTotal: 500,
          shippingCost: 50,
          shippingAddress: JSON.stringify({ governorate: 'القاهرة', city: 'مدينة نصر' }),
          items: JSON.stringify([{ quantity: 2 }]),
          createdAt: new Date('2026-10-10T10:00:00Z'),
        },
        // Unique guest order
        {
          id: 'gst-1',
          orderNumber: 'GST-200',
          status: 'pending',
          paymentMethod: 'cash_on_delivery',
          paymentStatus: 'PENDING',
          total: 400,
          finalTotal: 400,
          shippingCost: 50,
          shippingAddress: JSON.stringify({ governorate: 'الإسكندرية', city: 'سموحة' }),
          items: JSON.stringify([{ quantity: 3 }, { quantity: 1 }]),
          turboBranchName: 'فرع الإسكندرية',
          turboShipmentId: null,
          turboShipmentStatus: null,
          turboTrackingNumber: null,
          createdAt: new Date('2026-10-10T12:00:00Z'),
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(regularOrders);
      mockPrisma.guestOrder.findMany.mockResolvedValue(guestOrders);
      mockPrisma.orderItem.aggregate.mockResolvedValue({ _sum: { quantity: 5 } });

      const req = {
        user: { companyId: 'comp-1' },
        query: { startDate: '2026-10-10', endDate: '2026-10-10' },
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getDetailedOrderReport(req, res);

      expect(res.json).toHaveBeenCalled();
      expect(mockPrisma.guestOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({ paymentStatus: true }),
        })
      );
      const responseData = res.json.mock.calls[0][0];

      expect(responseData.success).toBe(true);
      const data = responseData.data;

      // Total orders should be 3 (2 regular + 1 unique guest, twin excluded)
      expect(data.totalOrders).toBe(3);

      // Total revenue: 500 + 300 + 400 = 1200
      expect(data.totalRevenue).toBe(1200);

      // Pieces: 5 from regular + 4 (3+1) from guest = 9 total pieces
      expect(data.totalPieces).toBe(9);

      // Status distribution should uppercase guest status ('PENDING')
      // 1 DELIVERED, 2 PENDING (1 regular + 1 guest)
      expect(data.statusDistribution['DELIVERED']).toBe(1);
      expect(data.statusDistribution['PENDING']).toBe(2);

      // COD count: cash_on_delivery mapped to COD
      // All 3 orders are COD
      expect(data.metrics.codOrdersCount).toBe(3);
      expect(data.metrics.prepaidOrdersCount).toBe(0);

      // Governorate details includes Alexandria from guest order
      const alex = data.governorateDetails.find((g) => g.name === 'الإسكندرية');
      expect(alex).toBeDefined();
      expect(alex.ordersCount).toBe(1);
    });

    test('accurately calculates duplicateStats including avoidedRevenue and topDuplicates', async () => {
      const orders = [
        {
          id: 'ord-1',
          orderNumber: 'ORD-101',
          status: 'DELIVERED',
          total: 500,
          customerPhone: '01012345678',
          customerName: 'أحمد علي',
          createdAt: new Date('2026-10-10T10:00:00Z'),
          shipments: [],
        },
        {
          id: 'ord-dup-1',
          orderNumber: 'ORD-102',
          status: 'DUPLICATE_ORDER',
          total: 500,
          customerPhone: '01012345678',
          customerName: 'أحمد علي',
          metadata: JSON.stringify({ duplicate: { duplicateOfOrderNumber: 'ORD-101' } }),
          createdAt: new Date('2026-10-10T10:15:00Z'),
          shipments: [],
        },
        {
          id: 'ord-dup-2',
          orderNumber: 'ORD-103',
          status: 'PENDING',
          total: 300,
          customerPhone: '01099999999',
          customerName: 'محمود حسن',
          metadata: JSON.stringify({ duplicate: { duplicateOfOrderNumber: 'ORD-099' } }),
          createdAt: new Date('2026-10-10T11:00:00Z'),
          shipments: [],
        },
      ];

      mockPrisma.order.findMany.mockResolvedValue(orders);
      mockPrisma.guestOrder.findMany.mockResolvedValue([]);
      mockPrisma.orderItem.aggregate.mockResolvedValue({ _sum: { quantity: 3 } });

      const req = {
        user: { companyId: 'comp-1' },
        query: { period: 'today' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getDetailedOrderReport(req, res);
      const data = res.json.mock.calls[0][0].data;

      expect(data.duplicateStats).toBeDefined();
      expect(data.duplicateStats.totalDuplicates).toBe(2);
      expect(data.duplicateStats.duplicateRate).toBe(66.7);
      expect(data.duplicateStats.avoidedRevenue).toBe(800);
      expect(data.duplicateStats.topDuplicates.length).toBe(2);
      expect(data.duplicateStats.topDuplicates[0].customerPhone).toBe('01012345678');
      expect(data.duplicateStats.topDuplicates[0].originalOrderNumber).toBe('ORD-101');
    });

    test('supports period=yesterday query parameter', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.guestOrder.findMany.mockResolvedValue([]);
      mockPrisma.orderItem.aggregate.mockResolvedValue({ _sum: { quantity: 0 } });

      const req = {
        user: { companyId: 'comp-1' },
        query: { period: 'yesterday' },
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getDetailedOrderReport(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.totalOrders).toBe(0);
    });
  });

  describe('getSalesReport', () => {
    test('unifies orders and guestOrders and groups by date', async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          orderNumber: 'ORD-1',
          createdAt: new Date('2026-10-10T08:00:00Z'),
          total: 200,
          status: 'DELIVERED',
        },
      ]);
      mockPrisma.guestOrder.findMany.mockResolvedValue([
        {
          orderNumber: 'GST-1',
          createdAt: new Date('2026-10-10T09:00:00Z'),
          total: 150,
          finalTotal: 150,
          status: 'pending',
        },
      ]);

      const req = {
        user: { companyId: 'comp-1' },
        query: { startDate: '2026-10-10', endDate: '2026-10-10' },
      };

      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getSalesReport(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.success).toBe(true);
      expect(responseData.data.data[0].orders).toBe(2);
      expect(responseData.data.data[0].sales).toBe(350);
    });
  });

  describe('getOrderStatusAnalytics', () => {
    test('accepts active custom status code without returning 400', async () => {
      mockPrisma.customOrderStatus.findFirst.mockResolvedValue({ id: 'c-1', code: 'DELAYED_WITH_CAPTAIN' });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);

      const req = {
        user: { companyId: 'comp-1' },
        query: { status: 'DELAYED_WITH_CAPTAIN' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getOrderStatusAnalytics(req, res);

      expect(res.status).not.toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(true);
    });

    test('rejects unrecognized status filter with 400', async () => {
      mockPrisma.customOrderStatus.findFirst.mockResolvedValue(null);

      const req = {
        user: { companyId: 'comp-1' },
        query: { status: 'UNKNOWN_RANDOM_STATUS' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getOrderStatusAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.stringContaining('Invalid status filter'),
      }));
    });
  });
});
