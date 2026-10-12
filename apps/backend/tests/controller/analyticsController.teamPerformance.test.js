jest.mock('../../services/analyticsService', () => ({}));

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { getTeamPerformanceAnalytics } = require('../../controller/analyticsController');

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
  lastName: 'Test',
  email,
  role
});

const order = (id, status, total, createdBy = null, confirmedBy = null, createdAt = new Date()) => ({
  id,
  status,
  total,
  createdBy,
  confirmedBy,
  createdAt
});

describe('analyticsController.getTeamPerformanceAnalytics', () => {
  let prismaMock;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          user('user-1', 'Swan', 'swan@example.com', 'OWNER'),
          user('user-2', 'Malak', 'malak@example.com', 'AGENT')
        ])
      },
      order: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);
  });

  test('returns empty safe response when companyId is missing', async () => {
    const req = { user: {}, query: {} };
    const res = createResponse();
    await getTeamPerformanceAnalytics(req, res);
    expect(res.statusCode).toBe(403);
  });

  test('does not apply createdAt filter when no dates provided', async () => {
    const req = createRequest();
    const res = createResponse();
    await getTeamPerformanceAnalytics(req, res);

    const where = prismaMock.order.findMany.mock.calls[0][0].where;
    expect(where.companyId).toBe('company-1');
    expect(where.createdAt).toBeUndefined();
  });

  test('startDate = endDate (اليوم) filters to end-of-day so today orders are included', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrder = order(
      'order-1',
      'DELIVERED',
      '500.00',
      'user-1',
      'user-1',
      new Date()
    );
    prismaMock.order.findMany.mockResolvedValue([todayOrder]);

    const req = createRequest({ startDate: todayStr, endDate: todayStr });
    const res = createResponse();
    await getTeamPerformanceAnalytics(req, res);

    const where = prismaMock.order.findMany.mock.calls[0][0].where;
    expect(where.createdAt).toBeDefined();
    // gte = بداية اليوم (00:00)
    expect(where.createdAt.gte.getHours()).toBe(0);
    // lte = نهاية اليوم (23:59:59.999) — دي كانت المشكلة قبل الإصلاح
    expect(where.createdAt.lte.getHours()).toBe(23);
    expect(where.createdAt.lte.getMinutes()).toBe(59);

    expect(res.payload.success).toBe(true);
    const data = res.payload.data;
    expect(data.totalOrdersProcessed).toBe(1);
    expect(data.totalTeamMembers).toBe(1);
    expect(data.teamMembers[0].userName).toBe('Swan Test');
    expect(data.teamMembers[0].ordersCreated).toBe(1);
    expect(data.teamMembers[0].ordersConfirmed).toBe(1);
    expect(data.teamMembers[0].deliveredOrders).toBe(1);
    expect(data.teamMembers[0].totalRevenue).toBe(500);
  });

  test('aggregates created/confirmed/delivered/cancelled per user', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      order('o1', 'DELIVERED', '100.00', 'user-1', 'user-1'),
      order('o2', 'CANCELLED', '50.00', 'user-1', 'user-2'),
      order('o3', 'PENDING', '30.00', 'user-2', null),
      order('o4', 'PENDING', '20.00', null, null)
    ]);

    const req = createRequest();
    const res = createResponse();
    await getTeamPerformanceAnalytics(req, res);

    const data = res.payload.data;
    expect(data.totalOrdersProcessed).toBe(4);
    const byName = Object.fromEntries(data.teamMembers.map((m) => [m.userName, m]));
    expect(byName['Swan Test'].ordersCreated).toBe(2);
    expect(byName['Swan Test'].ordersConfirmed).toBe(1);
    expect(byName['Swan Test'].deliveredOrders).toBe(1);
    expect(byName['Swan Test'].cancelledOrders).toBe(1);
    expect(byName['Swan Test'].totalRevenue).toBe(100);
    expect(byName['Malak Test'].ordersCreated).toBe(1);
    expect(byName['Malak Test'].ordersConfirmed).toBe(1);
  });

  test('supports period=yesterday and credits confirmation agent on storefront orders', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      order('o-recent', 'PROCESSING', '750.00', null, 'user-2'),
      order('o-shipped', 'SHIPPED', '250.00', 'user-1', 'user-2')
    ]);

    const req = createRequest({ period: 'yesterday' });
    const res = createResponse();
    await getTeamPerformanceAnalytics(req, res);

    const where = prismaMock.order.findMany.mock.calls[0][0].where;
    expect(where.createdAt).toBeDefined();

    expect(res.payload.success).toBe(true);
    const data = res.payload.data;
    expect(data.totalOrdersProcessed).toBe(2);
    expect(data.totalTeamRevenue).toBe(1000);

    const byName = Object.fromEntries(data.teamMembers.map((m) => [m.userName, m]));
    // user-2 confirmed storefront order o-recent -> gets 750 revenue
    expect(byName['Malak Test'].ordersConfirmed).toBe(2);
    expect(byName['Malak Test'].totalRevenue).toBe(750);
    expect(byName['Malak Test'].successRate).toBe(100);

    // user-1 created o-shipped -> gets 250 revenue
    expect(byName['Swan Test'].ordersCreated).toBe(1);
    expect(byName['Swan Test'].totalRevenue).toBe(250);
  });
});
