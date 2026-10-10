const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderService = require('../services/orderService');

/**
 * Agent Workspace Controller
 * Handles orders assigned to confirmation agents and supervisor fleet oversight
 */

// حالات مستبعدة من كابينة التأكيد: المهملة + كل ما انتهى عمره التشغيلي
// (تم شحنه/تسليمه/ترجعه/استرداده/مكرر/ضائع) — الـ workspace للطلبات
// التي ما زالت في مرحلة التأكيد فقط، لا أرشيف الشركة كله
// Must only contain valid OrderStatus enum values (see prisma/schema/enums.prisma)
const WORKSPACE_EXCLUDED_STATUSES = new Set([
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
  'LOST',
]);

const MANAGER_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER', 'TEAM_LEADER'];
const isManagerUser = (user) => MANAGER_ROLES.includes(String(user?.role || '').toUpperCase());

const ALLOWED_CALL_RESULTS = ['unreached', 'reached', 'busy', 'wrong_number', 'callback'];

// «إعادة اتصال» = التزام متابعة: نجدول افتراضيًا بعد 24 ساعة إن لم يكن هناك موعد مستقبلي
const DEFAULT_CALLBACK_FOLLOW_UP_MS = 24 * 60 * 60 * 1000;

// إخراج الطلب من طابور التأكيد النشط بعد تأكيده أو إلغائه
const deactivateWorkspaceAssignment = (prisma, companyId, orderId) => {
  if (typeof prisma.orderAssignment?.updateMany !== 'function') {
    return Promise.resolve();
  }
  return prisma.orderAssignment.updateMany({
    where: {
      companyId,
      isActive: true,
      OR: [{ orderId }, { guestOrderId: orderId }]
    },
    data: { isActive: false }
  });
};

const requireManager = (req, res, next) => {
  if (!isManagerUser(req.user)) {
    return res.status(403).json({ success: false, error: 'هذه العملية متاحة للمدير أو قائد الفريق فقط' });
  }
  return next();
};

const normalizeWorkspaceStatus = (value) => String(value || '').trim().toUpperCase();
const normalizeActionNote = (value) => String(value || '').trim();
const normalizeQuickActionStatus = (value) => {
  const normalizedStatus = normalizeWorkspaceStatus(value);
  return normalizedStatus === 'CANCELED' ? 'CANCELLED' : normalizedStatus;
};
const isCancellationStatus = (value) => normalizeQuickActionStatus(value) === 'CANCELLED';
const getCancellationReasonError = () => 'سبب إلغاء الطلب مطلوب عند اختيار حالة ملغي';

const parseBooleanParam = (value) => value === true || value === 'true' || value === '1';

const normalizeDigits = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
};

const getPhoneSearchVariants = (raw) => {
  const normalized = normalizeDigits(raw);
  const digits = normalized.replace(/\D/g, '');
  if (!digits || digits.length < 3) {
    return digits ? [digits] : [];
  }
  const variants = new Set([digits]);

  if (digits.startsWith('0020')) {
    const localWithout0 = digits.slice(4);
    variants.add(localWithout0);
    variants.add('0' + localWithout0);
    variants.add('20' + localWithout0);
  } else if (digits.startsWith('20') && digits.length >= 10) {
    const localWithout0 = digits.slice(2);
    variants.add(localWithout0);
    variants.add('0' + localWithout0);
  } else if (digits.startsWith('0') && digits.length >= 10) {
    const localWithout0 = digits.slice(1);
    variants.add(localWithout0);
    variants.add('20' + localWithout0);
  } else if (digits.length >= 9) {
    variants.add('0' + digits);
    variants.add('20' + digits);
  }

  return Array.from(variants);
};

