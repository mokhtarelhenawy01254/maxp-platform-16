jest.mock('../../../services/orderMovementCore', () => ({
  fetchOrderMovementData: jest.fn(),
  buildTransitions: jest.fn(),
  normalizeDateRange: jest.fn(() => ({ start: null, end: null })),
  normalizeStatus: jest.fn((s) => String(s || '').trim().toUpperCase()),
  calcPercentile: jest.fn(),
  calcMean: jest.fn(),
  hoursBetween: jest.fn(),
  isAutoChange: jest.fn((entry) =>
    ['SYSTEM_AUTO', 'SYSTEM', 'AUTO', 'CRON'].some((marker) =>
      String(entry.changedBy || entry.userName || '').toUpperCase().includes(marker)
    )
  ),
  TERMINAL_STATUSES: new Set([
    'DELIVERED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED',
    'PARTIALLY_REFUNDED', 'EXCHANGED', 'LOST', 'DUPLICATE_ORDER', 'TRASH',
    'SHORTAGE_FAILED', 'NOT_SHIPPED', 'REFUNDED_PARTIALLY', 'PENDING_CANCELLATION'
  ]),
  SUCCESS_STATUSES: new Set(['DELIVERED', 'PARTIALLY_DELIVERED']),
  FAILURE_STATUSES: new Set([
    'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED',
    'LOST', 'SHORTAGE_FAILED', 'TRASH', 'DUPLICATE_ORDER', 'NOT_SHIPPED'
  ]),
  getSharedPrismaClient: jest.fn()
}));

const core = require('../../../services/orderMovementCore');
const router = require('../../../controller/orderMovement/outcomesController');

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

const callRouter = async (req, res) => {
  router({ method: 'GET', url: '/', ...req }, res, () => {});
  await new Promise((resolve) => setImmediate(resolve));
};

const buildOrder = (id, orderNumber, status, total, changedBy, userName, reason) => ({
  id,
  orderNumber,
  status,
  total: String(total),
  statusHistory: [
    {
      status: 'CONFIRMED',
      oldStatus: 'PENDING',
      changedBy,
      userName,
      reason: null,
      createdAt: new Date('2026-05-01T08:00:00.000Z')
    },
    {
      status,
      oldStatus: 'CONFIRMED',
      changedBy,
      userName,
      reason,
      createdAt: new Date('2026-05-02T10:00:00.000Z')
    }
  ]
});

const happyOrders = [
  buildOrder('order-1', 'ORD-1', 'DELIVERED', 500, 'user-1', 'Ahmed', 'تم التسليم'),
  buildOrder('order-2', 'ORD-2', 'CANCELLED', 300, 'user-2', 'Sara', 'العميل رفض الاستلام'),
  buildOrder('order-3', 'ORD-3', 'RETURNED', 200, 'SYSTEM_AUTO', null, 'طلب غير مطابق'),
  buildOrder('order-4', 'ORD-4', 'CANCELLED', 150, 'user-3', 'Omar', '  العميل    رفض  الاستلام  '),
  buildOrder('order-5', 'ORD-5', 'DELIVERED', 400, 'SYSTEM_AUTO', null, null),
  buildOrder('order-6', 'ORD-6', 'PENDING', 100, 'user-4', 'Mona', null)
];

