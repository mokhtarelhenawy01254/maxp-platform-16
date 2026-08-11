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
  calcPercentile: jest.fn(),
  calcMean: jest.fn((a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)),
  hoursBetween: jest.fn((a, b) => Math.max(0, new Date(b).getTime() - new Date(a).getTime()) / 3600000),
  buildHistoryRangeWhere: jest.fn(({ start, end }) => {
    const where = { createdAt: {} };
    if (start) where.createdAt.gte = start;
    if (end) where.createdAt.lte = end;
    return where;
  }),
  TERMINAL_STATUSES: new Set([]),
  SUCCESS_STATUSES: new Set([]),
  FAILURE_STATUSES: new Set([]),
  getSharedPrismaClient: jest.fn()
}));

const core = require('../../../services/orderMovementCore');
const router = require('../../../controller/orderMovement/approvalsController');

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

const baseRequest = {
  id: 'req-1',
  orderId: 'order-1',
  requestedBy: 'user-3',
  fromStatusId: 'st-1',
  toStatusId: 'st-2',
  reason: 'العميل استلم الطلب',
  status: 'approved',
  reviewedBy: 'user-5',
  reviewedAt: new Date('2026-05-01T12:00:00.000Z'),
  createdAt: new Date('2026-05-01T10:00:00.000Z'),
  order: { orderNumber: 'ORD-1001' },
  fromStatus: { name: 'مؤكد', code: 'CONFIRMED' },
  toStatus: { name: 'تم التسليم', code: 'DELIVERED' },
  requestor: { firstName: 'أحمد', lastName: 'علي' },
  reviewer: { firstName: 'علي', lastName: 'حسن' }
};

