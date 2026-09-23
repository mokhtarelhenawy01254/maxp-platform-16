const { getClientIp, resolveIpLocation } = require('./ipGeoLookup');

/**
 * Sanitizes and normalizes incoming storefront session details.
 */
async function buildSessionDetails(rawDetails, req) {
  const clientIp = getClientIp(req);
  const existingIp = rawDetails?.ip || clientIp;

  // Resolve GeoIP location
  const geo = await resolveIpLocation(existingIp, req);

  const pages = Array.isArray(rawDetails?.pagesVisited)
    ? rawDetails.pagesVisited.slice(-30).map((p) => ({
        path: String(p.path || '').slice(0, 300),
        title: String(p.title || p.path || '').slice(0, 200),
        timestamp: p.timestamp || new Date().toISOString(),
      }))
    : [];

  const durationSeconds = Number.isFinite(Number(rawDetails?.durationSeconds))
    ? Math.max(0, Math.round(Number(rawDetails.durationSeconds)))
    : 0;

  const sessionCount = Number.isFinite(Number(rawDetails?.sessionCount))
    ? Math.max(1, Math.round(Number(rawDetails.sessionCount)))
    : 1;

  const firstSeenAt = rawDetails?.firstSeenAt
    ? new Date(rawDetails.firstSeenAt).toISOString()
    : new Date().toISOString();

  const sessionStartedAt = rawDetails?.sessionStartedAt
    ? new Date(rawDetails.sessionStartedAt).toISOString()
    : new Date(Date.now() - durationSeconds * 1000).toISOString();

  const trafficSource = rawDetails?.trafficSource && typeof rawDetails.trafficSource === 'object'
    ? {
        platform: rawDetails.trafficSource.platform ? String(rawDetails.trafficSource.platform).slice(0, 80) : undefined,
        source: rawDetails.trafficSource.source ? String(rawDetails.trafficSource.source).slice(0, 120) : 'direct',
        medium: rawDetails.trafficSource.medium ? String(rawDetails.trafficSource.medium).slice(0, 80) : undefined,
        campaignName: rawDetails.trafficSource.campaignName ? String(rawDetails.trafficSource.campaignName).slice(0, 200) : undefined,
        campaignId: rawDetails.trafficSource.campaignId ? String(rawDetails.trafficSource.campaignId).slice(0, 120) : undefined,
        adSetId: rawDetails.trafficSource.adSetId ? String(rawDetails.trafficSource.adSetId).slice(0, 120) : undefined,
        adId: rawDetails.trafficSource.adId ? String(rawDetails.trafficSource.adId).slice(0, 120) : undefined,
        referrer: rawDetails.trafficSource.referrer ? String(rawDetails.trafficSource.referrer).slice(0, 500) : undefined,
        landingPath: rawDetails.trafficSource.landingPath ? String(rawDetails.trafficSource.landingPath).slice(0, 500) : undefined,
      }
    : undefined;

  return {
    ip: geo.ip || existingIp || clientIp || null,
    ipGovernorate: geo.governorate || rawDetails?.ipGovernorate || null,
    ipCity: geo.city || rawDetails?.ipCity || null,
    ipCountry: geo.country || 'EG',
    trafficSource,
    pagesVisited: pages,
    durationSeconds,
    sessionCount,
    firstSeenAt,
    sessionStartedAt,
    sessionId: rawDetails?.sessionId ? String(rawDetails.sessionId).slice(0, 120) : undefined,
    visitorId: rawDetails?.visitorId ? String(rawDetails.visitorId).slice(0, 120) : undefined,
  };
}

/**
 * Finds customer's very first order and total order history for reporting in order details.
 */
