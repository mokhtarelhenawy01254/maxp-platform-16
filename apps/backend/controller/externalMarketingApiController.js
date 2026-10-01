const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  MARKETING_API_SCOPES,
  MARKETING_DEFAULT_SCOPES
} = require('../services/taskIntegrationService');

/**
 * Resolve target company based on credentials and query params.
 * Platform keys (*) or (platform:read) can query across all companies or filter by ?companyId=
 * Tenant keys are strictly bound to their assigned companyId.
 */
const resolveCompanyContext = (req, res) => {
  const externalApi = req.externalApi || req.externalTaskApi;
  const hasPlatform = externalApi?.hasPlatformRead || externalApi?.scopes?.includes('*') || externalApi?.scopes?.includes('platform:read');
  const requestedCompanyId = req.query.companyId ? String(req.query.companyId).trim() : null;

  if (requestedCompanyId && !hasPlatform && requestedCompanyId !== externalApi?.companyId) {
    res.status(403).json({
      success: false,
      message: 'Access denied: Your API key is not authorized to query other companies.'
    });
    return null;
  }

  const effectiveCompanyId = hasPlatform
    ? (requestedCompanyId || null)
    : (externalApi?.companyId || null);

  return {
    effectiveCompanyId,
    hasPlatform
  };
};

/**
 * Parse date filters from query string safely
 */
const parseDateRange = (req) => {
  const createdAt = {};
  if (req.query.from) {
    const fromDate = new Date(req.query.from);
    if (!isNaN(fromDate.getTime())) {
      createdAt.gte = fromDate;
    }
  }
  if (req.query.to) {
    const toDate = new Date(req.query.to);
    if (!isNaN(toDate.getTime())) {
      createdAt.lte = toDate;
    }
  }

  return Object.keys(createdAt).length > 0 ? { createdAt } : {};
};

/**
 * 1) GET /api/v1/external/analytics/summary
 * Scopes: analytics:read | *
 */
const getAnalyticsSummary = async (req, res) => {
  try {
    const companyCtx = resolveCompanyContext(req, res);
    if (!companyCtx) return;

    const prisma = getSharedPrismaClient();
    const dateRange = parseDateRange(req);
    const orderWhere = {
      ...(companyCtx.effectiveCompanyId ? { companyId: companyCtx.effectiveCompanyId } : {}),
      ...dateRange
    };

    const orders = await prisma.order.findMany({
      where: orderWhere,
      select: {
        id: true,
        total: true,
        status: true,
        paymentStatus: true,
        customerId: true,
        createdAt: true
      }
    });

    const totalOrders = orders.length;
    let totalRevenue = 0;
    const statusBreakdown = {};
    const customerOrderCount = new Map();

    for (const order of orders) {
      const orderTotal = Number(order.total || 0);
      totalRevenue += orderTotal;

      const status = String(order.status || 'UNKNOWN');
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

      if (order.customerId) {
        customerOrderCount.set(
          order.customerId,
          (customerOrderCount.get(order.customerId) || 0) + 1
        );
      }
    }

    let newCustomers = 0;
    let returningCustomers = 0;
    for (const count of customerOrderCount.values()) {
      if (count === 1) {
        newCustomers++;
      } else {
        returningCustomers++;
      }
    }

    const averageOrderValue = totalOrders > 0
      ? Number((totalRevenue / totalOrders).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders,
        averageOrderValue,
        newCustomers,
        returningCustomers,
        statusBreakdown
      },
      meta: {
        from: req.query.from || null,
        to: req.query.to || null,
        companyId: companyCtx.effectiveCompanyId || 'all',
        generatedAt: new Date().toISOString(),
        source: 'database'
      }
    });
  } catch (error) {
    console.error('❌ [EXTERNAL-ANALYTICS] Summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics summary'
    });
  }
};

/**
 * 2) GET /api/v1/external/analytics/orders-by-source
 * Scopes: analytics:read | *
 */
