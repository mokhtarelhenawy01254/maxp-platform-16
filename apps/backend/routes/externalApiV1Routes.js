/**
 * @module externalApiV1Routes
 * @description Public merchant REST API — read-only, authenticated with
 * Developer Hub API keys (`mxp_live_…`). Mounted at /api/v1/public/ext.
 *
 * Public (credential-free) probe: GET /mcp/status reports whether the MCP
 * servers are actually deployed, so the Developer Hub never advertises a dead
 * MCP endpoint. See config/mcpDeployment for the source of truth.
 *
 * Isolation contract:
 *  - company scope comes from the credential row (req.merchantCredential)
 *  - every query filters by that companyId
 *  - scopes gate each resource group
 */
const express = require('express');
const router = express.Router();

const { merchantApiAuth, requireScope, createMerchantApiAuth } = require('../middleware/merchantApiAuth');
const { getMcpDeploymentStatus } = require('../config/mcpDeployment');
const videoGenerationController = require('../controller/videoGenerationController');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const {
  formatExternalOrderListRow,
  formatExternalOrderDetail,
} = require('../utils/externalOrderPayload');

const getPrisma = () => getSharedPrismaClientAsync();

const MAX_PAGE_SIZE = 100;

const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), MAX_PAGE_SIZE);
  return { page, limit, skip: (page - 1) * limit };
};

const paginated = (res, { data, total, page, limit }) =>
  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / Math.max(limit, 1)) },
  });

const degrade = (res, context, error) => {
  console.error(`[ext-api] ${context} failed:`, error?.message || error);
  return res.status(503).json({ success: false, code: 'DATA_UNAVAILABLE', message: 'البيانات غير متاحة حالياً' });
};

// ─── MCP availability probe (public, no credential) ─────────────────────────
// Registered BEFORE the REST-key gate below on purpose: the Developer Hub must
// be able to learn whether the MCP servers exist before it owns a valid key,
// and the answer is the same for everyone. Values come from real deployment
// configuration (`config/mcpDeployment`), never hardcoded — deploying the
// servers (MCP_SERVERS_DEPLOYED=true) flips the Developer Hub back to the
// copy-ready config with no code change.
router.get('/mcp/status', (_req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  return res.json({ success: true, ...getMcpDeploymentStatus() });
});

// ─── Video bridge (merchant MCP tokens) ─────────────────────────────────────
// Registered BEFORE the REST-key gate below on purpose: this surface accepts
// merchant MCP tokens (mxp_mcp_…) presented by the video-mcp server, while all
// other /ext routes require a REST API key (mxp_live_…).
const videoMcpAuth = createMerchantApiAuth({ credentialType: 'MCP' });

router.use('/video', videoMcpAuth);
router.use('/video', (req, _res, next) => {
  // Tenant scope always comes from the verified credential row.
  req.companyId = req.merchantCredential.companyId;
  next();
});
router.post('/video/generate', requireScope('video:create'), (req, res) =>
  videoGenerationController.generateVideo(req, res),
);
router.get('/video/status/:taskId', requireScope('video:read'), (req, res) =>
  videoGenerationController.getVideoStatus(req, res),
);
router.get('/video/history', requireScope('video:read'), (req, res) =>
  videoGenerationController.getHistory(req, res),
);

router.use(merchantApiAuth);

// GET /api/v1/ext/me — identity probe for the presented key
router.get('/me', (req, res) => {
  const c = req.merchantCredential;
  return res.json({
    success: true,
    key: { id: c.id, name: c.name, maskedKey: c.maskedKey, scopes: c.scopes, rateLimitPerMin: c.rateLimitPerMin },
    companyId: c.companyId,
  });
});

