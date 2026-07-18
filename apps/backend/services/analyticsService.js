const { getSharedPrismaClient } = require('./sharedDatabase');

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const formatDayKey = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildDateRange = (startDate, endDate) => {
  const dates = [];
  const cursor = startOfDay(startDate);
  const lastDay = startOfDay(endDate);

  while (cursor <= lastDay) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

const parseNumericValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolvePrimaryImage = (images) => {
  if (Array.isArray(images)) {
    return typeof images[0] === 'string' ? images[0] : '';
  }

  if (typeof images !== 'string' || !images.trim()) {
    return '';
  }

  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : '';
  } catch {
    return '';
  }
};

const parseGuestOrderItems = (items) => {
  if (Array.isArray(items)) {
    return items;
  }

  if (typeof items !== 'string' || !items.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(items);
    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
      return parsed.items;
    }
  } catch {
    return [];
  }

  return [];
};

const normalizeOrderIdentity = (value) => String(value || '').trim();

const buildGuestAnalyticsOrderId = (guestOrder) => {
  const orderNumber = normalizeOrderIdentity(guestOrder?.orderNumber);
  if (orderNumber) {
    return `guest:${orderNumber}`;
  }

  const guestOrderId = normalizeOrderIdentity(guestOrder?.id);
  return guestOrderId ? `guest-id:${guestOrderId}` : null;
};

class AnalyticsService {

