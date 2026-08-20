jest.mock('../../../services/orderMovementCore', () => ({
  normalizeDateRange: jest.fn(({ startDate, endDate } = {}) => ({
    start: startDate ? new Date(startDate) : null,
    end: endDate ? new Date(endDate) : null
  })),
  getSharedPrismaClient: jest.fn()
}));

jest.mock('../../../services/orderMovementSql', () => ({
  fetchTransitionAggregates: jest.fn()
}));

const { getSharedPrismaClient } = require('../../../services/orderMovementCore');
const sql = require('../../../services/orderMovementSql');
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

const EMPTY_TOTALS = { transitions: 0, orders: 0, manualOrders: 0, autoOrders: 0 };

const happyResult = {
  rows: [
    { fromStatus: 'PENDING', toStatus: 'CONFIRMED', count: 2, revenue: 750, autoRevenue: 0, autoCount: 0 },
    { fromStatus: 'PREPARING', toStatus: 'READY', count: 1, revenue: 500, autoRevenue: 0, autoCount: 0 },
    { fromStatus: 'PACKAGED', toStatus: 'DELIVERED', count: 1, revenue: 500, autoRevenue: 500, autoCount: 1 },
    { fromStatus: 'DELIVERED', toStatus: 'CANCELLED', count: 1, revenue: 250, autoRevenue: 0, autoCount: 0 },
    { fromStatus: '__start__', toStatus: 'CONFIRMED', count: 1, revenue: 250, autoRevenue: 0, autoCount: 0 },
    { fromStatus: 'CONFIRMED', toStatus: 'UNKNOWN_STUFF', count: 1, revenue: 100, autoRevenue: 0, autoCount: 0 }
  ],
  totals: { transitions: 7, orders: 3, manualOrders: 3, autoOrders: 1 }
};

const baseQuery = { startDate: '2026-05-01', endDate: '2026-05-05' };

const invoke = async (req, res) => {
  await statusMatrixController({ ...req }, res, () => {});
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
    sql.fetchTransitionAggregates.mockResolvedValue(happyResult);

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
    sql.fetchTransitionAggregates.mockResolvedValue({ rows: [], totals: EMPTY_TOTALS });

    const res = createResponse();
    await invoke({ user: { id: 'u1', companyId: 'company-1' }, query: baseQuery }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toEqual({
      truncated: false,
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
    expect(sql.fetchTransitionAggregates).not.toHaveBeenCalled();
  });

  test('filters transitions by mode', async () => {
    sql.fetchTransitionAggregates.mockResolvedValue(happyResult);

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
    sql.fetchTransitionAggregates.mockResolvedValue({
      rows: [
        { fromStatus: 'PREPARING', toStatus: 'READY', count: 1, revenue: 100, autoRevenue: 0, autoCount: 0 },
        { fromStatus: 'DELIVERED', toStatus: 'CANCELLED', count: 1, revenue: 100, autoRevenue: 0, autoCount: 0 },
        { fromStatus: 'CANCELLED', toStatus: 'PENDING', count: 1, revenue: 100, autoRevenue: 0, autoCount: 0 },
        { fromStatus: 'PENDING', toStatus: 'CONFIRMED', count: 1, revenue: 100, autoRevenue: 0, autoCount: 0 }
      ],
      totals: { transitions: 4, orders: 4, manualOrders: 4, autoOrders: 0 }
    });

    const res = createResponse();
    await invoke({ user: { id: 'u1', companyId: 'company-1' }, query: baseQuery }, res);

    const data = res.payload.data;
    expect(data.rows.find((r) => r.fromStatus === 'PREPARING' && r.toStatus === 'READY').kind).toBe('forward');
    expect(data.rows.find((r) => r.fromStatus === 'DELIVERED' && r.toStatus === 'CANCELLED').kind).toBe('backward');
    expect(data.rows.find((r) => r.fromStatus === 'CANCELLED' && r.toStatus === 'PENDING').kind).toBe('backward');
    expect(data.rows.find((r) => r.fromStatus === 'PENDING' && r.toStatus === 'CONFIRMED').kind).toBe('skip');
  });

  test('flags transitions as invalid when the from-status config disallows the target', async () => {
    sql.fetchTransitionAggregates.mockResolvedValue({
      rows: [
        { fromStatus: 'CONFIRMED', toStatus: 'PREPARING', count: 1, revenue: 100, autoRevenue: 0, autoCount: 0 },
        { fromStatus: 'CONFIRMED', toStatus: 'DELIVERED', count: 1, revenue: 100, autoRevenue: 0, autoCount: 0 },
        { fromStatus: 'DELIVERED', toStatus: 'CANCELLED', count: 1, revenue: 100, autoRevenue: 0, autoCount: 0 }
      ],
      totals: { transitions: 3, orders: 3, manualOrders: 3, autoOrders: 0 }
    });

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
