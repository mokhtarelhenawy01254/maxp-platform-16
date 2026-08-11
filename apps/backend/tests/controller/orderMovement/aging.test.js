jest.mock('../../../services/orderMovementCore', () => ({
  fetchOrderMovementData: jest.fn(),
  buildTransitions: jest.fn(),
  normalizeDateRange: jest.fn(({ startDate, endDate }) => {
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
  }),
  normalizeStatus: jest.fn((s) => String(s || '').trim().toUpperCase()),
  hoursBetween: jest.fn(),
  isAutoChange: jest.fn((entry) =>
    ['SYSTEM_AUTO', 'SYSTEM', 'AUTO', 'CRON'].some((marker) =>
      String(entry.changedBy || entry.userName || '').toUpperCase().includes(marker)
    )
  ),
  buildHistoryRangeWhere: jest.fn(({ start, end }) => {
    const where = { createdAt: {} };
    if (start) where.createdAt.gte = start;
    if (end) where.createdAt.lte = end;
    return where;
  }),
  TERMINAL_STATUSES: new Set([
    'DELIVERED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED',
    'PARTIALLY_REFUNDED', 'EXCHANGED', 'LOST', 'DUPLICATE_ORDER', 'TRASH',
    'SHORTAGE_FAILED', 'NOT_SHIPPED', 'PENDING_CANCELLATION'
  ]),
  getSharedPrismaClient: jest.fn()
}));

const core = require('../../../services/orderMovementCore');
const router = require('../../../controller/orderMovement/agingController');

let prismaMock;
const mockOrders = (orders) => {
  prismaMock.order.findMany.mockResolvedValue(orders);
};

const NOW = new Date('2026-06-30T00:00:00.000Z');

const AUTO_MARKERS = ['SYSTEM_AUTO', 'SYSTEM', 'AUTO', 'CRON'];

const fakeBuildTransitions = (order, options = {}) => {
  const { filterRange = true, start, end } = options;
  return (order.statusHistory || [])
    .filter((h) => {
      if (!filterRange) return true;
      const time = new Date(h.createdAt).getTime();
      if (start && time < start.getTime()) return false;
      if (end && time > end.getTime()) return false;
      return true;
    })
    .map((h) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: String(h.status || '').trim().toUpperCase(),
      oldStatus: h.oldStatus ? String(h.oldStatus).trim().toUpperCase() : null,
      changedBy: h.changedBy || null,
      userName: h.userName || null,
      reason: h.reason || null,
      createdAt: h.createdAt,
      auto: AUTO_MARKERS.some((marker) =>
        String(h.changedBy || h.userName || '').toUpperCase().includes(marker)
      ),
      orderTotal: Number(order.total ?? 0),
      orderStatus: order.status,
      customerName: order.customerName || null,
      governorate: order.governorate || null
    }));
};

const realHoursBetween = (a, b) =>
  Math.max(0, new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60);

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
  await router({ ...req }, res, () => {});
};

const historyEntry = (status, createdAtIso, changedBy, userName, oldStatus = null) => ({
  status,
  oldStatus,
  changedBy,
  userName,
  reason: null,
  createdAt: new Date(createdAtIso)
});

const makeOrder = (id, orderNumber, status, total, history) => ({
  id,
  orderNumber,
  status,
  total: String(total),
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
  updatedAt: new Date('2026-06-29T00:00:00.000Z'),
  customerName: `عميل ${id}`,
  governorate: 'القاهرة',
  statusHistory: history
});

