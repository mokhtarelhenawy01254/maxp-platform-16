const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderService = require('../services/orderService');

/**
 * Agent Workspace Controller
 * Handles orders assigned to specific agents
 */

// Must only contain valid OrderStatus enum values (see prisma/schema/enums.prisma) — 'DELETED' and 'COMPLETED' are not part of the enum and would make Prisma reject the query.
const WORKSPACE_EXCLUDED_STATUSES = new Set(['TRASH']);

const ALLOWED_CALL_RESULTS = ['unreached', 'reached', 'busy', 'wrong_number', 'callback'];

const normalizeWorkspaceStatus = (value) => String(value || '').trim().toUpperCase();
const normalizeActionNote = (value) => String(value || '').trim();
const normalizeQuickActionStatus = (value) => {
  const normalizedStatus = normalizeWorkspaceStatus(value);
  return normalizedStatus === 'CANCELED' ? 'CANCELLED' : normalizedStatus;
};
const isCancellationStatus = (value) => normalizeQuickActionStatus(value) === 'CANCELLED';
const getCancellationReasonError = () => 'سبب إلغاء الطلب مطلوب عند اختيار حالة ملغي';

const parseBooleanParam = (value) => value === true || value === 'true' || value === '1';

const buildWorkspaceWhere = (companyId, userId, { requestedStatus = '', followUpOnly = false } = {}) => {
  const where = { companyId, assignedTo: userId, isActive: true };

  if (requestedStatus) {
    where.OR = [
      { order: { status: requestedStatus } },
      { guestOrder: { status: requestedStatus } }
    ];
  } else if (followUpOnly) {
    where.OR = [
      { order: { followUpDate: { not: null }, status: { not: 'CANCELLED' } } },
      { guestOrder: { followUpDate: { not: null }, status: { not: 'CANCELLED' } } }
    ];
  } else {
    where.OR = [
      { order: { status: { notIn: [...WORKSPACE_EXCLUDED_STATUSES] } } },
      { guestOrder: { status: { notIn: [...WORKSPACE_EXCLUDED_STATUSES] } } }
    ];
  }

  return where;
};

const getWorkspaceStats = async (prisma, companyId, userId) => {
  const base = { companyId, assignedTo: userId, isActive: true };

  const statusWhere = (status) => ({
    ...base,
    OR: [
      { order: { status } },
      { guestOrder: { status } }
    ]
  });

  const excludedWhere = {
    ...base,
    OR: [
      { order: { status: { notIn: [...WORKSPACE_EXCLUDED_STATUSES] } } },
      { guestOrder: { status: { notIn: [...WORKSPACE_EXCLUDED_STATUSES] } } }
    ]
  };

  const followupWhere = {
    ...base,
    OR: [
      { order: { followUpDate: { not: null }, status: { not: 'CANCELLED' } } },
      { guestOrder: { followUpDate: { not: null }, status: { not: 'CANCELLED' } } }
    ]
  };

  const [total, pending, confirmed, cancelled, followup] = await Promise.all([
    prisma.orderAssignment.count({ where: excludedWhere }),
    prisma.orderAssignment.count({ where: statusWhere('PENDING') }),
    prisma.orderAssignment.count({ where: statusWhere('CONFIRMED') }),
    prisma.orderAssignment.count({ where: statusWhere('CANCELLED') }),
    prisma.orderAssignment.count({ where: followupWhere })
  ]);

  return { total, pending, confirmed, cancelled, followup };
};

const assertWorkspaceOrderOwnership = async (prisma, companyId, userId, id) => {
  const assignment = await prisma.orderAssignment.findFirst({
    where: {
      companyId,
      assignedTo: userId,
      isActive: true,
      OR: [{ orderId: id }, { guestOrderId: id }]
    }
  });
  if (!assignment) {
    const err = new Error('لا تملك صلاحية التعامل مع هذا الطلب');
    err.statusCode = 403;
    throw err;
  }
  return { type: assignment.guestOrderId ? 'GUEST' : 'REGULAR', assignment };
};

