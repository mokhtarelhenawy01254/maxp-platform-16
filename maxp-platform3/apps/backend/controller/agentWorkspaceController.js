const { getSharedPrismaClient } = require('../services/sharedDatabase');
const orderService = require('../services/orderService');

/**
 * Agent Workspace Controller
 * Handles orders assigned to specific agents
 */

const WORKSPACE_EXCLUDED_STATUSES = new Set(['TRASH', 'DELETED', 'COMPLETED']);

const normalizeWorkspaceStatus = (value) => String(value || '').trim().toUpperCase();
const normalizeActionNote = (value) => String(value || '').trim();
const normalizeQuickActionStatus = (value) => {
  const normalizedStatus = normalizeWorkspaceStatus(value);
  return normalizedStatus === 'CANCELED' ? 'CANCELLED' : normalizedStatus;
};
const isCancellationStatus = (value) => normalizeQuickActionStatus(value) === 'CANCELLED';
const getCancellationReasonError = () => 'سبب إلغاء الطلب مطلوب عند اختيار حالة ملغي';

const shouldIncludeWorkspaceOrder = (order, requestedStatus = '', followUpOnly = false) => {
  if (!order) return false;

  const normalizedStatus = normalizeWorkspaceStatus(order.status);

  if (followUpOnly && !order.followUpDate) {
    return false;
  }

  if (requestedStatus) {
    return normalizedStatus === requestedStatus;
  }

  return !WORKSPACE_EXCLUDED_STATUSES.has(normalizedStatus);
};

const getMyOrders = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userId = req.user?.id;

    if (!companyId || !userId) {
      return res.status(403).json({ success: false, error: 'معرف الشركة أو المستخدم مطلوب' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const requestedStatus = normalizeWorkspaceStatus(req.query.status);
    const followUpOnly =
      req.query.followUpOnly === true ||
      req.query.followUpOnly === 'true' ||
      req.query.followUpOnly === '1';

    const prisma = getSharedPrismaClient();

    // Load active assignments first, then filter by the live order status so
    // the pending/confirmed tabs never depend on stale client-side paging.
    const assignments = await prisma.orderAssignment.findMany({
      where: {
        companyId,
        assignedTo: userId,
        isActive: true
      },
      include: {
        order: {
          include: {
            customer: true,
            orderItems: { include: { product: true } }
          }
        },
        guestOrder: {
          include: {
            orderNotes: true
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

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

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        type: isGuest ? 'GUEST' : 'REGULAR',
        customerName: isGuest ? order.guestName : (order.customerName || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim()),
        customerPhone: isGuest ? order.guestPhone : (order.customerPhone || order.customer?.phone || ''),
        governorate: order.governorate || order.shippingAddress?.governorate || '',
        city: order.city || order.shippingAddress?.city || '',
        total: parseFloat(order.total || order.finalTotal || 0),
        subtotal,
        shipping,
        status: order.status,
        createdAt: order.createdAt,
        assignedAt: a.assignedAt,
        callAttempts: order.callAttempts || 0,
        lastCallAt: isGuest ? order.lastCallAt : order.lastCallAttemptAt,
        followUpDate: order.followUpDate,
        items,
      };
    });

    const filteredOrders = formattedOrders.filter((order) =>
      shouldIncludeWorkspaceOrder(order, requestedStatus, followUpOnly)
    );
    const paginatedOrders = filteredOrders.slice(skip, skip + limit);
    const total = filteredOrders.length;

    res.json({
      success: true,
      data: paginatedOrders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in getMyOrders:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب طلباتك' });
  }
};

const logCallAttempt = async (req, res) => {
  try {
    const { id } = req.params; // Order ID or GuestOrder ID
    const { result, notes, type } = req.body; // type: 'REGULAR' or 'GUEST'
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    const userId = req.user?.id;

    const prisma = getSharedPrismaClient();
    const now = new Date();

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
            result,
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
            result,
            notes,
            createdAt: now
          }
        });
      });
    }

    res.json({ success: true, message: 'تم تسجيل محاولة الاتصال بنجاح' });
  } catch (error) {
    console.error('❌ [AGENT-WORKSPACE] Error in logCallAttempt:', error);
    res.status(500).json({ success: false, error: 'خطأ في تسجيل المكالمة' });
  }
};

const scheduleFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { followUpDate, type } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    const prisma = getSharedPrismaClient();
    const date = new Date(followUpDate);

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
    res.status(500).json({ success: false, error: 'خطأ في جدولة المتابعة' });
  }
};

const quickAction = async (req, res) => {
  try {
    const { id } = req.params;
    let { status, action, notes, type } = req.body;
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
