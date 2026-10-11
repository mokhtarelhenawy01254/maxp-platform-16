const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
const { buildDateRangeFilter, EGYPT_TIMEZONE } = require('../utils/dateUtils');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const _companyTimezoneCache = new Map();
const getCompanyTimezone = async (companyId) => {
  if (!companyId) return EGYPT_TIMEZONE;
  const cached = _companyTimezoneCache.get(companyId);
  if (cached && (Date.now() - cached.cachedAt < 5 * 60 * 1000)) {
    return cached.timezone;
  }
  try {
    const comp = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { timezone: true }
    });
    const tz = comp?.timezone || EGYPT_TIMEZONE;
    _companyTimezoneCache.set(companyId, { timezone: tz, cachedAt: Date.now() });
    return tz;
  } catch (err) {
    return EGYPT_TIMEZONE;
  }
};

const getAllOrders = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'معرف الشركة مطلوب' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status).trim() : null;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const companyTimezone = await getCompanyTimezone(companyId);

    // Build filters for regular orders and guest orders
    const where = { companyId };
    const guestWhere = { companyId };

    // Status filtering
    if (status) {
      const statusUpper = status.toUpperCase();
      const statusLower = status.toLowerCase();
      where.status = statusUpper;
      guestWhere.status = { in: [statusUpper, statusLower] };
    } else {
      // Default: exclude TRASH orders unless specifically requested
      where.status = { not: 'TRASH' };
      guestWhere.status = { notIn: ['TRASH', 'trash', 'deleted'] };
    }

    // Date range filtering
    if (startDate || endDate) {
      const dateFilter = buildDateRangeFilter(startDate, endDate, companyTimezone);
      if (dateFilter.gte || dateFilter.lte) {
        where.createdAt = dateFilter;
        guestWhere.createdAt = dateFilter;
      }
    }

    // "Fetch Top N" Strategy:
    // To properly merge and slice across both tables, fetch top records from both
    const fetchLimit = Math.max(limit, (page * limit) + limit);

    const [regularOrders, guestOrders, totalRegular, totalGuest] = await Promise.all([
      getSharedPrismaClient().order.findMany({
        where,
        take: fetchLimit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          customer: { select: { firstName: true, lastName: true, phone: true } },
          orderItems: { include: { product: { select: { name: true } } } }
        }
      }),
      getSharedPrismaClient().guestOrder.findMany({
        where: guestWhere,
        take: fetchLimit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
      }),
      getSharedPrismaClient().order.count({ where }),
      getSharedPrismaClient().guestOrder.count({ where: guestWhere })
    ]);

    // Reconcile and deduplicate twins:
    // Any guest order whose orderNumber already exists as a regular order is shadowed
    const regularOrderNumberSet = new Set(
      regularOrders.map(o => String(o.orderNumber || '').trim().toLowerCase()).filter(Boolean)
    );

    const guestNumbers = [
      ...new Set(guestOrders.map(g => String(g.orderNumber || '').trim()).filter(Boolean))
    ];
    let totalTwinsInScope = 0;

    if (guestNumbers.length > 0) {
      const twinRows = await getSharedPrismaClient().order.findMany({
        where: {
          companyId,
          orderNumber: { in: guestNumbers, mode: 'insensitive' }
        },
        select: { orderNumber: true }
      });

      const twinOrderNumbers = Array.isArray(twinRows) ? twinRows.map(t => t.orderNumber).filter(Boolean) : [];
      if (twinOrderNumbers.length > 0) {
        totalTwinsInScope = await getSharedPrismaClient().guestOrder.count({
          where: {
            AND: [
              guestWhere,
              { orderNumber: { in: twinOrderNumbers, mode: 'insensitive' } }
            ]
          }
        });
        twinRows.forEach(t => regularOrderNumberSet.add(String(t.orderNumber || '').trim().toLowerCase()));
      }
    }

    // Filter out shadowed guest orders
    const filteredGuestOrders = guestOrders.filter(g => {
      const key = String(g.orderNumber || '').trim().toLowerCase();
      return !key || !regularOrderNumberSet.has(key);
    });

    // Format regular orders
    const formattedRegular = regularOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'عميل غير محدد',
      customerPhone: order.customerPhone || order.customer?.phone || '',
      customerEmail: order.customerEmail || '',
      total: order.total,
      status: (order.status || 'PENDING').toLowerCase(),
      paymentStatus: (order.paymentStatus || 'PENDING').toLowerCase(),
      createdAt: order.createdAt,
      items: (order.orderItems || []).map(item => ({
        id: item.id,
        name: item.productName || item.product?.name || 'منتج غير محدد',
        price: item.price,
        quantity: item.quantity
      }))
    }));

    // Format guest orders
    const formattedGuests = filteredGuestOrders.map(order => {
      let items = [];
      try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
      } catch (_) {
        items = [];
      }
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.guestName || 'عميل زائر',
        customerPhone: order.guestPhone || '',
        customerEmail: order.guestEmail || '',
        total: order.finalTotal ? parseFloat(order.finalTotal) : parseFloat(order.total || 0),
        status: (order.status || 'PENDING').toLowerCase(),
        paymentStatus: (order.paymentStatus || 'PENDING').toLowerCase(),
        createdAt: order.createdAt,
        items: (Array.isArray(items) ? items : []).map(item => ({
          id: item.id || item.productId || '',
          name: item.name || item.productName || 'منتج غير محدد',
          price: item.price || 0,
          quantity: item.quantity || 1
        }))
      };
    });

    // Merge & Sort (createdAt desc, then id desc)
    const allFetchedOrders = [...formattedRegular, ...formattedGuests].sort((a, b) => {
      const timeDiff = new Date(b.createdAt) - new Date(a.createdAt);
      if (timeDiff !== 0) return timeDiff;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

    // Paginate slice
    const paginatedOrders = allFetchedOrders.slice(skip, skip + limit);

    // Calculate accurate total pagination count
    const total = Math.max(paginatedOrders.length, (totalRegular + totalGuest) - totalTwinsInScope);

    res.json({
      success: true,
      data: paginatedOrders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    console.error('❌ [ORDER-CONTROLLER] Error in getAllOrders:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب الطلبات' });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, notes } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    console.log(`🔍 [ORDER-CONTROLLER-DEBUG] Update request received:`);
    console.log(`   - Order ID: ${id}`);
    console.log(`   - New Status: ${status}`);
    console.log(`   - Company ID: ${companyId}`);
    console.log(`   - User:`, req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Unknown');

    if (!companyId) {
      console.log(`❌ [ORDER-CONTROLLER-DEBUG] No company ID found`);
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    // --- ADD PERMISSION CHECK HERE ---
    if (req.user && ['MODERATOR', 'EMPLOYEE'].includes(req.user.role)) {
      const existingOrder = await getSharedPrismaClient().order.findFirst({
        where: {
          OR: [
            { id: id, companyId: companyId },
            { orderNumber: id, companyId: companyId }
          ]
        },
        select: { createdBy: true }
      });

      if (!existingOrder) {
        return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      }

      if (existingOrder.createdBy !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          error: 'ليس لديك صلاحية لتعديل أو تأكيد هذا الطلب لأنك لست من قام بتسجيله' 
        });
      }
    }
    // ---------------------------------

    // استخدام OrderService الحقيقي
    console.log(`🔧 [ORDER-CONTROLLER-DEBUG] Preparing OrderService...`);
    const orderService = require('../services/orderService');

    // تحديث حالة الطلب (id هنا قد يكون id أو orderNumber) مع تمرير companyId والمستخدم
    console.log(`📞 [ORDER-CONTROLLER-DEBUG] Calling updateOrderStatus with companyId and user...`);
    const updatedOrder = await orderService.updateOrderStatus(
      id,
      companyId,
      status,
      notes,
      req.user?.id || null,
      req.user ? `${req.user.firstName} ${req.user.lastName}` : null
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

    res.json({
      success: true,
      data: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        trackingNumber: updatedOrder.turboTrackingNumber || trackingNumber,
        turboShipmentId: updatedOrder.turboShipmentId,
        updatedAt: updatedOrder.updatedAt.toISOString()
      },
      message: 'تم تحديث حالة الطلب بنجاح'
    });
  } catch (error) {
    console.error('❌ Error in updateOrder controller:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update order'
    });
  }
}

const getOneOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    let order = await getSharedPrismaClient().order.findFirst({
      where: {
        companyId,
        OR: [
          { id },
          { orderNumber: id }
        ]
      },
      include: {
        customer: true,
        orderItems: { include: { product: true } },
        statusHistory: true
      }
    });

    if (!order) {
      const guestOrder = await getSharedPrismaClient().guestOrder.findFirst({
        where: {
          companyId,
          OR: [
            { id },
            { orderNumber: id }
          ]
        }
      });

      if (guestOrder) {
        let items = [];
        try {
          items = typeof guestOrder.items === 'string' ? JSON.parse(guestOrder.items) : (guestOrder.items || []);
        } catch (_) {
          items = [];
        }

        order = {
          id: guestOrder.id,
          orderNumber: guestOrder.orderNumber,
          customerName: guestOrder.guestName || 'عميل زائر',
          customerPhone: guestOrder.guestPhone || '',
          customerEmail: guestOrder.guestEmail || '',
          total: guestOrder.finalTotal ? parseFloat(guestOrder.finalTotal) : parseFloat(guestOrder.total || 0),
          status: guestOrder.status,
          paymentStatus: guestOrder.paymentStatus,
          paymentMethod: guestOrder.paymentMethod,
          shippingAddress: guestOrder.shippingAddress,
          createdAt: guestOrder.createdAt,
          updatedAt: guestOrder.updatedAt,
          customer: {
            firstName: guestOrder.guestName,
            phone: guestOrder.guestPhone,
            email: guestOrder.guestEmail
          },
          orderItems: (Array.isArray(items) ? items : []).map(item => ({
            id: item.id || item.productId || '',
            productName: item.name || item.productName || 'منتج غير محدد',
            price: item.price || 0,
            quantity: item.quantity || 1,
            product: { name: item.name || item.productName || 'منتج غير محدد' }
          }))
        };
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('❌ [ORDER-CONTROLLER] Error in getOneOrder:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب بيانات الطلب' });
  }
};

