const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

describe('Shipping Settlement Routes', () => {
  let app;
  let prisma;
  let company;
  let adminUser;
  let customer;
  let order;
  let shippingCompany;
  let shipment;
  let token;

  beforeAll(async () => {
    prisma = getSharedPrismaClient();

    app = express();
    app.use(express.json());
    const shippingSettlementRoutes = require('../../routes/shippingSettlementRoutes');
    app.use('/api/v1/shipping-settlement', shippingSettlementRoutes);

    const unique = Date.now();

    company = await prisma.company.create({
      data: {
        id: `test-company-settle-${unique}`,
        name: 'Test Company Settlement',
        email: `settlement-company-${unique}@test.local`,
        isActive: true,
        sidebarLayout: 'three-tier',
        timezone: 'Asia/Riyadh',
        updatedAt: new Date()
      }
    });

    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    adminUser = await prisma.user.create({
      data: {
        id: `test-user-settle-admin-${unique}`,
        email: `settlement-admin-${unique}@test.local`,
        password: passwordHash,
        firstName: 'Settle',
        lastName: 'Admin',
        role: 'MANAGER',
        companyId: company.id,
        isActive: true,
        isEmailVerified: true,
        availability: 'available',
        timezone: 'Asia/Riyadh'
      }
    });

    await prisma.userCompany.create({
      data: {
        userId: adminUser.id,
        companyId: company.id,
        role: 'MANAGER',
        isActive: true,
        isDefault: true
      }
    });

    customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        firstName: 'Settle',
        lastName: 'Customer',
        email: `settlement-customer-${unique}@test.local`,
        phone: '01000000007'
      }
    });

    order = await prisma.order.create({
      data: {
        orderNumber: `ORD-SETTLE-${unique}`,
        customerId: customer.id,
        companyId: company.id,
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        subtotal: 200,
        tax: 0,
        shipping: 30,
        discount: 0,
        total: 230,
        currency: 'EGP',
        customerName: 'Settle Customer',
        customerPhone: '01000000007',
        customerEmail: customer.email,
        city: 'القاهرة',
        governorate: 'القاهرة',
        sourceType: 'manual'
      }
    });

    shippingCompany = await prisma.shippingCompany.create({
      data: {
        id: `test-shipping-co-${unique}`,
        name: 'Test Shipping Co',
        slug: `test-shipping-co-${unique}`,
        providerKey: 'MANUAL',
        integrationMode: 'MANUAL',
        companyId: company.id,
        isActive: true
      }
    });

    shipment = await prisma.shipment.create({
      data: {
        id: `test-shipment-${unique}`,
        companyId: company.id,
        orderId: order.id,
        shippingCompanyId: shippingCompany.id,
        carrierType: 'MANUAL',
        status: 'DELIVERED',
        trackingNumber: 'TRK-SETTLE-001',
        cost: 30,
        currency: 'EGP'
      }
    });

    const JWT_SECRET = process.env.JWT_SECRET || 'maxp-super-secret-jwt-key-2026';
    process.env.JWT_SECRET = JWT_SECRET;

    token = jwt.sign(
      {
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        companyId: company.id
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    try {
      if (shipment) {
        await prisma.shipment.deleteMany({ where: { id: shipment.id } }).catch(() => {});
      }
      if (shippingCompany) {
        await prisma.shippingCompany.deleteMany({ where: { id: shippingCompany.id } }).catch(() => {});
      }
      if (order) {
        await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } }).catch(() => {});
        await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
      }
      if (customer) {
        await prisma.customer.delete({ where: { id: customer.id } }).catch(() => {});
      }
      if (adminUser) {
        await prisma.userCompany.deleteMany({ where: { userId: adminUser.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      }
      if (company) {
        await prisma.activityLog.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.company.delete({ where: { id: company.id } }).catch(() => {});
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test('GET /summary returns pending and settled amounts per company', async () => {
    const res = await request(app)
      .get('/api/v1/shipping-settlement/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const companySummary = res.body.data.find((item) => item.company.id === shippingCompany.id);
    expect(companySummary).toBeDefined();
    expect(companySummary.deliveredShipments).toBe(1);
    expect(companySummary.pendingAmount).toBe(230);
    expect(companySummary.settledShipments).toBe(0);
  });

  test('GET /orders returns shipments with order info', async () => {
    const res = await request(app)
      .get(`/api/v1/shipping-settlement/orders?shippingCompanyId=${shippingCompany.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].order.orderNumber).toBe(order.orderNumber);
    expect(res.body.data[0].delivered).toBe(true);
    expect(res.body.data[0].settlementStatus).toBe('PENDING');
  });

  test('POST /settle marks shipments as settled', async () => {
    const res = await request(app)
      .post('/api/v1/shipping-settlement/settle')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingCompanyId: shippingCompany.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.updated).toBe(1);

    const updated = await prisma.shipment.findUnique({ where: { id: shipment.id } });
    expect(updated.settlementStatus).toBe('SETTLED');
    expect(updated.settledAt).not.toBeNull();
    expect(updated.settledBy).toBe(adminUser.id);
  });

  test('GET /summary reflects settled amounts after settle', async () => {
    const res = await request(app)
      .get('/api/v1/shipping-settlement/summary')
      .set('Authorization', `Bearer ${token}`);

    const companySummary = res.body.data.find((item) => item.company.id === shippingCompany.id);
    expect(companySummary.deliveredShipments).toBe(0);
    expect(companySummary.pendingAmount).toBe(0);
    expect(companySummary.settledShipments).toBe(1);
    expect(companySummary.settledAmount).toBe(230);
  });

  test('POST /unsettle reverts settlement', async () => {
    const res = await request(app)
      .post('/api/v1/shipping-settlement/unsettle')
      .set('Authorization', `Bearer ${token}`)
      .send({ shipmentIds: [shipment.id] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.updated).toBe(1);

    const updated = await prisma.shipment.findUnique({ where: { id: shipment.id } });
    expect(updated.settlementStatus).toBe('PENDING');
    expect(updated.settledAt).toBeNull();
  });

  test('GET /orders filters by settlementStatus=SETTLED', async () => {
    await request(app)
      .post('/api/v1/shipping-settlement/settle')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingCompanyId: shippingCompany.id });

    const res = await request(app)
      .get(`/api/v1/shipping-settlement/orders?settlementStatus=SETTLED`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].settlementStatus).toBe('SETTLED');

    await request(app)
      .post('/api/v1/shipping-settlement/unsettle')
      .set('Authorization', `Bearer ${token}`)
      .send({ shipmentIds: [shipment.id] });
  });
});