const getOrdersBySource = async (req, res) => {
  try {
    const companyCtx = resolveCompanyContext(req, res);
    if (!companyCtx) return;

    const prisma = getSharedPrismaClient();
    const dateRange = parseDateRange(req);
    const orderWhere = {
      ...(companyCtx.effectiveCompanyId ? { companyId: companyCtx.effectiveCompanyId } : {}),
      ...dateRange
    };

    const orders = await prisma.order.findMany({
      where: orderWhere,
      select: {
        id: true,
        total: true,
        sourceType: true,
        orderSource: true
      }
    });

    const totalOrders = orders.length;
    let overallRevenue = 0;
    const sourceBuckets = {};

    for (const order of orders) {
      const revenue = Number(order.total || 0);
      overallRevenue += revenue;

      const source = String(order.sourceType || order.orderSource || 'direct').trim().toLowerCase();
      if (!sourceBuckets[source]) {
        sourceBuckets[source] = {
          source,
          ordersCount: 0,
          totalRevenue: 0
        };
      }
      sourceBuckets[source].ordersCount += 1;
      sourceBuckets[source].totalRevenue += revenue;
    }

    const sources = Object.values(sourceBuckets).map((item) => ({
      source: item.source,
      ordersCount: item.ordersCount,
      totalRevenue: Number(item.totalRevenue.toFixed(2)),
      averageOrderValue: item.ordersCount > 0 ? Number((item.totalRevenue / item.ordersCount).toFixed(2)) : 0,
      percentageOfTotal: totalOrders > 0 ? Number(((item.ordersCount / totalOrders) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.ordersCount - a.ordersCount);

    return res.status(200).json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: Number(overallRevenue.toFixed(2)),
        sources
      },
      meta: {
        from: req.query.from || null,
        to: req.query.to || null,
        companyId: companyCtx.effectiveCompanyId || 'all',
        generatedAt: new Date().toISOString(),
        source: 'database'
      }
    });
  } catch (error) {
    console.error('❌ [EXTERNAL-ANALYTICS] Orders by source error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders by source'
    });
  }
};

/**
 * 3) GET /api/v1/external/products/top
 * Scopes: products:read | *
 */
const getTopProducts = async (req, res) => {
  try {
    const companyCtx = resolveCompanyContext(req, res);
    if (!companyCtx) return;

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const prisma = getSharedPrismaClient();
    const dateRange = parseDateRange(req);
    const orderWhere = {
      ...(companyCtx.effectiveCompanyId ? { companyId: companyCtx.effectiveCompanyId } : {}),
      ...dateRange
    };

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: orderWhere,
        productId: { not: null }
      },
      select: {
        productId: true,
        productName: true,
        productSku: true,
        quantity: true,
        price: true,
        total: true
      }
    });

    const productAggregates = new Map();
    for (const item of orderItems) {
      const pid = item.productId;
      if (!productAggregates.has(pid)) {
        productAggregates.set(pid, {
          productId: pid,
          productName: item.productName || 'Unknown Product',
          sku: item.productSku || null,
          quantitySold: 0,
          totalRevenue: 0,
          price: Number(item.price || 0)
        });
      }

      const agg = productAggregates.get(pid);
      agg.quantitySold += Number(item.quantity || 0);
      agg.totalRevenue += Number(item.total || (Number(item.price || 0) * Number(item.quantity || 0)));
    }

    const sortedProducts = Array.from(productAggregates.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit)
      .map((p) => ({
        ...p,
        totalRevenue: Number(p.totalRevenue.toFixed(2))
      }));

    return res.status(200).json({
      success: true,
      data: {
        limit,
        productsCount: sortedProducts.length,
        products: sortedProducts
      },
      meta: {
        from: req.query.from || null,
        to: req.query.to || null,
        companyId: companyCtx.effectiveCompanyId || 'all',
        generatedAt: new Date().toISOString(),
        source: 'database'
      }
    });
  } catch (error) {
    console.error('❌ [EXTERNAL-PRODUCTS] Top products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve top products'
    });
  }
};

/**
 * 4) GET /api/v1/external/subscriptions/summary
 * Scopes: subscriptions:read | platform:read | *
 */