async function getCustomerFirstOrderInfo(prisma, companyId, { phone, email, customerId, currentOrderNumber }) {
  if (!prisma || !companyId) {
    return { isFirstOrder: true, firstOrderNumber: null, firstOrderAt: null, totalOrdersCount: 0 };
  }

  const cleanPhone = phone
    ? String(phone).replace(/\D/g, '').slice(-10)
    : null;

  const orConditions = [];
  if (cleanPhone && cleanPhone.length >= 8) {
    orConditions.push({ customerPhone: { contains: cleanPhone } });
    orConditions.push({ guestPhone: { contains: cleanPhone } });
  }
  if (email && String(email).includes('@')) {
    const cleanEmail = String(email).trim().toLowerCase();
    orConditions.push({ customerEmail: cleanEmail });
    orConditions.push({ guestEmail: cleanEmail });
  }
  if (customerId) {
    orConditions.push({ customerId });
  }

  if (orConditions.length === 0) {
    return { isFirstOrder: true, firstOrderNumber: null, firstOrderAt: null, totalOrdersCount: 0 };
  }

  try {
    const [regularOrders, guestOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          companyId,
          OR: orConditions.map((c) => ({
            customerPhone: c.customerPhone,
            customerEmail: c.customerEmail,
            customerId: c.customerId,
          })).filter((c) => Object.values(c).some(Boolean)),
        },
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          status: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.guestOrder.findMany({
        where: {
          companyId,
          OR: orConditions.map((c) => ({
            guestPhone: c.guestPhone,
            guestEmail: c.guestEmail,
          })).filter((c) => Object.values(c).some(Boolean)),
        },
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          status: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const orderNumberMap = new Map();
    [...regularOrders, ...guestOrders].forEach((o) => {
      if (o.orderNumber && !orderNumberMap.has(o.orderNumber)) {
        orderNumberMap.set(o.orderNumber, o);
      }
    });

    const allOrders = Array.from(orderNumberMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const totalOrdersCount = allOrders.length;
    if (totalOrdersCount === 0) {
      return { isFirstOrder: true, firstOrderNumber: null, firstOrderAt: null, totalOrdersCount: 0 };
    }

    const firstOrder = allOrders[0];
    const isFirstOrder = currentOrderNumber
      ? firstOrder.orderNumber === currentOrderNumber || totalOrdersCount <= 1
      : false;

    return {
      isFirstOrder,
      firstOrderNumber: firstOrder.orderNumber,
      firstOrderAt: firstOrder.createdAt ? new Date(firstOrder.createdAt).toISOString() : null,
      totalOrdersCount,
    };
  } catch (err) {
    console.error('⚠️ [CUSTOMER-ORDER-INFO] Error fetching customer first order info:', err.message);
    return { isFirstOrder: true, firstOrderNumber: null, firstOrderAt: null, totalOrdersCount: 0 };
  }
}

/**
 * Extracts and cleans Egyptian phone digits for cross-matching.
 */
function extractPhoneDigits(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits || digits.length < 8) return null;
  return digits;
}

/**
 * Categorizes an order status into unified metrics for customer evaluation.
 */
function categorizeOrderStatus(statusStr) {
  const s = String(statusStr || '').toUpperCase().trim();
  if (
    ['DELIVERED', 'COMPLETED', 'SHIPPED_DELIVERED', 'DELIVERED_CASH_COLLECTED'].includes(s) ||
    s.includes('DELIVER') ||
    s.includes('مستلم') ||
    s.includes('تم التسليم')
  ) {
    return 'DELIVERED';
  }
  if (
    ['CANCELLED', 'CANCELED', 'REJECTED', 'TRASH'].includes(s) ||
    s.includes('CANCEL') ||
    s.includes('ملغي') ||
    s.includes('رفض')
  ) {
    return 'CANCELLED';
  }
  if (
    ['RETURNED', 'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'LOST', 'FAILED_DELIVERY'].includes(s) ||
    s.includes('RETURN') ||
    s.includes('مرتجع')
  ) {
    return 'RETURNED';
  }
  if (
    ['SHIPPED', 'OUT_FOR_DELIVERY', 'READY_TO_SHIP', 'IN_TRANSIT', 'PROCESSING', 'CONFIRMED', 'SCHEDULED', 'READY_FOR_PROCESSING', 'PENDING_PREPARATION', 'PREPARING', 'READY'].includes(s)
  ) {
    return 'IN_PROGRESS';
  }
  return 'PENDING';
}

/**
 * Resolves an item image URL from various string/array/object patterns.
 */
function resolveItemImageUrl(item) {
  if (item.productImage) return item.productImage;
  if (item.product?.mainImage) return item.product.mainImage;
  if (item.product?.images) {
    try {
      const parsed = typeof item.product.images === 'string' ? JSON.parse(item.product.images) : item.product.images;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      if (typeof parsed === 'string') return parsed;
    } catch {}
  }
  if (item.image) return item.image;
  return null;
}

/**
 * Comprehensive customer order history & purchase telemetry.
 * Returns customer stats, lifetime value, delivery success rate, and historical orders.
 */
async function getCustomerOrderHistory(prisma, companyId, {
  phone,
  email,
  customerId,
  alternativePhone,
  currentOrderNumber,
  limit = 20,
}) {
  const emptyResult = {
    stats: {
      totalOrders: 0,
      deliveredCount: 0,
      cancelledCount: 0,
      returnedCount: 0,
      inProgressCount: 0,
      pendingCount: 0,
      deliverySuccessRate: null,
      totalDeliveredSpent: 0,
      totalAllOrdersValue: 0,
      averageOrderValue: 0,
      firstOrderDate: null,
      lastOrderDate: null,
      isRepeatCustomer: false,
    },
    orders: [],
    customerSummary: {
      matchedBy: [],
      customerName: null,
      phone: phone || null,
      email: email || null,
    },
  };

  if (!prisma || !companyId) {
    return emptyResult;
  }

  try {
    // If customerId is provided but phone or email is missing, lookup customer record
    let resolvedPhone = phone;
    let resolvedEmail = email;
    let resolvedName = null;

    if (customerId) {
      try {
        const customer = await prisma.customer.findFirst({
          where: { id: customerId, companyId },
          select: { phone: true, phoneNormalized: true, email: true, firstName: true, lastName: true },
        });
        if (customer) {
          if (!resolvedPhone) resolvedPhone = customer.phoneNormalized || customer.phone;
          if (!resolvedEmail && customer.email) resolvedEmail = customer.email;
          const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
          if (fullName) resolvedName = fullName;
        }
      } catch (custErr) {
        console.warn('⚠️ [CUSTOMER-HISTORY] Could not load customer profile:', custErr.message);
      }
    }

    const matchedBy = [];
    const regularOrConditions = [];
    const guestOrConditions = [];

    // Phone matching (main phone + alternative phone)
    const phoneCandidates = [resolvedPhone, alternativePhone].filter(Boolean);
    const checkedPhoneDigits = new Set();

    for (const rawP of phoneCandidates) {
      const digits = extractPhoneDigits(rawP);
      if (!digits || checkedPhoneDigits.has(digits)) continue;
      checkedPhoneDigits.add(digits);
      matchedBy.push('phone');

      // Exact raw match
      regularOrConditions.push({ customerPhone: rawP });
      guestOrConditions.push({ guestPhone: rawP });

      // Match last 9 or 10 digits
      if (digits.length >= 9) {
        const slice9 = digits.slice(-9);
        regularOrConditions.push({ customerPhone: { contains: slice9 } });
        guestOrConditions.push({ guestPhone: { contains: slice9 } });
      }
    }

    // Email matching
    if (resolvedEmail && String(resolvedEmail).includes('@')) {
      const cleanEmail = String(resolvedEmail).trim().toLowerCase();
      matchedBy.push('email');
      regularOrConditions.push({ customerEmail: cleanEmail });
      guestOrConditions.push({ guestEmail: cleanEmail });
    }

    // CustomerId matching
    if (customerId) {
      matchedBy.push('customerId');
      regularOrConditions.push({ customerId });
    }

    if (regularOrConditions.length === 0 && guestOrConditions.length === 0) {
      return emptyResult;
    }

    // Query both regular and guest orders in parallel
    const [regularOrders, guestOrders] = await Promise.all([
      regularOrConditions.length > 0
        ? prisma.order.findMany({
            where: {
              companyId,
              OR: regularOrConditions,
            },
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              status: true,
              customStatusCode: true,
              paymentStatus: true,
              paymentMethod: true,
              total: true,
              subtotal: true,
              shipping: true,
              currency: true,
              customerName: true,
              customerPhone: true,
              orderItems: {
                select: {
                  id: true,
                  productName: true,
                  productColor: true,
                  productSize: true,
                  productImage: true,
                  price: true,
                  quantity: true,
                  total: true,
                  product: {
                    select: {
                      id: true,
                      name: true,
                      mainImage: true,
                      images: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 60,
          })
        : [],
      guestOrConditions.length > 0
        ? prisma.guestOrder.findMany({
            where: {
              companyId,
              OR: guestOrConditions,
            },
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
              status: true,
              paymentMethod: true,
              total: true,
              shippingCost: true,
              items: true,
              guestName: true,
              guestPhone: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 60,
          })
        : [],
    ]);

    // Deduplicate by orderNumber (prefer regular order)
    const orderMap = new Map();
    const guestMap = new Map();

    for (const rOrder of regularOrders) {
      if (rOrder.orderNumber && !orderMap.has(rOrder.orderNumber)) {
        orderMap.set(rOrder.orderNumber, { ...rOrder, source: 'order' });
      }
    }

    for (const gOrder of guestOrders) {
      if (gOrder.orderNumber && !orderMap.has(gOrder.orderNumber) && !guestMap.has(gOrder.orderNumber)) {
        guestMap.set(gOrder.orderNumber, { ...gOrder, source: 'guest' });
      }
    }

    const unifiedOrders = [...orderMap.values(), ...guestMap.values()];
    unifiedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalOrders = unifiedOrders.length;
    if (totalOrders === 0) {
      return emptyResult;
    }

    // Calculate aggregate statistics
    let deliveredCount = 0;
    let cancelledCount = 0;
    let returnedCount = 0;
    let inProgressCount = 0;
    let pendingCount = 0;
    let totalDeliveredSpent = 0;
    let totalAllOrdersValue = 0;

    const formattedList = [];

    for (const rawOrder of unifiedOrders) {
      const cat = categorizeOrderStatus(rawOrder.status || rawOrder.customStatusCode);
      const totalAmount = Number(rawOrder.total) || 0;
      totalAllOrdersValue += totalAmount;

      if (cat === 'DELIVERED') {
        deliveredCount++;
        totalDeliveredSpent += totalAmount;
      } else if (cat === 'CANCELLED') {
        cancelledCount++;
      } else if (cat === 'RETURNED') {
        returnedCount++;
      } else if (cat === 'IN_PROGRESS') {
        inProgressCount++;
      } else {
        pendingCount++;
      }

      if (!resolvedName && (rawOrder.customerName || rawOrder.guestName)) {
        resolvedName = rawOrder.customerName || rawOrder.guestName;
      }

      // Format order item for list (up to limit)
      if (formattedList.length < limit) {
        let items = [];
        let itemsCount = 0;

        if (rawOrder.source === 'order' && Array.isArray(rawOrder.orderItems)) {
          items = rawOrder.orderItems.map((item) => {
            const qty = Number(item.quantity) || 1;
            itemsCount += qty;
            return {
              id: item.id,
              name: item.productName || item.product?.name || 'منتج غير محدد',
              color: item.productColor || null,
              size: item.productSize || null,
              quantity: qty,
              price: Number(item.price) || 0,
              total: Number(item.total) || (Number(item.price) || 0) * qty,
              image: resolveItemImageUrl(item),
            };
          });
        } else if (rawOrder.source === 'guest') {
          let parsedItems = rawOrder.items;
          if (typeof parsedItems === 'string') {
            try {
              parsedItems = JSON.parse(parsedItems);
            } catch {
              parsedItems = [];
            }
          }
          if (Array.isArray(parsedItems)) {
            items = parsedItems.map((item, idx) => {
              const qty = Number(item.quantity || item.qty) || 1;
              itemsCount += qty;
              return {
                id: item.id || `guest-item-${idx}`,
                name: item.productName || item.name || 'منتج غير محدد',
                color: item.productColor || item.color || null,
                size: item.productSize || item.size || null,
                quantity: qty,
                price: Number(item.price) || 0,
                total: Number(item.total) || (Number(item.price) || 0) * qty,
                image: item.image || item.productImage || null,
              };
            });
          }
        }

        const isCurrentOrder = Boolean(
          currentOrderNumber &&
          (rawOrder.orderNumber === currentOrderNumber || rawOrder.id === currentOrderNumber)
        );

        formattedList.push({
          id: rawOrder.id,
          orderNumber: rawOrder.orderNumber,
          createdAt: rawOrder.createdAt ? new Date(rawOrder.createdAt).toISOString() : null,
          status: String(rawOrder.customStatusCode || rawOrder.status || 'pending').toLowerCase(),
          category: cat,
          paymentStatus: rawOrder.paymentStatus ? String(rawOrder.paymentStatus).toUpperCase() : null,
          paymentMethod: rawOrder.paymentMethod || 'cash_on_delivery',
          total: totalAmount,
          subtotal: Number(rawOrder.subtotal) || totalAmount,
          shipping: Number(rawOrder.shipping || rawOrder.shippingCost) || 0,
          currency: rawOrder.currency || 'EGP',
          itemsCount: itemsCount || items.length,
          items,
          isCurrentOrder,
        });
      }
    }

    const completedAttempts = deliveredCount + returnedCount + cancelledCount;
    const deliverySuccessRate = completedAttempts > 0
      ? Math.round((deliveredCount / completedAttempts) * 100)
      : (deliveredCount > 0 ? 100 : null);

    const averageOrderValue = totalOrders > 0
      ? Math.round((totalAllOrdersValue / totalOrders) * 100) / 100
      : 0;

    const chronological = [...unifiedOrders].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const firstOrderDate = chronological[0]?.createdAt
      ? new Date(chronological[0].createdAt).toISOString()
      : null;
    const lastOrderDate = chronological[chronological.length - 1]?.createdAt
      ? new Date(chronological[chronological.length - 1].createdAt).toISOString()
      : null;

    return {
      stats: {
        totalOrders,
        deliveredCount,
        cancelledCount,
        returnedCount,
        inProgressCount,
        pendingCount,
        deliverySuccessRate,
        totalDeliveredSpent: Math.round(totalDeliveredSpent * 100) / 100,
        totalAllOrdersValue: Math.round(totalAllOrdersValue * 100) / 100,
        averageOrderValue,
        firstOrderDate,
        lastOrderDate,
        isRepeatCustomer: totalOrders > 1,
      },
      orders: formattedList,
      customerSummary: {
        matchedBy: Array.from(new Set(matchedBy)),
        customerName: resolvedName,
        phone: resolvedPhone || null,
        email: resolvedEmail || null,
      },
    };
  } catch (err) {
    console.error('⚠️ [CUSTOMER-ORDER-HISTORY] Error fetching customer history:', err.message);
    return emptyResult;
  }
}

module.exports = {
  buildSessionDetails,
  getCustomerFirstOrderInfo,
  getCustomerOrderHistory,
};

