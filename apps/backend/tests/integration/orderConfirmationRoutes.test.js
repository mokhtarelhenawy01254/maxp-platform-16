const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getSharedPrismaClient } = require('../../services/sharedDatabase');

const ensureOrderConfirmationSettingsTable = async (prisma) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "order_confirmation_settings" (
      "id" TEXT PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "enabled" BOOLEAN NOT NULL DEFAULT false,
      "requireSourceTypes" TEXT,
      "requireStatuses" TEXT,
      "requireMatchMode" TEXT NOT NULL DEFAULT 'any',
      "confirmStatus" TEXT NOT NULL DEFAULT 'CONFIRMED',
      "distributionEnabled" BOOLEAN NOT NULL DEFAULT false,
      "distributionStrategy" TEXT NOT NULL DEFAULT 'round_robin',
      "eligibleRoles" TEXT,
      "eligibleUserIds" TEXT,
      "regionRules" TEXT,
      "specialtyRules" TEXT,
      "orderValueRules" TEXT,
      "workloadMaxOpen" INTEGER,
      "workloadStatuses" TEXT,
      "lastAssignedUserId" TEXT,
      "notifyOnNew" BOOLEAN NOT NULL DEFAULT true,
      "autoAssignOnConfirm" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "order_confirmation_settings_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "order_confirmation_settings"
    ADD COLUMN IF NOT EXISTS "orderValueRules" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "order_confirmation_settings_companyId_key"
    ON "order_confirmation_settings"("companyId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "order_confirmation_settings_companyId_idx"
    ON "order_confirmation_settings"("companyId");
  `);
};

const ensureOrderAssignmentsTable = async (prisma) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "order_assignments" (
      "id" TEXT PRIMARY KEY,
      "orderId" TEXT,
      "guestOrderId" TEXT,
      "companyId" TEXT NOT NULL,
      "assignedTo" TEXT NOT NULL,
      "assignedBy" TEXT,
      "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "strategy" TEXT,
      "metadata" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      CONSTRAINT "order_assignments_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
      CONSTRAINT "order_assignments_guestOrderId_fkey"
        FOREIGN KEY ("guestOrderId") REFERENCES "guest_orders"("id") ON DELETE CASCADE,
      CONSTRAINT "order_assignments_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "order_assignments_orderId_idx"
    ON "order_assignments"("orderId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "order_assignments_guestOrderId_idx"
    ON "order_assignments"("guestOrderId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "order_assignments_companyId_idx"
    ON "order_assignments"("companyId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "order_assignments_companyId_assignedAt_idx"
    ON "order_assignments"("companyId", "assignedAt");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "order_assignments_companyId_strategy_assignedAt_idx"
    ON "order_assignments"("companyId", "strategy", "assignedAt");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "order_assignments_assignedTo_idx"
    ON "order_assignments"("assignedTo");
  `);
};