const happyOrders = [
  makeOrder('order-A', 'ORD-A', 'PENDING_PREPARATION', 100, [
    historyEntry('CONFIRMED', '2026-05-15T10:00:00.000Z', 'user-1', 'Nada'),
    historyEntry('PENDING_PREPARATION', '2026-06-29T12:00:00.000Z', 'user-2', 'Omar', 'CONFIRMED')
  ]),
  makeOrder('order-B', 'ORD-B', 'CONFIRMED', 200, [
    historyEntry('CONFIRMED', '2026-05-20T00:00:00.000Z', 'user-1', 'Nada'),
    historyEntry('SCHEDULED', '2026-06-28T00:00:00.000Z', 'user-3', 'Sara', 'CONFIRMED')
  ]),
  makeOrder('order-K', 'ORD-K', 'SCHEDULED', 350, [
    historyEntry('CONFIRMED', '2026-05-06T00:00:00.000Z', 'user-1', 'Nada'),
    historyEntry('SCHEDULED', '2026-06-27T10:00:00.000Z', 'SYSTEM_AUTO', null, 'CONFIRMED')
  ]),
  makeOrder('order-C', 'ORD-C', 'PROCESSING', 300, [
    historyEntry('CONFIRMED', '2026-05-25T00:00:00.000Z', 'user-1', 'Nada'),
    historyEntry('PROCESSING', '2026-06-24T00:00:00.000Z', 'user-4', 'Mona', 'CONFIRMED')
  ]),
  makeOrder('order-D', 'ORD-D', 'READY', 400, [
    historyEntry('CONFIRMED', '2026-05-10T00:00:00.000Z', 'user-1', 'Nada'),
    historyEntry('READY', '2026-06-05T00:00:00.000Z', 'user-5', 'Ali', 'CONFIRMED')
  ]),
  makeOrder('order-E', 'ORD-E', 'ON_HOLD', 500, [
    historyEntry('CONFIRMED', '2026-05-01T00:00:00.000Z', 'user-1', 'Nada'),
    historyEntry('ON_HOLD', '2026-05-03T00:00:00.000Z', 'user-6', 'Huda', 'CONFIRMED')
  ]),
  makeOrder('order-F', 'ORD-F', 'DELIVERED', 600, [
    historyEntry('CONFIRMED', '2026-05-05T00:00:00.000Z', 'user-1', 'Nada'),
    historyEntry('DELIVERED', '2026-05-10T00:00:00.000Z', 'user-7', 'Salma', 'CONFIRMED')
  ]),
  makeOrder('order-G', 'ORD-G', 'PENDING', 250, [
    historyEntry('CONFIRMED', '2026-05-05T00:00:00.000Z', 'user-1', 'Nada'),
    historyEntry('PENDING', '2026-06-29T22:00:00.000Z', 'user-8', 'Yara', 'CONFIRMED')
  ]),
  makeOrder('order-H', 'ORD-H', 'CONFIRMED', 150, [
    historyEntry('CONFIRMED', '2026-04-10T00:00:00.000Z', 'user-1', 'Nada')
  ])
];

const modeOrders = [
  makeOrder('order-L', 'ORD-L', 'PROCESSING', 700, [
    historyEntry('PROCESSING', '2026-05-12T00:00:00.000Z', 'SYSTEM_AUTO', null, 'CONFIRMED')
  ]),
  makeOrder('order-M', 'ORD-M', 'PENDING', 900, [
    historyEntry('CONFIRMED', '2026-05-14T00:00:00.000Z', 'user-9', 'Kareem'),
    historyEntry('PENDING', '2026-06-15T00:00:00.000Z', 'user-9', 'Kareem', 'CONFIRMED')
  ])
];