describe('approvalsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('summarizes approval requests, reviewers and override count', async () => {
    const rows = [
      baseRequest,
      {
        id: 'req-2',
        orderId: 'order-2',
        requestedBy: 'user-3',
        fromStatusId: 'st-3',
        toStatusId: 'st-1',
        reason: null,
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date('2026-05-01T11:00:00.000Z'),
        order: { orderNumber: 'ORD-1002' },
        fromStatus: { name: 'قيد الانتظار', code: 'PENDING' },
        toStatus: { name: 'مؤكد', code: 'CONFIRMED' },
        requestor: { firstName: 'أحمد', lastName: 'علي' },
        reviewer: null
      },
      {
        id: 'req-3',
        orderId: 'order-3',
        requestedBy: 'user-4',
        fromStatusId: 'st-1',
        toStatusId: 'st-4',
        reason: 'العميل ألغى الطلب',
        status: 'rejected',
        reviewedBy: 'user-5',
        reviewedAt: new Date('2026-05-02T13:00:00.000Z'),
        createdAt: new Date('2026-05-02T08:00:00.000Z'),
        order: { orderNumber: 'ORD-1003' },
        fromStatus: { name: 'مؤكد', code: 'CONFIRMED' },
        toStatus: { name: 'ملغي', code: 'CANCELLED' },
        requestor: { firstName: 'سارة', lastName: 'محمد' },
        reviewer: { firstName: 'علي', lastName: 'حسن' }
      },
      {
        id: 'req-4',
        orderId: 'order-4',
        requestedBy: 'user-7',
        fromStatusId: null,
        toStatusId: 'st-2',
        reason: 'تسليم الطلب',
        status: 'approved',
        reviewedBy: 'user-6',
        reviewedAt: new Date('2026-05-02T10:00:00.000Z'),
        createdAt: new Date('2026-05-02T09:00:00.000Z'),
        order: { orderNumber: 'ORD-1004' },
        fromStatus: null,
        toStatus: { name: 'تم التسليم', code: 'DELIVERED' },
        requestor: null,
        reviewer: { firstName: 'منى', lastName: 'خالد' }
      }
    ];

    const prisma = {
      orderStatusChangeRequest: { findMany: jest.fn().mockResolvedValue(rows) },
      orderWorkflowAuditLog: { count: jest.fn().mockResolvedValue(3) }
    };
    core.getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await callRouter(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-03' },
        method: 'GET',
        url: '/'
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);

    const data = res.payload.data;
    expect(data.summary).toEqual({
      totalRequests: 4,
      pending: 1,
      approved: 2,
      rejected: 1,
      approvalRate: 50,
      avgReviewHours: 2.67,
      totalOverrides: 3
    });

    expect(data.requests).toHaveLength(4);
    expect(data.requests[0]).toEqual(
      expect.objectContaining({
        id: 'req-1',
        orderId: 'order-1',
        orderNumber: 'ORD-1001',
        requestedBy: 'user-3',
        requestedByName: 'أحمد علي',
        fromStatus: { name: 'مؤكد', code: 'CONFIRMED' },
        toStatus: { name: 'تم التسليم', code: 'DELIVERED' },
        reason: 'العميل استلم الطلب',
        status: 'approved',
        reviewedBy: 'user-5',
        reviewedByName: 'علي حسن',
        reviewedAt: new Date('2026-05-01T12:00:00.000Z'),
        createdAt: new Date('2026-05-01T10:00:00.000Z')
      })
    );
    expect(data.requests[3].requestedByName).toBe('user-7');
    expect(data.requests[3].fromStatus).toBeNull();

    expect(data.reviewers).toEqual([
      { name: 'علي حسن', reviewedCount: 2, approved: 1, rejected: 1, avgReviewHours: 3.5 },
      { name: 'منى خالد', reviewedCount: 1, approved: 1, rejected: 0, avgReviewHours: 1 }
    ]);

    expect(prisma.orderStatusChangeRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date)
          })
        }),
        include: {
          order: { select: { orderNumber: true } },
          fromStatus: { select: { name: true, code: true } },
          toStatus: { select: { name: true, code: true } },
          requestor: { select: { firstName: true, lastName: true } },
          reviewer: { select: { firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'asc' },
        take: 200
      })
    );
    expect(prisma.orderWorkflowAuditLog.count).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        changeType: 'override',
        createdAt: expect.objectContaining({
          gte: expect.any(Date),
          lte: expect.any(Date)
        })
      }
    });
  });

  test('returns empty analytics when there are no requests or overrides', async () => {
    const prisma = {
      orderStatusChangeRequest: { findMany: jest.fn().mockResolvedValue([]) },
      orderWorkflowAuditLog: { count: jest.fn().mockResolvedValue(0) }
    };
    core.getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await callRouter(
      {
        user: { id: 'user-1', companyId: 'company-1' },
        query: { startDate: '2026-05-01', endDate: '2026-05-03' },
        method: 'GET',
        url: '/'
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.summary).toEqual({
      totalRequests: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      approvalRate: 0,
      avgReviewHours: 0,
      totalOverrides: 0
    });
    expect(res.payload.data.requests).toEqual([]);
    expect(res.payload.data.reviewers).toEqual([]);
  });

  test('rejects requests without a company scope', async () => {
    const res = createResponse();
    await callRouter(
      { user: { id: 'user-1' }, query: {}, method: 'GET', url: '/' },
      res
    );

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ success: false, message: 'غير مصرح' });
    expect(core.getSharedPrismaClient).not.toHaveBeenCalled();
  });

  test('counts workflow overrides scoped to the company and range', async () => {
    const prisma = {
      orderStatusChangeRequest: { findMany: jest.fn().mockResolvedValue([]) },
      orderWorkflowAuditLog: { count: jest.fn().mockResolvedValue(7) }
    };
    core.getSharedPrismaClient.mockReturnValue(prisma);

    const res = createResponse();
    await callRouter(
      {
        user: { id: 'user-1', companyId: 'company-2' },
        query: { startDate: '2026-05-01', endDate: '2026-05-03' },
        method: 'GET',
        url: '/'
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.data.summary.totalOverrides).toBe(7);
    expect(prisma.orderWorkflowAuditLog.count).toHaveBeenCalledWith({
      where: {
        companyId: 'company-2',
        changeType: 'override',
        createdAt: expect.objectContaining({
          gte: expect.any(Date),
          lte: expect.any(Date)
        })
      }
    });
  });
});
