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

// الطلبات غير الصالحة: الملغية (CANCELLED) والمحذوفة (TRASH/DELETED)
const INVALID_ANALYTICS_ORDER_STATUSES = new Set([
  'CANCELLED',
  'CANCELED',
  'TRASH',
  'TRASH_ORDER',
  'DELETED',
]);

const isInvalidAnalyticsOrderStatus = (status) =>
  INVALID_ANALYTICS_ORDER_STATUSES.has(
    String(status || '').trim().toUpperCase(),
  );

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
    // The storefront passes the order NUMBER, so resolve by id OR orderNumber.
    let validOrderId = null;
    let resolvedOrder = null;
    if (orderId) {
      resolvedOrder = await getSharedPrismaClient().order.findFirst({
        where: {
          companyId,
          OR: [{ id: orderId }, { orderNumber: orderId }],
        },
        select: {
          id: true,
          orderNumber: true,
        },
      });

      if (resolvedOrder) {
        validOrderId = resolvedOrder.id;
      } else {
        console.warn(`Order ${orderId} not found for company ${companyId}, tracking without orderId`);
      }
    }

    // Enrich metadata with the resolved order reference so downstream analytics can link the event.
    let persistedMetadata = metadata;
    if (resolvedOrder) {
      let base = persistedMetadata;
      if (typeof base === 'string') {
        try {
          base = JSON.parse(base);
        } catch {
          base = {};
        }
      }
      base = (base && typeof base === 'object') ? { ...base } : {};
      base.orderId = resolvedOrder.id;
      base.orderNumber = resolvedOrder.orderNumber;
      persistedMetadata = base;
    }

    return await getSharedPrismaClient().conversionEvent.create({
      data: {
        companyId,
        sessionId,
        eventType,
        productId,
        orderId: validOrderId,
        value: value ? parseFloat(value) : null,
        metadata: persistedMetadata ? JSON.stringify(persistedMetadata) : null
      }
    });
  }

  async getOrderSummary(companyId, startDate, endDate) {
    const { regularOrders, supplementalGuestOrders } =
      await this.getAnalyticsOrderSnapshots(companyId, startDate, endDate);

    const validRegularOrders = regularOrders.filter(
      (order) => !isInvalidAnalyticsOrderStatus(order.status),
    );
    const validGuestOrders = supplementalGuestOrders.filter(
      (order) => !isInvalidAnalyticsOrderStatus(order.status),
    );

    const ordersRevenue = validRegularOrders.reduce(
      (sum, order) => sum + parseNumericValue(order.total),
      0,
    );
    const guestRevenue = validGuestOrders.reduce(
      (sum, order) =>
        sum + parseNumericValue(order.finalTotal ?? order.total),
      0,
    );

    return {
      count: validRegularOrders.length + validGuestOrders.length,
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
              createdAt: { gte: startDate, lte: endDate },
              status: { not: 'TRASH' }
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
      if (isInvalidAnalyticsOrderStatus(guestOrder?.status)) {
        continue;
      }
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

  async getProductSalesPerformance(companyId, startDate, endDate) {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const [orderItems, { supplementalGuestOrders }] = await Promise.all([
      getSharedPrismaClient().orderItem.findMany({
        where: {
          productId: { not: null },
          order: {
            is: {
              companyId,
              createdAt: { gte: startDate, lte: endDate },
              status: { not: 'TRASH' }
            }
          }
        },
        select: {
          orderId: true,
          productId: true,
          quantity: true,
          price: true,
          total: true
        }
      }),
      this.getAnalyticsOrderSnapshots(companyId, startDate, endDate),
    ]);

    const metrics = new Map();

    for (const item of orderItems) {
      if (!item.productId) continue;

      const existing =
        metrics.get(item.productId) ||
        {
          quantitySold: 0,
          revenue: 0,
          orderIds: new Set()
        };

      const quantity = parseNumericValue(item.quantity) || 1;
      const lineRevenue = parseNumericValue(item.total);
      const unitPrice = parseNumericValue(item.price);

      existing.quantitySold += quantity;
      existing.revenue += lineRevenue > 0 ? lineRevenue : unitPrice * quantity;
      if (item.orderId) {
        existing.orderIds.add(item.orderId);
      }

      metrics.set(item.productId, existing);
    }

    for (const guestOrder of supplementalGuestOrders) {
      if (isInvalidAnalyticsOrderStatus(guestOrder?.status)) {
        continue;
      }
      const guestOrderId = buildGuestAnalyticsOrderId(guestOrder);
      const items = parseGuestOrderItems(guestOrder.items);

      for (const item of items) {
        const productId = normalizeOrderIdentity(item?.productId);
        if (!productId) continue;

        const existing =
          metrics.get(productId) ||
          {
            quantitySold: 0,
            revenue: 0,
            orderIds: new Set()
          };

        const quantity = parseNumericValue(item?.quantity) || 1;
        const lineRevenue = parseNumericValue(item?.total);
        const unitPrice = parseNumericValue(item?.price ?? item?.basePrice);

        existing.quantitySold += quantity;
        existing.revenue += lineRevenue > 0 ? lineRevenue : unitPrice * quantity;
        if (guestOrderId) {
          existing.orderIds.add(guestOrderId);
        }

        metrics.set(productId, existing);
      }
    }

    if (metrics.size === 0) {
      return { products: [], summary: null };
    }

    const productIds = [...metrics.keys()];

    const allProducts = await getSharedPrismaClient().product.findMany({
      where: {
        companyId,
        id: { in: productIds }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        mainImage: true,
        images: true
      }
    });

    const productsMap = new Map(allProducts.map((p) => [p.id, p]));

    const products = productIds
      .map((productId) => {
        const product = productsMap.get(productId);
        const metric = metrics.get(productId);
        const orderCount = metric.orderIds.size;

        return {
          productId,
          productName: product?.name || 'منتج غير معروف',
          productSku: product?.sku || null,
          productImage: product?.mainImage || resolvePrimaryImage(product?.images) || null,
          quantitySold: metric.quantitySold,
          orderCount,
          revenue: parseFloat(metric.revenue.toFixed(2)),
          averagePrice: metric.quantitySold > 0 ? parseFloat((metric.revenue / metric.quantitySold).toFixed(2)) : 0,
          unitsPerOrder: orderCount > 0 ? parseFloat((metric.quantitySold / orderCount).toFixed(2)) : 0
        };
      })
      .sort((a, b) => b.quantitySold - a.quantitySold);

    const totalQuantity = products.reduce((sum, p) => sum + p.quantitySold, 0);
    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
    const totalOrderIds = new Set();

    orderItems.forEach((item) => {
      if (item.orderId) totalOrderIds.add(item.orderId);
    });
    supplementalGuestOrders.forEach((guestOrder) => {
      if (!isInvalidAnalyticsOrderStatus(guestOrder?.status)) {
        const id = buildGuestAnalyticsOrderId(guestOrder);
        if (id) totalOrderIds.add(id);
      }
    });

    return {
      products,
      summary: {
        totalProducts: products.length,
        totalQuantity,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalOrders: totalOrderIds.size,
        averageOrderValue: totalOrderIds.size > 0 ? parseFloat((totalRevenue / totalOrderIds.size).toFixed(2)) : 0
      }
    };
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
          totalRevenue: 0,
          validPurchases: 0,
          invalidPurchases: 0
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
      if (isInvalidAnalyticsOrderStatus(order.status)) {
        bucket.invalidPurchases += 1;
      } else {
        bucket.validPurchases += 1;
      }
    }

    for (const order of orderSnapshots.supplementalGuestOrders) {
      const bucket = ensureBucket(order.createdAt);
      bucket.totalPurchases += 1;
      bucket.totalRevenue += parseNumericValue(order.finalTotal ?? order.total);
      if (isInvalidAnalyticsOrderStatus(order.status)) {
        bucket.invalidPurchases += 1;
      } else {
        bucket.validPurchases += 1;
      }
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
        validPurchases: bucket?.validPurchases || 0,
        invalidPurchases: bucket?.invalidPurchases || 0,
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

    const prisma = getSharedPrismaClient();

    const [visits, addToCarts, checkouts, orderSnapshots, visitDayRows] =
      await Promise.all([
        prisma.storeVisit.count({
          where: {
            companyId,
            visitedAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.conversionEvent.count({
          where: {
            companyId,
            eventType: 'add_to_cart',
            createdAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.conversionEvent.count({
          where: {
            companyId,
            eventType: 'checkout',
            createdAt: { gte: startDate, lte: endDate }
          }
        }),
        this.getAnalyticsOrderSnapshots(companyId, startDate, endDate),
        prisma.$queryRaw`
          SELECT DATE("visitedAt") AS day, COUNT(*)::int AS count
          FROM "store_visits"
          WHERE "companyId" = ${companyId}
            AND "visitedAt" >= ${startDate}
            AND "visitedAt" <= ${endDate}
          GROUP BY DATE("visitedAt")
        `,
      ]);

    const allOrders = [
      ...orderSnapshots.regularOrders,
      ...orderSnapshots.supplementalGuestOrders,
    ];
    const purchases = allOrders.length;

    const ordersByDay = {};
    for (const order of allOrders) {
      const day = formatDayKey(order.createdAt);
      ordersByDay[day] = (ordersByDay[day] || 0) + 1;
    }

    const toDayKey = (value) => {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      return formatDayKey(value);
    };

    const visitsByDay = {};
    for (const row of visitDayRows) {
      const day = toDayKey(row.day);
      visitsByDay[day] = parseNumericValue(row.count);
    }

    const dailyTrends = Object.keys(visitsByDay)
      .sort()
      .map((day) => {
        const dayVisits = visitsByDay[day];
        const dayPurchases = ordersByDay[day] || 0;
        return {
          date: day,
          rate: dayVisits > 0
            ? parseFloat(((dayPurchases / dayVisits) * 100).toFixed(2))
            : 0,
        };
      });

    const conversionRate = visits > 0 ? (purchases / visits) * 100 : 0;

    return {
      visits,
      purchases,
      addToCarts,
      checkouts,
      directOrders: purchases > checkouts ? purchases - checkouts : 0,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      overallRate: parseFloat(conversionRate.toFixed(2)),
      visitorToCart: visits > 0 ? parseFloat(((addToCarts / visits) * 100).toFixed(2)) : 0,
      cartToCheckout: addToCarts > 0 ? parseFloat(((checkouts / addToCarts) * 100).toFixed(2)) : 0,
      checkoutToOrder: checkouts > 0 ? parseFloat(((purchases / checkouts) * 100).toFixed(2)) : 0,
      dailyTrends,
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

  async getOrderBreakdown(companyId, startDate, endDate, comparisonType = 'previous') {
    const cmpNone = comparisonType === 'none';

    const buildOne = async (cid, start, end) => {
      const prisma = getSharedPrismaClient();
      const where = { companyId: cid, createdAt: { gte: start, lte: end } };

      const [statusGroups, paymentGroups, guestOrders, orderNumbers] = await Promise.all([
        prisma.order.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        prisma.order.groupBy({
          by: ['paymentMethod'],
          where,
          _count: { paymentMethod: true },
        }),
        prisma.guestOrder.findMany({
          where,
          select: { orderNumber: true, status: true, paymentMethod: true },
        }),
        prisma.order
          .findMany({ where, select: { orderNumber: true } })
          .then((rows) => new Set(rows.map((o) => o.orderNumber).filter(Boolean))),
      ]);

      const supplementalGuests = guestOrders.filter(
        (o) => !o.orderNumber || !orderNumbers.has(o.orderNumber),
      );

      const statusMap = {
        DELIVERED: 'delivered', PROCESSING: 'processing', PENDING: 'pending',
        CANCELLED: 'cancelled', REFUNDED: 'refunded', RETURNED: 'returned',
        PARTIALLY_REFUNDED: 'refunded', PARTIALLY_RETURNED: 'returned',
        ON_HOLD: 'on-hold', CONFIRMED: 'confirmed', TRASH: 'trash',
        EXCHANGED: 'exchanged', SCHEDULED: 'scheduled', SHIPPED: 'shipped',
        READY_TO_SHIP: 'ready_to_ship',
      };

      const byStatus = {};
      let codOrders = 0;
      let prepaidOrders = 0;

      for (const g of statusGroups) {
        const raw = String(g.status).toUpperCase();
        const key = statusMap[raw] || raw.toLowerCase() || 'unknown';
        byStatus[key] = (byStatus[key] || 0) + g._count.status;
      }

      for (const g of paymentGroups) {
        const pm = String(g.paymentMethod).toUpperCase();
        if (pm === 'CASH') codOrders += g._count.paymentMethod;
        else prepaidOrders += g._count.paymentMethod;
      }

      for (const o of supplementalGuests) {
        const raw = String(o.status).toUpperCase();
        const key = statusMap[raw] || raw.toLowerCase() || 'unknown';
        byStatus[key] = (byStatus[key] || 0) + 1;

        const pm = String(o.paymentMethod).toUpperCase();
        if (pm === 'CASH') codOrders++;
        else if (pm) prepaidOrders++;
      }

      const totalRegular = statusGroups.reduce((s, g) => s + g._count.status, 0);

      return {
        totalOrders: totalRegular + supplementalGuests.length,
        ordersByStatus: byStatus,
        codOrders,
        prepaidOrders,
        cancelledOrders: byStatus['cancelled'] || 0,
        rejectedOrders: 0,
      };
    };

    const current = await buildOne(companyId, startDate, endDate);
    if (cmpNone) return { ...current, prevPeriod: null };

    const periodMs = endDate.getTime() - startDate.getTime();
    let prevEnd, prevStart;

    if (comparisonType === 'yoy') {
      prevEnd = new Date(startDate.getTime() - 86400000);
      prevStart = new Date(prevEnd.getTime() - periodMs);
      // Shift both back one full year
      prevEnd.setFullYear(prevEnd.getFullYear() - 1);
      prevStart.setFullYear(prevStart.getFullYear() - 1);
    } else {
      prevEnd = new Date(startDate.getTime() - 86400000);
      prevStart = new Date(prevEnd.getTime() - periodMs);
    }

    if (prevStart < startDate) {
      const prev = await buildOne(companyId, prevStart, prevEnd);
      return {
        ...current,
        prevPeriod: {
          totalOrders: prev.totalOrders,
          codOrders: prev.codOrders,
          prepaidOrders: prev.prepaidOrders,
          cancelledOrders: prev.cancelledOrders,
        },
      };
    }

    return { ...current, prevPeriod: null };
  }

  async getMultiPieceOrdersStats(companyId, startDate, endDate) {
    if (!companyId) {
      return {
        multiPieceOrders: 0,
        multiPiecePercentage: 0,
        singlePieceOrders: 0,
        totalEligibleOrders: 0,
        totalPieces: 0,
      };
    }

    const prisma = getSharedPrismaClient();

    // Definitions (Requirement 5 & 6):
    // Multi-piece order = total pieces/quantity across all items in order > 1 (2 or more pieces)
    // Excluded orders = DRAFT, TRASH, DUPLICATE_ORDER
    // Included = all other orders (including CANCELLED and RETURNED, which have separate rates)
    const [regularOrders, guestOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate, lte: endDate },
          status: {
            notIn: ['TRASH', 'DRAFT', 'DUPLICATE_ORDER']
          }
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderItems: {
            select: {
              quantity: true
            }
          }
        }
      }),
      prisma.guestOrder.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate, lte: endDate },
          status: {
            notIn: [
              'TRASH', 'trash', 'TRASH_ORDER', 'DELETED', 'deleted',
              'DRAFT', 'draft', 'DUPLICATE_ORDER', 'duplicate_order'
            ]
          }
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          items: true
        }
      })
    ]);

    const regularOrderNumbers = new Set(
      regularOrders
        .map((order) => normalizeOrderIdentity(order.orderNumber))
        .filter(Boolean)
    );

    const supplementalGuestOrders = guestOrders.filter((order) => {
      const orderNumber = normalizeOrderIdentity(order.orderNumber);
      return !orderNumber || !regularOrderNumbers.has(orderNumber);
    });

    let multiPieceOrders = 0;
    let singlePieceOrders = 0;
    let totalPieces = 0;

    for (const order of regularOrders) {
      const pieces = (order.orderItems || []).reduce(
        (sum, item) => sum + (Number(item.quantity) || 1),
        0
      );
      totalPieces += pieces;
      if (pieces > 1) {
        multiPieceOrders++;
      } else {
        singlePieceOrders++;
      }
    }

    for (const guestOrder of supplementalGuestOrders) {
      const items = parseGuestOrderItems(guestOrder.items);
      const pieces = items.reduce(
        (sum, item) => sum + (Number(item?.quantity) || 1),
        0
      );
      const finalPieces = pieces > 0 ? pieces : 1;
      totalPieces += finalPieces;
      if (finalPieces > 1) {
        multiPieceOrders++;
      } else {
        singlePieceOrders++;
      }
    }

    const totalEligibleOrders = regularOrders.length + supplementalGuestOrders.length;
    const multiPiecePercentage = totalEligibleOrders > 0
      ? parseFloat(((multiPieceOrders / totalEligibleOrders) * 100).toFixed(1))
      : 0;

    return {
      multiPieceOrders,
      multiPiecePercentage,
      singlePieceOrders,
      totalEligibleOrders,
      totalPieces
    };
  }

  async getStoreAnalytics(companyId, startDate, endDate, comparisonType = 'previous') {
    if (!companyId) {
      throw new Error('companyId is required');
    }

    const [
      totalVisits,
      uniqueVisitors,
      totalProductViews,
      conversionEvents,
      orderSummary,
      orderBreakdown,
      activeVisitors,
      recoveredConversions,
      incompleteCartsCount
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
      this.getOrderBreakdown(companyId, startDate, endDate, comparisonType),
      getSharedPrismaClient().storeVisit.count({
        where: {
          companyId,
          visitedAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }
        }
      }),
      getSharedPrismaClient().cartConversionLog.findMany({
        where: {
          companyId,
          convertedAt: { gte: startDate, lte: endDate },
          channel: 'admin-convert'
        },
        select: { cartValue: true }
      }).catch(() => []),
      getSharedPrismaClient().guestCart.count({
        where: {
          companyId,
          createdAt: { gte: startDate, lte: endDate }
        }
      }).catch(() => 0),
      this.getMultiPieceOrdersStats(companyId, startDate, endDate)
    ]);

    const addToCarts = conversionEvents.find(e => e.eventType === 'add_to_cart')?._count || 0;
    const checkouts = conversionEvents.find(e => e.eventType === 'checkout')?._count || 0;
    const purchases = orderSummary.count;
    const totalRevenue = orderSummary.revenue;
    const deliveredOrders = orderBreakdown?.ordersByStatus?.delivered || 0;
    const deliveryRate = purchases > 0 ? parseFloat(((deliveredOrders / purchases) * 100).toFixed(2)) : 0;

    // Recovery metrics from incomplete orders
    const recoveredPurchases = Array.isArray(recoveredConversions) ? recoveredConversions.length : 0;
    const recoveredRevenue = Array.isArray(recoveredConversions)
      ? parseFloat(recoveredConversions.reduce((s, c) => s + Number(c.cartValue || 0), 0).toFixed(2))
      : 0;
    const naturalPurchases = Math.max(0, purchases - recoveredPurchases);
    const incompleteCarts = typeof incompleteCartsCount === 'number' ? incompleteCartsCount : 0;

    // Calculate average order value from purchase events
    const avgOrderValue = purchases > 0 ? (totalRevenue / purchases).toFixed(2) : 0;

    // Calculate 3-tier conversion rates
    // 1. Organic/Natural: Orders completed directly without team recovery intervention
    const organicConversionRate = totalVisits > 0 ? parseFloat(((naturalPurchases / totalVisits) * 100).toFixed(2)) : 0;

    // 2. Realized/Total: Final conversion rate after recovering incomplete orders
    const storeConversionRate = totalVisits > 0 ? parseFloat(((purchases / totalVisits) * 100).toFixed(2)) : 0;
    const realizedConversionRate = storeConversionRate;

    // 3. Gross Intent/Potential: All customers who reached checkout (natural + incomplete carts + recovered)
    const grossIntentOrders = naturalPurchases + incompleteCarts + recoveredPurchases;
    const potentialConversionRate = totalVisits > 0 ? parseFloat(((grossIntentOrders / totalVisits) * 100).toFixed(2)) : 0;

    // Lift and recovery efficiency
    const conversionLift = parseFloat(Math.max(0, realizedConversionRate - organicConversionRate).toFixed(2));
    const recoveryRate = (incompleteCarts + recoveredPurchases) > 0
      ? parseFloat(((recoveredPurchases / (incompleteCarts + recoveredPurchases)) * 100).toFixed(2))
      : 0;

    // Product-level conversion rate: purchases / product views (product engagement)
    const productConversionRate = totalProductViews > 0 ? (purchases / totalProductViews * 100).toFixed(2) : 0;

    // Funnel conversion rates
    const addToCartRate = totalProductViews > 0 ? (addToCarts / totalProductViews * 100).toFixed(2) : 0;
    const checkoutRate = addToCarts > 0 ? (checkouts / addToCarts * 100).toFixed(2) : 0;

    // Fix: If no checkouts but there are purchases, calculate from addToCarts instead
    const purchaseRate = checkouts > 0
      ? (purchases / checkouts * 100).toFixed(2)
      : (addToCarts > 0 ? (purchases / addToCarts * 100).toFixed(2) : 0);

    // Calculate previous period visits and revenue for period-over-period trend analysis
    let prevPeriodStats = null;
    if (comparisonType !== 'none' && orderBreakdown?.prevPeriod && startDate && endDate) {
      try {
        const periodMs = endDate.getTime() - startDate.getTime();
        let prevEnd = new Date(startDate.getTime() - 86400000);
        let prevStart = new Date(prevEnd.getTime() - periodMs);
        if (comparisonType === 'yoy') {
          prevEnd = new Date(startDate.getTime() - 86400000);
          prevStart = new Date(prevEnd.getTime() - periodMs);
          prevEnd.setFullYear(prevEnd.getFullYear() - 1);
          prevStart.setFullYear(prevStart.getFullYear() - 1);
        }
        const [prevVisitsCount, prevOrdersSum, prevMultiStats] = await Promise.all([
          getSharedPrismaClient().storeVisit.count({
            where: { companyId, visitedAt: { gte: prevStart, lte: prevEnd } }
          }).catch(() => 0),
          this.getOrderSummary(companyId, prevStart, prevEnd).catch(() => ({ count: 0, revenue: 0 })),
          this.getMultiPieceOrdersStats(companyId, prevStart, prevEnd).catch(() => null)
        ]);
        prevPeriodStats = {
          ...orderBreakdown.prevPeriod,
          visits: prevVisitsCount,
          revenue: prevOrdersSum.revenue,
          purchases: prevOrdersSum.count,
          multiPieceOrders: prevMultiStats ? prevMultiStats.multiPieceOrders : 0,
          multiPiecePercentage: prevMultiStats ? prevMultiStats.multiPiecePercentage : 0,
          conversionRate: prevVisitsCount > 0 ? parseFloat(((prevOrdersSum.count / prevVisitsCount) * 100).toFixed(2)) : 0
        };
      } catch (err) {
        prevPeriodStats = orderBreakdown.prevPeriod;
      }
    }

    return {
      totalVisits,
      uniqueVisitors: uniqueVisitors.length,
      activeVisitors: typeof activeVisitors === 'number' ? activeVisitors : 0,
      totalProductViews,
      addToCarts,
      checkouts,
      purchases,
      naturalPurchases,
      recoveredPurchases,
      recoveredRevenue,
      incompleteCarts,
      deliveredOrders,
      deliveryRate,
      totalRevenue,
      conversionRate: storeConversionRate,
      organicConversionRate,
      realizedConversionRate,
      potentialConversionRate,
      conversionLift,
      recoveryRate,
      productConversionRate: parseFloat(productConversionRate),
      avgOrderValue: parseFloat(avgOrderValue),
      averageOrderValue: parseFloat(avgOrderValue),
      addToCartRate: parseFloat(addToCartRate),
      checkoutRate: parseFloat(checkoutRate),
      purchaseRate: parseFloat(purchaseRate),
      ...orderBreakdown,
      totalOrders: (multiPieceStats && multiPieceStats.totalEligibleOrders > 0)
        ? multiPieceStats.totalEligibleOrders
        : (orderBreakdown?.totalOrders || 0),
      rawTotalOrders: orderBreakdown?.totalOrders || 0,
      multiPieceOrders: multiPieceStats ? multiPieceStats.multiPieceOrders : 0,
      multiPiecePercentage: multiPieceStats ? multiPieceStats.multiPiecePercentage : 0,
      singlePieceOrders: multiPieceStats ? multiPieceStats.singlePieceOrders : 0,
      totalPieces: multiPieceStats ? multiPieceStats.totalPieces : 0,
      totalEligibleOrders: multiPieceStats ? multiPieceStats.totalEligibleOrders : 0,
      multiPieceStats,
      completedOrders: (orderBreakdown?.ordersByStatus?.delivered || 0) + (orderBreakdown?.ordersByStatus?.completed || 0),
      cancelledOrders: orderBreakdown?.ordersByStatus?.cancelled || 0,
      returnedOrders: orderBreakdown?.ordersByStatus?.returned || 0,
      pendingOrders: orderBreakdown?.ordersByStatus?.pending || 0,
      prevPeriod: prevPeriodStats || orderBreakdown?.prevPeriod || null,
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
