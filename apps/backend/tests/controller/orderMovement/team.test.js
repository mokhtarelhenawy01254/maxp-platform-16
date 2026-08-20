jest.mock('../../../services/orderMovementCore', () => ({
  fetchOrderMovementData: jest.fn(),
  buildTransitions: jest.fn(),
  normalizeDateRange: jest.fn(),
  normalizeStatus: jest.fn((s) => String(s || '').trim().toUpperCase()),
  calcPercentile: jest.fn(),
  calcMean: jest.fn(),
  hoursBetween: jest.fn(),
  TERMINAL_STATUSES: new Set(['DELIVERED', 'CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'EXCHANGED', 'LOST', 'DUPLICATE_ORDER', 'TRASH', 'SHORTAGE_FAILED', 'NOT_SHIPPED']),
  SUCCESS_STATUSES: new Set(['DELIVERED', 'PARTIALLY_DELIVERED']),
  FAILURE_STATUSES: new Set(['CANCELLED', 'RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'LOST', 'SHORTAGE_FAILED', 'TRASH', 'DUPLICATE_ORDER', 'NOT_SHIPPED']),
  getSharedPrismaClient: jest.fn()
}));

const core = require('../../../services/orderMovementCore');
const teamController = require('../../../controller/orderMovement/teamController');

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

const handler = teamController;

const hoursBetween = (a, b) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, ms) / (1000 * 60 * 60);
};

const AUTO_ACTOR_MARKERS = ['SYSTEM_AUTO', 'SYSTEM', 'AUTO', 'CRON'];

const buildTransitionsMock = (order) => {
  const rows = order.statusHistory || [];
  return rows.map((h) => {
    const who = String(h.changedBy || h.userName || '');
    const up = who.toUpperCase();
    const auto = AUTO_ACTOR_MARKERS.some((marker) => up.includes(marker));
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: core.normalizeStatus(h.status),
      oldStatus: h.oldStatus ? core.normalizeStatus(h.oldStatus) : null,
      changedBy: h.changedBy || null,
      userName: h.userName || null,
      reason: h.reason || null,
      createdAt: h.createdAt,
      auto,
      orderTotal: Number(order.total ?? 0),
      orderStatus: order.status
    };
  });
};

const buildFixtureOrders = () => [
  {
    id: 'order-1',
    orderNumber: 'ORD-1',
    status: 'DELIVERED',
    total: 500,
    createdAt: new Date('2026-05-01T08:00:00.000Z'),
    statusHistory: [
      { status: 'PENDING', oldStatus: null, changedBy: 'user-1', userName: '╪ú╪¡┘à╪»', createdAt: new Date('2026-05-01T08:00:00.000Z') },
      { status: 'CONFIRMED', oldStatus: 'PENDING', changedBy: 'user-1', userName: '╪ú╪¡┘à╪»', createdAt: new Date('2026-05-01T10:00:00.000Z') },
      { status: 'SHIPPED', oldStatus: 'CONFIRMED', changedBy: 'SYSTEM_AUTO', userName: null, createdAt: new Date('2026-05-02T09:00:00.000Z') },
      { status: 'DELIVERED', oldStatus: 'SHIPPED', changedBy: 'user-2', userName: '┘à╪▒┘è┘à', createdAt: new Date('2026-05-02T12:00:00.000Z') },
      { status: 'INVALID_STATUS', oldStatus: 'CONFIRMED', changedBy: 'user-1', userName: '╪ú╪¡┘à╪»', createdAt: new Date('2026-05-02T13:00:00.000Z') }
    ]
  },
  {
    id: 'order-2',
    orderNumber: 'ORD-2',
    status: 'DELIVERED',
    total: 300,
    createdAt: new Date('2026-05-02T06:00:00.000Z'),
    statusHistory: [
      { status: 'CONFIRMED', oldStatus: 'PENDING', changedBy: 'user-1', userName: '╪ú╪¡┘à╪»', createdAt: new Date('2026-05-02T09:00:00.000Z') },
      { status: 'CANCELLED', oldStatus: 'CONFIRMED', changedBy: 'user-2', userName: '┘à╪▒┘è┘à', createdAt: new Date('2026-05-02T15:00:00.000Z') },
      { status: 'DELIVERED', oldStatus: 'CANCELLED', changedBy: 'user-2', userName: '┘à╪▒┘è┘à', createdAt: new Date('2026-05-02T18:00:00.000Z') }
    ]
  },
  {
    id: 'order-3',
    orderNumber: 'ORD-3',
    status: 'DELIVERED',
    total: 700,
    createdAt: new Date('2026-05-03T05:00:00.000Z'),
    statusHistory: [
      { status: 'DELIVERED', oldStatus: 'PENDING', changedBy: 'SYSTEM_AUTO', userName: 'SYSTEM', createdAt: new Date('2026-05-03T12:00:00.000Z') }
    ]
  }
];

const setupCore = (orders, configs = []) => {
  core.fetchOrderMovementData.mockResolvedValue({ orders, start: null, end: null });
  core.normalizeDateRange.mockImplementation(() => ({ start: null, end: null }));
  core.buildTransitions.mockImplementation(buildTransitionsMock);
  core.hoursBetween.mockImplementation(hoursBetween);
  core.calcMean.mockImplementation((arr) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : 0));
  const prisma = {
    orderStatusConfig: {
      findMany: jest.fn().mockResolvedValue(configs)
    }
  };
  core.getSharedPrismaClient.mockReturnValue(prisma);
  return prisma;
};