const deleteAllOrders = async (req, res) => {
  try {
    console.log('🗑️ [ORDERS] Delete all orders request received');

    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
      });
    }

    // حذف جميع الطلبات العادية وطلبات الزوار للشركة
    const prisma = getSharedPrismaClient();
    await prisma.orderNote.deleteMany({
      where: {
        OR: [
          { order: { companyId } },
          { guestOrder: { companyId } }
        ]
      }
    }).catch(() => {});

    const [deleteResult, guestDeleteResult] = await Promise.all([
      prisma.order.deleteMany({
        where: { companyId }
      }),
      prisma.guestOrder.deleteMany({
        where: { companyId }
      })
    ]);

    const totalDeleted = (deleteResult?.count || 0) + (guestDeleteResult?.count || 0);
    console.log(`✅ [ORDERS] Deleted ${totalDeleted} orders (${deleteResult?.count || 0} regular, ${guestDeleteResult?.count || 0} guest) for company ${companyId}`);

    res.json({
      success: true,
      message: `تم حذف ${totalDeleted} طلب بنجاح`,
      deletedCount: totalDeleted
    });

  } catch (error) {
    console.error('❌ [ORDERS] Error deleting all orders:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في حذف الطلبات',
      error: error.message
    });
  }
};

const moveOrdersToTrash = async (req, res) => {
  try {
    const { orderIds } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    if (!orderIds || !Array.isArray(orderIds)) {
      return res.status(400).json({ success: false, message: 'قائمة الطلبات مطلوبة' });
    }

    const orderService = require('../services/orderService');
    const results = [];

    for (const id of orderIds) {
      try {
        await orderService.updateOrderStatus(id, companyId, 'TRASH', 'Bulk trash', req.user?.id, `${req.user?.firstName} ${req.user?.lastName}`);
        results.push({ id, success: true });
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }

    res.json({ success: true, results, message: `تم نقل ${results.filter(r => r.success).length} طلب إلى سلة المحذوفات` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const restoreOrdersFromTrash = async (req, res) => {
  try {
    const { orderIds } = req.body;
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;

    if (!orderIds || !Array.isArray(orderIds)) {
      return res.status(400).json({ success: false, message: 'قائمة الطلبات مطلوبة' });
    }

    const orderService = require('../services/orderService');
    const results = [];

    for (const id of orderIds) {
      try {
        await orderService.updateOrderStatus(id, companyId, 'RESTORE', 'Bulk restore', req.user?.id, `${req.user?.firstName} ${req.user?.lastName}`);
        results.push({ id, success: true });
      } catch (err) {
        results.push({ id, success: false, error: err.message });
      }
    }

    res.json({ success: true, results, message: `تم استعادة ${results.filter(r => r.success).length} طلب بنجاح` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getAllOrders, updateOrder, getOneOrder, deleteAllOrders, moveOrdersToTrash, restoreOrdersFromTrash }