describe('orderMovement agingController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: NOW, doNotFake: ['setImmediate', 'nextTick'] });
    prismaMock = { order: { findMany: jest.fn() } };
    core.getSharedPrismaClient.mockReturnValue(prismaMock);
    core.buildTransitions.mockImplementation(fakeBuildTransitions);
    core.hoursBetween.mockImplementation(realHoursBetween);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('computes aged orders, buckets, summary and order rows', async () => {
    mockOrders(happyOrders);

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
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          status: { notIn: expect.any(Array) },
          statusHistory: { some: expect.any(Object) }
        }),
        orderBy: { updatedAt: 'desc' },
        take: 50000
      })
    );

    expect(res.payload.data.summary).toEqual({
      totalAged: 5,
      oldestHours: 1392,
      totalRevenue: 1750,
      stuckOver7d: 2
    });

    expect(res.payload.data.buckets).toEqual([
      { key: '<1d', label: 'أقل من يوم', count: 0, revenue: 0 },
      { key: '1-3d', label: '1-3 أيام', count: 2, revenue: 550 },
      { key: '3-7d', label: '3-7 أيام', count: 1, revenue: 300 },
      { key: '7-30d', label: '7-30 يوم', count: 1, revenue: 400 },
      { key: '>30d', label: 'أكثر من 30 يوم', count: 1, revenue: 500 }
    ]);

    expect(res.payload.data.orders.map((o) => o.orderNumber)).toEqual([
      'ORD-E',
      'ORD-D',
      'ORD-C',
      'ORD-K',
      'ORD-B'
    ]);

    expect(res.payload.data.orders[0]).toEqual({
      orderId: 'order-E',
      orderNumber: 'ORD-E',
      status: 'ON_HOLD',
      ageHours: 1392,
      total: 500,
      customerName: 'عميل order-E',
      governorate: 'القاهرة',
      lastTransitionAt: new Date('2026-05-03T00:00:00.000Z'),
      lastTransitionBy: 'Huda',
      lastTransitionAuto: false,
      updatedAt: new Date('2026-06-29T00:00:00.000Z')
    });

    const k = res.payload.data.orders.find((o) => o.orderId === 'order-K');
    expect(k.ageHours).toBe(62);
    expect(k.lastTransitionBy).toBe('SYSTEM_AUTO');
    expect(k.lastTransitionAuto).toBe(true);
  });

  test('returns empty aggregates when no orders match', async () => {
    mockOrders([]);

    const res = createResponse();
    await callRouter({ user: { id: 'user-1', companyId: 'company-1' }, query: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.summary).toEqual({
      totalAged: 0,
      oldestHours: 0,
      totalRevenue: 0,
      stuckOver7d: 0
    });
    expect(res.payload.data.buckets).toEqual([
      { key: '<1d', label: 'أقل من يوم', count: 0, revenue: 0 },
      { key: '1-3d', label: '1-3 أيام', count: 0, revenue: 0 },
      { key: '3-7d', label: '3-7 أيام', count: 0, revenue: 0 },
      { key: '7-30d', label: '7-30 يوم', count: 0, revenue: 0 },
      { key: '>30d', label: 'أكثر من 30 يوم', count: 0, revenue: 0 }
    ]);
    expect(res.payload.data.orders).toEqual([]);
  });

  test('rejects requests without a company scope', async () => {
    const res = createResponse();
    await callRouter({ user: { id: 'user-1' }, query: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, message: 'غير مصرح' });
    expect(core.getSharedPrismaClient).not.toHaveBeenCalled();
  });

  test('filters out orders younger than the minAgeHours threshold', async () => {
    mockOrders(happyOrders);

    const res = createResponse();
    await callRouter(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-31', minAgeHours: '100' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.summary).toEqual({
      totalAged: 3,
      oldestHours: 1392,
      totalRevenue: 1200,
      stuckOver7d: 2
    });
    expect(res.payload.data.orders.map((o) => o.orderNumber)).toEqual([
      'ORD-E',
      'ORD-D',
      'ORD-C'
    ]);
  });

  test('filters stuck orders by automatic last movement', async () => {
    mockOrders(modeOrders);

    const res = createResponse();
    await callRouter(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-31', mode: 'auto' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.summary.totalAged).toBe(1);
    expect(res.payload.data.orders.map((o) => o.orderId)).toEqual(['order-L']);
    expect(res.payload.data.orders[0].lastTransitionBy).toBe('SYSTEM_AUTO');
    expect(res.payload.data.orders[0].lastTransitionAuto).toBe(true);
  });

  test('filters stuck orders by manual last movement', async () => {
    mockOrders(modeOrders);

    const res = createResponse();
    await callRouter(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-31', mode: 'manual' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.summary.totalAged).toBe(1);
    expect(res.payload.data.orders.map((o) => o.orderId)).toEqual(['order-M']);
    expect(res.payload.data.orders[0].ageHours).toBe(360);
    expect(res.payload.data.orders[0].lastTransitionBy).toBe('Kareem');
    expect(res.payload.data.orders[0].lastTransitionAuto).toBe(false);
  });

  test('limits the orders list to 100 while counting all aged orders', async () => {
    const manyOrders = [];
    for (let i = 0; i < 120; i += 1) {
      manyOrders.push(
        makeOrder(`order-${i}`, `ORD-${i}`, 'PENDING', 100, [
          historyEntry('CONFIRMED', '2026-05-10T00:00:00.000Z', 'user-1', 'Nada'),
          historyEntry('PENDING', '2026-06-01T00:00:00.000Z', 'user-1', 'Nada', 'CONFIRMED')
        ])
      );
    }
    mockOrders(manyOrders);

    const res = createResponse();
    await callRouter(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-31' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.summary.totalAged).toBe(120);
    expect(res.payload.data.orders).toHaveLength(100);
  });
});