describe('orderMovement outcomesController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('computes terminal outcomes summary, reasons and mode split', async () => {
    core.fetchOrderMovementData.mockResolvedValue({ orders: happyOrders, start: null, end: null });

    const res = createResponse();
    await callRouter(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-31' },
        method: 'GET',
        url: '/'
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.summary).toEqual({
      totalOrders: 6,
      delivered: 2,
      failed: 3,
      pending: 1,
      successRate: 33.33,
      deliveredRevenue: 900,
      lostRevenue: 650,
      failedRevenue: 650
    });
    expect(core.fetchOrderMovementData).toHaveBeenCalledWith({
      companyId: 'company-1',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      historyFilter: 'full'
    });

    const outcomes = res.payload.data.outcomes;
    expect(outcomes).toHaveLength(4);
    expect(outcomes.find((row) => row.status === 'DELIVERED')).toEqual({
      status: 'DELIVERED',
      count: 2,
      percent: 33.33,
      revenue: 900,
      avgOrderValue: 450,
      isTerminal: true
    });
    expect(outcomes.find((row) => row.status === 'CANCELLED')).toEqual({
      status: 'CANCELLED',
      count: 2,
      percent: 33.33,
      revenue: 450,
      avgOrderValue: 225,
      isTerminal: true
    });
    expect(outcomes.find((row) => row.status === 'RETURNED')).toEqual({
      status: 'RETURNED',
      count: 1,
      percent: 16.67,
      revenue: 200,
      avgOrderValue: 200,
      isTerminal: true
    });
    expect(outcomes.find((row) => row.status === 'PENDING')).toEqual({
      status: 'PENDING',
      count: 1,
      percent: 16.67,
      revenue: 100,
      avgOrderValue: 100,
      isTerminal: false
    });

    const reasons = res.payload.data.reasons;
    expect(reasons).toHaveLength(2);
    expect(reasons.find((row) => row.reason === 'العميل رفض الاستلام')).toEqual({
      reason: 'العميل رفض الاستلام',
      count: 2,
      revenue: 450,
      status: 'CANCELLED'
    });
    expect(reasons.find((row) => row.reason === 'طلب غير مطابق')).toEqual({
      reason: 'طلب غير مطابق',
      count: 1,
      revenue: 200,
      status: 'RETURNED'
    });

    expect(res.payload.data.modeSplit).toEqual({ manual: 4, auto: 2 });
  });

  test('returns empty aggregates when no orders match', async () => {
    core.fetchOrderMovementData.mockResolvedValue({ orders: [], start: null, end: null });

    const res = createResponse();
    await callRouter({ user: { id: 'user-1', companyId: 'company-1' }, query: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.summary).toEqual({
      totalOrders: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      successRate: 0,
      deliveredRevenue: 0,
      lostRevenue: 0,
      failedRevenue: 0
    });
    expect(res.payload.data.outcomes).toEqual([]);
    expect(res.payload.data.reasons).toEqual([]);
    expect(res.payload.data.modeSplit).toEqual({ manual: 0, auto: 0 });
  });

  test('rejects requests without a company scope', async () => {
    const res = createResponse();
    await callRouter({ user: { id: 'user-1' }, query: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, message: 'غير مصرح' });
    expect(core.fetchOrderMovementData).not.toHaveBeenCalled();
  });

  test('filters orders by manual last movement', async () => {
    core.fetchOrderMovementData.mockResolvedValue({ orders: happyOrders, start: null, end: null });

    const res = createResponse();
    await callRouter(
      { user: { id: 'user-1', companyId: 'company-1' }, query: { mode: 'manual' } },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.summary).toEqual({
      totalOrders: 4,
      delivered: 1,
      failed: 2,
      pending: 1,
      successRate: 25,
      deliveredRevenue: 500,
      lostRevenue: 450,
      failedRevenue: 450
    });
    expect(res.payload.data.modeSplit).toEqual({ manual: 4, auto: 0 });
  });

  test('filters orders by automatic last movement', async () => {
    core.fetchOrderMovementData.mockResolvedValue({ orders: happyOrders, start: null, end: null });

    const res = createResponse();
    await callRouter(
      { user: { id: 'user-1', companyId: 'company-1' }, query: { mode: 'auto' } },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.summary).toEqual({
      totalOrders: 2,
      delivered: 1,
      failed: 1,
      pending: 0,
      successRate: 50,
      deliveredRevenue: 400,
      lostRevenue: 200,
      failedRevenue: 200
    });
    expect(res.payload.data.modeSplit).toEqual({ manual: 0, auto: 2 });
  });

  test('skips failure orders with empty reasons', async () => {
    core.fetchOrderMovementData.mockResolvedValue({
      orders: [
        buildOrder('order-7', 'ORD-7', 'CANCELLED', 100, 'user-5', 'Ali', '   '),
        buildOrder('order-8', 'ORD-8', 'CANCELLED', 250, 'user-6', 'Huda', 'طلب مكرر')
      ],
      start: null,
      end: null
    });

    const res = createResponse();
    await callRouter({ user: { id: 'user-1', companyId: 'company-1' }, query: {} }, res);

    expect(res.payload.data.reasons).toHaveLength(1);
    expect(res.payload.data.reasons[0]).toEqual({
      reason: 'طلب مكرر',
      count: 1,
      revenue: 250,
      status: 'CANCELLED'
    });
  });
});