const buildWorkspaceWhere = (companyId, userId, { requestedStatus = '', followUpOnly = false, todayOnly = false, assignedTo = '', isManager = false, search = '' } = {}) => {
  const where = { companyId, isActive: true };

  if (isManager && assignedTo && assignedTo !== 'all' && assignedTo !== 'unassigned') {
    where.assignedTo = assignedTo;
  } else if (!isManager || assignedTo === 'me') {
    where.assignedTo = userId;
  }

  let statusCondition;
  // الضيوف يخزنون الحالة نصيًا بحالة مختلطة — الاستبعاد يتطلب النسختين
  const excludedStatuses = [...WORKSPACE_EXCLUDED_STATUSES];
  const excludedGuestStatuses = [
    ...excludedStatuses,
    ...excludedStatuses.map((s) => s.toLowerCase()),
  ];

  if (requestedStatus) {
    statusCondition = {
      OR: [
        { order: { status: requestedStatus } },
        { guestOrder: { status: { in: [requestedStatus.toUpperCase(), requestedStatus.toLowerCase()] } } }
      ]
    };
  } else if (followUpOnly) {
    // المتابعة: ميعاد قائم وحالة لم تنتهِ ولم تلغَ
    statusCondition = {
      OR: [
        { order: { followUpDate: { not: null }, status: { notIn: [...excludedStatuses, 'CANCELLED'] } } },
        { guestOrder: { followUpDate: { not: null }, status: { notIn: [...excludedGuestStatuses, 'CANCELLED', 'cancelled'] } } }
      ]
    };
  } else {
    statusCondition = {
      OR: [
        { order: { status: { notIn: excludedStatuses } } },
        { guestOrder: { status: { notIn: excludedGuestStatuses } } }
      ]
    };
  }

  let todayCondition = null;
  if (todayOnly) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    todayCondition = {
      OR: [
        { order: { createdAt: { gte: startOfToday } } },
        { guestOrder: { createdAt: { gte: startOfToday } } }
      ]
    };
  }

  const cleanSearch = String(search || '').trim().replace(/^[#№]/, '').trim();
  const normalizedSearch = normalizeDigits(cleanSearch);
  const phoneVariants = getPhoneSearchVariants(cleanSearch);

  let searchCondition = null;
  if (cleanSearch) {
    const searchOrList = [
      { order: { orderNumber: { contains: cleanSearch, mode: 'insensitive' } } },
      { order: { customerName: { contains: cleanSearch, mode: 'insensitive' } } },
      { order: { customer: { firstName: { contains: cleanSearch, mode: 'insensitive' } } } },
      { order: { customer: { lastName: { contains: cleanSearch, mode: 'insensitive' } } } },
      { order: { shippingAddress: { contains: cleanSearch, mode: 'insensitive' } } },
      { order: { notes: { contains: cleanSearch, mode: 'insensitive' } } },
      { guestOrder: { orderNumber: { contains: cleanSearch, mode: 'insensitive' } } },
      { guestOrder: { guestName: { contains: cleanSearch, mode: 'insensitive' } } },
      { guestOrder: { shippingAddress: { contains: cleanSearch, mode: 'insensitive' } } },
      { guestOrder: { notes: { contains: cleanSearch, mode: 'insensitive' } } }
    ];

    if (normalizedSearch && normalizedSearch !== cleanSearch) {
      searchOrList.push(
        { order: { orderNumber: { contains: normalizedSearch, mode: 'insensitive' } } },
        { guestOrder: { orderNumber: { contains: normalizedSearch, mode: 'insensitive' } } }
      );
    }

    if (phoneVariants.length > 0) {
      for (const variant of phoneVariants) {
        searchOrList.push(
          { order: { customerPhone: { contains: variant, mode: 'insensitive' } } },
          { order: { customer: { phone: { contains: variant, mode: 'insensitive' } } } },
          { guestOrder: { guestPhone: { contains: variant, mode: 'insensitive' } } }
        );
      }
    } else {
      searchOrList.push(
        { order: { customerPhone: { contains: cleanSearch, mode: 'insensitive' } } },
        { guestOrder: { guestPhone: { contains: cleanSearch, mode: 'insensitive' } } }
      );
    }

    searchCondition = { OR: searchOrList };
  }

  const andClauses = [statusCondition];
  if (todayCondition) {
    andClauses.push(todayCondition);
  }
  if (searchCondition) {
    andClauses.push(searchCondition);
  }

  if (andClauses.length > 1) {
    where.AND = andClauses;
  } else {
    where.OR = statusCondition.OR;
  }

  return where;
};

// مطابقة عداد السلات مع قائمة /orders-new/incomplete?hasPhone=true:
// سلة نشطة لم تنتهِ مدتها ومعها رقم هاتف فعلي في checkoutData،
// مع استبعاد السلات المستبعدة يدويًا (cartContactLog method=dismissed) والمحولة (cartConversionLog)
const countWorkspaceIncompleteCarts = async (prisma, companyId) => {
  if (!prisma.guestCart || typeof prisma.guestCart.count !== 'function') {
    return 0;
  }
  try {
    let lostAfterHours = 24;
    try {
      const settings = await orderService.getOrderSettings(companyId);
      const parsed = parseInt(settings?.incompleteOrderLostAfterHours, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        lostAfterHours = parsed;
      }
    } catch (_settingsError) {
      // غياب الإعدادات لا يوقف العدّ
    }

    const PHONE_KEYS = ['guestPhone', 'customerPhone', 'phoneNumber', 'mobileNumber', 'phone', 'mobile'];
    const phoneKeyClause = { OR: PHONE_KEYS.map((k) => ({ checkoutData: { contains: `"${k}"` } })) };
    const emptyPhoneClause = { OR: PHONE_KEYS.map((k) => ({ checkoutData: { contains: `"${k}":""` } })) };
    const lostThreshold = new Date(Date.now() - lostAfterHours * 60 * 60 * 1000);

    let excludedCartIds = [];
    if (prisma.cartContactLog && typeof prisma.cartContactLog.findMany === 'function') {
      try {
        const dismissLogs = await prisma.cartContactLog.findMany({
          where: { companyId, method: 'dismissed' },
          select: { cartId: true },
          distinct: ['cartId']
        });
        excludedCartIds = dismissLogs.map((l) => l.cartId).filter(Boolean);
      } catch (_dismissError) {
        // غياب الجدول في بيئات قديمة لا يوقف العدّ
      }
    }

    if (prisma.cartConversionLog && typeof prisma.cartConversionLog.findMany === 'function') {
      try {
        const convertedLogs = await prisma.cartConversionLog.findMany({
          where: { companyId },
          select: { cartId: true },
          distinct: ['cartId']
        });
        const convertedIds = convertedLogs.map((l) => l.cartId).filter(Boolean);
        if (convertedIds.length > 0) {
          excludedCartIds = Array.from(new Set([...excludedCartIds, ...convertedIds]));
        }
      } catch (_convError) {
        // غياب الجدول في بيئات قديمة لا يوقف العدّ
      }
    }

    const activeClause = {
      OR: [
        { checkoutUpdatedAt: { gte: lostThreshold } },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: { gte: lostThreshold } }] },
        { AND: [{ checkoutUpdatedAt: null }, { checkoutStartedAt: null }, { updatedAt: { gte: lostThreshold } }] }
      ]
    };

    return await prisma.guestCart.count({
      where: {
        companyId,
        ...activeClause,
        AND: [phoneKeyClause, { NOT: emptyPhoneClause }],
        ...(excludedCartIds.length ? { cartId: { notIn: excludedCartIds } } : {})
      }
    });
  } catch (_e) {
    return 0;
  }
};

