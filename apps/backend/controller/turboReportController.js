/**
 * Turbo Shipping Report Controller
 * تقارير شحن Turbo
 */

const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');
const TurboService = require('../services/turboService');

/**
 * جلب تقرير الشحن
 */
const getShippingReport = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { startDate, endDate, status, export: exportFormat } = req.query;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const prisma = getSharedPrismaClient();

    // بناء query للطلبات
    const where = {
      companyId: companyId,
      turboTrackingNumber: {
        not: null
      }
    };

    // فلترة حسب التاريخ
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        where.createdAt.lte = endDateTime;
      }
    }

    // فلترة حسب الحالة
    if (status) {
      where.turboShipmentStatus = status;
    }

    // جلب الطلبات
    const orders = await safeQuery(async () => {
      return await prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          shipping: true,
          turboTrackingNumber: true,
          turboShipmentStatus: true,
          turboMetadata: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1000 // حد أقصى 1000 طلب
      });
    }, 3);

    // معالجة البيانات وحساب الإحصائيات
    let totalActual = 0;
    let totalCustomer = 0;
    let ordersWithCost = 0;
    const reportData = [];

    for (const order of orders) {
      let actualCost = 0;
      try {
        if (order.turboMetadata) {
          const metadata = JSON.parse(order.turboMetadata);
          actualCost = parseFloat(metadata.actualShippingCost || 0);
        }
      } catch (e) {
        // Ignore parsing errors
      }

      const customerCost = parseFloat(order.shipping || 0);
      const difference = actualCost - customerCost;

      if (actualCost > 0) {
        totalActual += actualCost;
        ordersWithCost++;
      }
      totalCustomer += customerCost;

      reportData.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        actualCost,
        customerCost,
        difference,
        status: order.turboShipmentStatus,
        trackingNumber: order.turboTrackingNumber,
        createdAt: order.createdAt
      });
    }

    const totalDifference = totalActual - totalCustomer;
    const avgActual = ordersWithCost > 0 ? totalActual / ordersWithCost : 0;
    const avgCustomer = orders.length > 0 ? totalCustomer / orders.length : 0;

    // إذا كان الطلب تصدير CSV
    if (exportFormat === 'csv') {
      const csvRows = [];
      csvRows.push(['رقم الطلب', 'كود Turbo', 'السعر الفعلي', 'سعر العميل', 'الفرق', 'الحالة', 'التاريخ'].join(','));
      
      for (const row of reportData) {
        csvRows.push([
          `#${row.orderNumber}`,
          row.trackingNumber || '--',
          row.actualCost > 0 ? row.actualCost.toFixed(2) : 'غير متوفر',
          row.customerCost.toFixed(2),
          row.difference.toFixed(2),
          row.status || '--',
          new Date(row.createdAt).toLocaleDateString('ar-EG')
        ].join(','));
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="turbo-shipping-report-${Date.now()}.csv"`);
      // BOM for UTF-8
      res.write('\ufeff');
      return res.send(csvRows.join('\n'));
    }

    // إرجاع JSON
    res.json({
      success: true,
      data: {
        orders: reportData,
        statistics: {
          totalOrders: orders.length,
          ordersWithCost,
          totalActual,
          totalCustomer,
          totalDifference,
          avgActual,
          avgCustomer
        }
      }
    });
  } catch (error) {
    console.error('❌ [TURBO-REPORT] Error getting shipping report:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get shipping report'
    });
  }
};

/**
 * تحديث التكلفة الفعلية يدوي
 */
const updateManualCost = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { orderId, actualCost } = req.body;

    if (!companyId) {
      return res.status(403).json({ success: false, error: 'Company ID is required' });
    }
    if (!orderId || actualCost === undefined || actualCost === null || actualCost < 0) {
      return res.status(400).json({ success: false, error: 'orderId و actualCost مطلوبين' });
    }

    const prisma = getSharedPrismaClient();
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order || order.companyId !== companyId) {
      return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
    }

    let metadata = {};
    try {
      if (order.turboMetadata) {
        metadata = JSON.parse(order.turboMetadata);
      }
    } catch (e) { /* ignore */ }

    metadata.actualShippingCost = parseFloat(actualCost);
    metadata.actualShippingCostUpdatedAt = new Date().toISOString();
    metadata.actualShippingCostSource = 'manual';

    await prisma.order.update({
      where: { id: orderId },
      data: { turboMetadata: JSON.stringify(metadata) }
    });

    res.json({ success: true, message: 'تم تحديث التكلفة الفعلية' });
  } catch (error) {
    console.error('❌ [TURBO-REPORT] Error updating manual cost:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * تحديث جماعي للتكلفة الفعلية
 */
const bulkUpdateManualCost = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { orderIds, actualCost } = req.body;

    if (!companyId) {
      return res.status(403).json({ success: false, error: 'Company ID is required' });
    }
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0 || actualCost === undefined || actualCost < 0) {
      return res.status(400).json({ success: false, error: 'orderIds (مصفوفة) و actualCost مطلوبين' });
    }

    const prisma = getSharedPrismaClient();
    const now = new Date().toISOString();

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds }, companyId }
    });

    for (const order of orders) {
      let metadata = {};
      try {
        if (order.turboMetadata) {
          metadata = JSON.parse(order.turboMetadata);
        }
      } catch (e) { /* ignore */ }

      metadata.actualShippingCost = parseFloat(actualCost);
      metadata.actualShippingCostUpdatedAt = now;
      metadata.actualShippingCostSource = 'manual-bulk';

      await prisma.order.update({
        where: { id: order.id },
        data: { turboMetadata: JSON.stringify(metadata) }
      });
    }

    res.json({ success: true, message: `تم تحديث ${orders.length} طلب` });
  } catch (error) {
    console.error('❌ [TURBO-REPORT] Error bulk updating cost:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getShippingReport,
  updateManualCost,
  bulkUpdateManualCost
};

