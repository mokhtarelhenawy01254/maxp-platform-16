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

module.exports = {
  buildSessionDetails,
  getCustomerFirstOrderInfo,
};