const getMyOrders = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(403).json({ success: false, error: 'معرف الشركة أو المستخدم مطلوب' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const requestedStatus = normalizeWorkspaceStatus(req.query.status);
    const followUpOnly = parseBooleanParam(req.query.followUpOnly);
    const withStats = parseBooleanParam(req.query.withStats);
    const sortParam = String(req.query.sort || '').toLowerCase();
    const sort = ['recent', 'oldest', 'attempts'].includes(sortParam) ? sortParam : 'recent';

    const prisma = getSharedPrismaClient();

    // Filtering happens server-side in the DB so pagination never depends on
    // stale client-side slices of the full assignment list.
    const where = buildWorkspaceWhere(companyId, userId, { requestedStatus, followUpOnly });

    let orderBy = [{ assignedAt: 'desc' }];
    if (sort === 'oldest') {
      orderBy = [{ assignedAt: 'asc' }];
    } else if (sort === 'attempts') {
      orderBy = [
        { order: { callAttempts: 'desc' } },
        { guestOrder: { callAttempts: 'desc' } },
        { order: { createdAt: 'asc' } },
        { guestOrder: { createdAt: 'asc' } }
      ];
      // Fallback if Prisma rejects ordering by optional relations at runtime:
      // orderBy = [{ assignedAt: 'asc' }];
    }

    const [assignments, total] = await Promise.all([
      prisma.orderAssignment.findMany({
        where,
        include: {
          order: {
            include: {
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  deliveryRate: true,
                  totalDelivered: true,
                  totalOrdersCount: true,
                  customerRating: true,
                }
              },
              orderItems: { include: { product: true } },
              callAttemptLogs: {
                include: { user: { select: { firstName: true, lastName: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10
              }
            }
          },
          guestOrder: {
            include: {
              orderNotes: true,
              callAttemptLogs: {
                include: { user: { select: { firstName: true, lastName: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10
              }
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.orderAssignment.count({ where })
    ]);

    const formattedOrders = assignments.map(a => {
      const order = a.order || a.guestOrder;
      const isGuest = !!a.guestOrder;

      // Parse regular order items
      let items = [];
      if (!isGuest && order.orderItems?.length > 0) {
        items = order.orderItems.map(item => ({
          productName: item.productName || item.product?.name || 'منتج',
          name: item.productName || item.product?.name || 'منتج',
          quantity: item.quantity || 1,
          price: parseFloat(item.price || 0),
          total: parseFloat(item.total || (item.price * item.quantity) || 0),
          productColor: item.productColor,
          productSize: item.productSize,
        }));
      } else if (isGuest && order.items) {
        // Guest orders store items as JSON string or array
        try {
          const parsed = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          if (Array.isArray(parsed)) {
            items = parsed.map(item => ({
              productName: item.productName || item.name || 'منتج',
              name: item.productName || item.name || 'منتج',
              quantity: item.quantity || 1,
              price: parseFloat(item.price || item.unitPrice || 0),
              total: parseFloat(item.total || (item.price * item.quantity) || 0),
            }));
          }
        } catch (e) {
          items = [];
        }
      }

      // Calculate subtotal from items if not directly available
      const itemsSubtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
      const subtotal = parseFloat(order.subtotal || order.itemsTotal || itemsSubtotal || 0);
      const shipping = parseFloat(order.shippingCost || order.shipping || order.deliveryCost || 0);

      const rawShippingAddress = isGuest
        ? order.shippingAddress
        : (order.shippingAddress || order.customerAddress || '');
      const shippingAddressStr = typeof rawShippingAddress === 'string'
        ? rawShippingAddress
        : (typeof rawShippingAddress === 'object' && rawShippingAddress !== null
            ? (rawShippingAddress.address || rawShippingAddress.street || '')
            : '');

      let attribution = null;
      if (order.metadata) {
        try {
          const metaObj = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata;
          if (metaObj && typeof metaObj === 'object') {
            attribution = {
              source: metaObj.source || metaObj.platform || metaObj.utm_source || null,
              campaignName: metaObj.campaignName || metaObj.utm_campaign || metaObj.campaign || null,
              adSetId: metaObj.adSetId || metaObj.adsetId || null,
              adId: metaObj.adId || metaObj.adid || null,
            };
          }
        } catch {
          // ignore metadata json parsing errors
        }
      }

      const callLogs = Array.isArray(order.callAttemptLogs)
        ? order.callAttemptLogs.map(l => ({
            id: l.id,
            result: l.result || 'unreached',
            notes: l.notes || '',
            createdAt: l.createdAt,
            userName: (l.user?.firstName || l.user?.lastName)
              ? `${l.user?.firstName || ''} ${l.user?.lastName || ''}`.trim()
              : 'موظف',
          }))
        : [];

      const customerStats = !isGuest && order.customer ? {
        deliveryRate: typeof order.customer.deliveryRate === 'number' ? order.customer.deliveryRate : null,
        totalDelivered: order.customer.totalDelivered || 0,
        totalOrdersCount: order.customer.totalOrdersCount || 0,
        customerRating: order.customer.customerRating || 'UNKNOWN',
      } : null;

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        type: isGuest ? 'GUEST' : 'REGULAR',
        customerName: isGuest ? order.guestName : (order.customerName || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim()),
        customerPhone: isGuest ? order.guestPhone : (order.customerPhone || order.customer?.phone || ''),
        governorate: order.governorate || order.shippingAddress?.governorate || '',
        city: order.city || order.shippingAddress?.city || '',
        shippingAddress: shippingAddressStr,
        total: parseFloat(order.total || order.finalTotal || 0),
        subtotal,
        shipping,
        status: order.status,
        createdAt: order.createdAt,
        assignedAt: a.assignedAt,
        callAttempts: order.callAttempts || 0,
        lastCallAt: isGuest ? order.lastCallAt : order.lastCallAttemptAt,
        followUpDate: order.followUpDate,
        notes: order.notes || '',
        items,
        callLogs,
        customerStats,
        attribution,
      };
    });

    let stats = null;
    if (withStats) {
      stats = await getWorkspaceStats(prisma, companyId, userId);
    }

    res.json({
      success: true,
      data: formattedOrders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      stats
    });
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in getMyOrders:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب طلباتك' });
  }
};

const logCallAttempt = async (req, res) => {
  try {
    const { id } = req.params; // Order ID or GuestOrder ID
    const { result, notes } = req.body; // type is resolved from the ownership check
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userId = req.user?.id;

    // Validate call result
    let callResult = result;
    if (!callResult) {
      callResult = 'unreached'; // default for backward compatibility
    } else if (!ALLOWED_CALL_RESULTS.includes(callResult)) {
      return res.status(400).json({ success: false, error: 'قيمة نتيجة مكالمة غير صالحة' });
    }

    const prisma = getSharedPrismaClient();
    const now = new Date();

    const { type } = await assertWorkspaceOrderOwnership(prisma, companyId, userId, id);

    if (type === 'GUEST') {
      await prisma.$transaction(async (tx) => {
        await tx.guestOrder.update({
          where: { id, companyId },
          data: {
            callAttempts: { increment: 1 },
            lastCallAt: now
          }
        });
        await tx.callAttemptLog.create({
          data: {
            guestOrderId: id,
            userId,
            result: callResult,
            notes,
            createdAt: now
          }
        });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id, companyId },
          data: {
            callAttempts: { increment: 1 },
            lastCallAttemptAt: now
          }
        });
        await tx.callAttemptLog.create({
          data: {
            orderId: id,
            userId,
            result: callResult,
            notes,
            createdAt: now
          }
        });
      });
    }

    res.json({ success: true, message: 'تم تسجيل محاولة الاتصال بنجاح' });
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in logCallAttempt:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'خطأ في تسجيل المكالمة' });
  }
};

const scheduleFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { followUpDate } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userId = req.user?.id;

    // Validate followUpDate
    if (!followUpDate) {
      return res.status(400).json({ success: false, error: 'يجب تحديد تاريخ المتابعة' });
    }
    const date = new Date(followUpDate);
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ success: false, error: 'تاريخ المتابعة غير صالح' });
    }
    if (date.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: 'يجب أن يكون تاريخ المتابعة في المستقبل' });
    }

    const prisma = getSharedPrismaClient();

    const { type } = await assertWorkspaceOrderOwnership(prisma, companyId, userId, id);

    if (type === 'GUEST') {
      await prisma.guestOrder.update({
        where: { id, companyId },
        data: { followUpDate: date }
      });
    } else {
      await prisma.order.update({
        where: { id, companyId },
        data: { followUpDate: date }
      });
    }

    res.json({ success: true, message: 'تم جدولة المتابعة بنجاح' });
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in scheduleFollowUp:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'خطأ في جدولة المتابعة' });
  }
};

