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
  let turboOrder;
  let turboOrderPending;
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
        city: '╪º┘ä┘é╪º┘ç╪▒╪⌐',
        governorate: '╪º┘ä┘é╪º┘ç╪▒╪⌐',
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

    // Turbo shipments live on the Order table (turboShipmentId / turboShipmentStatus),
    // not on Shipment rows ΓÇö they must surface in settlement as a virtual "TURBO" company.
    turboOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-TURBO-${unique}`,
        customerId: customer.id,
        companyId: company.id,
        status: 'DELIVERED',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        subtotal: 120,
        tax: 0,
        shipping: 30,
        discount: 0,
        total: 150,
        currency: 'EGP',
        customerName: 'Turbo Customer',
        customerPhone: '01000000008',
        customerEmail: customer.email,
        city: '╪º┘ä┘é╪º┘ç╪▒╪⌐',
        governorate: '╪º┘ä┘é╪º┘ç╪▒╪⌐',
        sourceType: 'manual',
        turboShipmentId: `TB-${unique}-01`,
        turboTrackingNumber: `TB-${unique}-01`,
        turboShipmentStatus: 'delivered',
        turboMetadata: JSON.stringify({})
      }
    });

    turboOrderPending = await prisma.order.create({
      data: {
        orderNumber: `ORD-TURBO-P-${unique}`,
        customerId: customer.id,
        companyId: company.id,
        status: 'PROCESSING',
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        subtotal: 80,
        tax: 0,
        shipping: 20,
        discount: 0,
        total: 100,
        currency: 'EGP',
        customerName: 'Turbo Pending',
        customerPhone: '01000000009',
        customerEmail: customer.email,
        city: '╪º┘ä╪¼┘è╪▓╪⌐',
        governorate: '╪º┘ä╪¼┘è╪▓╪⌐',
        sourceType: 'manual',
        turboShipmentId: `TB-${unique}-02`,
        turboTrackingNumber: `TB-${unique}-02`,
        turboShipmentStatus: 'processing',
        turboMetadata: JSON.stringify({})
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
      if (turboOrderPending) {
        await prisma.order.deleteMany({ where: { id: turboOrderPending.id } }).catch(() => {});
      }
      if (turboOrder) {
        await prisma.order.deleteMany({ where: { id: turboOrder.id } }).catch(() => {});
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

  test('GET /summary includes virtual Turbo company from order-level shipments', async () => {
    const res = await request(app)
      .get('/api/v1/shipping-settlement/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const turbo = res.body.data.find((item) => item.company.id === 'TURBO');
    expect(turbo).toBeDefined();
    expect(turbo.company.providerKey).toBe('TURBO');
    expect(turbo.totalShipments).toBe(2);
    expect(turbo.deliveredShipments).toBe(1);
    expect(turbo.pendingAmount).toBe(150);
    expect(turbo.settledShipments).toBe(0);
  });

  test('GET /orders?shippingCompanyId=TURBO returns only turbo shipments', async () => {
    const res = await request(app)
      .get('/api/v1/shipping-settlement/orders?shippingCompanyId=TURBO')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    const delivered = res.body.data.find((item) => item.order.orderNumber === turboOrder.orderNumber);
    expect(delivered).toBeDefined();
    expect(delivered.sourceType).toBe('TURBO');
    expect(delivered.delivered).toBe(true);
    expect(delivered.trackingNumber).toBe(turboOrder.turboTrackingNumber);
    expect(delivered.order.total).toBe(150);
  });

  test('POST /settle with shippingCompanyId=TURBO settles only delivered turbo orders', async () => {
    const res = await request(app)
      .post('/api/v1/shipping-settlement/settle')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingCompanyId: 'TURBO' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.updated).toBe(1);

    const settled = await prisma.order.findUnique({ where: { id: turboOrder.id } });
    const settledMeta = JSON.parse(settled.turboMetadata);
    expect(settledMeta.settlementStatus).toBe('SETTLED');
    expect(settledMeta.settledAt).toBeTruthy();

    const pending = await prisma.order.findUnique({ where: { id: turboOrderPending.id } });
    expect(JSON.parse(pending.turboMetadata).settlementStatus).toBeUndefined();
  });

  test('POST /unsettle with turboOrderIds reverts turbo settlement', async () => {
    const res = await request(app)
      .post('/api/v1/shipping-settlement/unsettle')
      .set('Authorization', `Bearer ${token}`)
      .send({ turboOrderIds: [turboOrder.id] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.updated).toBe(1);

    const updated = await prisma.order.findUnique({ where: { id: turboOrder.id } });
    const meta = JSON.parse(updated.turboMetadata);
    expect(meta.settlementStatus).toBe('PENDING');
    expect(meta.settledAt).toBeUndefined();
  });

  test('GET /orders?shippingCompanyId=TURBO&settlementStatus=SETTLED filters turbo rows', async () => {
    await request(app)
      .post('/api/v1/shipping-settlement/settle')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingCompanyId: 'TURBO' });

    const res = await request(app)
      .get('/api/v1/shipping-settlement/orders?shippingCompanyId=TURBO&settlementStatus=SETTLED')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].order.orderNumber).toBe(turboOrder.orderNumber);
    expect(res.body.data[0].settlementStatus).toBe('SETTLED');

    await request(app)
      .post('/api/v1/shipping-settlement/unsettle')
      .set('Authorization', `Bearer ${token}`)
      .send({ turboOrderIds: [turboOrder.id] });
  });
});
