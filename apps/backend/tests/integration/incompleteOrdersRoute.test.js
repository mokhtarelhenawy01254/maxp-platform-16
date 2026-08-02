const express = require('express');
const request = require('supertest');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env.local'),
  quiet: true,
});

let mockCompanyId = null;

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
      await prisma.guestCart.deleteMany({
        where: { companyId: company?.id },
      });
      await prisma.company.deleteMany({
        where: { id: company?.id },
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
    expect(response.body.data.team.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data.trend.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data.recent).toEqual(expect.any(Array));
  });
});
