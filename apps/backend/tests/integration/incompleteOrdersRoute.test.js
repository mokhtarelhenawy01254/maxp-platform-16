const express = require('express');
const request = require('supertest');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env.local'),
  quiet: true,
});

let mockCompanyId = null;
let attributionNoAppCartId = null;

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      id: 'test-admin-user',
      email: 'orders-incomplete@test.local',
      companyId: mockCompanyId,
      role: 'ADMIN',
    };
    next();
  },
  requireRole: () => (req, res, next) => next(),
  requireCompanyAccess: (req, res, next) => next(),
}));

jest.mock('../../middleware/checkAppAccess', () => ({
  checkAppAccess: () => (req, res, next) => next(),
}));

jest.mock('axios', () => ({
  post: jest.fn(),
}));

const axios = require('axios');

const {
  getSharedPrismaClientAsync,
  closeSharedDatabase,
} = require('../../services/sharedDatabase');
const ordersRoutes = require('../../routes/orders');

describe('Incomplete orders route', () => {
  let app;
  let prisma;
  let company;
  let cartId;

  beforeAll(async () => {
    prisma = await getSharedPrismaClientAsync();

    app = express();
    app.use(express.json());
    app.use('/api/v1/orders-new', ordersRoutes);

    const unique = `${Date.now()}-${Math.round(Math.random() * 10000)}`;

    company = await prisma.company.create({
      data: {
        name: 'Incomplete Orders Route Test',
        email: `incomplete-orders-${unique}@test.local`,
        slug: `incomplete-orders-${unique}`,
        currency: 'EGP',
        settings: JSON.stringify({ description: 'Incomplete orders route test company' }),
        sidebarLayout: 'three-tier',
        timezone: 'Africa/Cairo',
      },
    });

    mockCompanyId = company.id;
    cartId = `incomplete-cart-${unique}`;

    await prisma.guestCart.create({
      data: {
        cartId,
        companyId: company.id,
        items: JSON.stringify([
          {
            productId: 'product-route-test',
            name: 'Route Test Product',
            quantity: 1,
            price: 990,
          },
        ]),
        total: 990,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        checkoutData: JSON.stringify({
          guestName: 'Fallback Activity User',
          guestPhone: '01099999999',
        }),
      },
    });

    attributionNoAppCartId = `attribution-no-app-${unique}`;

    await prisma.guestCart.create({
      data: {
        cartId: attributionNoAppCartId,
        companyId: company.id,
        items: JSON.stringify([
          {
            productId: 'product-route-test-2',
            name: 'Attribution No App Product',
            quantity: 1,
            price: 300,
          },
        ]),
        total: 300,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        checkoutData: JSON.stringify({
          guestName: 'Attribution User',
          guestPhone: '01088888888',
          attribution: {
            source: 'facebook',
            medium: 'paid_social',
            platform: 'facebook',
            campaignName: 'سوان صيف',
            campaignId: '238475612',
            fbclid: 'abc123',
          },
        }),
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    try {
      await prisma.guestCart.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.company.deleteMany({
        where: { id: company?.id },
      });
    } finally {
      mockCompanyId = null;
      attributionNoAppCartId = null;
      await closeSharedDatabase();
    }
  });

  test('GET /api/v1/orders-new/incomplete includes carts with recent activity even when checkoutStartedAt is null', async () => {
    const response = await request(app).get('/api/v1/orders-new/incomplete');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cartId,
          checkoutStartedAt: null,
          status: 'incomplete',
          itemsCount: 1,
        }),
      ]),
    );
  });

  test('GET /api/v1/orders-new/incomplete includes the real abandon reason for each cart', async () => {
    const response = await request(app).get('/api/v1/orders-new/incomplete');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const cart = response.body.data.find((c) => c.cartId === attributionNoAppCartId);
    expect(cart).toBeTruthy();
    expect(cart.abandonReason).toEqual({
      code: 'partial_shipping',
      evidence: ['address', 'governorate', 'city'],
    });
  });

  test('GET /api/v1/orders-new/incomplete hides attribution when the campaign-attribution app is not active', async () => {
    const response = await request(app).get('/api/v1/orders-new/incomplete');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const cart = response.body.data.find((c) => c.cartId === attributionNoAppCartId);
    expect(cart).toBeTruthy();
    expect(cart.attribution).toBeUndefined();
    expect(cart.checkoutData.attribution).toBeUndefined();
  });

  test('GET /api/v1/orders-new/incomplete returns server-side stats scoped to the company', async () => {
    const response = await request(app).get('/api/v1/orders-new/incomplete');

    expect(response.status).toBe(200);
    expect(response.body.stats).toEqual(
      expect.objectContaining({
        total: 1,
        active: 1,
        lost: 0,
        totalValue: 990,
        activeValue: 990,
        lostValue: 0,
      }),
    );
  });

  test('GET /api/v1/orders-new/incomplete supports sorting by total', async () => {
    const response = await request(app).get(
      '/api/v1/orders-new/incomplete?sortBy=total&sortDir=asc',
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

describe('Incomplete orders phone filter, conversion log & reports', () => {
  let app;
  let prisma;
  let company;
  let withPhoneCartId;
  let emptyPhoneCartId;

  beforeAll(async () => {
    prisma = await getSharedPrismaClientAsync();

    app = express();
    app.use(express.json());
    app.use('/api/v1/orders-new', ordersRoutes);

    const unique = `${Date.now()}-${Math.round(Math.random() * 10000)}`;

    company = await prisma.company.create({
      data: {
        name: 'Incomplete Orders Filters Test',
        email: `incomplete-filters-${unique}@test.local`,
        slug: `incomplete-filters-${unique}`,
        currency: 'EGP',
        settings: JSON.stringify({ description: 'Incomplete orders filter test company' }),
        sidebarLayout: 'three-tier',
        timezone: 'Africa/Cairo',
      },
    });

    mockCompanyId = company.id;
    withPhoneCartId = `with-phone-${unique}`;
    emptyPhoneCartId = `empty-phone-${unique}`;

    await prisma.orderInvoiceSettings.create({
      data: {
        companyId: company.id,
        showIncompleteCartsInOrders: true,
      },
    });

    const appRecord = await prisma.marketplaceApp.upsert({
      where: { slug: 'campaign-attribution' },
      update: { isActive: true },
      create: {
        slug: 'campaign-attribution',
        name: 'Campaign Attribution',
        description: 'Order campaign attribution',
        category: 'orders',
        monthlyPrice: 0,
        yearlyPrice: 0,
      },
    });

    await prisma.companyApp.upsert({
      where: { companyId_appId: { companyId: company.id, appId: appRecord.id } },
      update: { status: 'ACTIVE' },
      create: {
        companyId: company.id,
        appId: appRecord.id,
        status: 'ACTIVE',
      },
    });

    await prisma.guestCart.create({
      data: {
        cartId: withPhoneCartId,
        companyId: company.id,
        items: JSON.stringify([{ productId: 'p-a', name: 'With Phone', quantity: 1, price: 500 }]),
        total: 500,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        checkoutData: JSON.stringify({
          customerName: 'With Phone User',
          phone: '01012345678',
          governorate: 'Cairo',
          attribution: {
            source: 'instagram',
            medium: 'paid_social',
            platform: 'instagram',
            campaignName: 'كامبين تست',
            campaignId: '987654321',
            adId: 'ad-111',
          },
        }),
      },
    });

    await prisma.guestCart.create({
      data: {
        cartId: emptyPhoneCartId,
        companyId: company.id,
        items: JSON.stringify([{ productId: 'p-b', name: 'Empty Phone', quantity: 1, price: 200 }]),
        total: 200,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        checkoutData: JSON.stringify({
          customerName: 'Empty Phone User',
          phone: '',
          email: 'empty@test.local',
        }),
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    try {
      await prisma.cartConversionLog.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.cartContactLog.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.companyApp.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.orderInvoiceSettings.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.guestCart.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.company.deleteMany({
        where: { id: company?.id },
      });
      await prisma.marketplaceApp.deleteMany({
        where: { slug: 'campaign-attribution' },
      });
    } finally {
      mockCompanyId = null;
      axios.post.mockReset();
      await closeSharedDatabase();
    }
  });

  test('GET /incomplete?hasPhone=true excludes carts whose phone value is empty', async () => {
    const response = await request(app).get('/api/v1/orders-new/incomplete?hasPhone=true');

    expect(response.status).toBe(200);
    const ids = (response.body.data || []).map((c) => c.cartId);
    expect(ids).toContain(withPhoneCartId);
    expect(ids).not.toContain(emptyPhoneCartId);
  });

  test('GET /incomplete?hasPhone=false returns only carts without a usable phone', async () => {
    const response = await request(app).get('/api/v1/orders-new/incomplete?hasPhone=false');

    expect(response.status).toBe(200);
    const ids = (response.body.data || []).map((c) => c.cartId);
    expect(ids).toContain(emptyPhoneCartId);
    expect(ids).not.toContain(withPhoneCartId);
  });

  test('GET /simple includes only incomplete carts that carry a phone when showIncompleteCartsInOrders is on', async () => {
    const response = await request(app).get('/api/v1/orders-new/simple');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.meta.showIncompleteCartsInOrders).toBe(true);

    const ids = (response.body.data || []).map((o) => o.orderNumber || o.id);
    expect(ids).toContain(withPhoneCartId);
    expect(ids).not.toContain(emptyPhoneCartId);
  });

  test('POST /incomplete/:cartId/convert records a CartConversionLog with the employee', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: { id: 'order-id-1', orderNumber: 'ORD-1001' },
      },
    });

    const response = await request(app).post(`/api/v1/orders-new/incomplete/${withPhoneCartId}/convert`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const log = await prisma.cartConversionLog.findFirst({
      where: { cartId: withPhoneCartId },
    });
    expect(log).toBeTruthy();
    expect(log.employeeId).toBe('test-admin-user');
    expect(log.orderNumber).toBe('ORD-1001');
    expect(Number(log.cartValue)).toBe(500);
  });

  test('GET /incomplete returns cart attribution when the campaign-attribution app is active', async () => {
    const response = await request(app).get('/api/v1/orders-new/incomplete');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const cart = response.body.data.find((c) => c.cartId === withPhoneCartId);
    expect(cart).toBeTruthy();
    expect(cart.attribution).toEqual(
      expect.objectContaining({
        source: 'instagram',
        medium: 'paid_social',
        platform: 'instagram',
        campaignName: 'كامبين تست',
        campaignId: '987654321',
      }),
    );
  });

  test('GET /incomplete/:cartId returns cart attribution when the campaign-attribution app is active', async () => {
    const response = await request(app).get(`/api/v1/orders-new/incomplete/${withPhoneCartId}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.attribution).toEqual(
      expect.objectContaining({
        source: 'instagram',
        campaignName: 'كامبين تست',
        campaignId: '987654321',
        adId: 'ad-111',
      }),
    );
  });

  test('GET /incomplete/:cartId returns the real abandon reason derived from cart data', async () => {
    const response = await request(app).get(`/api/v1/orders-new/incomplete/${withPhoneCartId}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.abandonReason).toEqual({
      code: 'partial_shipping',
      evidence: ['address', 'city'],
    });
  });

  test('POST /incomplete/:cartId/convert forwards the saved attribution to the created order', async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        data: { id: 'order-id-attribution', orderNumber: 'ORD-2001' },
      },
    });

    const response = await request(app).post(`/api/v1/orders-new/incomplete/${withPhoneCartId}/convert`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const [url, payload] = axios.post.mock.calls[axios.post.mock.calls.length - 1];
    expect(url).toContain('/api/v1/public/orders');
    expect(payload).toEqual(
      expect.objectContaining({
        guestName: 'With Phone User',
        guestPhone: '01012345678',
      }),
    );
    expect(payload.attribution).toEqual(
      expect.objectContaining({
        source: 'instagram',
        campaignName: 'كامبين تست',
        campaignId: '987654321',
      }),
    );
  });

  test('GET /incomplete/reports returns recovery pipeline, trend and team rows', async () => {
    await prisma.cartConversionLog.create({
      data: {
        cartId: withPhoneCartId,
        orderId: 'order-id-2',
        orderNumber: 'ORD-1002',
        employeeId: 'emp-seeded',
        employeeName: 'Seeded Employee',
        companyId: company.id,
        cartValue: 500,
        governorate: 'Cairo',
      },
    });

    await prisma.cartContactLog.create({
      data: {
        cartId: withPhoneCartId,
        employeeId: 'emp-seeded',
        employeeName: 'Seeded Employee',
        companyId: company.id,
        method: 'call',
        result: 'answered',
      },
    });

    const response = await request(app).get('/api/v1/orders-new/incomplete/reports?days=30');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.pipeline).toEqual(
      expect.objectContaining({
        total: 2,
        active: 2,
        lost: 0,
        totalValue: 700,
      }),
    );
    expect(response.body.data.recovery.converted).toBeGreaterThanOrEqual(1);
    expect(response.body.data.recovery.convertedValue).toBeGreaterThanOrEqual(500);
    expect(response.body.data.recovery.byTeam).toBeGreaterThanOrEqual(1);
    expect(response.body.data.team.length).toBeGreaterThanOrEqual(1);
    const seeded = response.body.data.team.find((e) => e.employeeId === 'emp-seeded');
    expect(seeded).toBeTruthy();
    expect(seeded.contacts).toBe(1);
    expect(seeded.responses).toBe(1);
    expect(seeded.responseRate).toBe(100);
    expect(response.body.data.trend.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data.recent).toEqual(expect.any(Array));
  });

  test('POST /incomplete/:cartId/contact records a CartContactLog with the employee', async () => {
    const response = await request(app)
      .post(`/api/v1/orders-new/incomplete/${withPhoneCartId}/contact`)
      .send({ method: 'whatsapp', result: 'no_reply', note: 'تذكير بالطلب' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const log = await prisma.cartContactLog.findFirst({
      where: { cartId: withPhoneCartId, method: 'whatsapp' },
    });
    expect(log).toBeTruthy();
    expect(log.employeeId).toBe('test-admin-user');
    expect(log.result).toBe('no_reply');
  });

  test('GET /incomplete/reports accepts a custom from/to range', async () => {
    const from = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);

    const response = await request(app).get(
      `/api/v1/orders-new/incomplete/reports?from=${from}&to=${to}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.from).toBeTruthy();
    expect(response.body.data.to).toBeTruthy();
    expect(Array.isArray(response.body.data.trend)).toBe(true);
  });
});

describe('Incomplete orders status tabs (active vs lost)', () => {
  let app;
  let prisma;
  let company;
  let returnedCartId;
  let lostCartId;

  beforeAll(async () => {
    prisma = await getSharedPrismaClientAsync();

    app = express();
    app.use(express.json());
    app.use('/api/v1/orders-new', ordersRoutes);

    const unique = `${Date.now()}-${Math.round(Math.random() * 10000)}`;

    company = await prisma.company.create({
      data: {
        name: 'Incomplete Orders Status Tabs Test',
        email: `incomplete-status-${unique}@test.local`,
        slug: `incomplete-status-${unique}`,
        currency: 'EGP',
        settings: JSON.stringify({ description: 'Incomplete orders status tab test company' }),
        sidebarLayout: 'three-tier',
        timezone: 'Africa/Cairo',
      },
    });

    mockCompanyId = company.id;
    returnedCartId = `returned-cart-${unique}`;
    lostCartId = `lost-cart-${unique}`;

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // عميل عاد وحدّث الشيك آوت: بدأ من 3 أيام لكن آخر نشاط قبل ساعة → يعتبر نشط
    await prisma.guestCart.create({
      data: {
        cartId: returnedCartId,
        companyId: company.id,
        items: JSON.stringify([{ productId: 'p-r', name: 'Returned', quantity: 1, price: 400 }]),
        total: 400,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        checkoutStartedAt: threeDaysAgo,
        checkoutUpdatedAt: oneHourAgo,
        checkoutData: JSON.stringify({ customerName: 'Returned User', phone: '01011112222' }),
      },
    });

    // سلة مهجورة فعلاً: آخر نشاط من 3 أيام → مفقودة
    await prisma.guestCart.create({
      data: {
        cartId: lostCartId,
        companyId: company.id,
        items: JSON.stringify([{ productId: 'p-l', name: 'Lost', quantity: 1, price: 300 }]),
        total: 300,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        checkoutStartedAt: threeDaysAgo,
        checkoutUpdatedAt: threeDaysAgo,
        checkoutData: JSON.stringify({ customerName: 'Lost User', phone: '01033334444' }),
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;

    try {
      await prisma.guestCart.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.company.deleteMany({
        where: { id: company?.id },
      });
    } finally {
      mockCompanyId = null;
      await closeSharedDatabase();
    }
  });

  test('status=active returns a cart whose checkoutUpdatedAt is recent even when it started long ago', async () => {
    const response = await request(app).get('/api/v1/orders-new/incomplete?status=active');

    expect(response.status).toBe(200);
    const ids = (response.body.data || []).map((c) => c.cartId);
    expect(ids).toContain(returnedCartId);
    expect(ids).not.toContain(lostCartId);
  });

  test('status=lost returns only carts with no recent activity', async () => {
    const response = await request(app).get('/api/v1/orders-new/incomplete?status=lost');

    expect(response.status).toBe(200);
    const ids = (response.body.data || []).map((c) => c.cartId);
    expect(ids).toContain(lostCartId);
    expect(ids).not.toContain(returnedCartId);
  });

  test('stats do not double-count a returned cart (active + lost = total, scoped to base filters)', async () => {
    const response = await request(app).get('/api/v1/orders-new/incomplete');

    expect(response.status).toBe(200);
    const stats = response.body.stats;
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(1);
    expect(stats.lost).toBe(1);
    expect(stats.active + stats.lost).toBe(stats.total);
  });
});
