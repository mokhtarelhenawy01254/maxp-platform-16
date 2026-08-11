const AUTO_MARKERS = ['SYSTEM_AUTO', 'SYSTEM', 'AUTO', 'CRON'];

jest.mock('../../../services/orderMovementCore', () => ({
  fetchOrderMovementData: jest.fn(),
  buildTransitions: jest.fn((order, { filterRange = true, start, end } = {}) => {
    const rows = order.statusHistory || [];
    return rows
      .filter((h) => {
        if (!filterRange) return true;
        const t = new Date(h.createdAt).getTime();
        if (start && t < start.getTime()) return false;
        if (end && t > end.getTime()) return false;
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
        auto: (() => {
          const who = String(h.changedBy || h.userName || '');
          const up = who.toUpperCase();
          return AUTO_MARKERS.some((m) => up.includes(m));
        })(),
        orderTotal: Number(order.total ?? 0),
        orderStatus: order.status,
        customerName: order.customerName || null,
        governorate: order.governorate || null,
        paymentMethod: order.paymentMethod || null,
        sourceType: order.sourceType || null
      }));
  }),
  normalizeDateRange: jest.fn(({ startDate, endDate }) => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    return { start, end };
  }),
  normalizeStatus: jest.fn((s) => String(s || '').trim().toUpperCase()),
  calcPercentile: jest.fn(),
  calcMean: jest.fn((a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)),
  hoursBetween: jest.fn(),
  TERMINAL_STATUSES: new Set(['DELIVERED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'EXCHANGED', 'LOST', 'DUPLICATE_ORDER', 'TRASH', 'SHORTAGE_FAILED', 'NOT_SHIPPED', 'REFUNDED_PARTIALLY', 'PENDING_CANCELLATION']),
  SUCCESS_STATUSES: new Set(['DELIVERED', 'PARTIALLY_DELIVERED']),
  FAILURE_STATUSES: new Set(['CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'LOST', 'SHORTAGE_FAILED', 'TRASH', 'DUPLICATE_ORDER', 'NOT_SHIPPED']),
  getSharedPrismaClient: jest.fn()
}));

const { fetchOrderMovementData, getSharedPrismaClient } = require('../../../services/orderMovementCore');
const statusMatrixController = require('../../../controller/orderMovement/statusMatrixController');

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

const orderA = {
  id: 'o1',
  orderNumber: 'ORD-1',
  status: 'DELIVERED',
  total: '500',
  statusHistory: [
    { status: 'CONFIRMED', oldStatus: 'PENDING', changedBy: 'user-1', userName: 'Ahmed', createdAt: new Date('2026-05-01T08:00:00.000Z') },
    { status: 'READY', oldStatus: 'PREPARING', changedBy: 'user-1', userName: 'Ahmed', createdAt: new Date('2026-05-02T09:00:00.000Z') },
    { status: 'DELIVERED', oldStatus: 'PACKAGED', changedBy: 'SYSTEM_AUTO', userName: 'SYSTEM', createdAt: new Date('2026-05-03T10:00:00.000Z') }
  ]
};

const orderB = {
  id: 'o2',
  orderNumber: 'ORD-2',
  status: 'CANCELLED',
  total: '250',
  statusHistory: [
    { status: 'CONFIRMED', oldStatus: 'PENDING', changedBy: 'user-2', userName: 'Sara', createdAt: new Date('2026-05-01T09:00:00.000Z') },
    { status: 'CANCELLED', oldStatus: 'DELIVERED', changedBy: 'user-2', userName: 'Sara', createdAt: new Date('2026-05-04T11:00:00.000Z') }
  ]
};

const orderC = {
  id: 'o3',
  orderNumber: 'ORD-3',
  status: 'DELIVERED',
  total: '100',
  statusHistory: [
    { status: 'CONFIRMED', oldStatus: null, changedBy: 'user-3', userName: 'Omar', createdAt: new Date('2026-05-01T10:00:00.000Z') },
    { status: 'UNKNOWN_STUFF', oldStatus: 'CONFIRMED', changedBy: 'user-3', userName: 'Omar', createdAt: new Date('2026-05-02T10:00:00.000Z') }
  ]
};

const baseQuery = { startDate: '2026-05-01', endDate: '2026-05-05' };

process.on('unhandledRejection', (reason) => {
  console.log('UNHANDLED_REJECTION:', reason);
});

const invoke = async (req, res) => {
  await statusMatrixController({ method: 'GET', url: '/', ...req }, res, () => {});
};

describe('statusMatrixController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSharedPrismaClient.mockReturnValue({
      orderStatusConfig: {
        findMany: jest.fn().mockResolvedValue([])
      }
    });
  });

  test('aggregates transitions into a classified matrix on the happy path', async () => {
    fetchOrderMovementData.mockResolvedValue({ orders: [orderA, orderB, orderC], start: new Date('2026-05-01'), end: new Date('2026-05-05') });

    const res = createResponse();
    await invoke({ user: { id: 'u1', companyId: 'company-1' }, query: baseQuery }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);

    const data = res.payload.data;
    expect(data.totalTransitions).toBe(7);
    expect(data.totalOrders).toBe(3);
    expect(data.forwardCount).toBe(1);
    expect(data.backwardCount).toBe(1);
    expect(data.skipCount).toBe(3);
    expect(data.startCount).toBe(1);
    expect(data.sameCount).toBe(0);
    expect(data.invalidCount).toBe(0);
    expect(data.otherCount).toBe(1);
    expect(data.modes).toEqual({ manual: 6, auto: 1 });

    const pendingToConfirmed = data.rows.find((r) => r.fromStatus === 'PENDING' && r.toStatus === 'CONFIRMED');
    expect(pendingToConfirmed).toEqual({
      fromStatus: 'PENDING',
      toStatus: 'CONFIRMED',
      count: 2,
      revenue: 750,
      manualCount: 2,
      autoCount: 0,
      kind: 'skip'
    });

    const startRow = data.rows.find((r) => r.fromStatus === '__start__' && r.toStatus === 'CONFIRMED');
    expect(startRow.kind).toBe('start');

    const otherRow = data.rows.find((r) => r.toStatus === 'UNKNOWN_STUFF');
    expect(otherRow.kind).toBe('other');

    expect(data.rows[0].fromStatus).toBe('PENDING');
    expect(data.rows[0].toStatus).toBe('CONFIRMED');
    expect(data.rows[0].count).toBe(2);

    expect(data.statuses).toEqual(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PACKAGED', 'DELIVERED', 'CANCELLED', 'UNKNOWN_STUFF']);
    expect(getSharedPrismaClient().orderStatusConfig.findMany).toHaveBeenCalledWith({
      where: { companyId: 'company-1', isActive: true },
      select: { code: true, allowedNextStatuses: true }
    });
  });

  test('returns empty shape when there is no data', async () => {
    fetchOrderMovementData.mockResolvedValue({ orders: [], start: null, end: null });

    const res = createResponse();
    await invoke({ user: { id: 'u1', companyId: 'company-1' }, query: baseQuery }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toEqual({
      totalTransitions: 0,
      totalOrders: 0,
      forwardCount: 0,
      backwardCount: 0,
      skipCount: 0,
      invalidCount: 0,
      startCount: 0,
      sameCount: 0,
      otherCount: 0,
      rows: [],
      statuses: [],
      modes: { manual: 0, auto: 0 }
    });
    expect(getSharedPrismaClient().orderStatusConfig.findMany).not.toHaveBeenCalled();
  });

  test('rejects requests without a company scope', async () => {
    const res = createResponse();
    await invoke({ user: { id: 'u1' }, query: baseQuery }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, message: 'غير مصرح' });
    expect(fetchOrderMovementData).not.toHaveBeenCalled();
  });

  test('filters transitions by mode', async () => {
    fetchOrderMovementData.mockResolvedValue({ orders: [orderA, orderB, orderC], start: new Date('2026-05-01'), end: new Date('2026-05-05') });

    const autoRes = createResponse();
    await invoke({ user: { id: 'u1', companyId: 'company-1' }, query: { ...baseQuery, mode: 'auto' } }, autoRes);
    expect(autoRes.payload.data.totalTransitions).toBe(1);
    expect(autoRes.payload.data.totalOrders).toBe(1);
    expect(autoRes.payload.data.skipCount).toBe(1);
    expect(autoRes.payload.data.modes).toEqual({ manual: 0, auto: 1 });
    expect(autoRes.payload.data.rows).toEqual([
      { fromStatus: 'PACKAGED', toStatus: 'DELIVERED', count: 1, revenue: 500, manualCount: 0, autoCount: 1, kind: 'skip' }
    ]);

    const manualRes = createResponse();
    await invoke({ user: { id: 'u1', companyId: 'company-1' }, query: { ...baseQuery, mode: 'manual' } }, manualRes);
    expect(manualRes.payload.data.totalTransitions).toBe(6);
    expect(manualRes.payload.data.modes).toEqual({ manual: 6, auto: 0 });
  });

  test('classifies forward, backward and skip transitions by canonical index', async () => {
    const order = {
      id: 'o4',
      orderNumber: 'ORD-4',
      status: 'CANCELLED',
      total: '300',
      statusHistory: [
        { status: 'READY', oldStatus: 'PREPARING', changedBy: 'user-4', userName: 'Nada', createdAt: new Date('2026-05-01T08:00:00.000Z') },
        { status: 'CANCELLED', oldStatus: 'DELIVERED', changedBy: 'user-4', userName: 'Nada', createdAt: new Date('2026-05-02T08:00:00.000Z') },
        { status: 'PENDING', oldStatus: 'CANCELLED', changedBy: 'user-4', userName: 'Nada', createdAt: new Date('2026-05-03T08:00:00.000Z') },
        { status: 'CONFIRMED', oldStatus: 'PENDING', changedBy: 'user-4', userName: 'Nada', createdAt: new Date('2026-05-04T08:00:00.000Z') }
      ]
    };
    fetchOrderMovementData.mockResolvedValue({ orders: [order], start: new Date('2026-05-01'), end: new Date('2026-05-05') });

    const res = createResponse();
    await invoke({ user: { id: 'u1', companyId: 'company-1' }, query: baseQuery }, res);

    const data = res.payload.data;
    expect(data.rows.find((r) => r.fromStatus === 'PREPARING' && r.toStatus === 'READY').kind).toBe('forward');
    expect(data.rows.find((r) => r.fromStatus === 'DELIVERED' && r.toStatus === 'CANCELLED').kind).toBe('backward');
    expect(data.rows.find((r) => r.fromStatus === 'CANCELLED' && r.toStatus === 'PENDING').kind).toBe('backward');
    expect(data.rows.find((r) => r.fromStatus === 'PENDING' && r.toStatus === 'CONFIRMED').kind).toBe('skip');
  });

  test('flags transitions as invalid when the from-status config disallows the target', async () => {
    const order = {
      id: 'o5',
      orderNumber: 'ORD-5',
      status: 'DELIVERED',
      total: '400',
      statusHistory: [
        { status: 'PREPARING', oldStatus: 'CONFIRMED', changedBy: 'user-5', userName: 'Ali', createdAt: new Date('2026-05-01T08:00:00.000Z') },
        { status: 'DELIVERED', oldStatus: 'CONFIRMED', changedBy: 'user-5', userName: 'Ali', createdAt: new Date('2026-05-02T08:00:00.000Z') },
        { status: 'CANCELLED', oldStatus: 'DELIVERED', changedBy: 'user-5', userName: 'Ali', createdAt: new Date('2026-05-03T08:00:00.000Z') }
      ]
    };
    fetchOrderMovementData.mockResolvedValue({ orders: [order], start: new Date('2026-05-01'), end: new Date('2026-05-05') });

    getSharedPrismaClient.mockReturnValue({
      orderStatusConfig: {
        findMany: jest.fn().mockResolvedValue([
          { code: 'CONFIRMED', allowedNextStatuses: '["PREPARING","PACKAGED"]' },
          { code: 'DELIVERED', allowedNextStatuses: null }
        ])
      }
    });

    const res = createResponse();
    await invoke({ user: { id: 'u1', companyId: 'company-1' }, query: baseQuery }, res);

    const data = res.payload.data;
    const allowed = data.rows.find((r) => r.fromStatus === 'CONFIRMED' && r.toStatus === 'PREPARING');
    const disallowed = data.rows.find((r) => r.fromStatus === 'CONFIRMED' && r.toStatus === 'DELIVERED');
    const noConfig = data.rows.find((r) => r.fromStatus === 'DELIVERED' && r.toStatus === 'CANCELLED');

    expect(allowed.kind).toBe('skip');
    expect(disallowed.kind).toBe('invalid');
    expect(noConfig.kind).toBe('backward');
    expect(data.invalidCount).toBe(1);
  });
});
