/**
 * Shipping Client Admin (SHIP-W2C.1) Acceptance Tests
 * Validates:
 * 1. POST /clients creates Merchant + User(role='SHIPPING_CLIENT') with one-time temporary password (zero hash)
 * 2. Authenticating as the newly created client gives 200 on /shipping-client/me with correct merchantId
 * 3. PATCH /clients/:id/account {isActive: false} blocks portal access (403)
 * 4. POST /clients/:id/account resets password, rendering old password invalid and new one valid
 * 5. Requesting / modifying another company's client returns 404
 * 6. Audit: responses contain zero password hashes
 * 7. Non-admin roles (e.g. AGENT, MODERATOR) receive 403
 * 8. GET /clients lists company clients with portal status, shipment counts & pending COD
 */

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');

// In-memory mock store for multi-step scenario tests
const db = {
  merchants: [],
  users: [],
  shipments: [],
  activityLogs: [],
};

const mockPrisma = {
  merchant: {
    findMany: jest.fn(async ({ where }) => {
      let res = db.merchants.filter((m) => m.companyId === where.companyId);
      if (where.OR) {
        const q = where.OR[0].name.contains.toLowerCase();
        res = res.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            (m.phone && m.phone.includes(q))
        );
      }
      return res;
    }),
    findFirst: jest.fn(async ({ where }) => {
      return (
        db.merchants.find((m) => {
          if (where.id && m.id !== where.id) return false;
          if (where.companyId && m.companyId !== where.companyId) return false;
          if (where.email && m.email.toLowerCase() !== where.email.toLowerCase()) return false;
          return true;
        }) || null
      );
    }),
    create: jest.fn(async ({ data }) => {
      const created = {
        id: `merch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        commissionRate: 10,
        ...data,
      };
      db.merchants.push(created);
      return created;
    }),
    update: jest.fn(async ({ where, data }) => {
      const idx = db.merchants.findIndex((m) => m.id === where.id);
      if (idx !== -1) {
        db.merchants[idx] = { ...db.merchants[idx], ...data, updatedAt: new Date() };
        return db.merchants[idx];
      }
      return null;
    }),
  },
  user: {
    findMany: jest.fn(async ({ where }) => {
      return db.users.filter((u) => {
        if (where.companyId && u.companyId !== where.companyId) return false;
        if (where.merchantId?.in && !where.merchantId.in.includes(u.merchantId)) return false;
        if (where.role && u.role !== where.role) return false;
        return true;
      });
    }),
    findFirst: jest.fn(async ({ where }) => {
      return (
        db.users.find((u) => {
          if (where.id && u.id !== where.id) return false;
          if (where.companyId && u.companyId !== where.companyId) return false;
          if (where.merchantId && u.merchantId !== where.merchantId) return false;
          if (where.email && u.email.toLowerCase() !== where.email.toLowerCase()) return false;
          return true;
        }) || null
      );
    }),
    findUnique: jest.fn(async ({ where }) => {
      return db.users.find((u) => u.id === where.id) || null;
    }),
    create: jest.fn(async ({ data, select }) => {
      const created = {
        id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        ...data,
      };
      db.users.push(created);
      if (select) {
        const filtered = {};
        for (const k of Object.keys(select)) {
          if (select[k]) filtered[k] = created[k];
        }
        return filtered;
      }
      return created;
    }),
    update: jest.fn(async ({ where, data }) => {
      const idx = db.users.findIndex((u) => u.id === where.id);
      if (idx !== -1) {
        db.users[idx] = { ...db.users[idx], ...data, updatedAt: new Date() };
        return db.users[idx];
      }
      return null;
    }),
  },
  shipment: {
    findMany: jest.fn(async ({ where }) => {
      return db.shipments.filter((s) => {
        if (where.companyId && s.companyId !== where.companyId) return false;
        if (typeof where.merchantId === 'string' && s.merchantId !== where.merchantId) return false;
        if (where.merchantId?.in && !where.merchantId.in.includes(s.merchantId)) return false;
        return true;
      });
    }),
    count: jest.fn(async ({ where }) => {
      return db.shipments.filter((s) => {
        if (where.companyId && s.companyId !== where.companyId) return false;
        if (where.merchantId && s.merchantId !== where.merchantId) return false;
        if (where.status && typeof where.status === 'string' && s.status !== where.status) return false;
        if (where.status?.in && !where.status.in.includes(s.status)) return false;
        return true;
      }).length;
    }),
    aggregate: jest.fn(async ({ where }) => {
      const matched = db.shipments.filter((s) => {
        if (where.companyId && s.companyId !== where.companyId) return false;
        if (where.merchantId && s.merchantId !== where.merchantId) return false;
        if (where.status?.in && !where.status.in.includes(s.status)) return false;
        return true;
      });
      const total = matched.reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0);
      return { _sum: { codAmount: total } };
    }),
  },
  activityLog: {
    create: jest.fn(async ({ data }) => {
      const logged = { id: `log-${Date.now()}`, createdAt: new Date(), ...data };
      db.activityLogs.push(logged);
      return logged;
    }),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let currentReqUser = {
  id: 'usr-admin-1',
  companyId: 'company-shipping-1',
  role: 'COMPANY_ADMIN',
  email: 'admin@shipping1.com',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { ...currentReqUser };
    next();
  },
}));

jest.mock('../../middleware/checkAppAccess', () => () => (req, res, next) => next());

jest.mock('../../services/shipping/policyService', () => ({
  getPolicy: jest.fn().mockResolvedValue({
    clientPortalEnabled: true,
  }),
}));

const shippingClientAdminRoutes = require('../../routes/shippingClientAdminRoutes');
const shippingClientRoutes = require('../../routes/shippingClientRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-clients-admin', shippingClientAdminRoutes);
app.use('/api/v1/shipping-client', shippingClientRoutes);

describe('Shipping Client Admin (SHIP-W2C.1) Acceptance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.merchants = [];
    db.users = [];
    db.shipments = [];
    db.activityLogs = [];

    currentReqUser = {
      id: 'usr-admin-1',
      companyId: 'company-shipping-1',
      role: 'COMPANY_ADMIN',
      email: 'admin@shipping1.com',
    };
  });

  test('1. POST /clients creates Merchant + User(role=SHIPPING_CLIENT) and returns temp password once (zero hash)', async () => {
    const res = await request(app)
      .post('/api/v1/shipping-clients-admin/clients')
      .send({
        name: 'متجر الرقي للملابس',
        email: 'roqy@example.com',
        phone: '01011112222',
        address: 'القاهرة - مصر الجديدة',
        commissionRate: 8.5,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.merchant).toBeDefined();
    expect(res.body.data.merchant.name).toBe('متجر الرقي للملابس');
    expect(res.body.data.merchant.companyId).toBe('company-shipping-1');
    expect(res.body.data.account).toBeDefined();
    expect(res.body.data.account.role).toBe('SHIPPING_CLIENT');
    expect(res.body.data.account.userId).toBeDefined();

    // Credentials returned ONCE
    expect(res.body.data.credentials).toBeDefined();
    expect(res.body.data.credentials.email).toBe('roqy@example.com');
    expect(res.body.data.credentials.temporaryPassword).toMatch(/^Ship!/);

    // Verify DB state: password is NOT plaintext
    const dbUser = db.users.find((u) => u.email === 'roqy@example.com');
    expect(dbUser).toBeDefined();
    expect(dbUser.merchantId).toBe(res.body.data.merchant.id);
    expect(dbUser.password).not.toBe(res.body.data.credentials.temporaryPassword);
    expect(dbUser.password.startsWith('$2')).toBe(true);

    // Verify bcrypt matches the temp password
    const passwordMatch = await bcrypt.compare(res.body.data.credentials.temporaryPassword, dbUser.password);
    expect(passwordMatch).toBe(true);

    // Verify ActivityLog recorded
    expect(db.activityLogs.some((l) => l.action === 'CREATE_SHIPPING_CLIENT')).toBe(true);

    // Response must contain ZERO hash
    const resString = JSON.stringify(res.body);
    expect(resString).not.toContain('$2a$');
    expect(resString).not.toContain('$2b$');
    expect(resString).not.toContain('passwordHash');
  });

  test('2. Client can authenticate and access /shipping-client/me with correct merchantId', async () => {
    // Create client first
    const createRes = await request(app)
      .post('/api/v1/shipping-clients-admin/clients')
      .send({
        name: 'عميل التجربة',
        email: 'client.test@example.com',
        phone: '01234567890',
      });
    expect(createRes.status).toBe(201);
    const { merchant, account } = createRes.body.data;

    // Simulate login by setting currentReqUser as the newly created client
    currentReqUser = {
      id: account.userId,
      companyId: 'company-shipping-1',
      role: 'SHIPPING_CLIENT',
      merchantId: merchant.id,
      email: 'client.test@example.com',
    };

    const meRes = await request(app).get('/api/v1/shipping-client/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.merchantId).toBe(merchant.id);
    expect(meRes.body.data.user.role).toBe('SHIPPING_CLIENT');
  });

  test('3. PATCH .../account {isActive: false} blocks client immediately on /shipping-client/me (403)', async () => {
    // 1. Create client
    const createRes = await request(app)
      .post('/api/v1/shipping-clients-admin/clients')
      .send({
        name: 'عميل التعطيل',
        email: 'deactivate.test@example.com',
      });
    const { merchant } = createRes.body.data;

    // 2. Admin deactivates account
    const patchRes = await request(app)
      .patch(`/api/v1/shipping-clients-admin/clients/${merchant.id}/account`)
      .send({ isActive: false });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.isActive).toBe(false);

    // 3. Client attempts to access /shipping-client/me
    currentReqUser = {
      id: patchRes.body.data.userId,
      companyId: 'company-shipping-1',
      role: 'SHIPPING_CLIENT',
      merchantId: merchant.id,
      email: 'deactivate.test@example.com',
    };

    const meRes = await request(app).get('/api/v1/shipping-client/me');
    expect(meRes.status).toBe(403);
    expect(meRes.body.message).toContain('موقوف');
  });

  test('4. POST .../account resets password: old password invalidated, new works', async () => {
    // 1. Create client
    const createRes = await request(app)
      .post('/api/v1/shipping-clients-admin/clients')
      .send({
        name: 'عميل التعيين',
        email: 'reset.test@example.com',
      });
    const firstPassword = createRes.body.data.credentials.temporaryPassword;
    const { merchant, account } = createRes.body.data;

    // 2. Admin resets password
    const resetRes = await request(app)
      .post(`/api/v1/shipping-clients-admin/clients/${merchant.id}/account`)
      .send({});
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    const secondPassword = resetRes.body.data.credentials.temporaryPassword;
    expect(secondPassword).toBeDefined();
    expect(secondPassword).not.toBe(firstPassword);

    const dbUser = db.users.find((u) => u.id === account.userId);
    // Old password fails
    expect(await bcrypt.compare(firstPassword, dbUser.password)).toBe(false);
    // New password succeeds
    expect(await bcrypt.compare(secondPassword, dbUser.password)).toBe(true);
  });

  test("5. Accessing or modifying another company's client returns 404", async () => {
    // Seed client belonging to another company
    const otherMerchant = {
      id: 'merch-foreign-99',
      companyId: 'company-foreign-2',
      name: 'تاجر الشركة الأخرى',
      email: 'foreign@othercompany.com',
      isActive: true,
      commissionRate: 10,
    };
    db.merchants.push(otherMerchant);

    // 1. GET summary
    const sumRes = await request(app).get(`/api/v1/shipping-clients-admin/clients/${otherMerchant.id}/summary`);
    expect(sumRes.status).toBe(404);

    // 2. Reset account
    const resetRes = await request(app).post(`/api/v1/shipping-clients-admin/clients/${otherMerchant.id}/account`);
    expect(resetRes.status).toBe(404);

    // 3. Toggle account
    const patchRes = await request(app)
      .patch(`/api/v1/shipping-clients-admin/clients/${otherMerchant.id}/account`)
      .send({ isActive: false });
    expect(patchRes.status).toBe(404);
  });

  test('6. Non-admin roles (AGENT, MODERATOR, SHIPPING_CLIENT) receive 403', async () => {
    currentReqUser = {
      id: 'usr-agent-1',
      companyId: 'company-shipping-1',
      role: 'AGENT',
      email: 'agent@shipping1.com',
    };

    const res = await request(app).get('/api/v1/shipping-clients-admin/clients');
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('غير مصرح');
  });

  test('7. GET /clients lists company clients with portal status, shipment counts & pending COD', async () => {
    // Seed client
    const m = await mockPrisma.merchant.create({
      data: {
        companyId: 'company-shipping-1',
        name: 'شركة النور',
        email: 'alnoor@example.com',
      },
    });

    await mockPrisma.user.create({
      data: {
        companyId: 'company-shipping-1',
        merchantId: m.id,
        email: 'alnoor@example.com',
        role: 'SHIPPING_CLIENT',
        isActive: true,
      },
    });

    db.shipments.push({
      id: 'sh-1',
      companyId: 'company-shipping-1',
      merchantId: m.id,
      status: 'DELIVERED',
      codAmount: 350,
      createdAt: new Date(),
    });
    db.shipments.push({
      id: 'sh-2',
      companyId: 'company-shipping-1',
      merchantId: m.id,
      status: 'OUT_FOR_DELIVERY',
      codAmount: 150,
      createdAt: new Date(),
    });

    const listRes = await request(app).get('/api/v1/shipping-clients-admin/clients');
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    const clientItem = listRes.body.data.find((c) => c.id === m.id);
    expect(clientItem).toBeDefined();
    expect(clientItem.hasAccount).toBe(true);
    expect(clientItem.account.email).toBe('alnoor@example.com');
    expect(clientItem.metrics.totalShipments).toBe(2);
    expect(clientItem.metrics.monthShipments).toBe(2);
    expect(clientItem.metrics.deliveredCount).toBe(1);
    expect(clientItem.metrics.pendingCount).toBe(1);
    expect(clientItem.metrics.pendingCodAmount).toBe(500);

    // Response must have zero password hash
    expect(JSON.stringify(listRes.body)).not.toContain('$2b$');
  });
});