const getSubscriptionsSummary = async (req, res) => {
  try {
    const companyCtx = resolveCompanyContext(req, res);
    if (!companyCtx) return;

    const prisma = getSharedPrismaClient();
    const subWhere = companyCtx.effectiveCompanyId ? { companyId: companyCtx.effectiveCompanyId } : {};

    const subscriptions = await prisma.platformSubscription.findMany({
      where: subWhere,
      select: {
        id: true,
        status: true,
        monthlyFee: true,
        nextBillingDate: true,
        trialEndDate: true,
        lastBillingDate: true
      }
    });

    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let mrr = 0;
    let activeSubscriptions = 0;
    let trialSubscriptions = 0;
    let cancelledSubscriptions = 0;
    let upcomingRenewals = 0;

    for (const sub of subscriptions) {
      if (sub.status === 'ACTIVE') {
        activeSubscriptions++;
        mrr += Number(sub.monthlyFee || 0);

        if (sub.nextBillingDate && new Date(sub.nextBillingDate) <= thirtyDaysAhead) {
          upcomingRenewals++;
        }
      } else if (sub.status === 'TRIAL' || (sub.trialEndDate && new Date(sub.trialEndDate) > now)) {
        trialSubscriptions++;
      } else if (sub.status === 'CANCELLED' || sub.status === 'EXPIRED') {
        cancelledSubscriptions++;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        mrr: Number(mrr.toFixed(2)),
        totalSubscriptions: subscriptions.length,
        activeSubscriptions,
        trialSubscriptions,
        cancelledSubscriptions,
        upcomingRenewals
      },
      meta: {
        companyId: companyCtx.effectiveCompanyId || 'all',
        generatedAt: new Date().toISOString(),
        source: 'platform_subscriptions'
      }
    });
  } catch (error) {
    console.error('❌ [EXTERNAL-SUBSCRIPTIONS] Summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscriptions summary'
    });
  }
};

/**
 * 5) GET /api/v1/external/landing-pages/stats
 * Scopes: landing:read | *
 */
const getLandingPagesStats = async (req, res) => {
  try {
    const companyCtx = resolveCompanyContext(req, res);
    if (!companyCtx) return;

    const prisma = getSharedPrismaClient();
    const landingWhere = companyCtx.effectiveCompanyId ? { companyId: companyCtx.effectiveCompanyId } : {};

    const pages = await prisma.productLandingPage.findMany({
      where: landingWhere,
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        visits: true,
        orders: true,
        publishedAt: true,
        createdAt: true
      },
      orderBy: { visits: 'desc' }
    });

    let totalVisits = 0;
    let totalOrders = 0;

    const pagesWithRate = pages.map((page) => {
      const visits = Number(page.visits || 0);
      const orders = Number(page.orders || 0);
      totalVisits += visits;
      totalOrders += orders;

      const conversionRate = visits > 0
        ? Number(((orders / visits) * 100).toFixed(2))
        : 0;

      return {
        id: page.id,
        slug: page.slug,
        title: page.title,
        status: page.status,
        visits,
        orders,
        conversionRate,
        publishedAt: page.publishedAt
      };
    });

    const averageConversionRate = totalVisits > 0
      ? Number(((totalOrders / totalVisits) * 100).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalPages: pages.length,
          totalVisits,
          totalOrders,
          averageConversionRate
        },
        pages: pagesWithRate
      },
      meta: {
        companyId: companyCtx.effectiveCompanyId || 'all',
        generatedAt: new Date().toISOString(),
        source: 'product_landing_pages'
      }
    });
  } catch (error) {
    console.error('❌ [EXTERNAL-LANDING] Stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve landing pages stats'
    });
  }
};

/**
 * 6) GET /api/v1/external/leads/summary
 * Scopes: leads:read | customers:read | *
 * PRIVACY LAW: ZERO PII RETURNED (no phone, no email, no name, no address).
 */
