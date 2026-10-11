const { getAllOrders, getOneOrder } = require('../../controller/orderController');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
  initializeSharedDatabase: jest.fn(),
  executeWithRetry: jest.fn((fn) => fn()),
}));

describe('orderController - getAllOrders & getOneOrder', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({ timezone: 'Africa/Cairo' }),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      guestOrder: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    getSharedPrismaClient.mockReturnValue(mockPrisma);
  });

  describe('getAllOrders', () => {
    test('unifies both regular orders and guest orders, sorting by createdAt desc', async () => {
      const regularOrders = [
        {
          id: 'ord-1',
          orderNumber: 'ORD-101',
          customerName: 'أحمد علي',
          customerPhone: '01000000001',
          customerEmail: 'ahmed@test.com',
          total: 500,
          status: 'CONFIRMED',
          paymentStatus: 'PENDING',
          createdAt: new Date('2026-10-11T02:00:00Z'),
          orderItems: [
            { id: 'item-1', productName: 'قميص أبيض', price: 250, quantity: 2 },
          ],
        },
      ];

      const guestOrders = [
        {
          id: 'guest-1',
          orderNumber: 'ORD-102',
          guestName: 'محمد سامي',
          guestPhone: '01100000002',
          guestEmail: 'guest@test.com',
          total: 300,
          finalTotal: 300,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          createdAt: new Date('2026-10-11T03:00:00Z'), // newer than regular
          items: JSON.stringify([
            { id: 'gitem-1', name: 'بنطلون جينز', price: 300, quantity: 1 },
          ]),
        },
      ];

      mockPrisma.order.findMany.mockResolvedValueOnce(regularOrders);
      mockPrisma.guestOrder.findMany.mockResolvedValueOnce(guestOrders);
      mockPrisma.order.count.mockResolvedValueOnce(1);
      mockPrisma.guestOrder.count.mockResolvedValueOnce(1);

      const req = {
        user: { companyId: 'comp-100' },
        query: { page: '1', limit: '20' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getAllOrders(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      // Newest first (guest order is newer)
      expect(response.data[0].orderNumber).toBe('ORD-102');
      expect(response.data[0].customerName).toBe('محمد سامي');
      expect(response.data[1].orderNumber).toBe('ORD-101');
      expect(response.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        pages: 1,
      });
    });

    test('applies startDate and endDate date filters properly', async () => {
      mockPrisma.order.findMany.mockResolvedValueOnce([]);
      mockPrisma.guestOrder.findMany.mockResolvedValueOnce([]);
      mockPrisma.order.count.mockResolvedValueOnce(0);
      mockPrisma.guestOrder.count.mockResolvedValueOnce(0);

      const req = {
        user: { companyId: 'comp-100' },
        query: {
          startDate: '2026-10-10',
          endDate: '2026-10-10',
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getAllOrders(req, res);

      expect(mockPrisma.order.findMany).toHaveBeenCalled();
      const orderWhere = mockPrisma.order.findMany.mock.calls[0][0].where;
      expect(orderWhere.createdAt).toBeDefined();
      expect(orderWhere.createdAt.gte).toBeInstanceOf(Date);
      expect(orderWhere.createdAt.lte).toBeInstanceOf(Date);

      const guestWhere = mockPrisma.guestOrder.findMany.mock.calls[0][0].where;
      expect(guestWhere.createdAt).toBeDefined();
      expect(guestWhere.createdAt.gte).toBeInstanceOf(Date);
      expect(guestWhere.createdAt.lte).toBeInstanceOf(Date);
    });

    test('deduplicates twin records when guest order has matching orderNumber', async () => {
      const regularOrders = [
        {
          id: 'ord-reg-1',
          orderNumber: 'ORD-TWIN-999',
          customerName: 'عميل مسجل',
          customerPhone: '01011112222',
          total: 400,
          status: 'PROCESSING',
          createdAt: new Date('2026-10-10T12:00:00Z'),
          orderItems: [],
        },
      ];

      const guestOrders = [
        {
          id: 'guest-twin-1',
          orderNumber: 'ORD-TWIN-999', // Identical order number twin
          guestName: 'عميل زائر مكرر',
          guestPhone: '01011112222',
          total: 400,
          status: 'PENDING',
          createdAt: new Date('2026-10-10T11:59:00Z'),
          items: '[]',
        },
        {
          id: 'guest-unique-2',
          orderNumber: 'ORD-UNIQUE-888',
          guestName: 'طلب زائر وحيد',
          guestPhone: '01099998888',
          total: 200,
          status: 'PENDING',
          createdAt: new Date('2026-10-10T11:50:00Z'),
          items: '[]',
        },
      ];

      mockPrisma.order.findMany.mockResolvedValueOnce(regularOrders);
      mockPrisma.guestOrder.findMany.mockResolvedValueOnce(guestOrders);
      mockPrisma.order.count.mockResolvedValueOnce(1);
      mockPrisma.guestOrder.count.mockResolvedValueOnce(2);

      // Twin lookup in order table returns the regular counterpart
      mockPrisma.order.findMany.mockResolvedValueOnce([
        { orderNumber: 'ORD-TWIN-999' },
      ]);
      mockPrisma.guestOrder.count.mockResolvedValueOnce(1); // 1 twin in scope

      const req = {
        user: { companyId: 'comp-100' },
        query: { page: '1', limit: '20' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getAllOrders(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      // Twin was removed; only regular order and unique guest order remain
      expect(response.data).toHaveLength(2);
      expect(response.data.map((o) => o.orderNumber)).toEqual([
        'ORD-TWIN-999',
        'ORD-UNIQUE-888',
      ]);
      expect(response.data[0].customerName).toBe('عميل مسجل');
      // Total pagination should be 1 + 2 - 1 = 2
      expect(response.pagination.total).toBe(2);
    });

    test('filters by status in both upper and lowercase', async () => {
      mockPrisma.order.findMany.mockResolvedValueOnce([]);
      mockPrisma.guestOrder.findMany.mockResolvedValueOnce([]);
      mockPrisma.order.count.mockResolvedValueOnce(0);
      mockPrisma.guestOrder.count.mockResolvedValueOnce(0);

      const req = {
        user: { companyId: 'comp-100' },
        query: { status: 'confirmed' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getAllOrders(req, res);

      const orderWhere = mockPrisma.order.findMany.mock.calls[0][0].where;
      expect(orderWhere.status).toBe('CONFIRMED');

      const guestWhere = mockPrisma.guestOrder.findMany.mock.calls[0][0].where;
      expect(guestWhere.status).toEqual({ in: ['CONFIRMED', 'confirmed'] });
    });

    test('excludes TRASH orders by default when status is omitted', async () => {
      mockPrisma.order.findMany.mockResolvedValueOnce([]);
      mockPrisma.guestOrder.findMany.mockResolvedValueOnce([]);

      const req = {
        user: { companyId: 'comp-100' },
        query: {},
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getAllOrders(req, res);

      const orderWhere = mockPrisma.order.findMany.mock.calls[0][0].where;
      expect(orderWhere.status).toEqual({ not: 'TRASH' });

      const guestWhere = mockPrisma.guestOrder.findMany.mock.calls[0][0].where;
      expect(guestWhere.status).toEqual({ notIn: ['TRASH', 'trash', 'deleted'] });
    });

    test('paginates and slices correctly for page 2', async () => {
      const regularOrders = [
        { id: '1', orderNumber: '1', createdAt: new Date('2026-10-11T05:00:00Z'), total: 10 },
        { id: '2', orderNumber: '2', createdAt: new Date('2026-10-11T04:00:00Z'), total: 20 },
      ];
      const guestOrders = [
        { id: '3', orderNumber: '3', createdAt: new Date('2026-10-11T03:00:00Z'), total: 30, items: '[]' },
        { id: '4', orderNumber: '4', createdAt: new Date('2026-10-11T02:00:00Z'), total: 40, items: '[]' },
      ];

      mockPrisma.order.findMany.mockResolvedValueOnce(regularOrders);
      mockPrisma.guestOrder.findMany.mockResolvedValueOnce(guestOrders);
      mockPrisma.order.count.mockResolvedValueOnce(2);
      mockPrisma.guestOrder.count.mockResolvedValueOnce(2);

      const req = {
        user: { companyId: 'comp-100' },
        query: { page: '2', limit: '2' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getAllOrders(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      // Page 1 would have 1, 2; Page 2 has 3, 4
      expect(response.data.map(o => o.orderNumber)).toEqual(['3', '4']);
      expect(response.pagination).toEqual({
        total: 4,
        page: 2,
        limit: 2,
        pages: 2,
      });
    });

    test('returns 403 if companyId is missing', async () => {
      const req = { user: {}, query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getAllOrders(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('getOneOrder', () => {
    test('returns regular order if found', async () => {
      const foundOrder = {
        id: 'ord-123',
        orderNumber: 'ORD-123',
        customer: { firstName: 'علي' },
        orderItems: [],
        statusHistory: [],
      };
      mockPrisma.order.findFirst.mockResolvedValueOnce(foundOrder);

      const req = {
        params: { id: 'ord-123' },
        user: { companyId: 'comp-100' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getOneOrder(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true, data: foundOrder });
    });

    test('falls back to guestOrder if not found in regular order table', async () => {
      mockPrisma.order.findFirst.mockResolvedValueOnce(null);
      const guestOrder = {
        id: 'guest-456',
        orderNumber: 'ORD-GUEST-456',
        guestName: 'خالد',
        guestPhone: '01234567890',
        guestEmail: 'khaled@test.com',
        finalTotal: 350,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'cash_on_delivery',
        shippingAddress: 'القاهرة',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: JSON.stringify([{ name: 'ساعة يد', price: 350, quantity: 1 }]),
      };
      mockPrisma.guestOrder.findFirst.mockResolvedValueOnce(guestOrder);

      const req = {
        params: { id: 'ORD-GUEST-456' },
        user: { companyId: 'comp-100' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getOneOrder(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.orderNumber).toBe('ORD-GUEST-456');
      expect(response.data.customerName).toBe('خالد');
      expect(response.data.orderItems[0].productName).toBe('ساعة يد');
    });

    test('returns 404 if neither regular nor guest order is found', async () => {
      mockPrisma.order.findFirst.mockResolvedValueOnce(null);
      mockPrisma.guestOrder.findFirst.mockResolvedValueOnce(null);

      const req = {
        params: { id: 'non-existent' },
        user: { companyId: 'comp-100' },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getOneOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'الطلب غير موجود' })
      );
    });
  });
});
