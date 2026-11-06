/**
 * SHIP-T5 Acceptance Tests:
 * 1. إنشاء موظف بكود EMP-001 -> 200؛ إضافة موظفين بكود مكرر -> 409.
 * 2. مسؤول استلام جديد يختار من قائمة الموظفين (contactEmployeeId) -> 201.
 * 3. remittanceDays=["SUNDAY","WEDNESDAY"] + maxDeliveryDays=11 -> يظهران في لوحة الشحن.
 * 4. شحنة عمرها 12 يوم غير مسلّمة -> تظهر في stale.
 * 5. إنشاء تكامل WooCommerce -> 201؛ GET لا يرجّع الأسرار (تأكد من الغياب)؛ test يرجع 200/فشل واضح.
 * 6. webhook أوردر خارجي مرتين بنفس externalOrderId -> أول 201، ثاني 200 بدون تكرار.
 */

const express = require('express');
const request = require('supertest');

// In-memory test store
const store = {
  employees: [],
  policies: {},
  shipments: [],
  pickups: [],
  users: [
    {
      id: 'usr-admin-1',
      companyId: 'comp-t5-test',
      firstName: 'أحمد',
      lastName: 'المدير',
      email: 'admin@maxp.test',
      phone: '01011111111',
      isActive: true,
    },
    {
      id: 'usr-member-2',
      companyId: 'comp-t5-test',
      firstName: 'محمود',
      lastName: 'المنسق',
      email: 'coordinator@maxp.test',
      phone: '01022222222',
      isActive: true,
    },
  ],
  integrations: [],
  orders: [],
  customers: [],
};

const mockPrisma = {
  shippingEmployee: {
    findFirst: jest.fn(async ({ where }) => {
      return store.employees.find((e) => {
        if (where.companyId && e.companyId !== where.companyId) return false;
        if (where.id && e.id !== where.id) return false;
        if (where.employeeCode && e.employeeCode !== where.employeeCode) return false;
        if (where.isActive !== undefined && e.isActive !== where.isActive) return false;
        if (where.id && where.id.not && e.id === where.id.not) return false;
        return true;
      }) || null;
    }),
    findMany: jest.fn(async ({ where = {} }) => {
      return store.employees.filter((e) => {
        if (where.companyId && e.companyId !== where.companyId) return false;
        if (where.isActive !== undefined && e.isActive !== where.isActive) return false;
        return true;
      });
    }),
    create: jest.fn(async ({ data }) => {
      const rec = {
        id: `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      store.employees.push(rec);
      return rec;
    }),
    update: jest.fn(async ({ where, data }) => {
      const idx = store.employees.findIndex((e) => e.id === where.id);
      if (idx === -1) throw new Error('Employee not found');
      store.employees[idx] = { ...store.employees[idx], ...data, updatedAt: new Date() };
      return store.employees[idx];
    }),
    delete: jest.fn(async ({ where }) => {
      store.employees = store.employees.filter((e) => e.id !== where.id);
      return { id: where.id };
    }),
  },
  user: {
    findFirst: jest.fn(async ({ where }) => {
      return store.users.find((u) => {
        if (where.id && u.id !== where.id) return false;
        if (where.companyId && u.companyId !== where.companyId) return false;
        if (where.OR) {
          const matchOr = where.OR.some((clause) => clause.companyId && u.companyId === clause.companyId);
          if (!matchOr) return false;
        }
        return true;
      }) || null;
    }),
    findMany: jest.fn(async () => store.users),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(async ({ where }) => {
      return store.policies[where.companyId] || null;
    }),
    upsert: jest.fn(async ({ where, update, create }) => {
      const cur = store.policies[where.companyId] || { id: `pol-${Date.now()}`, companyId: where.companyId };
      const merged = { ...cur, ...update, ...create, updatedAt: new Date() };
      store.policies[where.companyId] = merged;
      return merged;
    }),
  },
  shipment: {
    findMany: jest.fn(async ({ where }) => {
      return store.shipments.filter((s) => {
        if (where.companyId && s.companyId !== where.companyId) return false;
        if (where.createdAt?.lte && new Date(s.createdAt) > new Date(where.createdAt.lte)) return false;
        if (where.status?.notIn && where.status.notIn.includes(s.status)) return false;
        return true;
      });
    }),
    findFirst: jest.fn(async ({ where }) => {
      return store.shipments.find((s) => {
        if (where.companyId && s.companyId !== where.companyId) return false;
        if (where.clientReference && s.clientReference === where.clientReference) return true;
        if (where.OR) {
          for (const clause of where.OR) {
            if (clause.clientReference && s.clientReference === clause.clientReference) return true;
            if (clause.metadata?.contains && s.metadata && s.metadata.includes('externalOrderId')) return true;
          }
        }
        return false;
      }) || null;
    }),
    create: jest.fn(async ({ data }) => {
      const s = {
        id: `shp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      store.shipments.push(s);
      return s;
    }),
  },
  shipmentEvent: {
    create: jest.fn(async ({ data }) => ({ id: `evt-${Date.now()}`, ...data })),
  },
  pickupRequest: {
    create: jest.fn(async ({ data }) => {
      const p = {
        id: `pkp-${Date.now()}`,
        pickupNumber: `PKP-${Date.now()}`,
        createdAt: new Date(),
        ...data,
      };
      store.pickups.push(p);
      return p;
    }),
  },
  storeIntegration: {
    findUnique: jest.fn(async ({ where }) => {
      return store.integrations.find((i) => i.id === where.id) || null;
    }),
    findFirst: jest.fn(async ({ where }) => {
      return store.integrations.find((i) => {
        if (where.id && i.id !== where.id) return false;
        if (where.companyId && i.companyId !== where.companyId) return false;
        return true;
      }) || null;
    }),
    findMany: jest.fn(async ({ where }) => {
      return store.integrations.filter((i) => i.companyId === where.companyId);
    }),
    create: jest.fn(async ({ data }) => {
      const item = {
        id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      store.integrations.push(item);
      return item;
    }),
    update: jest.fn(async ({ where, data }) => {
      const idx = store.integrations.findIndex((i) => i.id === where.id);
      if (idx === -1) throw new Error('Not found');
      store.integrations[idx] = { ...store.integrations[idx], ...data, updatedAt: new Date() };
      return store.integrations[idx];
    }),
    delete: jest.fn(async ({ where }) => {
      store.integrations = store.integrations.filter((i) => i.id !== where.id);
      return { id: where.id };
    }),
  },
  customer: {
    findFirst: jest.fn(async ({ where }) => {
      return store.customers.find((c) => c.companyId === where.companyId && c.phone === where.phone) || null;
    }),
    create: jest.fn(async ({ data }) => {
      const c = { id: `cst-${Date.now()}`, ...data };
      store.customers.push(c);
      return c;
    }),
  },
  order: {
    create: jest.fn(async ({ data }) => {
      const o = { id: `ord-${Date.now()}`, ...data };
      store.orders.push(o);
      return o;
    }),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'usr-admin-1',
  companyId: 'comp-t5-test',
  role: 'COMPANY_ADMIN',
  name: 'Ahmed Admin',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = mockUser;
    next();
  },
}));