const getLeadsSummary = async (req, res) => {
  try {
    const companyCtx = resolveCompanyContext(req, res);
    if (!companyCtx) return;

    const prisma = getSharedPrismaClient();
    const dateRange = parseDateRange(req);
    const customerWhere = {
      ...(companyCtx.effectiveCompanyId ? { companyId: companyCtx.effectiveCompanyId } : {}),
      ...dateRange
    };

    // Explicitly query ONLY aggregate/classification fields. Never select phone, email, name, address!
    const customers = await prisma.customer.findMany({
      where: customerWhere,
      select: {
        id: true,
        status: true,
        customerRating: true,
        facebookId: true,
        instagramId: true,
        whatsappId: true,
        telegramId: true,
        tiktokId: true,
        totalOrdersCount: true,
        createdAt: true
      }
    });

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let totalLeads = 0;
    let leadsLast7Days = 0;
    let leadsLast30Days = 0;
    const byStatus = {};
    const byRating = {};
    const byChannel = {
      facebook: 0,
      instagram: 0,
      whatsapp: 0,
      telegram: 0,
      tiktok: 0,
      direct: 0
    };

    for (const c of customers) {
      const status = String(c.status || 'UNKNOWN');
      byStatus[status] = (byStatus[status] || 0) + 1;

      if (status === 'LEAD') {
        totalLeads++;
      }

      const rating = String(c.customerRating || 'UNKNOWN');
      byRating[rating] = (byRating[rating] || 0) + 1;

      let hasChannel = false;
      if (c.facebookId) { byChannel.facebook++; hasChannel = true; }
      if (c.instagramId) { byChannel.instagram++; hasChannel = true; }
      if (c.whatsappId) { byChannel.whatsapp++; hasChannel = true; }
      if (c.telegramId) { byChannel.telegram++; hasChannel = true; }
      if (c.tiktokId) { byChannel.tiktok++; hasChannel = true; }
      if (!hasChannel) { byChannel.direct++; }

      const createdTime = new Date(c.createdAt).getTime();
      if (createdTime >= sevenDaysAgo) leadsLast7Days++;
      if (createdTime >= thirtyDaysAgo) leadsLast30Days++;
    }

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        totalRecords: customers.length,
        leadsLast7Days,
        leadsLast30Days,
        byStatus,
        byRating,
        byChannel
      },
      meta: {
        from: req.query.from || null,
        to: req.query.to || null,
        companyId: companyCtx.effectiveCompanyId || 'all',
        generatedAt: new Date().toISOString(),
        source: 'customers_aggregate'
      }
    });
  } catch (error) {
    console.error('❌ [EXTERNAL-LEADS] Summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leads summary'
    });
  }
};

/**
 * 7) GET /api/v1/external/ads/summary
 * Scopes: ads:read | *
 */
const getAdsSummary = async (req, res) => {
  try {
    const companyCtx = resolveCompanyContext(req, res);
    if (!companyCtx) return;

    const prisma = getSharedPrismaClient();
    const campaignWhere = companyCtx.effectiveCompanyId ? { companyId: companyCtx.effectiveCompanyId } : {};

    const campaigns = await prisma.facebookCampaign.findMany({
      where: campaignWhere,
      select: {
        id: true,
        name: true,
        status: true,
        objective: true,
        dailyBudget: true,
        lifetimeBudget: true
      }
    });

    if (campaigns.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalBudget: 0,
          status: 'No linked Meta/Facebook ad campaigns found for this tenant',
          note: 'Connect your Facebook Ad Account in Settings -> Integrations to sync active marketing campaigns.'
        },
        meta: {
          source: 'meta_api',
          companyId: companyCtx.effectiveCompanyId || 'all',
          generatedAt: new Date().toISOString()
        }
      });
    }

    let activeCampaigns = 0;
    let totalBudget = 0;
    const objectivesBreakdown = {};

    for (const c of campaigns) {
      if (c.status === 'ACTIVE') activeCampaigns++;
      totalBudget += Number(c.dailyBudget || c.lifetimeBudget || 0);
      const obj = String(c.objective || 'OUTCOME_SALES');
      objectivesBreakdown[obj] = (objectivesBreakdown[obj] || 0) + 1;
    }

    return res.status(200).json({
      success: true,
      data: {
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalBudget: Number(totalBudget.toFixed(2)),
        objectivesBreakdown
      },
      meta: {
        source: 'meta_campaigns',
        companyId: companyCtx.effectiveCompanyId || 'all',
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ [EXTERNAL-ADS] Summary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve ads summary'
    });
  }
};

/**
 * 8) GET /api/v1/external/docs
 * Public / Authenticated Documentation endpoint
 */