describe('orderMovement teamController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('groups transitions by member with confirms, cancels, deliveries, revenue and averages', async () => {
    const configs = [
      { code: 'CONFIRMED', allowedNextStatuses: JSON.stringify(['SCHEDULED', 'SHIPPED', 'CANCELLED']) }
    ];
    const prisma = setupCore(buildFixtureOrders(), configs);

    const res = createResponse();
    await handler(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-03' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.summary).toEqual({
      totalTransitions: 9,
      manualTransitions: 7,
      autoTransitions: 2,
      activeMembers: 2
    });
    expect(prisma.orderStatusConfig.findMany).toHaveBeenCalledWith({
      where: { companyId: 'company-1', isActive: true },
      select: { code: true, allowedNextStatuses: true }
    });

    const members = res.payload.data.members;
    expect(members.map((m) => m.name)).toEqual(['╪ú╪¡┘à╪»', '┘à╪▒┘è┘à', '╪º┘ä┘å╪╕╪º┘à (╪¬┘ä┘é╪º╪ª┘è)']);

    const ahmed = members[0];
    expect(ahmed).toEqual({
      name: '╪ú╪¡┘à╪»',
      changedBy: '╪ú╪¡┘à╪»',
      transitions: 4,
      manualTransitions: 4,
      autoTransitions: 0,
      confirms: 2,
      cancels: 0,
      deliveries: 0,
      invalidTransitions: 1,
      avgHoursToConfirm: 2.5,
      avgHoursToCancel: 0,
      revenue: 800,
      isSystem: false
    });

    const maryam = members[1];
    expect(maryam).toEqual({
      name: '┘à╪▒┘è┘à',
      changedBy: '┘à╪▒┘è┘à',
      transitions: 3,
      manualTransitions: 3,
      autoTransitions: 0,
      confirms: 0,
      cancels: 1,
      deliveries: 2,
      invalidTransitions: 0,
      avgHoursToConfirm: 0,
      avgHoursToCancel: 9,
      revenue: 800,
      isSystem: false
    });

    const systemMember = members[2];
    expect(systemMember).toEqual({
      name: '╪º┘ä┘å╪╕╪º┘à (╪¬┘ä┘é╪º╪ª┘è)',
      changedBy: 'SYSTEM_AUTO',
      transitions: 2,
      manualTransitions: 0,
      autoTransitions: 2,
      confirms: 0,
      cancels: 0,
      deliveries: 1,
      invalidTransitions: 0,
      avgHoursToConfirm: 0,
      avgHoursToCancel: 0,
      revenue: 1200,
      isSystem: true
    });
  });

  test('returns empty summary and members when there is no data', async () => {
    setupCore([]);

    const res = createResponse();
    await handler(
      { user: { id: 'user-1', companyId: 'company-1' }, query: {} },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual({
      summary: {
        totalTransitions: 0,
        manualTransitions: 0,
        autoTransitions: 0,
        activeMembers: 0
      },
      members: []
    });
    expect(core.getSharedPrismaClient).not.toHaveBeenCalled();
  });

  test('rejects requests without a company scope', async () => {
    const res = createResponse();
    await handler({ user: { id: 'user-1' }, query: {} }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });
    expect(core.fetchOrderMovementData).not.toHaveBeenCalled();
    expect(core.getSharedPrismaClient).not.toHaveBeenCalled();
  });

  test('filters manual transitions only in manual mode', async () => {
    setupCore(buildFixtureOrders());

    const res = createResponse();
    await handler(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-03', mode: 'manual' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.summary).toEqual({
      totalTransitions: 7,
      manualTransitions: 7,
      autoTransitions: 0,
      activeMembers: 2
    });
    expect(res.payload.data.members.map((m) => m.name)).toEqual(['╪ú╪¡┘à╪»', '┘à╪▒┘è┘à']);
    expect(res.payload.data.members.some((m) => m.isSystem)).toBe(false);
  });

  test('keeps only the synthetic system member in auto mode', async () => {
    setupCore(buildFixtureOrders());

    const res = createResponse();
    await handler(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-03', mode: 'auto' }
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.summary).toEqual({
      totalTransitions: 2,
      manualTransitions: 0,
      autoTransitions: 2,
      activeMembers: 0
    });
    expect(res.payload.data.members).toHaveLength(1);
    expect(res.payload.data.members[0]).toEqual({
      name: '╪º┘ä┘å╪╕╪º┘à (╪¬┘ä┘é╪º╪ª┘è)',
      changedBy: 'SYSTEM_AUTO',
      transitions: 2,
      manualTransitions: 0,
      autoTransitions: 2,
      confirms: 0,
      cancels: 0,
      deliveries: 1,
      invalidTransitions: 0,
      avgHoursToConfirm: 0,
      avgHoursToCancel: 0,
      revenue: 1200,
      isSystem: true
    });
  });

  test('returns 500 when the data fetch fails', async () => {
    core.fetchOrderMovementData.mockRejectedValue(new Error('db down'));
    core.normalizeDateRange.mockImplementation(() => ({ start: null, end: null }));

    const res = createResponse();
    await handler(
      { user: { id: 'user-1', companyId: 'company-1' }, query: {} },
      res
    );

    expect(res.statusCode).toBe(500);
    expect(res.payload.success).toBe(false);
  });
});