// ─── Products ───────────────────────────────────────────────────────────────
router.get('/products', requireScope('products:read'), async (req, res) => {
  try {
    const prisma = await getPrisma();
    const { page, limit, skip } = parsePagination(req.query);
    const where = { companyId: req.merchantCredential.companyId, deletedAt: null };
    if (req.query.search) {
      const q = String(req.query.search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (req.query.active === 'true') where.isActive = true;
    if (req.query.active === 'false') where.isActive = false;

    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, sku: true, price: true, comparePrice: true,
          stock: true, isActive: true, mainImage: true, categoryId: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.product.count({ where }),
    ]);
    return paginated(res, { data: rows, total, page, limit });
  } catch (error) {
    return degrade(res, 'products list', error);
  }
});

router.get('/products/:id', requireScope('products:read'), async (req, res) => {
  try {
    const prisma = await getPrisma();
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, companyId: req.merchantCredential.companyId, deletedAt: null },
      select: {
        id: true, name: true, description: true, sku: true, price: true, comparePrice: true,
        stock: true, isActive: true, mainImage: true, images: true, categoryId: true,
        barcode: true, createdAt: true, updatedAt: true,
      },
    });
    if (!product) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'المنتج غير موجود' });
    }
    return res.json({ success: true, data: product });
  } catch (error) {
    return degrade(res, 'product get', error);
  }
});

// ─── Inventory ──────────────────────────────────────────────────────────────
router.get('/inventory', requireScope('inventory:read'), async (req, res) => {
  try {
    const prisma = await getPrisma();
    const companyId = req.merchantCredential.companyId;
    const { page, limit, skip } = parsePagination(req.query);
    const threshold = Math.max(parseInt(req.query.lowStockThreshold, 10) || 5, 0);
    const where = { companyId, deletedAt: null, trackInventory: true };
    if (req.query.lowStock === 'true') where.stock = { lte: threshold };

    const [rows, total, aggregates] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { stock: 'asc' },
        select: { id: true, name: true, sku: true, stock: true, isActive: true, trackInventory: true },
      }),
      prisma.product.count({ where }),
      prisma.product.aggregate({
        where: { companyId, deletedAt: null },
        _sum: { stock: true },
        _count: { id: true },
      }),
    ]);

    return res.json({
      success: true,
      data: rows,
      summary: {
        totalProducts: aggregates._count.id,
        totalStock: aggregates._sum.stock || 0,
        lowStockThreshold: threshold,
      },
      pagination: { page, limit, total, pages: Math.ceil(total / Math.max(limit, 1)) },
    });
  } catch (error) {
    return degrade(res, 'inventory list', error);
  }
});