describe('Order Confirmation Routes', () => {
  let app;
  let prisma;
  let company;
  let adminUser;
  let agentUser;
  let customer;
  let order;
  let guestOrder;
  let token;

  beforeAll(async () => {
    prisma = getSharedPrismaClient();
    await ensureOrderConfirmationSettingsTable(prisma);
    await ensureOrderAssignmentsTable(prisma);

    app = express();
    app.use(express.json());

    const orderConfirmationRoutes = require('../../routes/orderConfirmationRoutes');
    app.use('/api/v1/order-confirmation', orderConfirmationRoutes);

    const unique = Date.now();

    company = await prisma.company.create({
      data: {
        id: `test-company-confirm-${unique}`,
        name: 'Test Company Confirmation',
        email: `confirmation-company-${unique}@test.local`,
        plan: 'BASIC',
        isActive: true,
        sidebarLayout: 'three-tier',
        timezone: 'Asia/Riyadh',
        updatedAt: new Date()
      }
    });

    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    adminUser = await prisma.user.create({
      data: {
        id: `test-user-confirm-admin-${unique}`,
        email: `confirmation-admin-${unique}@test.local`,
        password: passwordHash,
        firstName: 'Confirm',
        lastName: 'Admin',
        role: 'MANAGER',
        companyId: company.id,
        isActive: true,
        isEmailVerified: true,
        availability: 'available',
        timezone: 'Asia/Riyadh'
      }
    });

    agentUser = await prisma.user.create({
      data: {
        id: `test-user-confirm-agent-${unique}`,
        email: `confirmation-agent-${unique}@test.local`,
        password: passwordHash,
        firstName: 'Confirm',
        lastName: 'Agent',
        role: 'AGENT',
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

    await prisma.userCompany.create({
      data: {
        userId: agentUser.id,
        companyId: company.id,
        role: 'AGENT',
        isActive: true,
        isDefault: false
      }
    });

    await prisma.orderConfirmationSettings.create({
      data: {
        companyId: company.id,
        enabled: true,
        distributionEnabled: true,
        requireStatuses: JSON.stringify(['PENDING']),
        requireSourceTypes: JSON.stringify(['manual', 'storefront']),
        confirmStatus: 'CONFIRMED',
        eligibleRoles: JSON.stringify(['MANAGER', 'AGENT'])
      }
    });

    customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        firstName: 'Test',
        lastName: 'Customer',
        email: `confirmation-customer-${unique}@test.local`,
        phone: '01000000001'
      }
    });

    order = await prisma.order.create({
      data: {
        orderNumber: `ORD-CONFIRM-${unique}`,
        customerId: customer.id,
        companyId: company.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'CASH',
        subtotal: 150,
        tax: 0,
        shipping: 25,
        discount: 0,
        total: 175,
        currency: 'EGP',
        customerName: 'Test Customer',
        customerPhone: '01000000001',
        customerEmail: customer.email,
        city: 'القاهرة',
        governorate: 'القاهرة',
        sourceType: 'manual'
      }
    });

    guestOrder = await prisma.guestOrder.create({
      data: {
        orderNumber: `GUEST-CONFIRM-${unique}`,
        guestEmail: `confirmation-guest-${unique}@test.local`,
        guestPhone: '01000000005',
        guestName: 'Guest Confirm',
        items: JSON.stringify([{ name: 'Test Item', qty: 1, price: 150 }]),
        total: 150,
        shippingCost: 25,
        discountAmount: 0,
        finalTotal: 175,
        shippingAddress: 'Test Address, Cairo',
        paymentMethod: 'CASH',
        status: 'pending',
        companyId: company.id
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
      if (order) {
        await prisma.orderAssignment.deleteMany({ where: { orderId: order.id } });
        await prisma.orderStatusHistory.deleteMany({ where: { orderId: order.id } }).catch(() => {});
        await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
      }

      if (guestOrder) {
        await prisma.orderAssignment.deleteMany({ where: { guestOrderId: guestOrder.id } });
        await prisma.orderStatusHistory.deleteMany({ where: { guestOrderId: guestOrder.id } }).catch(() => {});
        await prisma.guestOrder.delete({ where: { id: guestOrder.id } }).catch(() => {});
      }

      if (customer) {
        await prisma.customer.delete({ where: { id: customer.id } }).catch(() => {});
      }

      if (adminUser) {
        await prisma.userCompany.deleteMany({ where: { userId: adminUser.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      }

      if (agentUser) {
        await prisma.userCompany.deleteMany({ where: { userId: agentUser.id } }).catch(() => {});
        await prisma.user.delete({ where: { id: agentUser.id } }).catch(() => {});
      }

      if (company) {
        await prisma.notification.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.activityLog.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.orderConfirmationSettings.deleteMany({ where: { companyId: company.id } }).catch(() => {});
        await prisma.company.delete({ where: { id: company.id } }).catch(() => {});
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test('GET /settings returns normalized settings', async () => {
    const res = await request(app)
      .get('/api/v1/order-confirmation/settings')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.requireStatuses)).toBe(true);
    expect(Array.isArray(res.body.data.requireSourceTypes)).toBe(true);
  });

  test('GET /settings returns normalized order value rules', async () => {
    await prisma.orderConfirmationSettings.updateMany({
        where: { companyId: company.id },
        data: {
          orderValueRules: JSON.stringify([
            { minTotal: 200, maxTotal: 500, userIds: [agentUser.id] },
            { minTotal: 501, maxTotal: null, userIds: [agentUser.id] }
          ])
        }
      });

    try {
      const res = await request(app)
        .get('/api/v1/order-confirmation/settings')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.orderValueRules).toEqual([
          { minTotal: 200, maxTotal: 500, userIds: [agentUser.id] },
          { minTotal: 501, maxTotal: null, userIds: [agentUser.id] }
        ]);
    } finally {
      await prisma.orderConfirmationSettings.updateMany({
        where: { companyId: company.id },
        data: { orderValueRules: JSON.stringify([]) }
      });
    }
  });

  test('GET /eligible-users returns available team', async () => {
    const res = await request(app)
      .get('/api/v1/order-confirmation/eligible-users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const emails = res.body.data.map((u) => u.email);
    expect(emails).toContain(agentUser.email);
  });

  test('GET /eligible-users can expose all role candidates for settings UI', async () => {
    await prisma.orderConfirmationSettings.updateMany({
      where: { companyId: company.id },
      data: { eligibleUserIds: JSON.stringify([agentUser.id]) }
    });

    try {
      const filteredRes = await request(app)
        .get('/api/v1/order-confirmation/eligible-users')
        .set('Authorization', `Bearer ${token}`);

      expect(filteredRes.status).toBe(200);
      expect(filteredRes.body.success).toBe(true);
      expect(filteredRes.body.data.map((u) => u.id)).toEqual([agentUser.id]);

      const allCandidatesRes = await request(app)
        .get('/api/v1/order-confirmation/eligible-users?includeAll=true')
        .set('Authorization', `Bearer ${token}`);

      expect(allCandidatesRes.status).toBe(200);
      expect(allCandidatesRes.body.success).toBe(true);
      const candidateIds = allCandidatesRes.body.data.map((u) => u.id);
      expect(candidateIds).toContain(adminUser.id);
      expect(candidateIds).toContain(agentUser.id);
    } finally {
      await prisma.orderConfirmationSettings.updateMany({
        where: { companyId: company.id },
        data: { eligibleUserIds: JSON.stringify([]) }
      });
    }
  });

  test('GET /queue includes matching orders', async () => {
    const res = await request(app)
      .get('/api/v1/order-confirmation/queue')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const orderNumbers = res.body.data.map((o) => o.orderNumber);
    expect(orderNumbers).toContain(order.orderNumber);
    expect(orderNumbers).toContain(guestOrder.orderNumber);
  });

  test('POST /confirm updates regular and guest orders', async () => {
    const confirmRes = await request(app)
      .post('/api/v1/order-confirmation/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.orderNumber, notes: 'Confirm test' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);

    const confirmGuestRes = await request(app)
      .post('/api/v1/order-confirmation/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: guestOrder.orderNumber, notes: 'Confirm guest test' });

    expect(confirmGuestRes.status).toBe(200);
    expect(confirmGuestRes.body.success).toBe(true);

    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: { status: true, confirmedAt: true }
    });

    expect(updatedOrder.confirmedAt).not.toBeNull();
    expect(updatedOrder.status).toBe('CONFIRMED');

    const updatedGuest = await prisma.guestOrder.findUnique({
      where: { id: guestOrder.id },
      select: { status: true }
    });

    expect(String(updatedGuest.status).toUpperCase()).toBe('CONFIRMED');
  });

  test('POST /assign distributes order manually and stats reflect assignment', async () => {
    const assignRes = await request(app)
      .post('/api/v1/order-confirmation/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ orderId: order.orderNumber, userId: agentUser.id, notes: 'Manual assign', strategy: 'manual' });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.success).toBe(true);

    const assignment = await prisma.orderAssignment.findFirst({
      where: { orderId: order.id, isActive: true }
    });

    expect(assignment).not.toBeNull();
    expect(assignment.assignedTo).toBe(agentUser.id);

    const statsRes = await request(app)
      .get('/api/v1/order-confirmation/stats?strategy=manual')
      .set('Authorization', `Bearer ${token}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.success).toBe(true);
    expect(statsRes.body.data.totals.totalAssigned).toBeGreaterThan(0);
  });
});
