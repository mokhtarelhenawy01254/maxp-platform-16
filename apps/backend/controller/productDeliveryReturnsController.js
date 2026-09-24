const { getSharedPrismaClient } = require('../services/sharedDatabase');

const ANALYTICS_DAY_MS = 24 * 60 * 60 * 1000;

const round2 = (value) => {
  const num = Number(value) || 0;
  return Math.round(num * 100) / 100;
};

const pct = (part, total) => {
  if (!total || !part) return 0;
  return Math.round((part / total) * 1000) / 10;
};

const normalizeDateInput = (value, { endOfDay = false } = {}) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
  }
  return date;
};

const parseDateRange = ({ startDate, endDate, period = '30' }) => {
  let end = normalizeDateInput(endDate, { endOfDay: true }) || new Date();
  let start;
  const normalizedPeriod = String(period || '30').trim().toLowerCase();

  if (startDate) {
    start = normalizeDateInput(startDate);
  } else if (normalizedPeriod === 'today' || normalizedPeriod === '1') {
    start = new Date(end);
    start.setHours(0, 0, 0, 0);
  } else if (normalizedPeriod === 'yesterday' || normalizedPeriod === '2') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    start = yesterday;
    end = new Date(yesterday);
    end.setHours(23, 59, 59, 999);
  } else if (normalizedPeriod === 'this_month') {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else if (normalizedPeriod === 'last_month') {
    const now = new Date();
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else {
    const days = Number.parseInt(normalizedPeriod, 10);
    const safeDays = Number.isFinite(days) && days > 0 ? days : 30;
    start = new Date(end.getTime() - safeDays * ANALYTICS_DAY_MS);
  }

  if (!start || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const now = new Date();
    start = new Date(now.getTime() - 30 * ANALYTICS_DAY_MS);
    end = now;
  }

  return { start, end };
};

const categorizeReturnReason = (reasonText) => {
  if (!reasonText) return 'OTHER';
  const t = String(reasonText).toLowerCase();

  if (
    t.includes('مقاس') || t.includes('كبير') || t.includes('صغير') ||
    t.includes('خامة') || t.includes('جودة') || t.includes('عيب') ||
    t.includes('تالف') || t.includes('مختلف') || t.includes('لون') ||
    t.includes('مواصفات') || t.includes('غير مطابق') || t.includes('صورة') ||
    t.includes('موديل') || t.includes('size') || t.includes('quality') ||
    t.includes('defect') || t.includes('color') || t.includes('wrong')
  ) {
    return 'QUALITY_CATALOG';
  }

  if (
    t.includes('شحن') || t.includes('مندوب') || t.includes('تأخر') ||
    t.includes('تأخير') || t.includes('وقت') || t.includes('توصيل') ||
    t.includes('عنوان') || t.includes('ميعاد') || t.includes('سفر') ||
    t.includes('كابتن') || t.includes('delivery') || t.includes('shipping') ||
    t.includes('late') || t.includes('delay') || t.includes('courier')
  ) {
    return 'LOGISTICS';
  }

  if (
    t.includes('فلوس') || t.includes('مبلغ') || t.includes('ألغى') ||
    t.includes('الغاء') || t.includes('كنسل') || t.includes('مش جاهز') ||
    t.includes('طلب مكرر') || t.includes('مش عايز') || t.includes('سعر') ||
    t.includes('غير جاد') || t.includes('مغلق') || t.includes('لم يرد') ||
    t.includes('ما بيردش') || t.includes('cancel') || t.includes('price') ||
    t.includes('duplicate') || t.includes('unreachable')
  ) {
    return 'CUSTOMER_SALES';
  }

  return 'OTHER';
};

const isDeliveredOrder = (status, customCode) => {
  const s = String(status || '').toUpperCase().trim();
  const c = String(customCode || '').toUpperCase().trim();
  return s === 'DELIVERED' || c === 'DELIVERED' || s === 'COMPLETED';
};

const isReturnedOrder = (status, customCode) => {
  const s = String(status || '').toUpperCase().trim();
  const c = String(customCode || '').toUpperCase().trim();
  return (
    s === 'RETURNED' ||
    s === 'PARTIALLY_RETURNED' ||
    s === 'REFUNDED' ||
    s === 'PARTIALLY_REFUNDED' ||
    s === 'RETURNED_TO_COMPANY' ||
    c.includes('RETURN') ||
    s.includes('RETURN')
  );
};

const extractOrderReturnReason = (order) => {
  if (order.turboReturnReason && order.turboReturnReason.trim()) {
    return order.turboReturnReason.trim();
  }
  if (order.returnRequests && order.returnRequests.length > 0) {
    const rr = order.returnRequests[0];
    const directReason = rr.returnReason?.reason || rr.returnReason?.returnReasonCategory?.name;
    if (directReason && directReason.trim()) return directReason.trim();
    if (rr.rejectionReason && rr.rejectionReason.trim()) return rr.rejectionReason.trim();
    if (rr.customerNotes && rr.customerNotes.trim()) return rr.customerNotes.trim();
    if (rr.adminNotes && rr.adminNotes.trim()) return rr.adminNotes.trim();
  }
  if (order.turboDelayReason && order.turboDelayReason.trim()) {
    return order.turboDelayReason.trim();
  }
  return 'رفض أو عدم استلام بدون ذكر سبب';
};

/**
 * تقرير تحليلي مخصص لكل منتج: نسب التسليم والتحصيل وتفصيل أسباب المرتجعات للمعالجة التشغيلية
 * GET /api/analytics/products-delivery-returns
 */
const getProductDeliveryReturnsReport = async (req, res) => {
  try {
    const companyId = req.user?.effectiveCompanyId || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'معرف الشركة مطلوب' });
    }

    const {
      startDate,
      endDate,
      period = '30',
      search = '',
      productId = '',
      shippingCompanyId = '',
      governorate = '',
      statusFilter = 'ALL',
      sortBy = 'totalShipped',
      sortOrder = 'desc'
    } = req.query;

    const prisma = getSharedPrismaClient();
    const { start, end } = parseDateRange({ startDate, endDate, period });

    const orderWhere = {
      companyId: String(companyId),
      createdAt: { gte: start, lte: end }
    };

    if (shippingCompanyId) {
      orderWhere.shipments = { some: { shippingCompanyId: String(shippingCompanyId) } };
    }

    if (governorate && governorate !== 'ALL') {
      orderWhere.governorate = { equals: governorate, mode: 'insensitive' };
    }

    const orders = await prisma.order.findMany({
      where: orderWhere,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customStatusCode: true,
        paymentStatus: true,
        total: true,
        subtotal: true,
        shipping: true,
        governorate: true,
        city: true,
        turboReturnReason: true,
        turboDelayReason: true,
        turboShipmentStatus: true,
        createdAt: true,
        returnRequests: {
          select: {
            id: true,
            status: true,
            responsibleParty: true,
            shippingReturnCost: true,
            customerNotes: true,
            adminNotes: true,
            rejectionReason: true,
            returnReason: {
              select: {
                reason: true,
                returnReasonCategory: { select: { name: true, defaultRole: true } }
              }
            }
          }
        },
        orderItems: {
          select: {
            id: true,
            productId: true,
            productName: true,
            productSku: true,
            productImage: true,
            quantity: true,
            price: true,
            total: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                mainImage: true,
                stock: true,
                category: { select: { id: true, name: true } }
              }
            }
          }
        }
      }
    });

    const productMap = {};

    orders.forEach((order) => {
      const isDelivered = isDeliveredOrder(order.status, order.customStatusCode);
      const isReturned = isReturnedOrder(order.status, order.customStatusCode);
      const isInTransit = !isDelivered && !isReturned && (
        ['SHIPPED', 'OUT_FOR_DELIVERY', 'READY_TO_SHIP', 'PROCESSING'].includes(order.status) ||
        String(order.customStatusCode || '').toUpperCase().includes('TRANSIT') ||
        String(order.customStatusCode || '').toUpperCase().includes('SHIP')
      );
      const isCancelledPreDispatch = !isDelivered && !isReturned && !isInTransit && order.status === 'CANCELLED';

      const items = order.orderItems || [];
      const totalOrderItemsCount = items.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1;
      const orderShippingVal = parseFloat(order.shipping) || 45;

      const orderReturnReasonText = isReturned ? extractOrderReturnReason(order) : null;
      const orderReturnCategory = isReturned ? categorizeReturnReason(orderReturnReasonText) : null;

      items.forEach((item) => {
        const itemPid = item.productId || item.product?.id || null;
        const key = itemPid || item.product?.name || item.productName || item.productSku || 'unknown';
        const name = item.product?.name || item.productName || 'منتج غير معروف';
        const sku = item.product?.sku || item.productSku || null;
        const image = item.product?.mainImage || item.productImage || null;
        const categoryName = item.product?.category?.name || 'عام';
        const stock = item.product?.stock ?? null;

        if (!productMap[key]) {
          productMap[key] = {
            productId: itemPid,
            productName: name,
            productSku: sku,
            productImage: image,
            categoryName,
            stock,
            totalOrders: new Set(),
            deliveredOrders: new Set(),
            returnedOrders: new Set(),
            inTransitOrders: new Set(),
            cancelledOrders: new Set(),
            shippedQuantity: 0,
            deliveredQuantity: 0,
            returnedQuantity: 0,
            inTransitQuantity: 0,
            cancelledQuantity: 0,
            expectedRevenue: 0,
            collectedRevenue: 0,
            lostRevenue: 0,
            inTransitRevenue: 0,
            lostShippingCost: 0,
            returnReasonsMap: {}
          };
        }

        const pData = productMap[key];
        const qty = item.quantity || 1;
        const itemRevenue = parseFloat(item.total) || (parseFloat(item.price) || 0) * qty || 0;
        const proportionalShipping = (orderShippingVal * qty) / totalOrderItemsCount;

        pData.totalOrders.add(order.id);

        if (isDelivered) {
          pData.deliveredOrders.add(order.id);
          pData.shippedQuantity += qty;
          pData.deliveredQuantity += qty;
          pData.expectedRevenue += itemRevenue;
          pData.collectedRevenue += itemRevenue;
        } else if (isReturned) {
          pData.returnedOrders.add(order.id);
          pData.shippedQuantity += qty;
          pData.returnedQuantity += qty;
          pData.expectedRevenue += itemRevenue;
          pData.lostRevenue += itemRevenue;
          pData.lostShippingCost += proportionalShipping;

          const rReason = orderReturnReasonText || 'رفض أو عدم استلام بدون ذكر سبب';
          if (!pData.returnReasonsMap[rReason]) {
            pData.returnReasonsMap[rReason] = {
              reason: rReason,
              category: orderReturnCategory || 'OTHER',
              count: 0,
              lostValue: 0
            };
          }
          pData.returnReasonsMap[rReason].count += 1;
          pData.returnReasonsMap[rReason].lostValue += itemRevenue;
        } else if (isInTransit) {
          pData.inTransitOrders.add(order.id);
          pData.shippedQuantity += qty;
          pData.inTransitQuantity += qty;
          pData.expectedRevenue += itemRevenue;
          pData.inTransitRevenue += itemRevenue;
        } else if (isCancelledPreDispatch) {
          pData.cancelledOrders.add(order.id);
          pData.cancelledQuantity += qty;
        }
      });
    });

    const productsList = Object.values(productMap).map((row) => {
      const closedCount = row.deliveredQuantity + row.returnedQuantity;
      const deliveryRate = pct(row.deliveredQuantity, closedCount > 0 ? closedCount : row.shippedQuantity);
      const shippedDeliveryRate = pct(row.deliveredQuantity, row.shippedQuantity);
      const returnRate = pct(row.returnedQuantity, row.shippedQuantity);
      const inTransitRate = pct(row.inTransitQuantity, row.shippedQuantity);
      const collectionRate = pct(row.collectedRevenue, row.expectedRevenue);

      const returnReasons = Object.values(row.returnReasonsMap)
        .map((r) => ({
          ...r,
          percentage: pct(r.count, row.returnedOrders.size || 1),
          lostValue: round2(r.lostValue)
        }))
        .sort((a, b) => b.count - a.count);

      const catCounts = {
        QUALITY_CATALOG: 0,
        LOGISTICS: 0,
        CUSTOMER_SALES: 0,
        OTHER: 0
      };
      returnReasons.forEach((r) => {
        catCounts[r.category] = (catCounts[r.category] || 0) + r.count;
      });

      let primaryBottleneck = 'NONE';
      let operationalRecommendation = 'أداء المنتج مستقر والمؤشرات في النطاق الآمن.';

      if (row.returnedQuantity > 0) {
        if (catCounts.QUALITY_CATALOG >= catCounts.LOGISTICS && catCounts.QUALITY_CATALOG >= catCounts.CUSTOMER_SALES && catCounts.QUALITY_CATALOG > 0) {
          primaryBottleneck = 'QUALITY_CATALOG';
          operationalRecommendation = 'معظم المرتجعات ناتجة عن المقاسات أو خامة المنتج ومطابقته للصور. يُنصح بمراجعة جدول المقاسات وتأكيد المقاس مع العميل قبل الشحن وفحص جودة الدفعة.';
        } else if (catCounts.LOGISTICS >= catCounts.QUALITY_CATALOG && catCounts.LOGISTICS >= catCounts.CUSTOMER_SALES && catCounts.LOGISTICS > 0) {
          primaryBottleneck = 'LOGISTICS';
          operationalRecommendation = 'السبب الأساسي هو تأخر شركة الشحن أو عدم التزام المندوب. يُوصى بتوجيه هذا المنتج لشركة شحن بديلة ومتابعة مسار الشحنات المتأخرة فوراً.';
        } else if (catCounts.CUSTOMER_SALES > 0) {
          primaryBottleneck = 'CUSTOMER_SALES';
          operationalRecommendation = 'المرتجعات مرتبطة بعدم جاهزية المبلغ أو تردد العميل. يُنصح بتفعيل التأكيد الهاتفي الصارم وطلب دفعة مسبقة (COD Deposit) في المحافظات عالية الخطورة.';
        }
      }

      let healthStatus = 'HEALTHY';
      if ((deliveryRate < 65 && closedCount >= 3) || (returnRate > 25 && row.shippedQuantity >= 4)) {
        healthStatus = 'CRITICAL';
      } else if ((deliveryRate < 75 && closedCount >= 3) || (returnRate > 15 && row.shippedQuantity >= 3)) {
        healthStatus = 'WARNING';
      }

      return {
        productId: row.productId,
        productName: row.productName,
        productSku: row.productSku,
        productImage: row.productImage,
        categoryName: row.categoryName,
        stock: row.stock,
        totalOrders: row.totalOrders.size,
        deliveredOrders: row.deliveredOrders.size,
        returnedOrders: row.returnedOrders.size,
        inTransitOrders: row.inTransitOrders.size,
        cancelledOrders: row.cancelledOrders.size,
        shippedQuantity: row.shippedQuantity,
        deliveredQuantity: row.deliveredQuantity,
        returnedQuantity: row.returnedQuantity,
        inTransitQuantity: row.inTransitQuantity,
        cancelledQuantity: row.cancelledQuantity,
        deliveryRate,
        shippedDeliveryRate,
        returnRate,
        inTransitRate,
        collectionRate,
        expectedRevenue: round2(row.expectedRevenue),
        collectedRevenue: round2(row.collectedRevenue),
        lostRevenue: round2(row.lostRevenue),
        inTransitRevenue: round2(row.inTransitRevenue),
        lostShippingCost: round2(row.lostShippingCost),
        healthStatus,
        primaryBottleneck,
        operationalRecommendation,
        returnReasons
      };
    });

    let filtered = productsList;

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.productName.toLowerCase().includes(q) ||
          (p.productSku && p.productSku.toLowerCase().includes(q))
      );
    }

    if (productId && productId.trim()) {
      filtered = filtered.filter((p) => p.productId === productId.trim());
    }

    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter((p) => p.healthStatus === statusFilter);
    }

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      if (sortBy === 'deliveryRate') return (a.deliveryRate - b.deliveryRate) * sortDir;
      if (sortBy === 'collectionRate') return (a.collectionRate - b.collectionRate) * sortDir;
      if (sortBy === 'returnRate') return (a.returnRate - b.returnRate) * sortDir;
      if (sortBy === 'collectedRevenue') return (a.collectedRevenue - b.collectedRevenue) * sortDir;
      if (sortBy === 'lostRevenue') return (a.lostRevenue - b.lostRevenue) * sortDir;
      if (sortBy === 'productName') return a.productName.localeCompare(b.productName) * sortDir;
      return (a.shippedQuantity - b.shippedQuantity) * sortDir;
    });

    const totalShippedQty = productsList.reduce((sum, p) => sum + p.shippedQuantity, 0);
    const totalDeliveredQty = productsList.reduce((sum, p) => sum + p.deliveredQuantity, 0);
    const totalReturnedQty = productsList.reduce((sum, p) => sum + p.returnedQuantity, 0);
    const totalInTransitQty = productsList.reduce((sum, p) => sum + p.inTransitQuantity, 0);
    const totalExpectedRevenue = productsList.reduce((sum, p) => sum + p.expectedRevenue, 0);
    const totalCollectedRevenue = productsList.reduce((sum, p) => sum + p.collectedRevenue, 0);
    const totalLostRevenue = productsList.reduce((sum, p) => sum + p.lostRevenue, 0);
    const totalLostShipping = productsList.reduce((sum, p) => sum + p.lostShippingCost, 0);

    const closedQty = totalDeliveredQty + totalReturnedQty;
    const overallDeliveryRate = pct(totalDeliveredQty, closedQty > 0 ? closedQty : totalShippedQty);
    const overallReturnRate = pct(totalReturnedQty, totalShippedQty);
    const overallCollectionRate = pct(totalCollectedRevenue, totalExpectedRevenue);

    const criticalCount = productsList.filter((p) => p.healthStatus === 'CRITICAL').length;
    const warningCount = productsList.filter((p) => p.healthStatus === 'WARNING').length;
    const healthyCount = productsList.filter((p) => p.healthStatus === 'HEALTHY').length;

    res.json({
      success: true,
      data: {
        summary: {
          totalProductsCount: productsList.length,
          totalShippedQuantity: totalShippedQty,
          totalDeliveredQuantity: totalDeliveredQty,
          totalReturnedQuantity: totalReturnedQty,
          totalInTransitQuantity: totalInTransitQty,
          overallDeliveryRate,
          overallReturnRate,
          overallCollectionRate,
          totalExpectedRevenue: round2(totalExpectedRevenue),
          totalCollectedRevenue: round2(totalCollectedRevenue),
          totalLostRevenue: round2(totalLostRevenue),
          totalLostShipping: round2(totalLostShipping),
          criticalCount,
          warningCount,
          healthyCount
        },
        products: filtered
      }
    });
  } catch (error) {
    console.error('❌ Error in getProductDeliveryReturnsReport:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب تقرير تسليم وتحصيل المنتجات',
      error: error.message
    });
  }
};

module.exports = {
  getProductDeliveryReturnsReport
};
