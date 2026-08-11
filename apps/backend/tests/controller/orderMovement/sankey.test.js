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

const sql = require('../../../services/orderMovementSql');
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

const EMPTY_TOTALS = { transitions: 0, orders: 0, manualOrders: 0, autoOrders: 0 };

const happyResult = {
  rows: [
    { fromStatus: '__start__', toStatus: 'PENDING', count: 2, revenue: 350.5, autoRevenue: 350.5, autoCount: 2 },
    { fromStatus: 'PENDING', toStatus: 'CONFIRMED', count: 1, revenue: 250.5, autoRevenue: 0, autoCount: 0 },
    { fromStatus: 'PENDING', toStatus: 'CANCELLED', count: 1, revenue: 100, autoRevenue: 0, autoCount: 0 },
    { fromStatus: 'CONFIRMED', toStatus: 'DELIVERED', count: 1, revenue: 250.5, autoRevenue: 250.5, autoCount: 1 }
  ],
  totals: { transitions: 5, orders: 2, manualOrders: 2, autoOrders: 2 }
};

describe('orderMovement sankeyController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('builds sankey graph with START links, status links, revenue and mode split', async () => {
    sql.fetchTransitionAggregates.mockResolvedValue(happyResult);

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
    expect(sql.fetchTransitionAggregates).toHaveBeenCalledWith({
      companyId: 'company-1',
      start: new Date('2026-05-01'),
      end: new Date('2026-05-31')
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
      { status: 'CANCELLED', count: 1 },
      { status: 'CONFIRMED', count: 1 },
      { status: 'DELIVERED', count: 1 }
    ]);
    expect(data.topOutflows).toEqual([
      { status: 'PENDING', count: 2 },
      { status: 'CONFIRMED', count: 1 }
    ]);
  });

  test('returns empty graph when no transitions exist', async () => {
    sql.fetchTransitionAggregates.mockResolvedValue({ rows: [], totals: EMPTY_TOTALS });

    const res = createResponse();
    await sankeyController(
      { user: { id: 'user-1', companyId: 'company-1' }, query: { startDate: '2026-05-01', endDate: '2026-05-31' } },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.totalOrders).toBe(0);
    expect(res.payload.data.totalTransitions).toBe(0);
    expect(res.payload.data.links).toEqual([]);
  });

  test('rejects requests without a company scope', async () => {
    const res = createResponse();
    await sankeyController({ user: { id: 'user-1' }, query: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, message: 'غير مصرح' });
    expect(sql.fetchTransitionAggregates).not.toHaveBeenCalled();
  });

  test('filters transitions by manual mode', async () => {
    sql.fetchTransitionAggregates.mockResolvedValue(happyResult);

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
    sql.fetchTransitionAggregates.mockResolvedValue(happyResult);

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
});
