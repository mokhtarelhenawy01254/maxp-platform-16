const { getSharedPrismaClient, initializeSharedDatabase, executeWithRetry } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const getAllOrders = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, error: 'معرف الشركة مطلوب' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    // Build filters
    const where = { companyId };
    
    // Default: exclude TRASH orders unless specifically requested
    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'TRASH' };
    }

    const [orders, total] = await Promise.all([
      getSharedPrismaClient().order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { firstName: true, lastName: true, phone: true } },
          orderItems: { include: { product: { select: { name: true } } } }
        }
      }),
      getSharedPrismaClient().order.count({ where })
    ]);

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'عميل غير محدد',
      customerPhone: order.customerPhone || order.customer?.phone || '',
      customerEmail: order.customerEmail || '',
      total: order.total,
      status: (order.status || 'PENDING').toLowerCase(),
      paymentStatus: (order.paymentStatus || 'PENDING').toLowerCase(),
      createdAt: order.createdAt,
      items: order.orderItems.map(item => ({
        id: item.id,
        name: item.productName || item.product?.name || 'منتج غير محدد',
        price: item.price,
        quantity: item.quantity
      }))
    }));

    res.json({
      success: true,
      data: formattedOrders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
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

    const order = await getSharedPrismaClient().order.findFirst({
      where: {
        id,
        companyId
      },
      include: {
        customer: true,
        orderItems: { include: { product: true } },
        statusHistory: true
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('❌ [ORDER-CONTROLLER] Error in getOneOrder:', error);
    res.status(500).json({ success: false, error: 'خطأ في جلب بيانات الطلب' });
  }
}

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
