const normalizeStatus = (raw) => String(raw || '').trim().toUpperCase();

const AUTO_MARKERS = ['SYSTEM_AUTO', 'SYSTEM', 'AUTO', 'CRON'];

const isAutoChange = (entry) => {
  const who = String(entry.changedBy || entry.userName || '');
  return AUTO_MARKERS.some((marker) => who.toUpperCase().includes(marker));
};

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
    status: normalizeStatus(h.status),
    oldStatus: h.oldStatus ? normalizeStatus(h.oldStatus) : null,
    changedBy: h.changedBy || null,
    userName: h.userName || null,
    reason: h.reason || null,
    createdAt: h.createdAt,
    auto: isAutoChange(h),
    orderTotal: Number(order.total ?? 0),
    orderStatus: order.status
  }));

jest.mock('../../../services/orderMovementCore', () => ({
  fetchOrderMovementData: jest.fn(),
  buildTransitions: jest.fn((order, opts) => buildTransitions(order, opts)),
  normalizeDateRange: jest.fn(({ startDate, endDate } = {}) => ({
    start: startDate ? new Date(startDate) : null,
    end: endDate ? new Date(endDate) : null
  })),
  normalizeStatus: jest.fn((s) => normalizeStatus(s)),
  isAutoChange: jest.fn((e) => isAutoChange(e)),
  calcPercentile: jest.fn(),
  calcMean: jest.fn((arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)),
  hoursBetween: jest.fn(),
  TERMINAL_STATUSES: new Set([]),
  SUCCESS_STATUSES: new Set([]),
  FAILURE_STATUSES: new Set([]),
  getSharedPrismaClient: jest.fn()
}));

const core = require('../../../services/orderMovementCore');
const sankeyController = require('../../../controller/orderMovement/sankeyController');

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

const orderOne = {
  id: 'order-1',
  orderNumber: 'ORD-1',
  status: 'DELIVERED',
  total: '250.50',
  createdAt: new Date('2026-05-01T08:00:00.000Z'),
  statusHistory: [
    {
      id: 'h-1',
      oldStatus: null,
      status: 'PENDING',
      changedBy: 'SYSTEM_AUTO',
      userName: null,
      createdAt: new Date('2026-05-01T08:00:00.000Z')
    },
    {
      id: 'h-2',
      oldStatus: 'PENDING',
      status: 'CONFIRMED',
      changedBy: 'user-1',
      userName: 'Nada',
      createdAt: new Date('2026-05-01T10:00:00.000Z')
    },
    {
      id: 'h-3',
      oldStatus: 'CONFIRMED',
      status: 'DELIVERED',
      changedBy: 'SYSTEM_AUTO',
      userName: null,
      createdAt: new Date('2026-05-02T10:00:00.000Z')
    }
  ]
};

const orderTwo = {
  id: 'order-2',
  orderNumber: 'ORD-2',
  status: 'CANCELLED',
  total: '100.00',
  createdAt: new Date('2026-05-01T09:00:00.000Z'),
  statusHistory: [
    {
      id: 'h-4',
      oldStatus: null,
      status: 'PENDING',
      changedBy: 'SYSTEM_AUTO',
      userName: null,
      createdAt: new Date('2026-05-01T09:00:00.000Z')
    },
    {
      id: 'h-5',
      oldStatus: 'PENDING',
      status: 'CANCELLED',
      changedBy: 'user-2',
      userName: 'Omar',
      createdAt: new Date('2026-05-02T11:00:00.000Z')
    }
  ]
};