jest.mock('../../middleware/checkAppAccess', () => () => (req, res, next) => next());

const teamRoutes = require('../../routes/teamRoutes');
const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');
const webhookRoutes = require('../../routes/webhookRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/team', teamRoutes);
app.use('/api/v1/shipping-portal', shippingPortalRoutes);
app.use('/shipping-portal', shippingPortalRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

describe('SHIP-T5: Employee Profile, Remittance Policy, and WooCommerce/Shopify Integrations', () => {
  beforeEach(() => {
    store.employees = [];
    store.policies = {};
    store.shipments = [];
    store.pickups = [];
    store.integrations = [];
    store.orders = [];
    store.customers = [];
    jest.clearAllMocks();
  });

  // Acceptance Criterion 1: إنشاء موظف بكود EMP-001 -> 200؛ إضافة موظفين بكود مكرر -> 409
  describe('1. Shipping Employee Profile CRUD & Code Uniqueness', () => {
    it('creates employee with code EMP-001 returning 200, and rejects duplicate code with 409', async () => {
      // Create first employee -> 200
      const res1 = await request(app)
        .post('/api/v1/team/employees')
        .send({
          employeeCode: 'EMP-001',
          fullName: 'محمود حسن',
          jobTitle: 'مسؤول استلام وشحن',
          personalPhone: '01011223344',
          workPhone: '01222334455',
        });

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.employee.employeeCode).toBe('EMP-001');
      expect(res1.body.employee.fullName).toBe('محمود حسن');

      // Create duplicate employee with same code -> 409
      const res2 = await request(app)
        .post('/api/v1/team/employees')
        .send({
          employeeCode: 'EMP-001',
          fullName: 'أحمد علي',
          jobTitle: 'مندوب تسليم',
        });

      expect(res2.status).toBe(409);
      expect(res2.body.success).toBe(false);
      expect(res2.body.code).toBe('DUPLICATE_EMPLOYEE_CODE');
    });

    it('links and unlinks an employee to a user account', async () => {
      // First create employee
      const created = await request(app)
        .post('/api/v1/team/employees')
        .send({
          employeeCode: 'EMP-002',
          fullName: 'طارق سامي',
          jobTitle: 'مدير عمليات',
        });
      const empId = created.body.employee.id;

      // Link to user-member-2 -> 200
      const linkRes = await request(app)
        .post(`/api/v1/team/employees/${empId}/link`)
        .send({ userId: 'usr-member-2' });

      expect(linkRes.status).toBe(200);
      expect(linkRes.body.employee.userId).toBe('usr-member-2');

      // Unlink -> 200
      const unlinkRes = await request(app)
        .post(`/api/v1/team/employees/${empId}/unlink`);

      expect(unlinkRes.status).toBe(200);
      expect(unlinkRes.body.employee.userId).toBeNull();
    });
  });

  // Acceptance Criterion 2: مسؤول استلام جديد يختار من قائمة الموظفين (contactEmployeeId) -> 201
  describe('2. Pickup Request with contactEmployeeId', () => {
    it('creates pickup request with contactEmployeeId returning 201 and resolves employee details', async () => {
      // Create employee
      const emp = await request(app)
        .post('/api/v1/team/employees')
        .send({
          employeeCode: 'EMP-PICKUP',
          fullName: 'كريم عادل',
          jobTitle: 'مسؤول استلام البضائع',
          workPhone: '01122334455',
        });
      const employeeId = emp.body.employee.id;

      // Create pickup request using contactEmployeeId
      const pickupRes = await request(app)
        .post('/api/v1/shipping-portal/pickups')
        .send({
          contactEmployeeId: employeeId,
          scheduledDate: '2026-11-15',
          pickupAddress: 'شارع الهرم الرئيسي، الجيزة',
          governorate: 'الجيزة',
          expectedParcels: 5,
        });

      expect(pickupRes.status).toBe(201);
      expect(pickupRes.body.success).toBe(true);
      expect(pickupRes.body.pickup.contactName).toBe('كريم عادل');
      expect(pickupRes.body.pickup.contactPhone).toBe('01122334455');
    });
  });

  // Acceptance Criterion 3: remittanceDays=["SUNDAY","WEDNESDAY"] + maxDeliveryDays=11 -> يظهران في لوحة الشحن
  describe('3. Remittance Days & Max Delivery Days in Policy Settings', () => {
    it('saves and retrieves policy settings with remittanceDays and maxDeliveryDays', async () => {
      // Update policy settings
      const updateRes = await request(app)
        .put('/api/v1/shipping-portal/policy-settings')
        .send({
          remittanceDays: ['SUNDAY', 'WEDNESDAY'],
          maxDeliveryDays: 11,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);

      // Fetch policy settings
      const getRes = await request(app)
        .get('/api/v1/shipping-portal/policy-settings');

      expect(getRes.status).toBe(200);
      expect(getRes.body.success).toBe(true);
      expect(getRes.body.policy.remittanceDays).toEqual(['SUNDAY', 'WEDNESDAY']);
      expect(getRes.body.policy.maxDeliveryDays).toBe(11);
    });
  });

  // Acceptance Criterion 4: شحنة عمرها 12 يوم غير مسلّمة -> تظهر في stale
  describe('4. Stale Shipments Alert (>maxDeliveryDays)', () => {
    it('detects 12-day-old non-delivered shipment in /shipments/stale while delivered shipments are excluded', async () => {
      // Configure maxDeliveryDays = 11
      store.policies['comp-t5-test'] = {
        companyId: 'comp-t5-test',
        maxDeliveryDays: 11,
      };

      const now = Date.now();
      const twelveDaysAgo = new Date(now - 12 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000);
      const fifteenDaysAgo = new Date(now - 15 * 24 * 60 * 60 * 1000);

      // Stale shipment: 12 days old, PENDING
      store.shipments.push({
        id: 'shp-stale-1',
        companyId: 'comp-t5-test',
        trackingNumber: 'TRK-STALE-1',
        status: 'PENDING',
        recipientName: 'عميل متأخر',
        recipientPhone: '01000000001',
        createdAt: twelveDaysAgo,
      });

      // Fresh shipment: 5 days old, OUT_FOR_DELIVERY
      store.shipments.push({
        id: 'shp-fresh-2',
        companyId: 'comp-t5-test',
        trackingNumber: 'TRK-FRESH-2',
        status: 'OUT_FOR_DELIVERY',
        recipientName: 'عميل جديد',
        recipientPhone: '01000000002',
        createdAt: fiveDaysAgo,
      });

      // Old delivered shipment: 15 days old, DELIVERED (should NOT be stale)
      store.shipments.push({
        id: 'shp-delivered-3',
        companyId: 'comp-t5-test',
        trackingNumber: 'TRK-DELIVERED-3',
        status: 'DELIVERED',
        recipientName: 'عميل مستلم',
        recipientPhone: '01000000003',
        createdAt: fifteenDaysAgo,
      });

      const res = await request(app)
        .get('/api/v1/shipping-portal/shipments/stale');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.shipments[0].trackingNumber).toBe('TRK-STALE-1');
      expect(res.body.shipments[0].isStale).toBe(true);
    });
  });

  // Acceptance Criterion 5: إنشاء تكامل WooCommerce -> 201؛ GET لا يرجّع الأسرار؛ test يرجع 200/فشل واضح
  describe('5. WooCommerce / Shopify Store Integrations with Secret Encryption & Masking', () => {
    it('creates WooCommerce integration, masks secrets in GET, and tests connection', async () => {
      // 1. Create WooCommerce integration -> 201
      const createRes = await request(app)
        .post('/shipping-portal/integrations')
        .send({
          platform: 'WOOCOMMERCE',
          storeUrl: 'https://store.example.com',
          consumerKey: 'ck_super_secret_key_123',
          consumerSecret: 'cs_super_secret_key_456',
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.integration.platform).toBe('WOOCOMMERCE');
      expect(createRes.body.integration.storeUrl).toBe('https://store.example.com');
      // Ensure zero secrets returned in POST response
      expect(createRes.body.integration.consumerKey).toBeUndefined();
      expect(createRes.body.integration.consumerSecret).toBeUndefined();
      expect(createRes.body.integration.hasConsumerKey).toBe(true);
      expect(createRes.body.integration.hasConsumerSecret).toBe(true);

      const integrationId = createRes.body.integration.id;

      // 2. GET list -> must NOT return secrets
      const listRes = await request(app)
        .get('/shipping-portal/integrations');

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBe(1);
      const item = listRes.body.data[0];
      expect(item.consumerKey).toBeUndefined();
      expect(item.consumerSecret).toBeUndefined();
      expect(item.accessToken).toBeUndefined();
      expect(item.hasConsumerKey).toBe(true);

      // 3. Test connection -> 200
      const testRes = await request(app)
        .post(`/shipping-portal/integrations/${integrationId}/test`);

      expect(testRes.status).toBe(200);
      expect(testRes.body.success).toBe(true);
      expect(testRes.body.message).toContain('تم التحقق بنجاح');
    });
  });

  // Acceptance Criterion 6: webhook أوردر خارجي مرتين بنفس externalOrderId -> أول 201، ثاني 200 بدون تكرار
  describe('6. External Store Webhook Ingestion & Idempotency', () => {
    it('ingests external order on first call returning 201, and second call returns 200 duplicate without recreation', async () => {
      // First create active store integration
      const createRes = await request(app)
        .post('/shipping-portal/integrations')
        .send({
          platform: 'WOOCOMMERCE',
          storeUrl: 'https://store.fashion.com',
          consumerKey: 'ck_test_123',
          consumerSecret: 'cs_test_456',
        });
      const integrationId = createRes.body.integration.id;

      const orderPayload = {
        externalOrderId: 'ORD-WOO-778899',
        customerName: 'فاطمة الزهراء',
        customerPhone: '01099887766',
        governorate: 'الإسكندرية',
        city: 'سموحة',
        address: 'شارع فوزي معاذ عمارة 14',
        total: 850,
        codAmount: 850,
        notes: 'يرجى الاتصال قبل التسليم',
      };

      // Call 1 -> 201 (Created)
      const res1 = await request(app)
        .post(`/api/v1/webhooks/store/${integrationId}/order`)
        .send(orderPayload);

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.externalOrderId).toBe('ORD-WOO-778899');
      expect(res1.body.order).toBeDefined();
      expect(res1.body.shipment).toBeDefined();
      expect(res1.body.shipment.recipientName).toBe('فاطمة الزهراء');

      const initialOrderCount = store.orders.length;
      const initialShipmentCount = store.shipments.length;

      // Call 2 with identical externalOrderId -> 200 (Idempotent duplicate)
      const res2 = await request(app)
        .post(`/api/v1/webhooks/store/${integrationId}/order`)
        .send(orderPayload);

      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.duplicate).toBe(true);
      expect(res2.body.message).toContain('idempotent');

      // Verify no duplicates created in store
      expect(store.orders.length).toBe(initialOrderCount);
      expect(store.shipments.length).toBe(initialShipmentCount);
    });
  });
});