const getDocs = async (_req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      title: 'MaxP External Marketing API',
      version: '1.0.0',
      description: 'Secure, privacy-first programmatic read interface for automated marketing bots, agents, and analytics engines.',
      privacyGuarantee: 'Strictly aggregated telemetry. No individual customer PII (names, phone numbers, emails, addresses) is ever exposed.',
      authentication: {
        methods: [
          { header: 'X-API-Key', format: 'ext_<public_part>_<secret_part>' },
          { header: 'Authorization', format: 'Bearer ext_<public_part>_<secret_part>' }
        ],
        rateLimit: '60 requests per minute per API key. Returns standard X-RateLimit-* headers.'
      },
      scopes: {
        available: MARKETING_API_SCOPES,
        defaultForMarketing: MARKETING_DEFAULT_SCOPES
      },
      endpoints: [
        {
          path: '/api/v1/external/analytics/summary',
          method: 'GET',
          requiredScope: 'analytics:read',
          description: 'Returns aggregated revenue, total orders, average order value, new/returning customer counts, and status breakdown.',
          queryParams: ['from (ISO8601 string)', 'to (ISO8601 string)', 'companyId (requires platform:read or *)'],
          example: 'curl -H "X-API-Key: ext_your_key" "https://maxp.online/api/v1/external/analytics/summary?from=2026-01-01"'
        },
        {
          path: '/api/v1/external/analytics/orders-by-source',
          method: 'GET',
          requiredScope: 'analytics:read',
          description: 'Breakdown of orders and revenue grouped by origination source (Facebook Inbox, Storefront, POS, Manual, etc.).',
          queryParams: ['from', 'to', 'companyId'],
          example: 'curl -H "X-API-Key: ext_your_key" "https://maxp.online/api/v1/external/analytics/orders-by-source"'
        },
        {
          path: '/api/v1/external/products/top',
          method: 'GET',
          requiredScope: 'products:read',
          description: 'List top performing products by units sold and generated revenue.',
          queryParams: ['limit (default: 10, max: 100)', 'from', 'to', 'companyId'],
          example: 'curl -H "X-API-Key: ext_your_key" "https://maxp.online/api/v1/external/products/top?limit=15"'
        },
        {
          path: '/api/v1/external/subscriptions/summary',
          method: 'GET',
          requiredScope: 'subscriptions:read',
          description: 'Monthly Recurring Revenue (MRR), active subscribers, trials, upcoming renewals, and plan distributions.',
          queryParams: ['companyId (requires platform:read or *)'],
          example: 'curl -H "X-API-Key: ext_your_key" "https://maxp.online/api/v1/external/subscriptions/summary"'
        },
        {
          path: '/api/v1/external/landing-pages/stats',
          method: 'GET',
          requiredScope: 'landing:read',
          description: 'Conversion rates, page views, and order counts per product landing page.',
          queryParams: ['from', 'to', 'companyId'],
          example: 'curl -H "X-API-Key: ext_your_key" "https://maxp.online/api/v1/external/landing-pages/stats"'
        },
        {
          path: '/api/v1/external/leads/summary',
          method: 'GET',
          requiredScope: 'leads:read',
          description: 'Aggregated lead acquisition counts, acquisition channel distributions, ratings, and recent trends.',
          queryParams: ['from', 'to', 'companyId'],
          example: 'curl -H "X-API-Key: ext_your_key" "https://maxp.online/api/v1/external/leads/summary"'
        },
        {
          path: '/api/v1/external/ads/summary',
          method: 'GET',
          requiredScope: 'ads:read',
          description: 'Synced Meta/Facebook ad campaign telemetry, active ad spend, and objectives.',
          queryParams: ['companyId'],
          example: 'curl -H "X-API-Key: ext_your_key" "https://maxp.online/api/v1/external/ads/summary"'
        },
        {
          path: '/api/v1/external/docs',
          method: 'GET',
          requiredScope: 'none',
          description: 'Returns machine-readable and human-readable API documentation and curl examples.',
          example: 'curl "https://maxp.online/api/v1/external/docs"'
        }
      ]
    },
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'api_documentation'
    }
  });
};

module.exports = {
  getAnalyticsSummary,
  getOrdersBySource,
  getTopProducts,
  getSubscriptionsSummary,
  getLandingPagesStats,
  getLeadsSummary,
  getAdsSummary,
  getDocs
};