describe('orderMovement sankeyController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    core.normalizeDateRange.mockImplementation(({ startDate, endDate } = {}) => ({
      start: startDate ? new Date(startDate) : null,
      end: endDate ? new Date(endDate) : null
    }));
  });

  test('builds sankey graph with START links, status links, revenue and mode split', async () => {
    core.fetchOrderMovementData.mockResolvedValue({ orders: [orderOne, orderTwo] });

    const res = createResponse();
    await sankeyController(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-31' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(core.fetchOrderMovementData).toHaveBeenCalledWith({
      companyId: 'company-1',
      startDate: '2026-05-01',
      endDate: '2026-05-31'
    });

    const data = res.payload.data;
    expect(data.totalTransitions).toBe(5);
    expect(data.totalOrders).toBe(2);
    expect(data.modes).toEqual({ manual: 2, auto: 3 });

    expect(data.nodes).toEqual([
      { id: 'START', name: 'بداية' },
      { id: 'PENDING', name: 'PENDING' },
      { id: 'CONFIRMED', name: 'CONFIRMED' },
      { id: 'CANCELLED', name: 'CANCELLED' },
      { id: 'DELIVERED', name: 'DELIVERED' }
    ]);

    expect(data.links).toEqual([
      { source: 0, target: 1, value: 2, manual: 0, auto: 2, revenue: 350.5 },
      { source: 1, target: 2, value: 1, manual: 1, auto: 0, revenue: 250.5 },
      { source: 1, target: 3, value: 1, manual: 1, auto: 0, revenue: 100 },
      { source: 2, target: 4, value: 1, manual: 0, auto: 1, revenue: 250.5 }
    ]);

    expect(data.topInflows).toEqual([
      { status: 'PENDING', count: 2 },
      { status: 'CONFIRMED', count: 1 },
      { status: 'DELIVERED', count: 1 },
      { status: 'CANCELLED', count: 1 }
    ]);
    expect(data.topOutflows).toEqual([
      { status: 'PENDING', count: 2 },
      { status: 'CONFIRMED', count: 1 }
    ]);
  });

  test('returns empty graph when no orders exist', async () => {
    core.fetchOrderMovementData.mockResolvedValue({ orders: [] });

    const res = createResponse();
    await sankeyController(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-31' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual({
      totalTransitions: 0,
      totalOrders: 0,
      modes: { manual: 0, auto: 0 },
      nodes: [{ id: 'START', name: 'بداية' }],
      links: [],
      topInflows: [],
      topOutflows: []
    });
  });

  test('rejects requests without a company scope', async () => {
    const res = createResponse();

    await sankeyController({ user: { id: 'user-1' }, query: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, message: 'غير مصرح' });
    expect(core.fetchOrderMovementData).not.toHaveBeenCalled();
  });

  test('filters transitions by manual mode', async () => {
    core.fetchOrderMovementData.mockResolvedValue({ orders: [orderOne, orderTwo] });

    const res = createResponse();
    await sankeyController(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-31', mode: 'manual' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    const data = res.payload.data;
    expect(data.totalTransitions).toBe(2);
    expect(data.totalOrders).toBe(2);
    expect(data.modes).toEqual({ manual: 2, auto: 0 });
    expect(data.nodes).toEqual([
      { id: 'START', name: 'بداية' },
      { id: 'PENDING', name: 'PENDING' },
      { id: 'CANCELLED', name: 'CANCELLED' },
      { id: 'CONFIRMED', name: 'CONFIRMED' }
    ]);
    expect(data.links).toEqual([
      { source: 1, target: 2, value: 1, manual: 1, auto: 0, revenue: 100 },
      { source: 1, target: 3, value: 1, manual: 1, auto: 0, revenue: 250.5 }
    ]);
  });

  test('filters transitions by auto mode', async () => {
    core.fetchOrderMovementData.mockResolvedValue({ orders: [orderOne, orderTwo] });

    const res = createResponse();
    await sankeyController(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-31', mode: 'auto' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    const data = res.payload.data;
    expect(data.totalTransitions).toBe(3);
    expect(data.totalOrders).toBe(2);
    expect(data.modes).toEqual({ manual: 0, auto: 3 });
    expect(data.nodes).toEqual([
      { id: 'START', name: 'بداية' },
      { id: 'CONFIRMED', name: 'CONFIRMED' },
      { id: 'DELIVERED', name: 'DELIVERED' },
      { id: 'PENDING', name: 'PENDING' }
    ]);
    expect(data.links).toEqual([
      { source: 0, target: 3, value: 2, manual: 0, auto: 2, revenue: 350.5 },
      { source: 1, target: 2, value: 1, manual: 0, auto: 1, revenue: 250.5 }
    ]);
  });

  test('skips orders with no in-range transitions', async () => {
    const outOfRange = {
      ...orderTwo,
      id: 'order-3',
      orderNumber: 'ORD-3',
      statusHistory: [
        {
          id: 'h-6',
          oldStatus: null,
          status: 'PENDING',
          changedBy: 'SYSTEM_AUTO',
          userName: null,
          createdAt: new Date('2026-04-01T09:00:00.000Z')
        }
      ]
    };
    core.fetchOrderMovementData.mockResolvedValue({ orders: [outOfRange] });

    const res = createResponse();
    await sankeyController(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-31' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.totalOrders).toBe(0);
    expect(res.payload.data.totalTransitions).toBe(0);
    expect(res.payload.data.links).toEqual([]);
  });
});
