jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn()
}));

jest.mock('../../services/orderService', () => ({
  updateGuestOrderStatus: jest.fn(),
  updateOrderStatus: jest.fn()
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const agentWorkspaceController = require('../../controller/agentWorkspaceController');
const orderService = require('../../services/orderService');

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

const createOrder = (id, status, overrides = {}) => ({
  id,
  orderNumber: `ORD-${id}`,
  status,
  customerName: 'Workspace Customer',
  customerPhone: '01000000000',
  governorate: 'القاهرة',
  city: 'مدينة نصر',
  total: 120,
  subtotal: 100,
  shipping: 20,
  createdAt: new Date('2026-05-03T09:00:00.000Z'),
  callAttempts: 0,
  lastCallAttemptAt: null,
  followUpDate: null,
  orderItems: [],
  ...overrides
});

const createGuestOrder = (id, status, overrides = {}) => ({
  id,
  orderNumber: `G-${id}`,
  status,
  guestName: 'Guest Customer',
  guestPhone: '01011111111',
  items: '[]',
  total: 90,
  finalTotal: 90,
  shippingCost: 0,
  createdAt: new Date('2026-05-03T09:00:00.000Z'),
  callAttempts: 0,
  lastCallAt: null,
  followUpDate: null,
  orderNotes: [],
  ...overrides
});

const createAssignment = ({ order = null, guestOrder = null, companyId = 'company-1', assignedTo = 'user-1', isActive = true } = {}) => ({
  id: `assignment-${order?.id || guestOrder?.id || Math.random()}`,
  companyId,
  assignedTo,
  isActive,
  orderId: order ? order.id : null,
  guestOrderId: guestOrder ? guestOrder.id : null,
  assignedAt: new Date('2026-05-03T10:00:00.000Z'),
  order,
  guestOrder
});

// Minimal Prisma-like matcher for the `where` shapes this controller emits
// (base fields + OR on order/guestOrder relations or their foreign keys).
const matchOrderCondition = (order, cond) => {
  if (cond.status) {
    if (cond.status.in) {
      if (!cond.status.in.includes(order.status)) return false;
    } else if (cond.status.notIn) {
      if (cond.status.notIn.includes(order.status)) return false;
    } else if (cond.status.not) {
      if (order.status === cond.status.not) return false;
    } else if (order.status !== cond.status) {
      return false;
    }
  }
  if (cond.followUpDate) {
    const notIsNull = cond.followUpDate.not === null;
    const isNull = order.followUpDate === null || order.followUpDate === undefined;
    if (notIsNull ? isNull : !isNull) return false;
  }
  return true;
};

const matchesWorkspaceWhere = (assignment, where = {}) => {
  if (where.companyId && assignment.companyId !== where.companyId) return false;
  if (where.assignedTo && assignment.assignedTo !== where.assignedTo) return false;
  if (where.isActive === true && assignment.isActive !== true) return false;

  const matchCondition = (cond) => {
    if (cond.orderId !== undefined) return assignment.orderId === cond.orderId;
    if (cond.guestOrderId !== undefined) return assignment.guestOrderId === cond.guestOrderId;
    if (cond.order) {
      if (!assignment.order) return false;
      return matchOrderCondition(assignment.order, cond.order);
    }
    if (cond.guestOrder) {
      if (!assignment.guestOrder) return false;
      return matchOrderCondition(assignment.guestOrder, cond.guestOrder);
    }
    return false;
  };

  if (where.AND) {
    return where.AND.every((subWhere) => matchesWorkspaceWhere(assignment, subWhere));
  }
  if (where.OR) {
    return where.OR.some(matchCondition);
  }
  return true;
};

// Provides findMany/count/findFirst backed by an in-memory assignment list so
// tests stay meaningful now that filtering happens server-side in the DB.
const mockOrderAssignment = ({ assignments }) => {
  const findMany = jest.fn(({ where, skip = 0, take }) => {
    const filtered = assignments.filter((a) => matchesWorkspaceWhere(a, where));
    const sliced = take !== undefined ? filtered.slice(skip, skip + take) : filtered;
    return Promise.resolve(sliced);
  });
  const count = jest.fn(({ where }) =>
    Promise.resolve(assignments.filter((a) => matchesWorkspaceWhere(a, where)).length)
  );
  const findFirst = jest.fn(({ where }) =>
    Promise.resolve(assignments.find((a) => matchesWorkspaceWhere(a, where)) || null)
  );

  getSharedPrismaClient.mockReturnValue({
    orderAssignment: { findMany, count, findFirst }
  });

  return { findMany, count, findFirst };
};

describe('agentWorkspaceController.getMyOrders', () => {
  const baseReq = {
    user: {
      id: 'user-1',
      effectiveCompanyId: 'company-1'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps cancelled assigned orders visible in the default workspace feed', async () => {
    const { findMany } = mockOrderAssignment({
      assignments: [
        createAssignment({ order: createOrder('pending', 'PENDING') }),
        createAssignment({ order: createOrder('cancelled', 'CANCELLED') }),
        createAssignment({ order: createOrder('trash', 'TRASH') })
      ]
    });

    const res = createResponse();
    await agentWorkspaceController.getMyOrders({ ...baseReq, query: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.pagination.total).toBe(2);
    expect(res.payload.data.map((order) => order.status)).toEqual([
      'PENDING',
      'CANCELLED'
    ]);

    // Exclusion filtering is pushed to the database.
    // Note: The excluded set must only contain valid OrderStatus enum values (see prisma/schema/enums.prisma).
    // The workspace excludes TRASH + every terminal/logistics status (shipped,
    // delivered, returned, refunded, duplicate, lost) — it is a confirmation
    // cockpit, not the company archive.
    const findManyArg = findMany.mock.calls[0][0];
    const excludedOrder = findManyArg.where.OR[0].order.status.notIn;
    const excludedGuest = findManyArg.where.OR[1].guestOrder.status.notIn;
    expect(excludedOrder).toEqual([
      'TRASH',
      'DUPLICATE_ORDER',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'PARTIALLY_DELIVERED',
      'RETURNED',
      'PARTIALLY_RETURNED',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
      'EXCHANGED',
      'LOST'
    ]);
    // guest statuses are stored as free text — exclusion covers both cases
    expect(excludedGuest).toEqual([
      ...excludedOrder,
      ...excludedOrder.map((s) => s.toLowerCase())
    ]);
  });

  test('filters directly by cancellation status for the cancelled tab', async () => {
    const { findMany } = mockOrderAssignment({
      assignments: [
        createAssignment({ order: createOrder('pending', 'PENDING') }),
        createAssignment({ order: createOrder('cancelled', 'CANCELLED') }),
        createAssignment({ order: createOrder('confirmed', 'CONFIRMED') })
      ]
    });

    const res = createResponse();
    await agentWorkspaceController.getMyOrders(
      { ...baseReq, query: { status: 'cancelled' } },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.pagination.total).toBe(1);
    expect(res.payload.data).toHaveLength(1);
    expect(res.payload.data[0].status).toBe('CANCELLED');

    const findManyArg = findMany.mock.calls[0][0];
    expect(findManyArg.where.OR).toEqual([
      { order: { status: 'CANCELLED' } },
      { guestOrder: { status: 'CANCELLED' } }
    ]);
  });

  test('filters to follow-up orders only when followUpOnly is set', async () => {
    const { findMany } = mockOrderAssignment({
      assignments: [
        createAssignment({ order: createOrder('fu', 'PENDING', { followUpDate: new Date('2026-06-01T00:00:00.000Z') }) }),
        createAssignment({ order: createOrder('no-fu', 'PENDING') }),
        createAssignment({ order: createOrder('cancelled-fu', 'CANCELLED', { followUpDate: new Date('2026-06-01T00:00:00.000Z') }) })
      ]
    });

    const res = createResponse();
    await agentWorkspaceController.getMyOrders({ ...baseReq, query: { followUpOnly: '1' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.pagination.total).toBe(1);
    expect(res.payload.data.map((o) => o.id)).toEqual(['fu']);

    // المتابعة تستبعد أيضاً الحالات النهائية/اللوجستية (تم شحنه/تسليمه/ترجعه...)
    // لا الملغي فقط — طلب مسلّم بميعاد متابعة قديم لا يعود للطابور
    const excludedOrder = [
      'TRASH',
      'DUPLICATE_ORDER',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'PARTIALLY_DELIVERED',
      'RETURNED',
      'PARTIALLY_RETURNED',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
      'EXCHANGED',
      'LOST'
    ];
    const findManyArg = findMany.mock.calls[0][0];
    expect(findManyArg.where.OR).toEqual([
      {
        order: {
          followUpDate: { not: null },
          status: { notIn: [...excludedOrder, 'CANCELLED'] }
        }
      },
      {
        guestOrder: {
          followUpDate: { not: null },
          status: { notIn: [...excludedOrder, ...excludedOrder.map((s) => s.toLowerCase()), 'CANCELLED', 'cancelled'] }
        }
      }
    ]);
  });

  test('applies server-side pagination via take/skip on findMany', async () => {
    const assignments = Array.from({ length: 25 }, (_, i) =>
      createAssignment({ order: createOrder(`p-${i}`, 'PENDING') })
    );
    const { findMany } = mockOrderAssignment({ assignments });

    const res = createResponse();
    await agentWorkspaceController.getMyOrders(
      { ...baseReq, query: { page: '3', limit: '10' } },
      res
    );

    const findManyArg = findMany.mock.calls[0][0];
    expect(findManyArg.take).toBe(10);
    expect(findManyArg.skip).toBe(20);
    expect(res.payload.pagination).toEqual({ total: 25, page: 3, limit: 10, pages: 3 });
    expect(res.payload.data).toHaveLength(5);
  });

  test('passes the attempts ordering to the database when sort=attempts', async () => {
    const { findMany } = mockOrderAssignment({
      assignments: [createAssignment({ order: createOrder('a', 'PENDING') })]
    });

    const res = createResponse();
    await agentWorkspaceController.getMyOrders({ ...baseReq, query: { sort: 'attempts' } }, res);

    const findManyArg = findMany.mock.calls[0][0];
    expect(findManyArg.orderBy).toEqual([
      { order: { callAttempts: 'desc' } },
      { guestOrder: { callAttempts: 'desc' } },
      { order: { createdAt: 'asc' } },
      { guestOrder: { createdAt: 'asc' } }
    ]);
  });

  test('computes workspace stats from count queries when withStats is requested', async () => {
    const { count } = mockOrderAssignment({
      assignments: [
        createAssignment({ order: createOrder('a', 'PENDING') }),
        createAssignment({ order: createOrder('b', 'CANCELLED') }),
        createAssignment({ order: createOrder('c', 'CONFIRMED') })
      ]
    });

    const res = createResponse();
    await agentWorkspaceController.getMyOrders({ ...baseReq, query: { withStats: 'true' } }, res);

    expect(res.payload.stats).toEqual({
      total: 3,
      pending: 1,
      confirmed: 1,
      cancelled: 1,
      followup: 0,
      incomplete: 0
    });
    // 1 pagination total + 5 stats counts
    expect(count).toHaveBeenCalledTimes(6);
  });

  it('applies search condition to query when search parameter is provided', async () => {
    const { findMany } = mockOrderAssignment({ assignments: [] });
    const req = {
      ...baseReq,
      query: { search: '01012345678' }
    };
    const res = createResponse();

    await agentWorkspaceController.getMyOrders(req, res);

    expect(res.statusCode).toBe(200);
    const findManyArg = findMany.mock.calls[0][0];
    expect(findManyArg.where.AND).toBeDefined();
    expect(findManyArg.where.AND.length).toBe(2);
  });

  test('exposes the order discount so the items editor does not wipe it', async () => {
    mockOrderAssignment({
      assignments: [
        createAssignment({ order: createOrder('disc', 'PENDING', { discount: 25, subtotal: 100, total: 95 }) }),
        createAssignment({ guestOrder: createGuestOrder('gdisc', 'PENDING', { discountAmount: 15, total: 85, finalTotal: 85 }) })
      ]
    });

    const res = createResponse();
    await agentWorkspaceController.getMyOrders({ ...baseReq, query: {} }, res);

    expect(res.statusCode).toBe(200);
    const byId = new Map(res.payload.data.map((o) => [o.id, o]));
    expect(byId.get('disc').discount).toBe(25);
    expect(byId.get('gdisc').discount).toBe(15);
  });

  test('incomplete counter matches the visible queue: phone-bearing, non-dismissed carts only', async () => {
    const prismaMock = {
      orderAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0)
      },
      guestCart: {
        count: jest.fn().mockResolvedValue(4)
      },
      cartContactLog: {
        findMany: jest.fn().mockResolvedValue([{ cartId: 'cart-x' }, { cartId: 'cart-y' }])
      }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await agentWorkspaceController.getMyOrders({ ...baseReq, query: { withStats: 'true' } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.stats.incomplete).toBe(4);
    // عدّاد السلات استبعد المستبعدة يدويًا (method=dismissed)
    const countWhere = prismaMock.guestCart.count.mock.calls[0][0].where;
    expect(countWhere.checkoutStartedAt).toEqual({ not: null });
    expect(countWhere.cartId).toEqual({ notIn: ['cart-x', 'cart-y'] });
    expect(countWhere.AND).toBeDefined();
  });
});

describe('agentWorkspaceController.quickAction', () => {
  const baseReq = {
    params: { id: 'order-1' },
    user: {
      id: 'user-1',
      firstName: 'Agent',
      lastName: 'One',
      email: 'agent@example.com',
      effectiveCompanyId: 'company-1'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects workspace cancellation without a reason', async () => {
    const res = createResponse();

    await agentWorkspaceController.quickAction({
      ...baseReq,
      body: {
        action: 'cancel',
        notes: '   '
      }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      success: false,
      error: 'سبب إلغاء الطلب مطلوب عند اختيار حالة ملغي'
    });
    expect(orderService.updateOrderStatus).not.toHaveBeenCalled();
    expect(orderService.updateGuestOrderStatus).not.toHaveBeenCalled();
  });

  test('cancels a regular workspace order with the provided reason', async () => {
    orderService.updateOrderStatus.mockResolvedValue({ status: 'CANCELLED' });
    mockOrderAssignment({
      assignments: [createAssignment({ order: createOrder('order-1', 'PENDING') })]
    });

    const res = createResponse();
    await agentWorkspaceController.quickAction({
      ...baseReq,
      body: {
        action: 'cancel',
        notes: 'العميل طلب الإلغاء'
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
      'order-1',
      'company-1',
      'CANCELLED',
      'العميل طلب الإلغاء',
      'user-1',
      'Agent One'
    );
  });

  test('cancels a guest workspace order with the provided reason', async () => {
    orderService.updateGuestOrderStatus.mockResolvedValue({ status: 'CANCELLED' });
    mockOrderAssignment({
      assignments: [createAssignment({ guestOrder: createGuestOrder('order-1', 'PENDING') })]
    });

    const res = createResponse();
    await agentWorkspaceController.quickAction({
      ...baseReq,
      body: {
        action: 'cancel',
        notes: 'رقم العميل غير صحيح'
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toEqual({
      orderType: 'guest',
      status: 'CANCELLED'
    });
    expect(orderService.updateGuestOrderStatus).toHaveBeenCalledWith(
      'order-1',
      'company-1',
      'CANCELLED',
      'رقم العميل غير صحيح',
      'user-1',
      'Agent One'
    );
  });

  test('rejects quickAction with 403 when the order is not assigned to the user', async () => {
    orderService.updateOrderStatus.mockResolvedValue({ status: 'CANCELLED' });
    mockOrderAssignment({ assignments: [] });

    const res = createResponse();
    await agentWorkspaceController.quickAction({
      ...baseReq,
      body: {
        action: 'cancel',
        notes: 'سبب ما'
      }
    }, res);

    expect(res.statusCode).toBe(403);
    expect(res.payload.success).toBe(false);
    expect(res.payload.error).toBe('لا تملك صلاحية التعامل مع هذا الطلب');
    expect(orderService.updateOrderStatus).not.toHaveBeenCalled();
    expect(orderService.updateGuestOrderStatus).not.toHaveBeenCalled();
  });

  test('returns workflow pending response when the status update enters the review workflow', async () => {
    orderService.updateOrderStatus.mockResolvedValue({
      workflowStatus: 'pending',
      workflowRequestId: 'req-123'
    });
    mockOrderAssignment({
      assignments: [createAssignment({ order: createOrder('order-1', 'PENDING') })]
    });

    const res = createResponse();
    await agentWorkspaceController.quickAction({
      ...baseReq,
      body: {
        status: 'CONFIRMED'
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual({
      workflowStatus: 'pending',
      requestId: 'req-123'
    });
  });

  test('keeps the assignment active when the status update fails so the agent can retry', async () => {
    orderService.updateOrderStatus.mockRejectedValue(new Error('حالة غير صالحة'));
    const prismaMock = {
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      order: { update: jest.fn().mockResolvedValue({}) }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await agentWorkspaceController.quickAction({
      ...baseReq,
      body: { action: 'confirm', notes: 'تأكيد' }
    }, res);

    expect(res.statusCode).toBe(500);
    // الإصلاح الجوهري: إبطال الإسناد بعد نجاح الحالة لا قبلها — فشل الحالة
    // لم يعد يسرق ملكية الطلب من الموظف ويحجب إعادة المحاولة بـ 403
    expect(prismaMock.orderAssignment.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });
});

describe('agentWorkspaceController.logCallAttempt', () => {
  const baseReq = {
    params: { id: 'order-1' },
    user: {
      id: 'user-1',
      effectiveCompanyId: 'company-1'
    }
  };

  const mockTx = {
    order: { update: jest.fn().mockResolvedValue({}) },
    guestOrder: { update: jest.fn().mockResolvedValue({}) },
    callAttemptLog: { create: jest.fn().mockResolvedValue({}) }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('logs a call attempt for a regular order inside a transaction', async () => {
    getSharedPrismaClient.mockReturnValue({
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1' })
      },
      $transaction: jest.fn((cb) => cb(mockTx))
    });

    const res = createResponse();
    await agentWorkspaceController.logCallAttempt({
      ...baseReq,
      body: { result: 'reached', notes: 'رد العميل' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(mockTx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1', companyId: 'company-1' },
      data: { callAttempts: { increment: 1 }, lastCallAttemptAt: expect.any(Date) }
    });
    expect(mockTx.callAttemptLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-1',
        companyId: 'company-1',
        userId: 'user-1',
        result: 'reached',
        notes: 'رد العميل'
      })
    });
    expect(mockTx.guestOrder.update).not.toHaveBeenCalled();
  });

  test('logs a call attempt for a guest order inside a transaction', async () => {
    getSharedPrismaClient.mockReturnValue({
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: 'order-1', orderId: null })
      },
      $transaction: jest.fn((cb) => cb(mockTx))
    });

    const res = createResponse();
    await agentWorkspaceController.logCallAttempt({
      ...baseReq,
      body: { result: 'unreached', notes: 'لا رد' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(mockTx.guestOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1', companyId: 'company-1' },
      data: { callAttempts: { increment: 1 }, lastCallAt: expect.any(Date) }
    });
    expect(mockTx.callAttemptLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guestOrderId: 'order-1',
        userId: 'user-1',
        result: 'unreached',
        notes: 'لا رد'
      })
    });
    expect(mockTx.order.update).not.toHaveBeenCalled();
  });

  test('rejects an invalid call result value with 400', async () => {
    getSharedPrismaClient.mockReturnValue({
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1' })
      },
      $transaction: jest.fn((cb) => cb(mockTx))
    });

    const res = createResponse();
    await agentWorkspaceController.logCallAttempt({
      ...baseReq,
      body: { result: 'bogus', notes: 'test' }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      success: false,
      error: 'قيمة نتيجة مكالمة غير صالحة'
    });
    expect(mockTx.order.update).not.toHaveBeenCalled();
    expect(mockTx.callAttemptLog.create).not.toHaveBeenCalled();
  });

  test('schedules a default 24h follow-up when the result is callback and none exists', async () => {
    const tx = {
      order: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ followUpDate: null })
      },
      guestOrder: { update: jest.fn().mockResolvedValue({}) },
      callAttemptLog: { create: jest.fn().mockResolvedValue({}) }
    };
    getSharedPrismaClient.mockReturnValue({
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1' })
      },
      $transaction: jest.fn((cb) => cb(tx))
    });

    const res = createResponse();
    await agentWorkspaceController.logCallAttempt({
      ...baseReq,
      body: { result: 'callback', notes: 'سأعود للعميل' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1', companyId: 'company-1' },
        data: expect.objectContaining({
          callAttempts: { increment: 1 },
          followUpDate: expect.any(Date)
        })
      })
    );
  });

  test('keeps an existing future follow-up when the result is callback', async () => {
    const futureDate = new Date(Date.now() + 3 * 86400000);
    const tx = {
      order: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ followUpDate: futureDate })
      },
      guestOrder: { update: jest.fn().mockResolvedValue({}) },
      callAttemptLog: { create: jest.fn().mockResolvedValue({}) }
    };
    getSharedPrismaClient.mockReturnValue({
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1' })
      },
      $transaction: jest.fn((cb) => cb(tx))
    });

    const res = createResponse();
    await agentWorkspaceController.logCallAttempt({
      ...baseReq,
      body: { result: 'callback', notes: 'test' }
    }, res);

    expect(res.statusCode).toBe(200);
    const updateArg = tx.order.update.mock.calls[0][0];
    expect(updateArg.data.followUpDate).toBeUndefined();
  });
});

describe('agentWorkspaceController.scheduleFollowUp', () => {
  const baseReq = {
    params: { id: 'order-1' },
    user: {
      id: 'user-1',
      effectiveCompanyId: 'company-1'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('schedules a follow-up for a regular order', async () => {
    const prismaMock = {
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1' })
      },
      order: { update: jest.fn().mockResolvedValue({}) },
      guestOrder: { update: jest.fn().mockResolvedValue({}) }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await agentWorkspaceController.scheduleFollowUp({
      ...baseReq,
      body: { followUpDate: '2027-06-05T10:00:00.000Z' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1', companyId: 'company-1' },
      data: { followUpDate: expect.any(Date) }
    });
    expect(prismaMock.guestOrder.update).not.toHaveBeenCalled();
  });

  test('schedules a follow-up for a guest order', async () => {
    const prismaMock = {
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: 'order-1', orderId: null })
      },
      order: { update: jest.fn().mockResolvedValue({}) },
      guestOrder: { update: jest.fn().mockResolvedValue({}) }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await agentWorkspaceController.scheduleFollowUp({
      ...baseReq,
      body: { followUpDate: '2027-06-05T10:00:00.000Z' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prismaMock.guestOrder.update).toHaveBeenCalledWith({
      where: { id: 'order-1', companyId: 'company-1' },
      data: { followUpDate: expect.any(Date) }
    });
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  test('rejects an invalid followUpDate with 400', async () => {
    const prismaMock = {
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1' })
      },
      order: { update: jest.fn().mockResolvedValue({}) },
      guestOrder: { update: jest.fn().mockResolvedValue({}) }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await agentWorkspaceController.scheduleFollowUp({
      ...baseReq,
      body: { followUpDate: 'not-a-date' }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      success: false,
      error: 'تاريخ المتابعة غير صالح'
    });
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.guestOrder.update).not.toHaveBeenCalled();
  });

  test('rejects a past followUpDate with 400', async () => {
    const prismaMock = {
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1' })
      },
      order: { update: jest.fn().mockResolvedValue({}) },
      guestOrder: { update: jest.fn().mockResolvedValue({}) }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const res = createResponse();
    await agentWorkspaceController.scheduleFollowUp({
      ...baseReq,
      body: { followUpDate: pastDate }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      success: false,
      error: 'يجب أن يكون تاريخ المتابعة في المستقبل'
    });
    expect(prismaMock.order.update).not.toHaveBeenCalled();
    expect(prismaMock.guestOrder.update).not.toHaveBeenCalled();
  });

  test('accepts a valid future followUpDate', async () => {
    const prismaMock = {
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({ guestOrderId: null, orderId: 'order-1' })
      },
      order: { update: jest.fn().mockResolvedValue({}) },
      guestOrder: { update: jest.fn().mockResolvedValue({}) }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const res = createResponse();
    await agentWorkspaceController.scheduleFollowUp({
      ...baseReq,
      body: { followUpDate: futureDate }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1', companyId: 'company-1' },
      data: { followUpDate: expect.any(Date) }
    });
  });
});

describe('agentWorkspaceController manager fleet operations', () => {
  const managerReq = {
    user: {
      id: 'manager-1',
      role: 'MANAGER',
      effectiveCompanyId: 'company-1'
    }
  };

  test('allows manager to query unassigned orders', async () => {
    const unassignedOrder = createOrder('unassigned-1', 'PENDING');
    const prismaMock = {
      order: {
        findMany: jest.fn().mockResolvedValue([unassignedOrder]),
        count: jest.fn().mockResolvedValue(1)
      },
      guestOrder: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0)
      },
      orderAssignment: {
        count: jest.fn().mockResolvedValue(0)
      }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await agentWorkspaceController.getMyOrders({
      ...managerReq,
      query: { assignedTo: 'unassigned' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.length).toBe(1);
    expect(res.payload.data[0].id).toBe('unassigned-1');
  });

  test('allows manager supervisor override to confirm an order without 403', async () => {
    orderService.updateOrderStatus.mockResolvedValue({ status: 'CONFIRMED' });
    const prismaMock = {
      orderAssignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'assign-agent-9',
          orderId: 'order-1',
          assignedTo: 'agent-9',
          isActive: true
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      order: {
        update: jest.fn().mockResolvedValue({})
      }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await agentWorkspaceController.quickAction({
      ...managerReq,
      params: { id: 'order-1' },
      body: { action: 'confirm', notes: 'تأكيد إشرافي' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prismaMock.orderAssignment.updateMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        isActive: true,
        OR: [{ orderId: 'order-1' }, { guestOrderId: 'order-1' }]
      },
      data: { isActive: false }
    });
  });

  test('stats for the unassigned filter reflect the unassigned pool, not the whole team', async () => {
    const prismaMock = {
      order: {
        findMany: jest.fn().mockResolvedValue([createOrder('u1', 'PENDING')]),
        count: jest.fn().mockResolvedValue(2)
      },
      guestOrder: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1)
      },
      guestCart: { count: jest.fn().mockResolvedValue(7) },
      orderAssignment: { count: jest.fn().mockResolvedValue(0) }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await agentWorkspaceController.getMyOrders({
      ...managerReq,
      query: { assignedTo: 'unassigned', withStats: 'true' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.stats).toEqual({
      total: 3,
      pending: 3,
      confirmed: 0,
      cancelled: 0,
      followup: 0,
      incomplete: 7
    });
    expect(prismaMock.orderAssignment.count).not.toHaveBeenCalled();
  });
});

describe('agentWorkspaceController.requireManager', () => {
  test('blocks non-manager users with 403 before the handler runs', async () => {
    const res = createResponse();
    const next = jest.fn();

    await agentWorkspaceController.requireManager(
      { user: { id: 'u1', role: 'AGENT', effectiveCompanyId: 'company-1' } },
      res,
      next
    );

    expect(res.statusCode).toBe(403);
    expect(res.payload.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  test('lets managers and team leaders through to the handler', async () => {
    const next = jest.fn();

    await agentWorkspaceController.requireManager(
      { user: { id: 'm1', role: 'TEAM_LEADER', effectiveCompanyId: 'company-1' } },
      createResponse(),
      next
    );

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('agentWorkspaceController.assignOrder', () => {
  const managerReq = {
    user: { id: 'manager-1', role: 'MANAGER', effectiveCompanyId: 'company-1' }
  };

  test('rejects assigning to a user who is not an active member of the company', async () => {
    const prismaMock = {
      userCompany: { findFirst: jest.fn().mockResolvedValue(null) },
      order: { findFirst: jest.fn() }
    };
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await agentWorkspaceController.assignOrder({
      ...managerReq,
      body: { orderId: 'order-1', targetUserId: 'outsider-1' }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(prismaMock.order.findFirst).not.toHaveBeenCalled();
  });

  test('assigns a regular order to an active member of the same company inside a transaction', async () => {
    const prismaMock = {
      userCompany: { findFirst: jest.fn().mockResolvedValue({ id: 'uc-1' }) },
      order: {
        findFirst: jest.fn().mockResolvedValue({ id: 'order-1', companyId: 'company-1' }),
        update: jest.fn().mockResolvedValue({})
      },
      orderAssignment: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({})
      },
      guestOrder: { findFirst: jest.fn() },
      $transaction: null
    };
    prismaMock.$transaction = jest.fn((cb) => cb(prismaMock));
    getSharedPrismaClient.mockReturnValue(prismaMock);

    const res = createResponse();
    await agentWorkspaceController.assignOrder({
      ...managerReq,
      body: { orderId: 'order-1', targetUserId: 'agent-2' }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(prismaMock.orderAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: 'company-1', orderId: 'order-1', assignedTo: 'agent-2' })
      })
    );
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'order-1' }, data: expect.objectContaining({ assignedTo: 'agent-2' }) })
    );
    // الإسناد القديم أُلغي قبل إنشاء الجديد داخل نفس المعاملة
    const calls = prismaMock.orderAssignment.updateMany.mock.invocationCallOrder[0];
    const createCall = prismaMock.orderAssignment.create.mock.invocationCallOrder[0];
    expect(calls).toBeLessThan(createCall);
  });
});

