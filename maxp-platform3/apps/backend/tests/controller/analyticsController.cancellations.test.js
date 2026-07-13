jest.mock('../../services/analyticsService', () => ({}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getCancellationAnalytics } = require('../../controller/analyticsController');

const createResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    status: jest.fn((code) => {
      response.statusCode = code;
      return response;
    }),
    json: jest.fn((payload) => {
      response.payload = payload;
      return response;
    })
  };

  return response;
};

const baseRegularOrder = {
  id: 'order-1',
  orderNumber: 'ORD-1',
  total: '250.50',
  paymentMethod: 'COD',
  notes: null,
  customerName: '',
  customerPhone: '01000000000',
  customerEmail: '',
  city: 'مدينة نصر',
  governorate: 'القاهرة',
  sourceType: 'manual',
  orderSource: 'REGULAR',
  createdAt: new Date('2026-05-01T08:00:00.000Z'),
  updatedAt: new Date('2026-05-02T10:00:00.000Z'),
  customer: {
    firstName: 'أحمد',
    lastName: 'علي',
    phone: '01099999999',
    email: 'ahmed@example.com',
    city: 'المعادي',
    governorate: 'القاهرة'
  }
};

describe('analyticsController.getCancellationAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('summarizes cancellation reasons for regular and guest orders without duplicate records', async () => {
    const cancellationHistory = {
      id: 'history-1',
      oldStatus: 'CONFIRMED',
      reason: 'العميل رفض الاستلام',
      changedBy: 'user-1',
      userName: 'Nada',
      createdAt: new Date('2026-05-02T10:00:00.000Z'),
      order: baseRegularOrder,
      guestOrder: null
    };

    const guestOrder = {
      id: 'guest-1',
      orderNumber: 'GUEST-1',
      total: '100.00',
      finalTotal: '120.00',
      paymentMethod: 'COD',
      notes: 'إلغاء تلقائي: تجاوز حد محاولات الاتصال',
      guestName: 'عميل ضيف',
      guestPhone: '01111111111',
      guestEmail: '',
      shippingAddress: JSON.stringify({
        governorate: 'الجيزة',
        city: 'الهرم'
      }),
      createdAt: new Date('2026-05-02T07:00:00.000Z'),
      updatedAt: new Date('2026-05-03T08:00:00.000Z'),
      OrderStatusHistory: []
    };

    const prisma = {
      orderStatusHistory: {
        findMany: jest.fn().mockResolvedValue([cancellationHistory])
      },
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            ...baseRegularOrder,
            statusHistory: [
              {
                id: 'history-1',
                oldStatus: 'CONFIRMED',
                reason: 'العميل رفض الاستلام',
                changedBy: 'user-1',
                userName: 'Nada',
                createdAt: new Date('2026-05-02T10:00:00.000Z')
              }
            ]
          }
        ])
      },
      guestOrder: {
        findMany: jest.fn().mockResolvedValue([guestOrder])
      }
    };
    getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await getCancellationAnalytics(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-03' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.summary).toEqual(
      expect.objectContaining({
        totalCancelledOrders: 2,
        regularOrders: 1,
        guestOrders: 1,
        totalLostRevenue: 370.5,
        withReason: 2
      })
    );
    expect(res.payload.data.reasonBreakdown.map((row) => row.reason)).toEqual(
      expect.arrayContaining([
        'العميل رفض الاستلام',
        'إلغاء تلقائي: تجاوز حد محاولات الاتصال'
      ])
    );
    expect(res.payload.data.categoryBreakdown.map((row) => row.category)).toEqual(
      expect.arrayContaining(['طلب العميل', 'تعذر التواصل'])
    );
    expect(res.payload.data.orders.map((order) => order.reviewUrl)).toEqual(
      expect.arrayContaining([
        '/orders/workspace?order=order-1',
        '/orders/workspace?order=guest-1'
      ])
    );
    expect(res.payload.data.orders.find((order) => order.id === 'order-1').customerName).toBe('أحمد علي');
    expect(prisma.orderStatusHistory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { order: { is: { companyId: 'company-1' } } },
            { guestOrder: { is: { companyId: 'company-1' } } }
          ]
        })
      })
    );
    expect(
      prisma.orderStatusHistory.findMany.mock.calls[0][0].select.order.select.customer.select
    ).toEqual({
      firstName: true,
      lastName: true,
      phone: true,
      email: true
    });
  });

  test('rejects requests without a company scope', async () => {
    const res = createResponse();

    await getCancellationAnalytics({ user: { id: 'user-1' }, query: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, message: 'غير مصرح' });
    expect(getSharedPrismaClient).not.toHaveBeenCalled();
  });
});