const getWorkspaceStats = async (prisma, companyId, userId, { assignedTo = '', isManager = false } = {}) => {
  const base = { companyId, isActive: true };

  // عدادات شاشة «غير الموزع» تعكس نفس بركة الطلبات المعروضة (pending بلا إسناد نشط)
  // بدل عدّ الطلبات لكل الفريق — كانت العدادات العلوية لا تطابق محتوى الشاشة
  if (isManager && assignedTo === 'unassigned') {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const [unassignedRegular, unassignedGuest, unassignedTodayRegular, unassignedTodayGuest, incomplete] = await Promise.all([
      prisma.order.count({ where: { companyId, assignedTo: null, confirmedAt: null, status: 'PENDING' } }),
      prisma.guestOrder.count({
        where: { companyId, status: { in: ['pending', 'PENDING'] }, orderAssignments: { none: { isActive: true } } }
      }),
      prisma.order.count({ where: { companyId, assignedTo: null, confirmedAt: null, createdAt: { gte: startOfToday }, status: 'PENDING' } }),
      prisma.guestOrder.count({
        where: { companyId, createdAt: { gte: startOfToday }, status: { in: ['pending', 'PENDING'] }, orderAssignments: { none: { isActive: true } } }
      }),
      countWorkspaceIncompleteCarts(prisma, companyId)
    ]);
    const poolTotal = unassignedRegular + unassignedGuest;
    const poolToday = unassignedTodayRegular + unassignedTodayGuest;
    return {
      total: poolTotal,
      all: poolTotal,
      today: poolToday,
      pending: poolTotal,
      processing: 0,
      confirmed: 0,
      cancelled: 0,
      followup: 0,
      incomplete
    };
  }

  if (isManager && assignedTo && assignedTo !== 'all' && assignedTo !== 'unassigned') {
    base.assignedTo = assignedTo;
  } else if (!isManager || assignedTo === 'me') {
    base.assignedTo = userId;
  }

  const statusWhere = (status) => ({
    ...base,
    OR: [
      { order: { status } },
      { guestOrder: { status: { in: [status.toUpperCase(), status.toLowerCase()] } } }
    ]
  });

  const excludedWhere = {
    ...base,
    OR: [
      { order: { status: { notIn: [...WORKSPACE_EXCLUDED_STATUSES] } } },
      { guestOrder: { status: { notIn: [...WORKSPACE_EXCLUDED_STATUSES, ...Array.from(WORKSPACE_EXCLUDED_STATUSES).map((s) => s.toLowerCase())] } } }
    ]
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayWhere = {
    ...base,
    OR: [
      { order: { createdAt: { gte: startOfToday }, status: { notIn: [...WORKSPACE_EXCLUDED_STATUSES] } } },
      { guestOrder: { createdAt: { gte: startOfToday }, status: { notIn: [...WORKSPACE_EXCLUDED_STATUSES, ...Array.from(WORKSPACE_EXCLUDED_STATUSES).map((s) => s.toLowerCase())] } } }
    ]
  };

  const followupWhere = {
    ...base,
    OR: [
      {
        order: {
          followUpDate: { not: null },
          status: { notIn: [...WORKSPACE_EXCLUDED_STATUSES, 'CANCELLED'] }
        }
      },
      {
        guestOrder: {
          followUpDate: { not: null },
          status: {
            notIn: [
              ...WORKSPACE_EXCLUDED_STATUSES,
              ...[...WORKSPACE_EXCLUDED_STATUSES].map((s) => s.toLowerCase()),
              'cancelled',
              'CANCELLED'
            ]
          }
        }
      }
    ]
  };


  const [total, today, pending, processing, confirmed, cancelled, followup] = await Promise.all([
    prisma.orderAssignment.count({ where: excludedWhere }),
    prisma.orderAssignment.count({ where: todayWhere }),
    prisma.orderAssignment.count({ where: statusWhere('PENDING') }),
    prisma.orderAssignment.count({ where: statusWhere('PROCESSING') }),
    prisma.orderAssignment.count({ where: statusWhere('CONFIRMED') }),
    prisma.orderAssignment.count({ where: statusWhere('CANCELLED') }),
    prisma.orderAssignment.count({ where: followupWhere })
  ]);

  const incomplete = await countWorkspaceIncompleteCarts(prisma, companyId);

  return { total, all: total, today, pending, processing, confirmed, cancelled, followup, incomplete };
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
  let riskData = null;
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
        if (metaObj.risk && typeof metaObj.risk === 'object') {
          riskData = {
            score: Number(metaObj.risk.riskScore) || 0,
            level: String(metaObj.risk.riskLevel || 'low'),
            reasons: Array.isArray(metaObj.risk.riskReasons)
              ? metaObj.risk.riskReasons.map((r) => ({
                  code: r.code || null,
                  label: r.label || String(r.code || ''),
                  weight: Number(r.weight) || 0,
                }))
              : [],
          };
        }
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
        durationSeconds: l.durationSeconds || 0,
        recordingUrl: l.recordingUrl || null,
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
    // الخصم الحقيقي حتى لا يمحو محرر العناصر خصم الطلب عند الحفظ (regular: discount، guest: discountAmount)
    discount: parseFloat((isGuest ? order.discountAmount : order.discount) || 0),
    status: order.status,
    createdAt: order.createdAt,
    createdBy: order.createdBy || null,
    createdByName: order.createdByName || null,
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
    riskData,
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
    const todayOnly = parseBooleanParam(req.query.todayOnly);
    const withStats = parseBooleanParam(req.query.withStats);
    const sortParam = String(req.query.sort || '').toLowerCase();
    const sort = ['recent', 'oldest', 'attempts'].includes(sortParam) ? sortParam : 'recent';
    let assignedTo = req.query.assignedTo ? String(req.query.assignedTo).trim() : '';
    const search = String(req.query.search || req.query.q || '').trim();

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
      const cleanSearch = String(search || '').trim().replace(/^[#№]/, '').trim();
      const normalizedSearch = normalizeDigits(cleanSearch);
      const phoneVariants = getPhoneSearchVariants(cleanSearch);

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

      if (todayOnly) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        regularWhere.createdAt = { gte: startOfToday };
        guestWhere.createdAt = { gte: startOfToday };
      }

      if (cleanSearch) {
        const regularSearchList = [
          { orderNumber: { contains: cleanSearch, mode: 'insensitive' } },
          { customerName: { contains: cleanSearch, mode: 'insensitive' } },
          { customer: { firstName: { contains: cleanSearch, mode: 'insensitive' } } },
          { customer: { lastName: { contains: cleanSearch, mode: 'insensitive' } } },
          { shippingAddress: { contains: cleanSearch, mode: 'insensitive' } },
          { notes: { contains: cleanSearch, mode: 'insensitive' } }
        ];
        const guestSearchList = [
          { orderNumber: { contains: cleanSearch, mode: 'insensitive' } },
          { guestName: { contains: cleanSearch, mode: 'insensitive' } },
          { shippingAddress: { contains: cleanSearch, mode: 'insensitive' } },
          { notes: { contains: cleanSearch, mode: 'insensitive' } }
        ];

        if (normalizedSearch && normalizedSearch !== cleanSearch) {
          regularSearchList.push({ orderNumber: { contains: normalizedSearch, mode: 'insensitive' } });
          guestSearchList.push({ orderNumber: { contains: normalizedSearch, mode: 'insensitive' } });
        }

        if (phoneVariants.length > 0) {
          for (const variant of phoneVariants) {
            regularSearchList.push(
              { customerPhone: { contains: variant, mode: 'insensitive' } },
              { customer: { phone: { contains: variant, mode: 'insensitive' } } }
            );
            guestSearchList.push(
              { guestPhone: { contains: variant, mode: 'insensitive' } }
            );
          }
        } else {
          regularSearchList.push(
            { customerPhone: { contains: cleanSearch, mode: 'insensitive' } }
          );
          guestSearchList.push(
            { guestPhone: { contains: cleanSearch, mode: 'insensitive' } }
          );
        }

        regularWhere.AND = [{ OR: regularSearchList }];
        guestWhere.AND = [{ OR: guestSearchList }];
      }

      const [totalRegular, totalGuest] = await Promise.all([
        prisma.order.count({ where: regularWhere }),
        prisma.guestOrder.count({ where: guestWhere })
      ]);
      const total = totalRegular + totalGuest;

      // إصلاح الـ Pagination المزدوج: جلب العناصر حتى (skip + limit) من كل جدول ودمجها وفرزها بدقة
      const fetchTake = skip + limit;

      const [regularOrders, guestOrders] = await Promise.all([
        totalRegular > 0 && skip < total
          ? prisma.order.findMany({
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
              take: fetchTake
            })
          : Promise.resolve([]),
        totalGuest > 0 && skip < total
          ? prisma.guestOrder.findMany({
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
              take: fetchTake
            })
          : Promise.resolve([])
      ]);

      const formattedRegular = regularOrders.map((o) => formatWorkspaceOrderRecord(o, false, null, null, null));
      const formattedGuest = guestOrders.map((g) => formatWorkspaceOrderRecord(g, true, null, null, null));
      const combined = [...formattedRegular, ...formattedGuest];

      if (sort === 'oldest') {
        combined.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else if (sort === 'attempts') {
        combined.sort((a, b) => (b.callAttempts || 0) - (a.callAttempts || 0));
      } else {
        combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      const paginatedOrders = combined.slice(skip, skip + limit);

      let stats = null;
      if (withStats) {
        stats = await getWorkspaceStats(prisma, companyId, userId, { assignedTo, isManager });
      }

      return res.json({
        success: true,
        data: paginatedOrders,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
        stats
      });
    }

    const where = buildWorkspaceWhere(companyId, userId, { requestedStatus, followUpOnly, todayOnly, assignedTo, isManager, search });

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

    // نتيجة «إعادة اتصال» بدون موعد متابعة مستقبلي = جدولة تلقائية بعد 24 ساعة
    // حتى لا يسقط الطلب من تاب المتابعات (الذي يشترط followUpDate)
    let scheduleDefaultFollowUp = callResult === 'callback';

    if (type === 'GUEST') {
      await prisma.$transaction(async (tx) => {
        if (scheduleDefaultFollowUp) {
          const existing = await tx.guestOrder.findUnique({ where: { id }, select: { followUpDate: true } });
          if (existing?.followUpDate && new Date(existing.followUpDate).getTime() > now.getTime()) {
            scheduleDefaultFollowUp = false;
          }
        }
        await tx.guestOrder.update({
          where: { id, companyId },
          data: {
            callAttempts: { increment: 1 },
            lastCallAt: now,
            ...(scheduleDefaultFollowUp ? { followUpDate: new Date(now.getTime() + DEFAULT_CALLBACK_FOLLOW_UP_MS) } : {})
          }
        });
        await tx.callAttemptLog.create({
          data: {
            guestOrderId: id,
            // بدونها تسقط المحاولات اليدوية من فلترة الشركات في سجل التليفوني
            // وحارس الـ 20 ثانية — جدول واحد لازم يُكتب بنمط واحد
            companyId,
            userId,
            result: callResult,
            notes,
            createdAt: now
          }
        });
      });
    } else {
      await prisma.$transaction(async (tx) => {
        if (scheduleDefaultFollowUp) {
          const existing = await tx.order.findUnique({ where: { id }, select: { followUpDate: true } });
          if (existing?.followUpDate && new Date(existing.followUpDate).getTime() > now.getTime()) {
            scheduleDefaultFollowUp = false;
          }
        }
        await tx.order.update({
          where: { id, companyId },
          data: {
            callAttempts: { increment: 1 },
            lastCallAttemptAt: now,
            ...(scheduleDefaultFollowUp ? { followUpDate: new Date(now.getTime() + DEFAULT_CALLBACK_FOLLOW_UP_MS) } : {})
          }
        });
        await tx.callAttemptLog.create({
          data: {
            orderId: id,
            companyId,
            userId,
            result: callResult,
            notes,
            createdAt: now
          }
        });
      });
    }

    res.json({
      success: true,
      message: scheduleDefaultFollowUp
        ? 'تم تسجيل محاولة الاتصال وجدولة متابعة تلقائية بعد 24 ساعة'
        : 'تم تسجيل محاولة الاتصال بنجاح'
    });
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

    if (type === 'GUEST') {
      const updatedGuestOrder = await orderService.updateGuestOrderStatus(
        id,
        companyId,
        normalizedStatus,
        actionNotes || 'اجراء سريع من لوحة الموظف',
        userId,
        userName
      );

      // إلغاء الإسناد بعد نجاح الحالة لا قبلها — فشل الحالة كان يفعّل الإسناد
      // فيفقد الموظف ملكية الطلب (403) ويستحيل عليه إعادة المحاولة
      if (normalizedStatus === 'CONFIRMED' || normalizedStatus === 'CANCELLED') {
        await deactivateWorkspaceAssignment(prisma, companyId, id);
      }

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

      if (normalizedStatus === 'CONFIRMED') {
        await deactivateWorkspaceAssignment(prisma, companyId, id);

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
        await deactivateWorkspaceAssignment(prisma, companyId, id);
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

    // حماية حدود المستأجرين: لا إسناد إلا لموظف نشط داخل نفس الشركة
    const targetMember = await prisma.userCompany.findFirst({
      where: { userId: targetUserId, companyId, isActive: true },
      select: { id: true }
    });
    if (!targetMember) {
      return res.status(400).json({ success: false, error: 'الموظف المستهدف غير موجود أو غير نشط في هذه الشركة' });
    }

    const regular = await prisma.order.findFirst({ where: { id: orderId, companyId } });
    if (regular) {
      // ذرية: لا إسناد جديد قبل إلغاء القديم ولا طلب بلا إسناد بينهما
      await prisma.$transaction(async (tx) => {
        await tx.orderAssignment.updateMany({
          where: { orderId: regular.id, isActive: true },
          data: { isActive: false }
        });
        await tx.orderAssignment.create({
          data: {
            companyId,
            orderId: regular.id,
            assignedTo: targetUserId,
            assignedBy,
            strategy: 'manual',
            isActive: true
          }
        });
        await tx.order.update({
          where: { id: regular.id },
          data: {
            assignedTo: targetUserId,
            assignedBy,
            assignedAt: new Date(),
            assignmentStrategy: 'manual'
          }
        });
      });
      return res.json({ success: true, message: 'تم تعيين الطلب بنجاح' });
    }

    const guest = await prisma.guestOrder.findFirst({ where: { id: orderId, companyId } });
    if (guest) {
      await prisma.$transaction(async (tx) => {
        await tx.orderAssignment.updateMany({
          where: { guestOrderId: guest.id, isActive: true },
          data: { isActive: false }
        });
        await tx.orderAssignment.create({
          data: {
            companyId,
            guestOrderId: guest.id,
            assignedTo: targetUserId,
            assignedBy,
            strategy: 'manual',
            isActive: true
          }
        });
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
              // عزل المستأجرين: لا ربط متغير إلا لمنتج تابع لنفس الشركة
              // (مسار productId فوقه يتحقق — هذا كان الناقص)
              const v = await tx.productVariant.findUnique({
                where: { id: candidateVariantId },
                include: { product: { select: { companyId: true } } }
              });
              if (v && v.product?.companyId === companyId) {
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
    const { customerName, customerPhone, secondaryPhone, governorate, city, shippingAddress, notes } = req.body;
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
      if (notes !== undefined) updateData.notes = notes;

      let regularAddrObj = {};
      try {
        regularAddrObj = JSON.parse(regular.shippingAddress || '{}') || {};
      } catch {
        regularAddrObj = { address: regular.shippingAddress || '' };
      }
      if (shippingAddress !== undefined) regularAddrObj.address = shippingAddress;
      if (governorate !== undefined) regularAddrObj.governorate = governorate;
      if (city !== undefined) regularAddrObj.city = city;
      if (secondaryPhone !== undefined) regularAddrObj.phone2 = secondaryPhone;

      updateData.shippingAddress = JSON.stringify(regularAddrObj);
      updateData.updatedAt = new Date();

      // الطلب وتوأمه الضيف ذرية — لا انقسام بيانات عميل بينهما عند فشل النصف
      const twinGuest = await prisma.guestOrder.findFirst({
        where: { orderNumber: regular.orderNumber, companyId }
      });
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: regular.id },
          data: updateData
        });
        if (twinGuest) {
          await tx.guestOrder.update({
            where: { id: twinGuest.id },
            data: {
              guestName: customerName || twinGuest.guestName,
              guestPhone: customerPhone || twinGuest.guestPhone,
              shippingAddress: updateData.shippingAddress || twinGuest.shippingAddress,
              notes: notes !== undefined ? notes : twinGuest.notes,
              updatedAt: new Date()
            }
          });
        }
      });

      return res.json({ success: true, message: 'تم تحديث بيانات العميل بنجاح' });
    } else {
      const guest = await prisma.guestOrder.findFirst({ where: { id, companyId } });
      if (!guest) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

      const updateData = {};
      if (customerName !== undefined) updateData.guestName = customerName;
      if (customerPhone !== undefined) updateData.guestPhone = customerPhone;
      if (notes !== undefined) updateData.notes = notes;

      let guestAddrObj = {};
      try {
        guestAddrObj = JSON.parse(guest.shippingAddress || '{}') || {};
      } catch {
        guestAddrObj = { address: guest.shippingAddress || '' };
      }
      if (shippingAddress !== undefined) guestAddrObj.address = shippingAddress;
      if (governorate !== undefined) guestAddrObj.governorate = governorate;
      if (city !== undefined) guestAddrObj.city = city;
      if (secondaryPhone !== undefined) guestAddrObj.phone2 = secondaryPhone;

      updateData.shippingAddress = JSON.stringify(guestAddrObj);
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

/**
 * Helper to resolve date range and comparison period
 */
const resolveDateRange = (range = 'today', startDateStr, endDateStr) => {
  const now = new Date();
  let start, end, prevStart, prevEnd;

  if (range === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(end);
    prevEnd.setDate(prevEnd.getDate() - 1);
  } else if (range === 'yesterday') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(end);
    prevEnd.setDate(prevEnd.getDate() - 1);
  } else if (range === '7d') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const durationMs = end.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - durationMs + 1);
  } else if (range === '30d') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const durationMs = end.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - durationMs + 1);
  } else if (range === 'custom' && startDateStr && endDateStr) {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    start = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
    end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
    const durationMs = Math.max(86400000, end.getTime() - start.getTime());
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - durationMs + 1);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 1);
    prevEnd = new Date(end);
    prevEnd.setDate(prevEnd.getDate() - 1);
  }

  return { start, end, prevStart, prevEnd };
};

