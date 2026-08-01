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
