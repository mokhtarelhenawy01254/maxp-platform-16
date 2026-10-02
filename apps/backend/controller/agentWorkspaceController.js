const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderService = require('../services/orderService');

/**
 * Agent Workspace Controller
 * Handles orders assigned to confirmation agents and supervisor fleet oversight
 */

// Must only contain valid OrderStatus enum values (see prisma/schema/enums.prisma)
const WORKSPACE_EXCLUDED_STATUSES = new Set(['TRASH']);

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'TEAM_LEADER'];
const isManagerUser = (user) => MANAGER_ROLES.includes(String(user?.role || '').toUpperCase());

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

const buildWorkspaceWhere = (companyId, userId, { requestedStatus = '', followUpOnly = false, assignedTo = '', isManager = false } = {}) => {
  const where = { companyId, isActive: true };

  if (isManager && assignedTo && assignedTo !== 'all' && assignedTo !== 'unassigned') {
    where.assignedTo = assignedTo;
  } else if (!isManager || assignedTo === 'me') {
    where.assignedTo = userId;
  }

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

const getWorkspaceStats = async (prisma, companyId, userId, { assignedTo = '', isManager = false } = {}) => {
  const base = { companyId, isActive: true };
  if (isManager && assignedTo && assignedTo !== 'all' && assignedTo !== 'unassigned') {
    base.assignedTo = assignedTo;
  } else if (!isManager || assignedTo === 'me') {
    base.assignedTo = userId;
  }

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

  let incomplete = 0;
  if (prisma.guestCart && typeof prisma.guestCart.count === 'function') {
    try {
      incomplete = await prisma.guestCart.count({
        where: {
          companyId,
          checkoutStartedAt: { not: null },
        }
      });
    } catch (_e) {
      incomplete = 0;
    }
  }

  return { total, pending, confirmed, cancelled, followup, incomplete };
};

const assertWorkspaceOrderOwnership = async (prisma, companyId, userId, id, isManager = false) => {
  const assignment = await prisma.orderAssignment.findFirst({
    where: {
      companyId,
      assignedTo: isManager ? undefined : userId,
      isActive: true,
      OR: [{ orderId: id }, { guestOrderId: id }]
    }
  });

  if (assignment) {
    return { type: assignment.guestOrderId ? 'GUEST' : 'REGULAR', assignment };
  }

  if (isManager) {
    const regular = await prisma.order.findFirst({ where: { id, companyId } });
    if (regular) return { type: 'REGULAR', assignment: null };
    const guest = await prisma.guestOrder.findFirst({ where: { id, companyId } });
    if (guest) return { type: 'GUEST', assignment: null };
  }

  const err = new Error('لا تملك صلاحية التعامل مع هذا الطلب');
  err.statusCode = 403;
  throw err;
};

const formatWorkspaceOrderRecord = (order, isGuest, assignedAt, assignedTo = null, assignedToName = null) => {
  if (!order) return null;

  let items = [];
  if (!isGuest && order.orderItems?.length > 0) {
    items = order.orderItems.map((item) => ({
      productName: item.productName || item.product?.name || 'منتج',
      name: item.productName || item.product?.name || 'منتج',
      quantity: item.quantity || 1,
      price: parseFloat(item.price || 0),
      total: parseFloat(item.total || (item.price * item.quantity) || 0),
      productColor: item.productColor,
      productSize: item.productSize,
    }));
  } else if (isGuest && order.items) {
    try {
      const parsed = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      if (Array.isArray(parsed)) {
        items = parsed.map((item) => ({
          productName: item.productName || item.name || 'منتج',
          name: item.productName || item.name || 'منتج',
          quantity: item.quantity || 1,
          price: parseFloat(item.price || item.unitPrice || 0),
          total: parseFloat(item.total || (item.price * item.quantity) || 0),
        }));
      }
    } catch {
      items = [];
    }
  }

  const itemsSubtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const subtotal = parseFloat(order.subtotal || order.itemsTotal || itemsSubtotal || 0);
  const shipping = parseFloat(order.shippingCost || order.shipping || order.deliveryCost || 0);

  const rawShippingAddress = isGuest
    ? order.shippingAddress
    : (order.shippingAddress || order.customerAddress || '');

  let shippingAddressStr = '';
  let secondaryPhone = null;

  if (typeof rawShippingAddress === 'string') {
    const trimmed = rawShippingAddress.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          shippingAddressStr = parsed.address || parsed.addressLine1 || parsed.street || '';
          if (parsed.phone2) secondaryPhone = String(parsed.phone2).trim();
        } else {
          shippingAddressStr = rawShippingAddress;
        }
      } catch {
        shippingAddressStr = rawShippingAddress;
      }
    } else {
      shippingAddressStr = rawShippingAddress;
    }
  } else if (typeof rawShippingAddress === 'object' && rawShippingAddress !== null) {
    shippingAddressStr = rawShippingAddress.address || rawShippingAddress.addressLine1 || rawShippingAddress.street || '';
    if (rawShippingAddress.phone2) secondaryPhone = String(rawShippingAddress.phone2).trim();
  }

  // Also check notes for alternative phone number pattern
  if (!secondaryPhone && order.notes) {
    const phoneMatch = String(order.notes).match(/(?:هاتف بديل|رقم بديل|هاتف آخر)[:\s]*([0-9]{10,11})/i);
    if (phoneMatch && phoneMatch[1]) {
      secondaryPhone = phoneMatch[1].trim();
    }
  }

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
    ? order.callAttemptLogs.map((l) => ({
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
    secondaryPhone: secondaryPhone || null,
    governorate: order.governorate || order.shippingAddress?.governorate || '',
    city: order.city || order.shippingAddress?.city || '',
    shippingAddress: shippingAddressStr,
    total: parseFloat(order.total || order.finalTotal || 0),
    subtotal,
    shipping,
    status: order.status,
    createdAt: order.createdAt,
    assignedAt: assignedAt || order.assignedAt || null,
    assignedTo: assignedTo || order.assignedTo || null,
    assignedToName: assignedToName || null,
    callAttempts: order.callAttempts || 0,
    lastCallAt: isGuest ? order.lastCallAt : order.lastCallAttemptAt,
    followUpDate: order.followUpDate,
    notes: order.notes || '',
    items,
    callLogs,
    customerStats,
    attribution,
  };
};

const getMyOrders = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(403).json({ success: false, error: 'معرف الشركة أو المستخدم مطلوب' });
    }

    const isManager = isManagerUser(req.user);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const requestedStatus = normalizeWorkspaceStatus(req.query.status);
    const followUpOnly = parseBooleanParam(req.query.followUpOnly);
    const withStats = parseBooleanParam(req.query.withStats);
    const sortParam = String(req.query.sort || '').toLowerCase();
    const sort = ['recent', 'oldest', 'attempts'].includes(sortParam) ? sortParam : 'recent';
    let assignedTo = req.query.assignedTo ? String(req.query.assignedTo).trim() : '';

    const prisma = getSharedPrismaClient();

    // If a manager does not specify assignedTo filter, check if they have personal calls.
    // If they have 0 calls assigned to their name, default to 'all' so they never see an empty screen.
    if (isManager && !assignedTo) {
      const personalCount = await prisma.orderAssignment.count({
        where: { companyId, assignedTo: userId, isActive: true }
      });
      if (personalCount === 0) {
        assignedTo = 'all';
      }
    }

    // Unassigned Pool View for Managers
    if (isManager && assignedTo === 'unassigned') {
      const regularWhere = {
        companyId,
        assignedTo: null,
        confirmedAt: null,
        status: requestedStatus ? requestedStatus : 'PENDING'
      };
      const guestWhere = {
        companyId,
        status: { in: requestedStatus ? [requestedStatus.toLowerCase(), requestedStatus.toUpperCase()] : ['pending', 'PENDING'] },
        orderAssignments: { none: { isActive: true } }
      };

      const [regularOrders, guestOrders, totalRegular, totalGuest] = await Promise.all([
        prisma.order.findMany({
          where: regularWhere,
          include: {
            customer: {
              select: {
                id: true, firstName: true, lastName: true, phone: true,
                deliveryRate: true, totalDelivered: true, totalOrdersCount: true, customerRating: true,
              }
            },
            orderItems: { include: { product: true } },
            callAttemptLogs: {
              include: { user: { select: { firstName: true, lastName: true } } },
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          },
          orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
          skip,
          take: limit
        }),
        prisma.guestOrder.findMany({
          where: guestWhere,
          include: {
            orderNotes: true,
            callAttemptLogs: {
              include: { user: { select: { firstName: true, lastName: true } } },
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          },
          orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
          skip,
          take: limit
        }),
        prisma.order.count({ where: regularWhere }),
        prisma.guestOrder.count({ where: guestWhere })
      ]);

      const formattedOrders = [
        ...regularOrders.map((o) => formatWorkspaceOrderRecord(o, false, null, null, null)),
        ...guestOrders.map((g) => formatWorkspaceOrderRecord(g, true, null, null, null))
      ].slice(0, limit);

      const total = totalRegular + totalGuest;

      let stats = null;
      if (withStats) {
        stats = await getWorkspaceStats(prisma, companyId, userId, { assignedTo, isManager });
      }

      return res.json({
        success: true,
        data: formattedOrders,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        stats
      });
    }

    const where = buildWorkspaceWhere(companyId, userId, { requestedStatus, followUpOnly, assignedTo, isManager });

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

    // Map assigned user names for managers
    const assignedUserIds = Array.from(new Set(assignments.map((a) => a.assignedTo).filter(Boolean)));
    const assignedUsers = (isManager && assignedUserIds.length)
      ? await prisma.user.findMany({
          where: { id: { in: assignedUserIds } },
          select: { id: true, firstName: true, lastName: true, email: true }
        })
      : [];
    const assignedUserMap = new Map(
      assignedUsers.map((u) => [u.id, `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.id])
    );

    const formattedOrders = assignments.map((a) => {
      const order = a.order || a.guestOrder;
      const isGuest = !!a.guestOrder;
      const assignedToName = assignedUserMap.get(a.assignedTo) || null;
      return formatWorkspaceOrderRecord(order, isGuest, a.assignedAt, a.assignedTo, assignedToName);
    });

    let stats = null;
    if (withStats) {
      stats = await getWorkspaceStats(prisma, companyId, userId, { assignedTo, isManager });
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
    const { id } = req.params;
    const { result, notes } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userId = req.user?.id;

    let callResult = result;
    if (!callResult) {
      callResult = 'unreached';
    } else if (!ALLOWED_CALL_RESULTS.includes(callResult)) {
      return res.status(400).json({ success: false, error: 'قيمة نتيجة مكالمة غير صالحة' });
    }

    const prisma = getSharedPrismaClient();
    const now = new Date();
    const isManager = isManagerUser(req.user);

    const { type } = await assertWorkspaceOrderOwnership(prisma, companyId, userId, id, isManager);

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
    const isManager = isManagerUser(req.user);

    const { type } = await assertWorkspaceOrderOwnership(prisma, companyId, userId, id, isManager);

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
    const isManager = isManagerUser(req.user);
    const { type } = await assertWorkspaceOrderOwnership(prisma, companyId, userId, id, isManager);

    // Deactivate order assignment upon CONFIRMED or CANCELLED so it immediately leaves the active confirmation queue
    if (normalizedStatus === 'CONFIRMED') {
      if (typeof prisma.orderAssignment?.updateMany === 'function') {
        await prisma.orderAssignment.updateMany({
          where: {
            companyId,
            isActive: true,
            OR: [{ orderId: id }, { guestOrderId: id }]
          },
          data: { isActive: false }
        });
      }

      if (type === 'REGULAR' && typeof prisma.order?.update === 'function') {
        await prisma.order.update({
          where: { id },
          data: {
            confirmedAt: new Date(),
            confirmedBy: userId,
            confirmationNotes: actionNotes || 'اجراء سريع من لوحة الموظف'
          }
        });
      }
    } else if (normalizedStatus === 'CANCELLED') {
      if (typeof prisma.orderAssignment?.updateMany === 'function') {
        await prisma.orderAssignment.updateMany({
          where: {
            companyId,
            isActive: true,
            OR: [{ orderId: id }, { guestOrderId: id }]
          },
          data: { isActive: false }
        });
      }
    }

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

const getTeamWorkload = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'معرف الشركة مطلوب' });
    }

    const prisma = getSharedPrismaClient();

    // 1. Count unassigned orders
    const [unassignedRegular, unassignedGuest] = await Promise.all([
      prisma.order.count({
        where: {
          companyId,
          assignedTo: null,
          confirmedAt: null,
          status: 'PENDING'
        }
      }),
      prisma.guestOrder.count({
        where: {
          companyId,
          status: { in: ['pending', 'PENDING'] },
          orderAssignments: { none: { isActive: true } }
        }
      })
    ]);
    const unassignedCount = unassignedRegular + unassignedGuest;

    // 2. Get eligible agents
    const orderConfirmationService = require('../services/orderConfirmationService');
    const settings = orderConfirmationService.normalizeSettings(await orderConfirmationService.getSettings(companyId));
    const eligibleUsers = await orderConfirmationService.getEligibleUsers(companyId, settings, { ignoreUserFilter: true });

    // 3. Compute workload per agent
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const eligibleUserIds = eligibleUsers.map((u) => u.id);

    const pendingAssignments = eligibleUserIds.length
      ? await prisma.orderAssignment.groupBy({
          by: ['assignedTo'],
          where: {
            companyId,
            isActive: true,
            assignedTo: { in: eligibleUserIds },
            OR: [
              { order: { status: 'PENDING' } },
              { guestOrder: { status: { in: ['pending', 'PENDING'] } } }
            ]
          },
          _count: { assignedTo: true }
        })
      : [];
    const pendingMap = new Map(pendingAssignments.map((a) => [a.assignedTo, a._count.assignedTo]));

    const confirmedRegularToday = eligibleUserIds.length
      ? await prisma.order.groupBy({
          by: ['confirmedBy'],
          where: {
            companyId,
            confirmedBy: { in: eligibleUserIds },
            confirmedAt: { gte: startOfToday }
          },
          _count: { confirmedBy: true }
        })
      : [];
    const confirmedMap = new Map(confirmedRegularToday.map((c) => [c.confirmedBy, c._count.confirmedBy]));

    const agents = eligibleUsers.map((user) => ({
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'موظف',
      email: user.email,
      role: user.role,
      availability: user.availability || 'online',
      pendingCount: pendingMap.get(user.id) || 0,
      todayConfirmedCount: confirmedMap.get(user.id) || 0,
    }));

    agents.sort((a, b) => b.pendingCount - a.pendingCount);

    res.json({
      success: true,
      data: {
        unassignedCount,
        agents
      }
    });
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in getTeamWorkload:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب بيانات أحمال الفريق' });
  }
};

const autoDistributeOrders = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userId = req.user?.id;
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'معرف الشركة مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const orderConfirmationService = require('../services/orderConfirmationService');
    const settings = orderConfirmationService.normalizeSettings(await orderConfirmationService.getSettings(companyId));

    settings.distributionEnabled = true;

    const limit = Math.min(100, Math.max(1, parseInt(req.body?.limit) || 50));

    const [unassignedRegular, unassignedGuest] = await Promise.all([
      prisma.order.findMany({
        where: {
          companyId,
          assignedTo: null,
          confirmedAt: null,
          status: 'PENDING'
        },
        take: limit,
        orderBy: { createdAt: 'asc' }
      }),
      prisma.guestOrder.findMany({
        where: {
          companyId,
          status: { in: ['pending', 'PENDING'] },
          orderAssignments: { none: { isActive: true } }
        },
        take: limit,
        orderBy: { createdAt: 'asc' }
      })
    ]);

    let assignedCount = 0;

    for (const order of unassignedRegular) {
      const assigned = await orderConfirmationService.autoAssign(companyId, order, settings, userId);
      if (assigned) assignedCount++;
    }

    for (const guest of unassignedGuest) {
      const assigned = await orderConfirmationService.autoAssignGuest(companyId, guest, settings, userId);
      if (assigned) assignedCount++;
    }

    res.json({
      success: true,
      message: `تم توزيع ${assignedCount} طلب بنجاح على موظفي التأكيد`,
      data: { assignedCount }
    });
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in autoDistributeOrders:', error);
    res.status(500).json({ success: false, error: 'خطأ في التوزيع التلقائي للطلبات' });
  }
};

const assignOrder = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const assignedBy = req.user?.id;
    const { orderId, targetUserId } = req.body;

    if (!orderId || !targetUserId) {
      return res.status(400).json({ success: false, error: 'معرف الطلب والموظف مطلوبان' });
    }

    const prisma = getSharedPrismaClient();

    const regular = await prisma.order.findFirst({ where: { id: orderId, companyId } });
    if (regular) {
      await prisma.orderAssignment.updateMany({
        where: { orderId: regular.id, isActive: true },
        data: { isActive: false }
      });
      await prisma.orderAssignment.create({
        data: {
          companyId,
          orderId: regular.id,
          assignedTo: targetUserId,
          assignedBy,
          strategy: 'manual',
          isActive: true
        }
      });
      await prisma.order.update({
        where: { id: regular.id },
        data: {
          assignedTo: targetUserId,
          assignedBy,
          assignedAt: new Date(),
          assignmentStrategy: 'manual'
        }
      });
      return res.json({ success: true, message: 'تم تعيين الطلب بنجاح' });
    }

    const guest = await prisma.guestOrder.findFirst({ where: { id: orderId, companyId } });
    if (guest) {
      await prisma.orderAssignment.updateMany({
        where: { guestOrderId: guest.id, isActive: true },
        data: { isActive: false }
      });
      await prisma.orderAssignment.create({
        data: {
          companyId,
          guestOrderId: guest.id,
          assignedTo: targetUserId,
          assignedBy,
          strategy: 'manual',
          isActive: true
        }
      });
      return res.json({ success: true, message: 'تم تعيين الطلب بنجاح' });
    }

    res.status(404).json({ success: false, error: 'الطلب غير موجود' });
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in assignOrder:', error);
    res.status(500).json({ success: false, error: 'خطأ في تعيين الطلب' });
  }
};

const updateOrderItems = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, shipping, discount, notes } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userId = req.user?.id;
    const isManager = isManagerUser(req.user);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب توفير منتج واحد على الأقل' });
    }

    const prisma = getSharedPrismaClient();
    const { type } = await assertWorkspaceOrderOwnership(prisma, companyId, userId, id, isManager);

    const parsedShipping = Math.max(0, parseFloat(shipping) || 0);
    const parsedDiscount = Math.max(0, parseFloat(discount) || 0);
    const calculatedSubtotal = items.reduce((sum, it) => {
      const q = Math.max(1, parseInt(it.quantity, 10) || 1);
      const p = Math.max(0, parseFloat(it.price) || 0);
      return sum + (p * q);
    }, 0);
    const calculatedTotal = Math.max(0, calculatedSubtotal + parsedShipping - parsedDiscount);

    if (type === 'REGULAR') {
      const regularOrder = await prisma.order.findFirst({ where: { id, companyId } });
      if (!regularOrder) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

      await prisma.$transaction(async (tx) => {
        await tx.orderItem.deleteMany({ where: { orderId: regularOrder.id } });

        for (const item of items) {
          let validProductId = null;
          let validVariantId = null;

          if (item.productId) {
            try {
              const prod = await tx.product.findUnique({
                where: { id: item.productId },
                select: { id: true, companyId: true }
              });
              if (prod && prod.companyId === companyId) {
                validProductId = prod.id;
              } else {
                const varAsProd = await tx.productVariant.findUnique({
                  where: { id: item.productId },
                  include: { product: true }
                });
                if (varAsProd && varAsProd.product?.companyId === companyId) {
                  validProductId = varAsProd.productId;
                  validVariantId = varAsProd.id;
                }
              }
            } catch (_err) {
              // ignore lookup errors
            }
          }

          const candidateVariantId = item.variantId || item.metadata?.variantId;
          if (candidateVariantId && !validVariantId) {
            try {
              const v = await tx.productVariant.findUnique({ where: { id: candidateVariantId } });
              if (v) {
                validVariantId = v.id;
                if (!validProductId && v.productId) validProductId = v.productId;
              }
            } catch (_err) {
              // ignore lookup errors
            }
          }

          const itemQty = Math.max(1, parseInt(item.quantity, 10) || 1);
          const itemPrice = Math.max(0, parseFloat(item.price) || 0);
          const itemTotal = itemQty * itemPrice;

          await tx.orderItem.create({
            data: {
              orderId: regularOrder.id,
              productId: validProductId,
              variantId: validVariantId,
              quantity: itemQty,
              price: itemPrice,
              total: itemTotal,
              productName: item.productName || item.name || null,
              productColor: item.productColor || item.color || null,
              productSize: item.productSize != null ? String(item.productSize) : (item.size != null ? String(item.size) : null),
              productImage: item.productImage || item.image || null,
              productSku: item.productSku || item.sku || null,
              metadata: typeof item.metadata === 'object' ? JSON.stringify(item.metadata) : (item.metadata || null)
            }
          });
        }

        const orderUpdateData = {
          subtotal: calculatedSubtotal,
          shipping: parsedShipping,
          discount: parsedDiscount,
          total: calculatedTotal,
          updatedAt: new Date()
        };
        if (notes !== undefined) orderUpdateData.notes = notes;

        await tx.order.update({
          where: { id: regularOrder.id },
          data: orderUpdateData
        });

        const twinGuest = await tx.guestOrder.findFirst({
          where: { orderNumber: regularOrder.orderNumber, companyId }
        });
        if (twinGuest) {
          const guestUpdateData = {
            items: JSON.stringify(items),
            total: calculatedSubtotal,
            shippingCost: parsedShipping,
            discountAmount: parsedDiscount,
            finalTotal: calculatedTotal,
            updatedAt: new Date()
          };
          if (notes !== undefined) guestUpdateData.notes = notes;

          await tx.guestOrder.update({
            where: { id: twinGuest.id },
            data: guestUpdateData
          });
        }
      });

      return res.json({
        success: true,
        message: 'تم تحديث منتجات الطلب بنجاح',
        data: {
          subtotal: calculatedSubtotal,
          shipping: parsedShipping,
          discount: parsedDiscount,
          total: calculatedTotal
        }
      });
    } else {
      const guestOrder = await prisma.guestOrder.findFirst({ where: { id, companyId } });
      if (!guestOrder) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

      const guestUpdateData = {
        items: JSON.stringify(items),
        total: calculatedSubtotal,
        shippingCost: parsedShipping,
        discountAmount: parsedDiscount,
        finalTotal: calculatedTotal,
        updatedAt: new Date()
      };
      if (notes !== undefined) guestUpdateData.notes = notes;

      await prisma.guestOrder.update({
        where: { id: guestOrder.id },
        data: guestUpdateData
      });

      return res.json({
        success: true,
        message: 'تم تحديث منتجات الطلب بنجاح',
        data: {
          subtotal: calculatedSubtotal,
          shipping: parsedShipping,
          discount: parsedDiscount,
          total: calculatedTotal
        }
      });
    }
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in updateOrderItems:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'خطأ في تحديث منتجات الطلب' });
  }
};

const updateOrderCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, customerPhone, governorate, city, shippingAddress, notes } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userId = req.user?.id;
    const isManager = isManagerUser(req.user);

    const prisma = getSharedPrismaClient();
    const { type } = await assertWorkspaceOrderOwnership(prisma, companyId, userId, id, isManager);

    if (type === 'REGULAR') {
      const regular = await prisma.order.findFirst({ where: { id, companyId } });
      if (!regular) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

      const updateData = {};
      if (customerName !== undefined) updateData.customerName = customerName;
      if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
      if (governorate !== undefined) updateData.governorate = governorate;
      if (city !== undefined) updateData.city = city;
      if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress;
      if (notes !== undefined) updateData.notes = notes;
      updateData.updatedAt = new Date();

      await prisma.order.update({
        where: { id: regular.id },
        data: updateData
      });

      const twinGuest = await prisma.guestOrder.findFirst({
        where: { orderNumber: regular.orderNumber, companyId }
      });
      if (twinGuest) {
        await prisma.guestOrder.update({
          where: { id: twinGuest.id },
          data: {
            guestName: customerName || twinGuest.guestName,
            guestPhone: customerPhone || twinGuest.guestPhone,
            shippingAddress: shippingAddress || twinGuest.shippingAddress,
            notes: notes !== undefined ? notes : twinGuest.notes,
            updatedAt: new Date()
          }
        });
      }

      return res.json({ success: true, message: 'تم تحديث بيانات العميل بنجاح' });
    } else {
      const guest = await prisma.guestOrder.findFirst({ where: { id, companyId } });
      if (!guest) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

      const updateData = {};
      if (customerName !== undefined) updateData.guestName = customerName;
      if (customerPhone !== undefined) updateData.guestPhone = customerPhone;
      if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress;
      if (notes !== undefined) updateData.notes = notes;
      updateData.updatedAt = new Date();

      await prisma.guestOrder.update({
        where: { id: guest.id },
        data: updateData
      });

      return res.json({ success: true, message: 'تم تحديث بيانات العميل بنجاح' });
    }
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in updateOrderCustomer:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.message || 'خطأ في تحديث بيانات العميل' });
  }
};

module.exports = {
  getMyOrders,
  logCallAttempt,
  scheduleFollowUp,
  quickAction,
  getTeamWorkload,
  autoDistributeOrders,
  assignOrder,
  updateOrderItems,
  updateOrderCustomer
};
