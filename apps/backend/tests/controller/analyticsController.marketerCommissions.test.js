jest.mock('../../services/analyticsService', () => ({}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getMarketerCommissionsAnalytics } = require('../../controller/analyticsController');

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

const createRequest = (query = {}) => ({
  user: { companyId: 'company-1', id: 'user-owner' },
  query
});

const user = (id, firstName, email, role = 'AGENT') => ({
  id,
  firstName,
  lastName: 'Marketer',
  email,
  role
});

const orderWithItems = (id, status, total, createdBy, confirmedBy, items = [{ quantity: 1, price: 100 }]) => ({
  id,
  orderNumber: `ORD-${id}`,
  status,
  total,
  createdBy,
  confirmedBy,
  createdAt: new Date(),
  orderItems: items
});

describe('analyticsController.getMarketerCommissionsAnalytics', () => {
  let prismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          user('user-1', 'Heba', 'heba@example.com'),
          user('user-2', 'Malak', 'malak@example.com')
        ])
      },
      order: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);
  });

  test('returns 403 when companyId is missing', async () => {
    const req = { user: {}, query: {} };
    const res = createResponse();
    await getMarketerCommissionsAnalytics(req, res);
    expect(res.statusCode).toBe(403);
  });

  test('calculates correct pieces and commissions at 50 EGP/piece default', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      // Heba: 2 orders, 3 pieces total, 1 delivered (1 piece), 1 shipped (2 pieces)
      orderWithItems('o1', 'DELIVERED', '500.00', 'user-1', 'user-1', [{ quantity: 1, price: 500 }]),
      orderWithItems('o2', 'SHIPPED', '1000.00', 'user-1', 'user-1', [{ quantity: 2, price: 500 }]),
      // Malak: 1 order, 2 pieces total, 1 processing
      orderWithItems('o3', 'PROCESSING', '800.00', 'user-2', null, [{ quantity: 1, price: 400 }, { quantity: 1, price: 400 }])
    ]);

    const req = createRequest();
    const res = createResponse();
    await getMarketerCommissionsAnalytics(req, res);

    expect(res.payload.success).toBe(true);
    const data = res.payload.data;
    expect(data.commissionRatePerPiece).toBe(50);
    expect(data.summary.totalMarketers).toBe(2);
    expect(data.summary.totalOrders).toBe(3);
    expect(data.summary.totalPieces).toBe(5); // 3 + 2
    expect(data.summary.totalEstimatedCommission).toBe(250); // 5 * 50
    expect(data.summary.totalDeliveredPieces).toBe(1);
    expect(data.summary.totalDeliveredCommission).toBe(50); // 1 * 50

    const heba = data.marketers.find(m => m.userId === 'user-1');
    expect(heba.ordersCreated).toBe(2);
    expect(heba.totalPieces).toBe(3);
    expect(heba.totalRevenue).toBe(1500);
    expect(heba.estimatedCommission).toBe(150);
    expect(heba.deliveredOrders).toBe(1);
    expect(heba.deliveredPieces).toBe(1);
    expect(heba.deliveredCommission).toBe(50);
    expect(heba.shippedOrders).toBe(1);
    expect(heba.shippedPieces).toBe(2);

    const malak = data.marketers.find(m => m.userId === 'user-2');
    expect(malak.ordersCreated).toBe(1);
    expect(malak.totalPieces).toBe(2);
    expect(malak.estimatedCommission).toBe(100);
  });

  test('supports custom commissionPerPiece parameter', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      orderWithItems('o1', 'DELIVERED', '500.00', 'user-1', 'user-1', [{ quantity: 2, price: 250 }])
    ]);

    const req = createRequest({ commissionPerPiece: '75' });
    const res = createResponse();
    await getMarketerCommissionsAnalytics(req, res);

    expect(res.payload.success).toBe(true);
    const data = res.payload.data;
    expect(data.commissionRatePerPiece).toBe(75);
    expect(data.summary.totalPieces).toBe(2);
    expect(data.summary.totalEstimatedCommission).toBe(150); // 2 * 75
    expect(data.marketers[0].estimatedCommission).toBe(150);
  });

  test('filters by specific userId when passed', async () => {
    const req = createRequest({ userId: 'user-1' });
    const res = createResponse();
    await getMarketerCommissionsAnalytics(req, res);

    const where = prismaMock.order.findMany.mock.calls[0][0].where;
    expect(where.createdBy).toBe('user-1');
  });
});