// ─── Orders ─────────────────────────────────────────────────────────────────
router.get('/orders', requireScope('orders:read'), async (req, res) => {
  try {
    const prisma = await getPrisma();
    const { page, limit, skip } = parsePagination(req.query);
    const where = { companyId: req.merchantCredential.companyId };
    if (req.query.status) where.status = String(req.query.status).toUpperCase();
    if (req.query.paymentStatus) where.paymentStatus = String(req.query.paymentStatus).toUpperCase();
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(String(req.query.from));
      if (req.query.to) where.createdAt.lte = new Date(String(req.query.to));
    }

    const [rows, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, orderNumber: true, status: true, customStatusCode: true, paymentStatus: true, paymentMethod: true,
          subtotal: true, shipping: true, discount: true, total: true, currency: true,
          customerName: true, customerPhone: true, city: true, governorate: true,
          confirmedAt: true, createdAt: true, metadata: true,
          orderItems: { select: { quantity: true } },
          shipments: {
            select: { collectedAt: true, collectedAmount: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
          statusHistory: {
            where: { status: { in: ['DELIVERED', 'delivered', 'Delivered'] } },
            select: { status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          returnRequests: {
            select: {
              rejectionReason: true,
              reasonId: true,
              adminNotes: true,
              customerNotes: true,
              returnReason: { select: { reason: true } },
            },
            take: 1,
          },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return paginated(res, { data: rows.map(formatExternalOrderListRow), total, page, limit });
  } catch (error) {
    if (String(error?.name || '').includes('PrismaClientValidationError')) {
      return res.status(400).json({ success: false, code: 'INVALID_FILTER', message: 'قيمة فلتر غير صالحة' });
    }
    return degrade(res, 'orders list', error);
  }
});

router.get('/orders/:id', requireScope('orders:read'), async (req, res) => {
  try {
    const prisma = await getPrisma();
    const order = await prisma.order.findFirst({
      where: {
        companyId: req.merchantCredential.companyId,
        OR: [
          { id: req.params.id },
          { orderNumber: req.params.id },
        ],
      },
      select: {
        id: true, orderNumber: true, status: true, customStatusCode: true, paymentStatus: true,
        paymentMethod: true, subtotal: true, tax: true, shipping: true, discount: true, total: true,
        currency: true, customerName: true, customerPhone: true, customerEmail: true, city: true,
        governorate: true, notes: true, confirmedAt: true, createdAt: true, updatedAt: true,
        metadata: true,
        orderItems: {
          select: { id: true, productId: true, quantity: true, price: true, productName: true },
        },
        shipments: {
          select: { collectedAt: true, collectedAmount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          where: { status: { in: ['DELIVERED', 'delivered', 'Delivered'] } },
          select: { status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        returnRequests: {
          select: {
            rejectionReason: true,
            reasonId: true,
            adminNotes: true,
            customerNotes: true,
            returnReason: { select: { reason: true } },
          },
          take: 1,
        },
      },
    });
    if (!order) {
      return res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'الطلب غير موجود' });
    }
    return res.json({ success: true, data: formatExternalOrderDetail(order) });
  } catch (error) {
    return degrade(res, 'order get', error);
  }
});

// ─── Customers ──────────────────────────────────────────────────────────────
router.get('/customers', requireScope('customers:read'), async (req, res) => {
  try {
    const prisma = await getPrisma();
    const { page, limit, skip } = parsePagination(req.query);
    const where = { companyId: req.merchantCredential.companyId };
    if (req.query.search) {
      const q = String(req.query.search).trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (req.query.status) where.status = String(req.query.status).toUpperCase();

    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          status: true, createdAt: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);
    return paginated(res, { data: rows, total, page, limit });
  } catch (error) {
    return degrade(res, 'customers list', error);
  }
});

// ─── Coupons ────────────────────────────────────────────────────────────────
router.get('/coupons', requireScope('coupons:read'), async (req, res) => {
  try {
    const prisma = await getPrisma();
    const { page, limit, skip } = parsePagination(req.query);
    const where = { companyId: req.merchantCredential.companyId };
    if (req.query.active === 'true') where.isActive = true;

    const [rows, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, code: true, name: true, type: true, value: true, minOrderAmount: true,
          usageLimit: true, usageCount: true, isActive: true, validFrom: true, validTo: true,
        },
      }),
      prisma.coupon.count({ where }),
    ]);
    return paginated(res, { data: rows, total, page, limit });
  } catch (error) {
    return degrade(res, 'coupons list', error);
  }
});

// ─── Analytics summary ──────────────────────────────────────────────────────
router.get('/analytics/summary', requireScope('analytics:read'), async (req, res) => {
  try {
    const prisma = await getPrisma();
    const companyId = req.merchantCredential.companyId;
    const since = new Date(Date.now() - (Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365)) * 86400000);

    const [ordersCount, revenue, productsCount, customersCount, recentOrders] = await Promise.all([
      prisma.order.count({ where: { companyId, createdAt: { gte: since } } }),
      prisma.order.aggregate({
        where: { companyId, createdAt: { gte: since }, status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] } },
        _sum: { total: true },
      }),
      prisma.product.count({ where: { companyId, deletedAt: null, isActive: true } }),
      prisma.customer.count({ where: { companyId } }),
      prisma.order.findMany({
        where: { companyId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, orderNumber: true, total: true, status: true, createdAt: true },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        windowDays: Math.round((Date.now() - since.getTime()) / 86400000),
        orders: ordersCount,
        revenue: revenue._sum.total || 0,
        activeProducts: productsCount,
        customers: customersCount,
        recentOrders,
      },
    });
  } catch (error) {
    return degrade(res, 'analytics summary', error);
  }
});

module.exports = router;
