jest.mock('../../../services/orderMovementCore', () => ({
  fetchOrderMovementData: jest.fn(),
  buildTransitions: jest.fn(),
  normalizeDateRange: jest.fn(() => ({ start: null, end: null })),
  normalizeStatus: jest.fn((s) => String(s || '').trim().toUpperCase()),
  isAutoChange: jest.fn((entry) => {
    const who = String(entry?.changedBy || entry?.userName || '').toUpperCase();
    return ['SYSTEM_AUTO', 'SYSTEM', 'AUTO', 'CRON'].some((marker) => who.includes(marker));
  }),
  calcPercentile: jest.fn((sortedArr, pct) => {
    if (!sortedArr.length) return 0;
    const index = Math.min(sortedArr.length - 1, Math.max(0, Math.ceil((pct / 100) * sortedArr.length) - 1));
    return sortedArr[index];
  }),
  calcMean: jest.fn((arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)),
  hoursBetween: jest.fn((a, b) => {
    const ms = new Date(b).getTime() - new Date(a).getTime();
    return Math.max(0, ms) / 3600000;
  }),
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
const dwellTimeController = require('../../../controller/orderMovement/dwellTimeController');

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

const callController = async (req) => {
  const res = createResponse();
  const settled = new Promise((resolve) => {
    res.json.mockImplementation((payload) => {
      res.payload = payload;
      resolve();
      return res;
    });
  });
  dwellTimeController({ method: 'GET', url: '/', ...req }, res, () => {});
  await settled;
  return res;
};

const historyEntry = ({ status, oldStatus = null, changedBy = 'user-1', userName = null, createdAt }) => ({
  status,
  oldStatus,
  changedBy,
  userName,
  reason: null,
  createdAt
});

const orderOne = {
  id: 'order-1',
  orderNumber: 'ORD-1',
  status: 'DELIVERED',
  total: '250.50',
  createdAt: new Date('2026-05-01T08:00:00.000Z'),
  updatedAt: new Date('2026-05-03T08:00:00.000Z'),
  statusHistory: [
    historyEntry({ status: 'PENDING', userName: 'Ahmed', createdAt: '2026-05-01T08:00:00.000Z' }),
    historyEntry({ status: 'CONFIRMED', oldStatus: 'PENDING', userName: 'Sara', createdAt: '2026-05-01T12:00:00.000Z' }),
    historyEntry({ status: 'SHIPPED', oldStatus: 'CONFIRMED', changedBy: 'SYSTEM_AUTO', createdAt: '2026-05-01T20:00:00.000Z' }),
    historyEntry({ status: 'DELIVERED', oldStatus: 'SHIPPED', userName: 'Omar', createdAt: '2026-05-03T08:00:00.000Z' })
  ]
};

const orderTwo = {
  id: 'order-2',
  orderNumber: 'ORD-2',
  status: 'CANCELLED',
  total: '120.00',
  createdAt: new Date('2026-05-02T10:00:00.000Z'),
  updatedAt: new Date('2026-05-02T22:00:00.000Z'),
  statusHistory: [
    historyEntry({ status: 'PENDING', userName: 'Ali', createdAt: '2026-05-02T10:00:00.000Z' }),
    historyEntry({ status: 'CONFIRMED', oldStatus: 'PENDING', changedBy: 'SYSTEM_AUTO', createdAt: '2026-05-02T16:00:00.000Z' }),
    historyEntry({ status: 'CANCELLED', oldStatus: 'CONFIRMED', changedBy: 'SYSTEM_AUTO', createdAt: '2026-05-02T22:00:00.000Z' })
  ]
};

const orderThree = {
  id: 'order-3',
  orderNumber: 'ORD-3',
  status: 'PENDING_PREPARATION',
  total: '80.00',
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
  statusHistory: [
    historyEntry({ status: 'PENDING', userName: 'Ali', createdAt: '2026-05-01T00:00:00.000Z' }),
    historyEntry({ status: 'PENDING_PREPARATION', oldStatus: 'PENDING', userName: 'Nour', createdAt: '2026-08-01T00:00:00.000Z' }),
    historyEntry({ status: 'PENDING_PREPARATION', oldStatus: 'PENDING_PREPARATION', userName: 'Nour', createdAt: '2026-08-02T00:00:00.000Z' })
  ]
};

const findByStatus = (rows, status) => rows.find((row) => row.status === status);

describe('dwellTimeController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('computes dwell intervals, percentiles, cycle time and manual/auto split', async () => {
    core.fetchOrderMovementData.mockResolvedValue({
      orders: [orderOne, orderTwo, orderThree],
      start: null,
      end: null
    });

    const res = await callController({
      user: { id: 'user-1', companyId: 'company-1' },
      query: { startDate: '2026-05-01', endDate: '2026-05-31', mode: 'all' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.totalOrders).toBe(3);
    expect(core.fetchOrderMovementData).toHaveBeenCalledWith({
      companyId: 'company-1',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      historyFilter: 'full',
      maxOrders: 30000
    });

    const statuses = res.payload.data.statuses;
    expect(findByStatus(statuses, 'PENDING')).toEqual(
      expect.objectContaining({
        entries: 2,
        avgHours: 5,
        p50Hours: 4,
        p90Hours: 6,
        maxHours: 6,
        manualEntries: 1,
        autoEntries: 1
      })
    );
    expect(findByStatus(statuses, 'CONFIRMED')).toEqual(
      expect.objectContaining({
        entries: 2,
        avgHours: 7,
        p50Hours: 6,
        p90Hours: 8,
        maxHours: 8,
        manualEntries: 0,
        autoEntries: 2
      })
    );
    expect(findByStatus(statuses, 'SHIPPED')).toEqual(
      expect.objectContaining({
        entries: 1,
        avgHours: 36,
        manualEntries: 1,
        autoEntries: 0
      })
    );
    expect(findByStatus(statuses, 'PENDING_PREPARATION')).toEqual(
      expect.objectContaining({
        entries: 1,
        avgHours: 24,
        manualEntries: 1,
        autoEntries: 0
      })
    );
    expect(statuses.map((row) => row.status)).toEqual([
      'SHIPPED',
      'PENDING_PREPARATION',
      'CONFIRMED',
      'PENDING'
    ]);

    expect(res.payload.data.cycleTime).toEqual({
      avgHours: 30,
      p50Hours: 12,
      p90Hours: 48,
      sampleSize: 2,
      manualAvgHours: 48,
      autoAvgHours: 12
    });
  });

  test('filters dwell samples by manual mode', async () => {
    core.fetchOrderMovementData.mockResolvedValue({
      orders: [orderOne, orderTwo, orderThree],
      start: null,
      end: null
    });

    const res = await callController({
      user: { id: 'user-1', companyId: 'company-1' },
      query: { startDate: '2026-05-01', endDate: '2026-05-31', mode: 'manual' }
    });

    const statuses = res.payload.data.statuses;
    expect(findByStatus(statuses, 'PENDING')).toEqual(
      expect.objectContaining({ entries: 1, avgHours: 4, manualEntries: 1, autoEntries: 0 })
    );
    expect(findByStatus(statuses, 'CONFIRMED')).toBeUndefined();
    expect(findByStatus(statuses, 'SHIPPED')).toEqual(
      expect.objectContaining({ entries: 1, avgHours: 36, manualEntries: 1 })
    );
    expect(res.payload.data.cycleTime.sampleSize).toBe(1);
    expect(res.payload.data.cycleTime.manualAvgHours).toBe(48);
    expect(res.payload.data.cycleTime.autoAvgHours).toBe(0);
  });

  test('filters dwell samples by auto mode', async () => {
    core.fetchOrderMovementData.mockResolvedValue({
      orders: [orderOne, orderTwo, orderThree],
      start: null,
      end: null
    });

    const res = await callController({
      user: { id: 'user-1', companyId: 'company-1' },
      query: { startDate: '2026-05-01', endDate: '2026-05-31', mode: 'auto' }
    });

    const statuses = res.payload.data.statuses;
    expect(findByStatus(statuses, 'PENDING')).toEqual(
      expect.objectContaining({ entries: 1, avgHours: 6, manualEntries: 0, autoEntries: 1 })
    );
    expect(findByStatus(statuses, 'CONFIRMED')).toEqual(
      expect.objectContaining({ entries: 2, avgHours: 7, manualEntries: 0, autoEntries: 2 })
    );
    expect(findByStatus(statuses, 'SHIPPED')).toBeUndefined();
    expect(res.payload.data.cycleTime.sampleSize).toBe(1);
  });

  test('returns empty result when no orders exist', async () => {
    core.fetchOrderMovementData.mockResolvedValue({
      orders: [],
      start: null,
      end: null
    });

    const res = await callController({
      user: { id: 'user-1', companyId: 'company-1' },
      query: { startDate: '2026-05-01', endDate: '2026-05-31', mode: 'all' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toEqual({
      totalOrders: 0,
      statuses: [],
      cycleTime: {
        avgHours: 0,
        p50Hours: 0,
        p90Hours: 0,
        sampleSize: 0,
        manualAvgHours: 0,
        autoAvgHours: 0
      }
    });
  });

  test('rejects requests without a company scope', async () => {
    const res = await callController({
      user: { id: 'user-1' },
      query: { startDate: '2026-05-01', endDate: '2026-05-31' }
    });

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, message: 'غير مصرح' });
    expect(core.fetchOrderMovementData).not.toHaveBeenCalled();
  });
});
