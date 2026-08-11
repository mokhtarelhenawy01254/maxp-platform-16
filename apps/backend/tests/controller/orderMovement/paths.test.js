jest.mock('../../../services/orderMovementCore', () => ({
  fetchOrderMovementData: jest.fn(),
  buildTransitions: jest.fn(),
  normalizeDateRange: jest.fn(({ startDate, endDate } = {}) => ({
    start: startDate ? new Date(startDate) : null,
    end: endDate ? new Date(endDate) : null
  })),
  normalizeStatus: jest.fn((s) => String(s || '').trim().toUpperCase()),
  calcPercentile: jest.fn((arr, pct) => {
    if (!arr.length) return 0;
    const index = Math.min(arr.length - 1, Math.max(0, Math.ceil((pct / 100) * arr.length) - 1));
    return arr[index];
  }),
  calcMean: jest.fn((arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)),
  hoursBetween: jest.fn(),
  TERMINAL_STATUSES: new Set(['DELIVERED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'EXCHANGED', 'LOST', 'DUPLICATE_ORDER', 'TRASH', 'SHORTAGE_FAILED', 'NOT_SHIPPED', 'REFUNDED_PARTIALLY', 'PENDING_CANCELLATION']),
  SUCCESS_STATUSES: new Set(['DELIVERED', 'PARTIALLY_DELIVERED']),
  FAILURE_STATUSES: new Set(['CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'LOST', 'SHORTAGE_FAILED', 'TRASH', 'DUPLICATE_ORDER', 'NOT_SHIPPED']),
  getSharedPrismaClient: jest.fn()
}));

const core = require('../../../services/orderMovementCore');
const pathsController = require('../../../controller/orderMovement/pathsController');

const AUTO_MARKERS = ['SYSTEM_AUTO', 'SYSTEM', 'AUTO', 'CRON'];

const buildTransitions = (order, { start, end } = {}) => (order.statusHistory || [])
  .filter((h) => {
    const t = new Date(h.createdAt).getTime();
    if (start && t < start.getTime()) return false;
    if (end && t > end.getTime()) return false;
    return true;
  })
  .map((h) => ({
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: core.normalizeStatus(h.status),
    oldStatus: h.oldStatus ? core.normalizeStatus(h.oldStatus) : null,
    changedBy: h.changedBy || null,
    userName: h.userName || null,
    reason: h.reason || null,
    createdAt: h.createdAt,
    auto: AUTO_MARKERS.some((marker) => String(h.changedBy || h.userName || '').toUpperCase().includes(marker)),
    orderTotal: Number(order.total ?? 0),
    orderStatus: order.status
  }));

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

const historyEntry = (status, createdAtIso, changedBy = 'user-1', oldStatus = null) => ({
  status,
  oldStatus,
  changedBy,
  userName: changedBy,
  createdAt: new Date(createdAtIso)
});

const orderOne = {
  id: 'order-1',
  orderNumber: 'ORD-1',
  status: 'DELIVERED',
  total: '500',
  createdAt: new Date('2026-05-01T08:00:00.000Z'),
  statusHistory: [
    historyEntry('CONFIRMED', '2026-05-01T08:00:00.000Z'),
    historyEntry('SHIPPED', '2026-05-02T08:00:00.000Z', 'user-1', 'CONFIRMED'),
    historyEntry('DELIVERED', '2026-05-04T08:00:00.000Z', 'SYSTEM_AUTO', 'SHIPPED')
  ]
};

const orderTwo = {
  id: 'order-2',
  orderNumber: 'ORD-2',
  status: 'CANCELLED',
  total: '300',
  createdAt: new Date('2026-05-01T09:00:00.000Z'),
  statusHistory: [
    historyEntry('CONFIRMED', '2026-05-01T09:00:00.000Z'),
    historyEntry('CANCELLED', '2026-05-03T09:00:00.000Z', 'user-2', 'CONFIRMED')
  ]
};

const orderThree = {
  id: 'order-3',
  orderNumber: 'ORD-3',
  status: 'SHIPPED',
  total: '200',
  createdAt: new Date('2026-05-01T10:00:00.000Z'),
  statusHistory: [
    historyEntry('CONFIRMED', '2026-05-01T10:00:00.000Z'),
    historyEntry('SHIPPED', '2026-05-02T10:00:00.000Z', 'user-1', 'CONFIRMED')
  ]
};

describe('orderMovement pathsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    core.buildTransitions.mockImplementation((order, opts) => buildTransitions(order, opts));
    core.hoursBetween.mockImplementation((a, b) => {
      const ms = new Date(b).getTime() - new Date(a).getTime();
      return Math.max(0, ms) / (1000 * 60 * 60);
    });
  });

  test('builds top paths, stats and aggregates on the happy path', async () => {
    core.fetchOrderMovementData.mockResolvedValue({ orders: [orderOne, orderTwo, orderThree], start: null, end: null });

    const res = createResponse();
    await pathsController(
      { user: { id: 'user-1', companyId: 'company-1' }, query: { startDate: '2026-05-01', endDate: '2026-05-31' } },
      res
    );

    expect(res.statusCode).toBe(200);
    const data = res.payload.data;
    expect(data.totalOrders).toBe(3);
    expect(data.uniquePaths).toBe(3);
    expect(data.stats).toEqual({
      maxPathLength: 3,
      avgPathLength: 2.33,
      successPathCount: 1,
      failedPathCount: 1,
      pendingPathCount: 1
    });

    const delivered = data.topPaths.find((p) => p.path === 'CONFIRMED→SHIPPED→DELIVERED');
    expect(delivered).toMatchObject({
      orderCount: 1,
      percent: 33.3,
      terminalStatus: 'DELIVERED',
      manualTransitions: 2,
      autoTransitions: 1,
      totalRevenue: 500,
      avgOrderValue: 500
    });
    expect(delivered.avgHours).toBeGreaterThan(0);
    expect(delivered.medianHours).toBeGreaterThan(0);

    expect(data.topPaths[0].orderCount).toBe(1);
  });

  test('returns empty aggregates when no orders have transitions', async () => {
    core.fetchOrderMovementData.mockResolvedValue({ orders: [], start: null, end: null });

    const res = createResponse();
    await pathsController(
      { user: { id: 'user-1', companyId: 'company-1' }, query: {} },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toEqual({
      totalOrders: 0,
      uniquePaths: 0,
      stats: { maxPathLength: 0, avgPathLength: 0, successPathCount: 0, failedPathCount: 0, pendingPathCount: 0 },
      topPaths: []
    });
  });

  test('rejects requests without a company scope', async () => {
    const res = createResponse();
    await pathsController({ user: { id: 'user-1' }, query: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, message: 'غير مصرح' });
    expect(core.fetchOrderMovementData).not.toHaveBeenCalled();
  });

  test('filters transitions by auto mode and drops orders without auto transitions', async () => {
    core.fetchOrderMovementData.mockResolvedValue({ orders: [orderOne, orderThree], start: null, end: null });

    const res = createResponse();
    await pathsController(
      { user: { id: 'user-1', companyId: 'company-1' }, query: { mode: 'auto' } },
      res
    );

    const data = res.payload.data;
    expect(data.totalOrders).toBe(1);
    expect(data.topPaths.length).toBe(1);
    expect(data.topPaths[0].path).toBe('DELIVERED');
    expect(data.topPaths[0].autoTransitions).toBe(1);
  });
});
