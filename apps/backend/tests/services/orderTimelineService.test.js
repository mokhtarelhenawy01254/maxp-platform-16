let activeMockPrisma = null;
jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => activeMockPrisma,
  safeQuery: async (fn) => fn(),
}));

const orderTimelineService = require('../../services/orderTimelineService');
const { logOrderEvent, ORDER_EVENT_ACTIONS } = require('../../services/orderEventLogger');
const orderService = require('../../services/orderService');

describe('orderTimelineService & orderEventLogger (TASK f55c6321)', () => {
  const companyId = 'comp_test_1';
  const orderId = 'ord_test_1';
  const orderNumber = 'ORD-397979-898';

  const baseOrder = {
    id: orderId,
    orderNumber,
    companyId,
    status: 'PROCESSING',
    paymentStatus: 'COMPLETED',
    paymentMethod: 'CREDIT_CARD',
    total: 835,
    discount: 50,
    sourceType: 'storefront',
    extractionMethod: 'checkout',
    createdBy: null,
    createdByName: null,
    createdAt: new Date('2026-11-10T10:00:00.000Z'),
    updatedAt: new Date('2026-11-10T12:00:00.000Z'),
    metadata: JSON.stringify({
      kashierTransactionId: 'TX-KSH-9988',
      kashierPayment: {
        transactionId: 'TX-KSH-9988',
        status: 'SUCCESS',
        amount: 835,
        currency: 'EGP',
        method: 'card',
        confirmedAt: '2026-11-10T10:05:00.000Z',
      },
      discountApprovalStatus: 'APPROVED',
      discountApprovedBy: 'مدير المبيعات',
      discountApprovedById: 'user_mgr_1',
      discountApprovedAt: '2026-11-10T10:10:00.000Z',
    }),
  };

  function createMockPrisma(overrides = {}) {
    return {
      order: {
        findFirst: jest.fn().mockResolvedValue(baseOrder),
        create: jest.fn(),
        update: jest.fn(),
        ...overrides.order,
      },
      guestOrder: {
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        ...overrides.guestOrder,
      },
      orderStatusHistory: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.orderStatusHistory,
      },
      activityLog: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: `act_${Date.now()}`, ...data })),
        update: jest.fn(),
        delete: jest.fn(),
        ...overrides.activityLog,
      },
      orderNote: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.orderNote,
      },
      orderAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        ...overrides.orderAssignment,
      },
      callAttemptLog: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.callAttemptLog,
      },
      orderWorkflowAuditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.orderWorkflowAuditLog,
      },
    };
  }

  test('covers all 8 event types (create, status, payment, discount, edit, note, assign, call) with zero duplicates', async () => {
    const prisma = createMockPrisma({
      orderStatusHistory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sh_1',
            orderId,
            status: 'CONFIRMED',
            oldStatus: 'PENDING',
            changedBy: 'user_agent_1',
            userName: 'أحمد محمد',
            reason: 'تأكيد الطلب مع العميل',
            createdAt: new Date('2026-11-10T10:15:00.000Z'),
          },
        ]),
      },
      activityLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'act_create',
            companyId,
            userId: 'user_creator_1',
            category: 'orders',
            action: ORDER_EVENT_ACTIONS.ORDER_CREATED,
            description: 'إنشاء الطلب',
            targetType: 'order',
            targetId: orderId,
            targetName: orderNumber,
            metadata: JSON.stringify({ orderId, sourceType: 'storefront', companyId }),
            createdAt: new Date('2026-11-10T10:00:00.000Z'),
            user: { id: 'user_creator_1', firstName: 'سارة', lastName: 'علي', avatar: null },
          },
          {
            id: 'act_pay',
            companyId,
            userId: null,
            category: 'orders',
            action: ORDER_EVENT_ACTIONS.PAYMENT_SUCCEEDED,
            description: 'نجاح الدفع عبر كاشير',
            targetType: 'order',
            targetId: orderId,
            targetName: orderNumber,
            metadata: JSON.stringify({ orderId, transactionId: 'TX-KSH-9988', companyId }),
            createdAt: new Date('2026-11-10T10:05:00.000Z'),
            user: null,
          },
          {
            id: 'act_disc',
            companyId,
            userId: 'user_mgr_1',
            category: 'orders',
            action: ORDER_EVENT_ACTIONS.DISCOUNT_APPROVED,
            description: 'اعتماد الخصم',
            targetType: 'order',
            targetId: orderId,
            targetName: orderNumber,
            metadata: JSON.stringify({ orderId, companyId }),
            createdAt: new Date('2026-11-10T10:10:00.000Z'),
            user: { id: 'user_mgr_1', firstName: 'خالد', lastName: 'حسن', avatar: null },
          },
          {
            id: 'act_edit',
            companyId,
            userId: 'user_agent_1',
            category: 'orders',
            action: ORDER_EVENT_ACTIONS.ORDER_UPDATED,
            description: 'تحديث عنوان العميل',
            targetType: 'order',
            targetId: orderId,
            targetName: orderNumber,
            metadata: JSON.stringify({
              orderId,
              before: { shippingAddress: 'القاهرة' },
              after: { shippingAddress: 'الجيزة' },
              companyId,
            }),
            createdAt: new Date('2026-11-10T10:20:00.000Z'),
            user: { id: 'user_agent_1', firstName: 'أحمد', lastName: 'محمد', avatar: null },
          },
        ]),
      },
      orderNote: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'note_1',
            orderId,
            content: 'العميل يطلب التسليم مساءً',
            authorId: 'user_agent_1',
            authorName: 'أحمد محمد',
            createdAt: new Date('2026-11-10T10:25:00.000Z'),
            user: { id: 'user_agent_1', firstName: 'أحمد', lastName: 'محمد', avatar: null },
          },
        ]),
      },
      orderAssignment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'assign_1',
            orderId,
            companyId,
            assignedTo: 'user_agent_1',
            assignedBy: 'user_mgr_1',
            assignedAt: new Date('2026-11-10T10:02:00.000Z'),
            strategy: 'ROUND_ROBIN',
            isActive: true,
            metadata: null,
          },
        ]),
      },
      callAttemptLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'call_1',
            orderId,
            userId: 'user_agent_1',
            direction: 'OUTBOUND',
            callStatus: 'COMPLETED',
            durationSeconds: 45,
            result: 'CONFIRMED',
            createdAt: new Date('2026-11-10T10:14:00.000Z'),
            user: { id: 'user_agent_1', firstName: 'أحمد', lastName: 'محمد', avatar: null },
          },
        ]),
      },
    });

    const result1 = await orderTimelineService.getOrderTimeline(companyId, orderNumber, { prisma });
    const result2 = await orderTimelineService.getOrderTimeline(companyId, orderNumber, { prisma });

    const types = new Set(result1.events.map((e) => e.type));
    expect(types).toEqual(new Set(['create', 'status', 'payment', 'discount', 'edit', 'note', 'assign', 'call']));
    expect(result1.events.length).toBe(8);
    expect(result1.total).toBe(8);

    // Zero duplicates
    expect(new Set(result1.events.map((e) => e.eventKey)).size).toBe(result1.events.length);

    // Consecutive reads are strictly identical (no disappearing events)
    expect(result2.events.length).toBe(result1.events.length);
    expect(result2.total).toBe(result1.total);
    expect(result2.events.map((e) => e.eventKey)).toEqual(result1.events.map((e) => e.eventKey));
  });

  test('synthesizes order.created, order.payment.succeeded, and order.discount.approved at read time without DB writes', async () => {
    const zeroEventOrder = {
      ...baseOrder,
      status: 'PENDING',
    };
    const prisma = createMockPrisma({
      order: { findFirst: jest.fn().mockResolvedValue(zeroEventOrder) },
    });

    const res = await orderTimelineService.getOrderTimeline(companyId, orderNumber, { prisma });

    expect(res).not.toBeNull();
    expect(res.events.length).toBeGreaterThanOrEqual(3);
    expect(res.events.some((e) => e.action === 'order.created' && e.meta.sourceType === 'storefront')).toBe(true);
    expect(
      res.events.some(
        (e) => e.action === 'order.payment.succeeded' && e.meta.transactionId === 'TX-KSH-9988'
      )
    ).toBe(true);
    expect(res.events.some((e) => e.action === 'order.discount.approved')).toBe(true);

    // Zero DB writes occurred during read
    expect(prisma.activityLog.create).not.toHaveBeenCalled();
    expect(prisma.activityLog.update).not.toHaveBeenCalled();
    expect(prisma.activityLog.delete).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  test('filters by type & actorId with total computed from filtered result, and paginates via cursor', async () => {
    const prisma = createMockPrisma({
      activityLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'a1',
            companyId,
            userId: 'actor_1',
            category: 'orders',
            action: ORDER_EVENT_ACTIONS.PAYMENT_SUCCEEDED,
            description: 'دفع 1',
            targetType: 'order',
            targetId: orderId,
            metadata: JSON.stringify({ orderId }),
            createdAt: new Date('2026-11-10T11:00:00.000Z'),
            user: { id: 'actor_1', firstName: 'Ali', lastName: 'Hassan' },
          },
          {
            id: 'a2',
            companyId,
            userId: 'actor_2',
            category: 'orders',
            action: ORDER_EVENT_ACTIONS.PAYMENT_REFUNDED,
            description: 'استرداد 2',
            targetType: 'order',
            targetId: orderId,
            metadata: JSON.stringify({ orderId }),
            createdAt: new Date('2026-11-10T11:05:00.000Z'),
            user: { id: 'actor_2', firstName: 'Mona', lastName: 'Sami' },
          },
          {
            id: 'a3',
            companyId,
            userId: 'actor_1',
            category: 'orders',
            action: ORDER_EVENT_ACTIONS.ORDER_UPDATED,
            description: 'تعديل 3',
            targetType: 'order',
            targetId: orderId,
            metadata: JSON.stringify({ orderId }),
            createdAt: new Date('2026-11-10T11:10:00.000Z'),
            user: { id: 'actor_1', firstName: 'Ali', lastName: 'Hassan' },
          },
        ]),
      },
    });

    const paymentPage1 = await orderTimelineService.getOrderTimeline(companyId, orderNumber, {
      prisma,
      type: 'payment',
      limit: 1,
    });
    expect(paymentPage1.events).toHaveLength(1);
    expect(paymentPage1.total).toBe(2);
    expect(paymentPage1.hasMore).toBe(true);
    expect(paymentPage1.events[0].type).toBe('payment');

    const paymentPage2 = await orderTimelineService.getOrderTimeline(companyId, orderNumber, {
      prisma,
      type: 'payment',
      cursor: paymentPage1.nextCursor,
      limit: 1,
    });
    expect(paymentPage2.events).toHaveLength(1);
    expect(paymentPage2.hasMore).toBe(false);
    expect(paymentPage2.events[0].eventKey).not.toBe(paymentPage1.events[0].eventKey);

    const byActor = await orderTimelineService.getOrderTimeline(companyId, orderNumber, {
      prisma,
      actorId: 'actor_1',
    });
    expect(byActor.total).toBe(2);
    expect(byActor.events.every((e) => e.actor.id === 'actor_1')).toBe(true);
  });

  test('suppresses duplicate status_history/Kashier notes and deduplicates activity_log status mirror', async () => {
    const prisma = createMockPrisma({
      orderStatusHistory: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sh_1',
            orderId,
            status: 'CONFIRMED',
            oldStatus: 'PENDING',
            changedBy: 'u1',
            userName: 'User 1',
            reason: 'تأكيد',
            createdAt: new Date('2026-11-10T12:00:00.000Z'),
          },
          {
            id: 'sh_disc',
            orderId,
            status: 'CONFIRMED',
            oldStatus: 'CONFIRMED',
            changedBy: 'u1',
            userName: 'User 1',
            reason: 'اعتماد الخصم بقيمة 50 ج.م بواسطة User 1',
            createdAt: new Date('2026-11-10T12:01:00.000Z'),
          },
        ]),
      },
      activityLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'act_status_dup',
            companyId,
            userId: 'u1',
            category: 'orders',
            action: 'order.status.change',
            description: 'تغيير الحالة',
            targetType: 'order',
            targetId: orderId,
            metadata: JSON.stringify({ orderId, newStatus: 'CONFIRMED' }),
            createdAt: new Date('2026-11-10T12:00:01.000Z'),
            user: null,
          },
          {
            id: 'act_disc',
            companyId,
            userId: 'u1',
            category: 'orders',
            action: ORDER_EVENT_ACTIONS.DISCOUNT_APPROVED,
            description: 'اعتماد الخصم',
            targetType: 'order',
            targetId: orderId,
            metadata: JSON.stringify({ orderId }),
            createdAt: new Date('2026-11-10T12:01:00.000Z'),
            user: null,
          },
          {
            id: 'act_pay',
            companyId,
            userId: null,
            category: 'orders',
            action: ORDER_EVENT_ACTIONS.PAYMENT_SUCCEEDED,
            description: 'دفع كاشير',
            targetType: 'order',
            targetId: orderId,
            metadata: JSON.stringify({ orderId, transactionId: 'TX-1' }),
            createdAt: new Date('2026-11-10T12:02:00.000Z'),
            user: null,
          },
        ]),
      },
      orderNote: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'note_kashier',
            orderId,
            content: 'تم الدفع إلكترونياً عبر كاشير بنجاح',
            authorName: 'Kashier Gateway',
            createdAt: new Date('2026-11-10T12:02:00.000Z'),
          },
        ]),
      },
    });

    const res = await orderTimelineService.getOrderTimeline(companyId, orderNumber, { prisma });
    expect(res.events.map((e) => e.eventKey)).toEqual([
      'activity_log:act_pay',
      'activity_log:act_disc',
      'status_history:sh_1',
    ]);
  });

  test('logOrderEvent writes append-only activityLog with targetType=order and companyId, normalizing SYSTEM userId to null', async () => {
    const prisma = createMockPrisma();
    await logOrderEvent({
      prisma,
      companyId,
      orderId,
      orderNumber,
      action: ORDER_EVENT_ACTIONS.PAYMENT_SUCCEEDED,
      userId: 'KASHIER_WEBHOOK',
      userName: 'Kashier Gateway',
      before: { paymentStatus: 'PENDING' },
      after: { paymentStatus: 'COMPLETED', transactionId: 'TX-55' },
    });

    expect(prisma.activityLog.create).toHaveBeenCalledTimes(1);
    const callArg = prisma.activityLog.create.mock.calls[0][0].data;
    expect(callArg.companyId).toBe(companyId);
    expect(callArg.targetType).toBe('order');
    expect(callArg.targetId).toBe(orderId);
    expect(callArg.category).toBe('orders');
    expect(callArg.action).toBe('order.payment.succeeded');
    expect(callArg.userId).toBeNull();
    expect(callArg.isLocked).toBe(true);

    const parsedMeta = JSON.parse(callArg.metadata);
    expect(parsedMeta.before).toEqual({ paymentStatus: 'PENDING' });
    expect(parsedMeta.after).toEqual({ paymentStatus: 'COMPLETED', transactionId: 'TX-55' });
    expect(parsedMeta.companyId).toBe(companyId);
  });

  test('orderService transitions write events via logOrderEvent / statusHistory once per transition', async () => {
    const prisma = createMockPrisma({
      order: {
        findFirst: jest.fn().mockResolvedValue({
          ...baseOrder,
          status: 'PENDING',
          shippingAddress: 'القاهرة',
          notes: 'ملاحظة قديمة',
          company: { orderWorkflowConfig: null },
        }),
        update: jest.fn().mockResolvedValue({
          ...baseOrder,
          status: 'CONFIRMED',
          shippingAddress: 'الإسكندرية',
        }),
      },
    });

    const originalGetPrisma = orderService.getPrisma;
    activeMockPrisma = prisma;
    orderService.getPrisma = () => prisma;
    orderService.autoCreateTurboShipmentForOrder = jest.fn().mockResolvedValue(null);
    orderService.validateConfiguredStatusTransition = jest.fn().mockResolvedValue(true);
    try {
      await orderService.confirmOrder(orderNumber, companyId, 'الإسكندرية');
      expect(prisma.activityLog.create).toHaveBeenCalledTimes(1);
      expect(prisma.activityLog.create.mock.calls[0][0].data.action).toBe(ORDER_EVENT_ACTIONS.ORDER_UPDATED);

      prisma.activityLog.create.mockClear();
      await orderService.updateOrderStatus(orderNumber, companyId, 'CONFIRMED', 'تحديث', 'user_1', 'Admin', null, false, {
        updatedFields: { city: 'الجيزة' },
        skipTransitionValidation: true,
        skipCallAttemptGuard: true,
      });
      expect(prisma.activityLog.create).toHaveBeenCalledTimes(1);
      expect(prisma.activityLog.create.mock.calls[0][0].data.action).toBe(ORDER_EVENT_ACTIONS.ORDER_UPDATED);
    } finally {
      activeMockPrisma = null;
      orderService.getPrisma = originalGetPrisma;
    }
  });
});