  async getAnalyticsOrderSnapshots(companyId, startDate, endDate) {
    const prisma = getSharedPrismaClient();
    const where = {
      companyId,
      createdAt: { gte: startDate, lte: endDate },
    };

    const [regularOrders, guestOrders] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          total: true,
          status: true,
        },
      }),
      prisma.guestOrder.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          total: true,
          finalTotal: true,
          items: true,
          status: true,
        },
      }),
    ]);

    const regularOrderNumbers = new Set(
      regularOrders
        .map((order) => normalizeOrderIdentity(order.orderNumber))
        .filter(Boolean),
    );

    const supplementalGuestOrders = guestOrders.filter((order) => {
      const orderNumber = normalizeOrderIdentity(order.orderNumber);
      return !orderNumber || !regularOrderNumbers.has(orderNumber);
    });

    return {
      regularOrders,
      supplementalGuestOrders,
    };
  }

  async trackStoreVisit(data) {
    const { companyId, sessionId, ipAddress, userAgent, referrer, landingPage } = data;

    if (!companyId) {
      console.warn('⚠️ [Analytics] trackStoreVisit called without companyId');
      return null;
    }

    // Verify company exists before creating visit record
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { id: true }
    });

    if (!company) {
      console.warn(`⚠️ [Analytics] Company not found: ${companyId}`);
      return null;
    }

    return await getSharedPrismaClient().storeVisit.create({
      data: {
        companyId,
        sessionId,
        ipAddress,
        userAgent,
        referrer,
        landingPage
      }
    });
  }

  async trackProductVisit(data) {
    const { productId, companyId, sessionId, source } = data;

    if (!companyId) {
      throw new Error('companyId is required');
    }

    const product = await getSharedPrismaClient().product.findFirst({
      where: { id: productId, companyId }
    });

    if (!product) {
      throw new Error('Product not found or does not belong to this company');
    }

    return await getSharedPrismaClient().productVisit.create({
      data: {
        productId,
        companyId,
        sessionId,
        source
      }
    });
  }

  async trackConversionEvent(data) {
    const { companyId, sessionId, eventType, productId, orderId, value, metadata } = data;

    if (!companyId) {
      console.warn('⚠️ [Analytics] trackConversionEvent called without companyId');
      return null;
    }

    // Verify company exists
    const company = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { id: true }
    });

    if (!company) {
      console.warn(`⚠️ [Analytics] Company not found: ${companyId}`);
      return null;
    }

    // Validate product only for add_to_cart events
    if (productId && eventType === 'add_to_cart') {
      const product = await getSharedPrismaClient().product.findFirst({
        where: { id: productId, companyId }
      });

      if (!product) {
        console.warn(`Product ${productId} not found for company ${companyId}, but continuing with tracking`);
      }
    }

    // Verify order exists before adding it to avoid foreign key constraint errors
    let validOrderId = null;
    if (orderId) {
      const order = await getSharedPrismaClient().order.findFirst({
        where: { id: orderId, companyId }
      });

      if (order) {
        validOrderId = orderId;
      } else {
        console.warn(`Order ${orderId} not found for company ${companyId}, tracking without orderId`);
      }
    }

    return await getSharedPrismaClient().conversionEvent.create({
      data: {
        companyId,
        sessionId,
        eventType,
        productId,
        orderId: validOrderId,
        value: value ? parseFloat(value) : null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  }

  async getOrderSummary(companyId, startDate, endDate) {
    const { regularOrders, supplementalGuestOrders } =
      await this.getAnalyticsOrderSnapshots(companyId, startDate, endDate);

    const ordersRevenue = regularOrders.reduce(
      (sum, order) => sum + parseNumericValue(order.total),
      0,
    );
    const guestRevenue = supplementalGuestOrders.reduce(
      (sum, order) =>
        sum + parseNumericValue(order.finalTotal ?? order.total),
      0,
    );

    return {
      count: regularOrders.length + supplementalGuestOrders.length,
      revenue: parseNumericValue(ordersRevenue + guestRevenue),
    };
  }

  async getProductSalesMetrics(companyId, startDate, endDate) {
    const [orderItems, { supplementalGuestOrders }] = await Promise.all([
      getSharedPrismaClient().orderItem.findMany({
        where: {
          productId: { not: null },
          order: {
            is: {
              companyId,
              createdAt: { gte: startDate, lte: endDate }
            }
          }
        },
        select: {
          orderId: true,
          productId: true,
          quantity: true,
          price: true
        }
      }),
      this.getAnalyticsOrderSnapshots(companyId, startDate, endDate),
    ]);

    const metrics = new Map();

    for (const item of orderItems) {
      if (!item.productId) {
        continue;
      }

      const existing =
        metrics.get(item.productId) ||
        {
          sales: 0,
          revenue: 0,
          orderIds: new Set()
        };

      const quantity = parseNumericValue(item.quantity) || 1;
      existing.sales += quantity;
      existing.revenue += parseNumericValue(item.price) * quantity;
      if (item.orderId) {
        existing.orderIds.add(item.orderId);
      }

      metrics.set(item.productId, existing);
    }

    for (const guestOrder of supplementalGuestOrders) {
      const guestOrderId = buildGuestAnalyticsOrderId(guestOrder);
      const items = parseGuestOrderItems(guestOrder.items);

      for (const item of items) {
        const productId = normalizeOrderIdentity(item?.productId);
        if (!productId) {
          continue;
        }

        const existing =
          metrics.get(productId) ||
          {
            sales: 0,
            revenue: 0,
            orderIds: new Set()
          };

        const quantity = parseNumericValue(item?.quantity) || 1;
        const lineRevenue = parseNumericValue(item?.total);
        const unitPrice = parseNumericValue(item?.price ?? item?.basePrice);

        existing.sales += quantity;
        existing.revenue += lineRevenue > 0 ? lineRevenue : unitPrice * quantity;
        if (guestOrderId) {
          existing.orderIds.add(guestOrderId);
        }

        metrics.set(productId, existing);
      }
    }

    return metrics;
  }

  async buildDailyAnalyticsFromRawEvents(companyId, startDate, endDate) {
    const [storeVisits, productVisits, conversionEvents, orderSnapshots] = await Promise.all([
      getSharedPrismaClient().storeVisit.findMany({
        where: {
          companyId,
          visitedAt: { gte: startDate, lte: endDate }
        },
        select: {
          visitedAt: true,
          sessionId: true
        }
      }),
      getSharedPrismaClient().productVisit.findMany({
        where: {
          companyId,
          visitedAt: { gte: startDate, lte: endDate }
        },
        select: {
          visitedAt: true
        }
      }),
      getSharedPrismaClient().conversionEvent.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate, lte: endDate },
          eventType: { in: ['add_to_cart', 'checkout'] }
        },
        select: {
          createdAt: true,
          eventType: true
        }
      }),
      this.getAnalyticsOrderSnapshots(companyId, startDate, endDate)
    ]);

    const buckets = new Map();

    const ensureBucket = (date) => {
      const key = formatDayKey(date);

      if (!buckets.has(key)) {
        buckets.set(key, {
          date: startOfDay(date),
          totalVisits: 0,
          uniqueVisitors: new Set(),
          totalProductViews: 0,
          totalAddToCarts: 0,
          totalCheckouts: 0,
          totalPurchases: 0,
          totalRevenue: 0
        });
      }

      return buckets.get(key);
    };

    for (const visit of storeVisits) {
      const bucket = ensureBucket(visit.visitedAt);
      bucket.totalVisits += 1;
      if (visit.sessionId) {
        bucket.uniqueVisitors.add(visit.sessionId);
      }
    }

    for (const visit of productVisits) {
      ensureBucket(visit.visitedAt).totalProductViews += 1;
    }

    for (const event of conversionEvents) {
      const bucket = ensureBucket(event.createdAt);
      if (event.eventType === 'add_to_cart') {
        bucket.totalAddToCarts += 1;
      }
      if (event.eventType === 'checkout') {
        bucket.totalCheckouts += 1;
      }
    }

    for (const order of orderSnapshots.regularOrders) {
      const bucket = ensureBucket(order.createdAt);
      bucket.totalPurchases += 1;
      bucket.totalRevenue += parseNumericValue(order.total);
    }

    for (const order of orderSnapshots.supplementalGuestOrders) {
      const bucket = ensureBucket(order.createdAt);
      bucket.totalPurchases += 1;
      bucket.totalRevenue += parseNumericValue(order.finalTotal ?? order.total);
    }

    const buildDailyEntry = (date) => {
      const key = formatDayKey(date);
      const bucket = buckets.get(key);
      const totalVisits = bucket?.totalVisits || 0;
      const totalPurchases = bucket?.totalPurchases || 0;
      const totalRevenue = bucket?.totalRevenue || 0;
      const uniqueVisitors = bucket?.uniqueVisitors?.size || 0;
      const avgOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;
      const conversionRate = totalVisits > 0 ? (totalPurchases / totalVisits) * 100 : 0;

      return {
        companyId,
        date: startOfDay(date),
        totalVisits,
        uniqueVisitors,
        totalProductViews: bucket?.totalProductViews || 0,
        totalAddToCarts: bucket?.totalAddToCarts || 0,
        totalCheckouts: bucket?.totalCheckouts || 0,
        totalPurchases,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2))
      };
    };

    const rangeEntries = buildDateRange(startDate, endDate).map((date) => buildDailyEntry(date));
    const coveredKeys = new Set(rangeEntries.map((entry) => formatDayKey(entry.date)));

    for (const bucket of buckets.values()) {
      const bucketKey = formatDayKey(bucket.date);
      if (!coveredKeys.has(bucketKey)) {
        rangeEntries.push(buildDailyEntry(bucket.date));
        coveredKeys.add(bucketKey);
      }
    }

    rangeEntries.sort((left, right) => new Date(left.date) - new Date(right.date));
    return rangeEntries;
  }

  async getStoreConversionRate(companyId, startDate, endDate) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const [visits, orderSummary] = await Promise.all([
      getSharedPrismaClient().storeVisit.count({
        where: {
          companyId,
          visitedAt: { gte: startDate, lte: endDate }
        }
      }),
      this.getOrderSummary(companyId, startDate, endDate)
    ]);

    const purchases = orderSummary.count;

    const conversionRate = visits > 0 ? (purchases / visits * 100).toFixed(2) : 0;

    return {
      visits,
      purchases,
      conversionRate: parseFloat(conversionRate)
    };
  }

  async getProductConversionRate(productId, companyId, startDate, endDate) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const product = await getSharedPrismaClient().product.findFirst({
      where: { id: productId, companyId }
    });

    if (!product) {
      throw new Error('Product not found or access denied');
    }

    const views = await getSharedPrismaClient().productVisit.count({
      where: {
        productId,
        companyId,
        visitedAt: { gte: startDate, lte: endDate }
      }
    });

    const addToCarts = await getSharedPrismaClient().conversionEvent.count({
      where: {
        productId,
        companyId,
        eventType: 'add_to_cart',
        createdAt: { gte: startDate, lte: endDate }
      }
    });

    const purchaseEvents = await getSharedPrismaClient().conversionEvent.count({
      where: {
        productId,
        companyId,
        eventType: 'purchase',
        createdAt: { gte: startDate, lte: endDate }
      }
    });
    const salesMetrics = await this.getProductSalesMetrics(companyId, startDate, endDate);
    const purchases = Math.max(
      purchaseEvents,
      salesMetrics.get(productId)?.orderIds?.size || 0
    );

    const viewToCartRate = views > 0 ? (addToCarts / views * 100).toFixed(2) : 0;
    const cartToPurchaseRate = addToCarts > 0 ? (purchases / addToCarts * 100).toFixed(2) : 0;
    const overallConversionRate = views > 0 ? (purchases / views * 100).toFixed(2) : 0;

    return {
      views,
      addToCarts,
      purchases,
      viewToCartRate: parseFloat(viewToCartRate),
      cartToPurchaseRate: parseFloat(cartToPurchaseRate),
      conversionRate: parseFloat(overallConversionRate)
    };
  }

  async getOrderBreakdown(companyId, startDate, endDate) {
    const prisma = getSharedPrismaClient();
    const where = {
      companyId,
      createdAt: { gte: startDate, lte: endDate },
    };

    const [regularOrders, guestOrders] = await Promise.all([
      prisma.order.findMany({
        where,
        select: { orderNumber: true, status: true, paymentMethod: true },
      }),
      prisma.guestOrder.findMany({
        where,
        select: { orderNumber: true, status: true, paymentMethod: true },
      }),
    ]);

    const regularOrderNumbers = new Set(
      regularOrders
        .map((o) => o.orderNumber)
        .filter(Boolean),
    );
    const supplementalGuests = guestOrders.filter(
      (o) => !o.orderNumber || !regularOrderNumbers.has(o.orderNumber),
    );

    const statusMap = {
      DELIVERED: 'completed',
      PROCESSING: 'processing',
      PENDING: 'pending',
      CANCELLED: 'cancelled',
      REFUNDED: 'refunded',
      RETURNED: 'refunded',
      PARTIALLY_REFUNDED: 'refunded',
      PARTIALLY_RETURNED: 'refunded',
      ON_HOLD: 'on-hold',
    };

    const byStatus = {};
    let codOrders = 0;
    let prepaidOrders = 0;

    const countOrder = (order) => {
      const raw = typeof order.status === 'string' ? order.status.toUpperCase() : '';
      const key = statusMap[raw] || raw.toLowerCase() || 'unknown';
      byStatus[key] = (byStatus[key] || 0) + 1;

      const pm = typeof order.paymentMethod === 'string' ? order.paymentMethod.toUpperCase() : '';
      if (pm === 'CASH') {
        codOrders++;
      } else if (pm) {
        prepaidOrders++;
      }
    };

    regularOrders.forEach(countOrder);
    supplementalGuests.forEach(countOrder);

    return {
      totalOrders: regularOrders.length + supplementalGuests.length,
      ordersByStatus: byStatus,
      codOrders,
      prepaidOrders,
      cancelledOrders: byStatus['cancelled'] || 0,
      rejectedOrders: 0,
    };
  }

  async getStoreAnalytics(companyId, startDate, endDate) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const [
      totalVisits,
      uniqueVisitors,
      totalProductViews,
      conversionEvents,
      orderSummary,
      orderBreakdown
    ] = await Promise.all([
      getSharedPrismaClient().storeVisit.count({
        where: { companyId, visitedAt: { gte: startDate, lte: endDate } }
      }),
      getSharedPrismaClient().storeVisit.groupBy({
        by: ['sessionId'],
        where: { companyId, visitedAt: { gte: startDate, lte: endDate } }
      }),
      getSharedPrismaClient().productVisit.count({
        where: { companyId, visitedAt: { gte: startDate, lte: endDate } }
      }),
      getSharedPrismaClient().conversionEvent.groupBy({
        by: ['eventType'],
        where: { companyId, createdAt: { gte: startDate, lte: endDate } },
        _count: true
      }),
      this.getOrderSummary(companyId, startDate, endDate),
      this.getOrderBreakdown(companyId, startDate, endDate)
    ]);

    const addToCarts = conversionEvents.find(e => e.eventType === 'add_to_cart')?._count || 0;
    const checkouts = conversionEvents.find(e => e.eventType === 'checkout')?._count || 0;
    const purchases = orderSummary.count;
    const totalRevenue = orderSummary.revenue;

    // Calculate average order value from purchase events
    const avgOrderValue = purchases > 0 ? (totalRevenue / purchases).toFixed(2) : 0;

    // Calculate conversion rates with proper fallbacks
    // Store-level conversion rate: purchases / total visits (overall store performance)
    const storeConversionRate = totalVisits > 0 ? (purchases / totalVisits * 100).toFixed(2) : 0;

    // Product-level conversion rate: purchases / product views (product engagement)
    const productConversionRate = totalProductViews > 0 ? (purchases / totalProductViews * 100).toFixed(2) : 0;

    // Funnel conversion rates
    const addToCartRate = totalProductViews > 0 ? (addToCarts / totalProductViews * 100).toFixed(2) : 0;
    const checkoutRate = addToCarts > 0 ? (checkouts / addToCarts * 100).toFixed(2) : 0;

    // Fix: If no checkouts but there are purchases, calculate from addToCarts instead
    const purchaseRate = checkouts > 0
      ? (purchases / checkouts * 100).toFixed(2)
      : (addToCarts > 0 ? (purchases / addToCarts * 100).toFixed(2) : 0);

    return {
      totalVisits,
      uniqueVisitors: uniqueVisitors.length,
      totalProductViews,
      addToCarts,
      checkouts,
      purchases,
      totalRevenue,
      conversionRate: parseFloat(storeConversionRate),
      productConversionRate: parseFloat(productConversionRate),
      avgOrderValue: parseFloat(avgOrderValue),
      addToCartRate: parseFloat(addToCartRate),
      checkoutRate: parseFloat(checkoutRate),
      purchaseRate: parseFloat(purchaseRate),
      ...orderBreakdown,
    };
  }

  async getTopPerformingProducts(companyId, startDate, endDate, limit = 10) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const [productViews, addToCartEvents, purchaseEvents, salesMetrics] = await Promise.all([
      getSharedPrismaClient().productVisit.groupBy({
        by: ['productId'],
        where: { companyId, visitedAt: { gte: startDate, lte: endDate } },
        _count: { id: true }
      }),
      getSharedPrismaClient().conversionEvent.groupBy({
        by: ['productId'],
        where: {
          companyId,
          eventType: 'add_to_cart',
          createdAt: { gte: startDate, lte: endDate },
          productId: { not: null }
        },
        _count: { id: true }
      }),
      getSharedPrismaClient().conversionEvent.groupBy({
        by: ['productId'],
        where: {
          companyId,
          eventType: 'purchase',
          createdAt: { gte: startDate, lte: endDate },
          productId: { not: null }
        },
        _count: { id: true }
      }),
      this.getProductSalesMetrics(companyId, startDate, endDate)
    ]);

    const productIds = [...new Set([
      ...productViews.map(v => v.productId),
      ...addToCartEvents.map(e => e.productId).filter(Boolean),
      ...purchaseEvents.map(e => e.productId).filter(Boolean),
      ...Array.from(salesMetrics.keys())
    ])];

    if (productIds.length === 0) {
      return [];
    }

    const allProducts = await getSharedPrismaClient().product.findMany({
      where: {
        companyId,
        id: { in: productIds }
      },
      select: { id: true, name: true, price: true, images: true }
    });

    const viewsMap = new Map(productViews.map(v => [v.productId, v._count.id]));
    const addToCartsMap = new Map(addToCartEvents.map(e => [e.productId, e._count.id]));
    const purchasesMap = new Map(purchaseEvents.map(e => [e.productId, e._count.id]));
    const productsMap = new Map(allProducts.map(p => [p.id, p]));

    const results = productIds.map(productId => {
      const product = productsMap.get(productId);
      if (!product) return null;

      const views = viewsMap.get(productId) || 0;
      const addToCarts = addToCartsMap.get(productId) || 0;
      const recordedPurchases = purchasesMap.get(productId) || 0;
      const salesMetric = salesMetrics.get(productId);
      const purchases = Math.max(
        recordedPurchases,
        salesMetric?.orderIds?.size || 0
      );
      const sales = salesMetric?.sales || 0;
      const revenue = parseFloat((salesMetric?.revenue || 0).toFixed(2));

      const viewToCartRate = views > 0 ? parseFloat(((addToCarts / views) * 100).toFixed(2)) : 0;
      const cartToPurchaseRate = addToCarts > 0 ? parseFloat(((purchases / addToCarts) * 100).toFixed(2)) : 0;
      const conversionRate = views > 0 ? parseFloat(((purchases / views) * 100).toFixed(2)) : 0;

      return {
        ...product,
        image: resolvePrimaryImage(product.images),
        views,
        addToCarts,
        purchases,
        sales,
        revenue,
        viewToCartRate,
        cartToPurchaseRate,
        conversionRate
      };
    }).filter(p => p !== null);

    return results
      .sort((a, b) => {
        if (b.conversionRate !== a.conversionRate) {
          return b.conversionRate - a.conversionRate;
        }
        if (b.revenue !== a.revenue) {
          return b.revenue - a.revenue;
        }
        if (b.sales !== a.sales) {
          return b.sales - a.sales;
        }
        if (b.purchases !== a.purchases) {
          return b.purchases - a.purchases;
        }
        return b.views - a.views;
      })
      .slice(0, limit);
  }

  async aggregateDailyAnalytics(companyId, date) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const analytics = await this.getStoreAnalytics(companyId, startOfDay, endOfDay);

    return await getSharedPrismaClient().dailyAnalytic.upsert({
      where: {
        companyId_date: {
          companyId,
          date: startOfDay
        }
      },
      update: {
        totalVisits: analytics.totalVisits,
        uniqueVisitors: analytics.uniqueVisitors,
        totalProductViews: analytics.totalProductViews,
        totalAddToCarts: analytics.addToCarts,
        totalCheckouts: analytics.checkouts,
        totalPurchases: analytics.purchases,
        totalRevenue: analytics.totalRevenue,
        conversionRate: analytics.conversionRate,
        avgOrderValue: analytics.avgOrderValue
      },
      create: {
        companyId,
        date: startOfDay,
        totalVisits: analytics.totalVisits,
        uniqueVisitors: analytics.uniqueVisitors,
        totalProductViews: analytics.totalProductViews,
        totalAddToCarts: analytics.addToCarts,
        totalCheckouts: analytics.checkouts,
        totalPurchases: analytics.purchases,
        totalRevenue: analytics.totalRevenue,
        conversionRate: analytics.conversionRate,
        avgOrderValue: analytics.avgOrderValue
      }
    });
  }

  async getProductAnalyticsByDate(companyId, startDate, endDate) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const [products, topProducts, salesMetrics] = await Promise.all([
      getSharedPrismaClient().product.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          images: true
        }
      }),
      this.getTopPerformingProducts(companyId, startDate, endDate, 10),
      this.getProductSalesMetrics(companyId, startDate, endDate)
    ]);

    const lowPerforming = products
      .map((product) => {
        const metric = salesMetrics.get(product.id);
        const sales = metric?.sales || 0;
        const revenue = parseFloat(((metric?.revenue || 0)).toFixed(2));

        return {
          id: product.id,
          name: product.name,
          sales,
          revenue,
          image: resolvePrimaryImage(product.images)
        };
      })
      .filter((product) => product.sales === 0 || product.revenue === 0)
      .sort((a, b) => {
        if (a.sales !== b.sales) {
          return a.sales - b.sales;
        }
        if (a.revenue !== b.revenue) {
          return a.revenue - b.revenue;
        }
        return a.name.localeCompare(b.name, 'ar');
      })
      .slice(0, 10);

    return {
      topProducts,
      lowPerforming,
      lowPerformingProducts: lowPerforming,
      totalProducts: products.length
    };
  }

  async getDailyAnalyticsByDate(companyId, startDate, endDate) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const rawDailyAnalytics = await this.buildDailyAnalyticsFromRawEvents(companyId, startDate, endDate);
    const storedDailyAnalytics = await getSharedPrismaClient().dailyAnalytic.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: {
        date: 'asc'
      }
    });

    const hasMeaningfulStoredData = storedDailyAnalytics.some((entry) => (
      parseNumericValue(entry.totalVisits) > 0 ||
      parseNumericValue(entry.uniqueVisitors) > 0 ||
      parseNumericValue(entry.totalProductViews) > 0 ||
      parseNumericValue(entry.totalAddToCarts) > 0 ||
      parseNumericValue(entry.totalCheckouts) > 0 ||
      parseNumericValue(entry.totalPurchases) > 0 ||
      parseNumericValue(entry.totalRevenue) > 0
    ));

    if (storedDailyAnalytics.length > 0 && hasMeaningfulStoredData) {
      const storedByDay = new Map(
        storedDailyAnalytics.map((entry) => [formatDayKey(entry.date), entry]),
      );

      return rawDailyAnalytics.map((rawEntry) => {
        const storedEntry = storedByDay.get(formatDayKey(rawEntry.date));
        if (!storedEntry) {
          return rawEntry;
        }

        const totalVisits = Math.max(
          parseNumericValue(storedEntry.totalVisits),
          parseNumericValue(rawEntry.totalVisits),
        );
        const uniqueVisitors = Math.max(
          parseNumericValue(storedEntry.uniqueVisitors),
          parseNumericValue(rawEntry.uniqueVisitors),
        );
        const totalProductViews = Math.max(
          parseNumericValue(storedEntry.totalProductViews),
          parseNumericValue(rawEntry.totalProductViews),
        );
        const totalAddToCarts = Math.max(
          parseNumericValue(storedEntry.totalAddToCarts),
          parseNumericValue(rawEntry.totalAddToCarts),
        );
        const totalCheckouts = Math.max(
          parseNumericValue(storedEntry.totalCheckouts),
          parseNumericValue(rawEntry.totalCheckouts),
        );

        // Order-derived metrics are safer to recompute from raw orders because
        // daily snapshots can lag guest-order mirroring.
        const rawPurchases = parseNumericValue(rawEntry.totalPurchases);
        const rawRevenue = parseNumericValue(rawEntry.totalRevenue);
        const totalPurchases = rawPurchases > 0
          ? rawPurchases
          : parseNumericValue(storedEntry.totalPurchases);
        const totalRevenue = rawRevenue > 0
          ? rawRevenue
          : parseNumericValue(storedEntry.totalRevenue);
        const conversionRate = totalVisits > 0 ? (totalPurchases / totalVisits) * 100 : 0;
        const avgOrderValue = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

        return {
          ...rawEntry,
          companyId: storedEntry.companyId || rawEntry.companyId,
          date: storedEntry.date || rawEntry.date,
          totalVisits,
          uniqueVisitors,
          totalProductViews,
          totalAddToCarts,
          totalCheckouts,
          totalPurchases,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          conversionRate: parseFloat(conversionRate.toFixed(2)),
          avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        };
      });
    }

    return rawDailyAnalytics;
  }
}

module.exports = new AnalyticsService();