const quickAction = async (req, res) => {
  try {
    const { id } = req.params;
    let { status, action, notes } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    // Mapping action to status if status is missing (support frontend's action parameter)
    if (!status && action) {
      if (action === 'confirm') status = 'CONFIRMED';
      if (action === 'cancel') status = 'CANCELLED';
    }

    if (!status) {
      return res.status(400).json({ success: false, error: 'يجب تحديد حالة الإجراء' });
    }

    const normalizedStatus = normalizeQuickActionStatus(status);
    const actionNotes = normalizeActionNote(notes);

    if (isCancellationStatus(normalizedStatus) && !actionNotes) {
      return res.status(400).json({
        success: false,
        error: getCancellationReasonError()
      });
    }

    const userId = req.user?.id;
    const userName = (req.user?.firstName || req.user?.lastName) 
      ? `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() 
      : (req.user?.email || 'System Agent');

    const prisma = getSharedPrismaClient();
    const { type } = await assertWorkspaceOrderOwnership(prisma, companyId, userId, id);

    if (type === 'GUEST') {
      const updatedGuestOrder = await orderService.updateGuestOrderStatus(
        id,
        companyId,
        normalizedStatus,
        actionNotes || 'اجراء سريع من لوحة الموظف',
        userId,
        userName
      );

      return res.json({
        success: true,
        message: 'تم تنفيذ الإجراء بنجاح',
        data: {
          orderType: 'guest',
          status: updatedGuestOrder.status
        }
      });
    } else {
      const updatedOrder = await orderService.updateOrderStatus(
        id,
        companyId,
        normalizedStatus,
        actionNotes || 'اجراء سريع من لوحة الموظف',
        userId,
        userName
      );

      if (updatedOrder?.workflowStatus === 'pending') {
        return res.json({
          success: true,
          message: 'تم تقديم طلب تغيير الحالة للمراجعة.',
          data: {
            workflowStatus: 'pending',
            requestId: updatedOrder.workflowRequestId
          }
        });
      }
    }

    res.json({ success: true, message: 'تم تنفيذ الإجراء بنجاح' });
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in quickAction:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'خطأ في تنفيذ الإجراء' });
  }
};

module.exports = {
  getMyOrders,
  logCallAttempt,
  scheduleFollowUp,
  quickAction
};