/**
 * Parse duration seconds from log notes if recorded (e.g. "duration: 45s" or similar)
 */
const parseDurationSeconds = (notes) => {
  if (!notes || typeof notes !== 'string') return 0;
  const match = notes.match(/(?:duration|المدة|مدّة|مدة)[:\s]*(\d+)(?:\s*(?:s|sec|ثانية|ثواني))?/i);
  if (match && match[1]) {
    return parseInt(match[1], 10) || 0;
  }
  return 0;
};

/**
 * @route GET /api/v1/agent-workspace/reports
 * @desc Get real-time operational confirmation performance metrics and reports
 * @access Private (Agent views self, Manager views team/agents)
 */
const getWorkspaceReports = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const currentUserId = req.user?.id;

    if (!companyId || !currentUserId) {
      return res.status(403).json({ success: false, error: 'معرف الشركة أو المستخدم مطلوب' });
    }

    const isManager = isManagerUser(req.user);
    const { range = 'today', startDate, endDate, agentId } = req.query;

    // Permissions: Regular agents can ONLY view their own individual performance
    const targetAgentId = isManager ? (agentId || 'all') : currentUserId;

    const prisma = getSharedPrismaClient();
    const { start, end, prevStart, prevEnd } = resolveDateRange(range, startDate, endDate);

    // 1. Fetch eligible agents
    let eligibleAgents = [];
    if (isManager) {
      try {
        const orderConfirmationService = require('../services/orderConfirmationService');
        const settings = orderConfirmationService.normalizeSettings(await orderConfirmationService.getSettings(companyId));
        const users = await orderConfirmationService.getEligibleUsers(companyId, settings, { ignoreUserFilter: true });
        eligibleAgents = users.map((u) => ({
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'وكيل',
          email: u.email,
          role: u.role || 'AGENT'
        }));
      } catch (err) {
        console.warn('⚠️ [AGENT-WORKSPACE] Could not load eligible users:', err.message);
      }
    } else {
      eligibleAgents = [{
        id: currentUserId,
        name: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.email || 'وكيل',
        email: req.user?.email,
        role: req.user?.role || 'AGENT'
      }];
    }

    // Helper to calculate metrics for a specific time range and agent filter
    const aggregateMetrics = async (periodStart, periodEnd, agentFilter) => {
      // 1. Call attempt logs
      const callLogWhere = {
        createdAt: { gte: periodStart, lte: periodEnd },
        OR: [
          { order: { companyId } },
          { guestOrder: { companyId } },
          { user: { companyId } }
        ]
      };
      if (agentFilter && agentFilter !== 'all') {
        callLogWhere.userId = agentFilter;
      }

      const callLogs = await prisma.callAttemptLog.findMany({
        where: callLogWhere,
        select: {
          id: true,
          orderId: true,
          guestOrderId: true,
          userId: true,
          result: true,
          notes: true,
          createdAt: true
        }
      });

      const totalCalls = callLogs.length;
      let totalDurationSeconds = 0;
      const contactedOrderIds = new Set();
      const callbackOrderIds = new Set();

      for (const log of callLogs) {
        totalDurationSeconds += parseDurationSeconds(log.notes);
        const orderIdentifier = log.orderId || log.guestOrderId;
        if (orderIdentifier) {
          contactedOrderIds.add(orderIdentifier);
          if (log.result === 'callback') {
            callbackOrderIds.add(orderIdentifier);
          }
        }
      }

      const contactedOrdersCount = contactedOrderIds.size;
      const avgAttemptsPerOrder = contactedOrdersCount > 0
        ? Number((totalCalls / contactedOrdersCount).toFixed(1))
        : 0;

      // 2. Confirmed orders
      const orderConfirmedWhere = {
        companyId,
        status: 'CONFIRMED',
        OR: [
          { confirmedAt: { gte: periodStart, lte: periodEnd } },
          { confirmedAt: null, updatedAt: { gte: periodStart, lte: periodEnd } }
        ]
      };
      if (agentFilter && agentFilter !== 'all') {
        orderConfirmedWhere.OR = [
          { confirmedBy: agentFilter, confirmedAt: { gte: periodStart, lte: periodEnd } },
          { assignedTo: agentFilter, confirmedAt: { gte: periodStart, lte: periodEnd } },
          { confirmedBy: agentFilter, confirmedAt: null, updatedAt: { gte: periodStart, lte: periodEnd } },
          { assignedTo: agentFilter, confirmedAt: null, updatedAt: { gte: periodStart, lte: periodEnd } }
        ];
      }

      const [confirmedRegular, confirmedGuest] = await Promise.all([
        prisma.order.findMany({
          where: orderConfirmedWhere,
          select: {
            id: true,
            createdAt: true,
            assignedAt: true,
            confirmedAt: true,
            updatedAt: true,
            confirmedBy: true,
            assignedTo: true,
            callAttempts: true
          }
        }),
        prisma.guestOrder.findMany({
          where: {
            companyId,
            status: { in: ['CONFIRMED', 'confirmed'] },
            updatedAt: { gte: periodStart, lte: periodEnd }
          },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            callAttempts: true,
            orderAssignments: {
              where: { isActive: false },
              select: { assignedTo: true, assignedAt: true },
              take: 1
            }
          }
        })
      ]);

      const filteredGuestConfirmed = (agentFilter && agentFilter !== 'all')
        ? confirmedGuest.filter((g) => g.orderAssignments?.[0]?.assignedTo === agentFilter)
        : confirmedGuest;

      const confirmedOrdersCount = confirmedRegular.length + filteredGuestConfirmed.length;

      // Handling time calculation (minutes from assignment or creation to confirmation)
      let totalHandlingMinutes = 0;
      let ordersWithHandlingTime = 0;

      for (const ord of confirmedRegular) {
        const startT = ord.assignedAt ? new Date(ord.assignedAt).getTime() : new Date(ord.createdAt).getTime();
        const endT = ord.confirmedAt ? new Date(ord.confirmedAt).getTime() : new Date(ord.updatedAt).getTime();
        if (endT >= startT) {
          totalHandlingMinutes += Math.round((endT - startT) / 60000);
          ordersWithHandlingTime++;
        }
      }
      for (const g of filteredGuestConfirmed) {
        const startT = g.orderAssignments?.[0]?.assignedAt
          ? new Date(g.orderAssignments[0].assignedAt).getTime()
          : new Date(g.createdAt).getTime();
        const endT = new Date(g.updatedAt).getTime();
        if (endT >= startT) {
          totalHandlingMinutes += Math.round((endT - startT) / 60000);
          ordersWithHandlingTime++;
        }
      }

      const avgHandlingTimeMinutes = ordersWithHandlingTime > 0
        ? Math.round(totalHandlingMinutes / ordersWithHandlingTime)
        : 0;

      // 3. Cancelled orders
      const orderCancelledWhere = {
        companyId,
        status: 'CANCELLED',
        updatedAt: { gte: periodStart, lte: periodEnd }
      };
      if (agentFilter && agentFilter !== 'all') {
        orderCancelledWhere.assignedTo = agentFilter;
      }
      const [cancelledRegular, cancelledGuest] = await Promise.all([
        prisma.order.findMany({
          where: orderCancelledWhere,
          select: { id: true, assignedTo: true, updatedAt: true }
        }),
        prisma.guestOrder.findMany({
          where: {
            companyId,
            status: { in: ['CANCELLED', 'cancelled'] },
            updatedAt: { gte: periodStart, lte: periodEnd }
          },
          select: {
            id: true,
            updatedAt: true,
            orderAssignments: { select: { assignedTo: true }, take: 1 }
          }
        })
      ]);

      const filteredGuestCancelled = (agentFilter && agentFilter !== 'all')
        ? cancelledGuest.filter((g) => g.orderAssignments?.[0]?.assignedTo === agentFilter)
        : cancelledGuest;

      const cancelledOrdersCount = cancelledRegular.length + filteredGuestCancelled.length;

      // 4. Follow-up scheduled orders
      const followUpOrdersWhere = {
        companyId,
        followUpDate: { gte: periodStart, lte: periodEnd },
        status: { notIn: ['CONFIRMED', 'CANCELLED', 'SHIPPED', 'DELIVERED', 'TRASH'] }
      };
      if (agentFilter && agentFilter !== 'all') {
        followUpOrdersWhere.assignedTo = agentFilter;
      }
      const [followUpRegular, followUpGuest] = await Promise.all([
        prisma.order.findMany({
          where: followUpOrdersWhere,
          select: { id: true }
        }),
        prisma.guestOrder.findMany({
          where: {
            companyId,
            followUpDate: { gte: periodStart, lte: periodEnd },
            status: { notIn: ['CONFIRMED', 'confirmed', 'CANCELLED', 'cancelled', 'SHIPPED', 'DELIVERED', 'TRASH'] }
          },
          select: { id: true }
        })
      ]);

      const allFollowUpIds = new Set([
        ...callbackOrderIds,
        ...followUpRegular.map((o) => o.id),
        ...followUpGuest.map((g) => g.id)
      ]);
      const followUpOrdersCount = allFollowUpIds.size;

      // 5. Currently open orders (Pending / Processing in workspace)
      const openRegularWhere = {
        companyId,
        status: { in: ['PENDING', 'PROCESSING'] }
      };
      if (agentFilter && agentFilter !== 'all') {
        openRegularWhere.assignedTo = agentFilter;
      }
      const openGuestWhere = {
        companyId,
        status: { in: ['pending', 'PENDING', 'processing', 'PROCESSING'] }
      };
      if (agentFilter && agentFilter !== 'all') {
        openGuestWhere.orderAssignments = { some: { assignedTo: agentFilter, isActive: true } };
      }
      const [openRegularCount, openGuestCount] = await Promise.all([
        prisma.order.count({ where: openRegularWhere }),
        prisma.guestOrder.count({ where: openGuestWhere })
      ]);
      const openOrdersCount = openRegularCount + openGuestCount;

      return {
        contactedOrdersCount,
        confirmedOrdersCount,
        followUpOrdersCount,
        cancelledOrdersCount,
        openOrdersCount,
        totalCalls,
        totalDurationSeconds,
        avgAttemptsPerOrder,
        avgHandlingTimeMinutes,
        callLogs,
        confirmedRegular,
        filteredGuestConfirmed,
        cancelledRegular,
        filteredGuestCancelled
      };
    };

    // Calculate current and previous period metrics
    const currentData = await aggregateMetrics(start, end, targetAgentId);
    const prevData = await aggregateMetrics(prevStart, prevEnd, targetAgentId);

    const calcDelta = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    // 2. Generate daily trend array
    const dailyTrend = [];
    const stepDate = new Date(start);
    while (stepDate <= end) {
      const dayStart = new Date(stepDate.getFullYear(), stepDate.getMonth(), stepDate.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(stepDate.getFullYear(), stepDate.getMonth(), stepDate.getDate(), 23, 59, 59, 999);
      const dateKey = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;

      const dayCalls = currentData.callLogs.filter((l) => {
        const t = new Date(l.createdAt).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      });
      const dayContacted = new Set(dayCalls.map((l) => l.orderId || l.guestOrderId).filter(Boolean)).size;

      const dayConfirmed = currentData.confirmedRegular.filter((o) => {
        const t = new Date(o.confirmedAt || o.updatedAt).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      }).length + currentData.filteredGuestConfirmed.filter((g) => {
        const t = new Date(g.updatedAt).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      }).length;

      const dayCancelled = currentData.cancelledRegular.filter((o) => {
        const t = new Date(o.updatedAt).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      }).length + currentData.filteredGuestCancelled.filter((g) => {
        const t = new Date(g.updatedAt).getTime();
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      }).length;

      dailyTrend.push({
        date: dateKey,
        dayName: dayStart.toLocaleDateString('ar-EG', { weekday: 'short' }),
        calls: dayCalls.length,
        contacted: dayContacted,
        confirmed: dayConfirmed,
        cancelled: dayCancelled
      });

      stepDate.setDate(stepDate.getDate() + 1);
    }

    // 3. Per-Agent Breakdown Table
    const agentBreakdown = [];
    for (const agent of eligibleAgents) {
      const agentMetrics = await aggregateMetrics(start, end, agent.id);
      const confirmationRate = agentMetrics.contactedOrdersCount > 0
        ? Number(((agentMetrics.confirmedOrdersCount / agentMetrics.contactedOrdersCount) * 100).toFixed(1))
        : 0;

      agentBreakdown.push({
        agentId: agent.id,
        agentName: agent.name,
        email: agent.email,
        role: agent.role,
        contactedOrders: agentMetrics.contactedOrdersCount,
        confirmedOrders: agentMetrics.confirmedOrdersCount,
        followUpOrders: agentMetrics.followUpOrdersCount,
        cancelledOrders: agentMetrics.cancelledOrdersCount,
        openOrders: agentMetrics.openOrdersCount,
        totalCalls: agentMetrics.totalCalls,
        totalDurationSeconds: agentMetrics.totalDurationSeconds,
        avgAttemptsPerOrder: agentMetrics.avgAttemptsPerOrder,
        avgHandlingTimeMinutes: agentMetrics.avgHandlingTimeMinutes,
        confirmationRate
      });
    }

    agentBreakdown.sort((a, b) => b.confirmedOrders - a.confirmedOrders);

    const overallConfirmationRate = currentData.contactedOrdersCount > 0
      ? Number(((currentData.confirmedOrdersCount / currentData.contactedOrdersCount) * 100).toFixed(1))
      : 0;

    return res.json({
      success: true,
      data: {
        isManager,
        range,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
          prevStart: prevStart.toISOString(),
          prevEnd: prevEnd.toISOString()
        },
        kpis: {
          contactedOrders: {
            value: currentData.contactedOrdersCount,
            prevValue: prevData.contactedOrdersCount,
            deltaPercent: calcDelta(currentData.contactedOrdersCount, prevData.contactedOrdersCount),
            source: 'call_attempt_logs'
          },
          confirmedOrders: {
            value: currentData.confirmedOrdersCount,
            prevValue: prevData.confirmedOrdersCount,
            deltaPercent: calcDelta(currentData.confirmedOrdersCount, prevData.confirmedOrdersCount),
            source: 'orders / guest_orders (CONFIRMED)'
          },
          followUpOrders: {
            value: currentData.followUpOrdersCount,
            prevValue: prevData.followUpOrdersCount,
            deltaPercent: calcDelta(currentData.followUpOrdersCount, prevData.followUpOrdersCount),
            source: 'call_attempt_logs / followUpDate'
          },
          cancelledOrders: {
            value: currentData.cancelledOrdersCount,
            prevValue: prevData.cancelledOrdersCount,
            deltaPercent: calcDelta(currentData.cancelledOrdersCount, prevData.cancelledOrdersCount),
            source: 'orders / guest_orders (CANCELLED)'
          },
          openOrders: {
            value: currentData.openOrdersCount,
            prevValue: prevData.openOrdersCount,
            deltaPercent: calcDelta(currentData.openOrdersCount, prevData.openOrdersCount),
            source: 'order_assignments / status PENDING'
          },
          totalCalls: {
            value: currentData.totalCalls,
            prevValue: prevData.totalCalls,
            deltaPercent: calcDelta(currentData.totalCalls, prevData.totalCalls),
            source: 'call_attempt_logs.id'
          },
          totalDurationSeconds: {
            value: currentData.totalDurationSeconds,
            prevValue: prevData.totalDurationSeconds,
            deltaPercent: calcDelta(currentData.totalDurationSeconds, prevData.totalDurationSeconds),
            source: 'call_attempt_logs.durationSeconds'
          },
          avgAttemptsPerOrder: {
            value: currentData.avgAttemptsPerOrder,
            prevValue: prevData.avgAttemptsPerOrder,
            deltaPercent: calcDelta(currentData.avgAttemptsPerOrder, prevData.avgAttemptsPerOrder),
            source: 'calls ÷ contacted orders'
          },
          avgHandlingTimeMinutes: {
            value: currentData.avgHandlingTimeMinutes,
            prevValue: prevData.avgHandlingTimeMinutes,
            deltaPercent: calcDelta(currentData.avgHandlingTimeMinutes, prevData.avgHandlingTimeMinutes),
            source: 'orders (confirmedAt - createdAt)'
          },
          confirmationRate: {
            value: overallConfirmationRate,
            source: 'confirmed ÷ contacted orders'
          }
        },
        dailyTrend,
        agents: eligibleAgents,
        agentBreakdown
      }
    });
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in getWorkspaceReports:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب تقارير أداء مساحة العمل' });
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
  updateOrderCustomer,
  getWorkspaceReports,
  requireManager
};
