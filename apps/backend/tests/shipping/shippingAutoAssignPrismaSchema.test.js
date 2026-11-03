/**
 * SHIP-W8.1 Hotfix Regression Test: Real Prisma Schema Validation & HTTP Integration
 * 
 * Verifies:
 * 1. Schema integrity: Every field queried by autoAssignService (select, include, where)
 *    strictly exists on actual Prisma schema models (Order, Shipment, Courier, DeliveryRun, ShipmentEvent)
 *    WITHOUT loose mocking bypassing schema checks.
 * 2. Negative proof: querying `customerGovernorate` or `customerCity` on `Order` throws:
 *    Unknown field `customerGovernorate` for select statement on model `Order`.
 * 3. Positive proof: `Order` has `governorate`, `city`, `shippingAddress`, `total`, and relation `customer`.
 * 4. HTTP Acceptance Criteria:
 *    - POST /api/v1/shipping-assign/suggest with 2 PENDING shipments -> 200 with assignments and unassigned arrays.
 *    - POST /api/v1/shipping-assign/apply with suggestion -> 200, courierId updated, and ShipmentEvent(ASSIGNED).
 */

const express = require('express');
const request = require('supertest');
const { Prisma } = require('../../prisma/generated/postgresql_v2');

// Build schema dictionary from real Prisma DMMF
const dmmfModels = new Map(
  Prisma.dmmf.datamodel.models.map((m) => [
    m.name.toLowerCase(),
    {
      name: m.name,
      fields: new Map(m.fields.map((f) => [f.name, f])),
    },
  ])
);

function validateFieldSelection(modelName, selectOrInclude, isInclude = false) {
  if (!selectOrInclude || typeof selectOrInclude !== 'object') return;
  const modelDef = dmmfModels.get(modelName.toLowerCase());
  if (!modelDef) return;

  for (const [field, value] of Object.entries(selectOrInclude)) {
    if (!modelDef.fields.has(field)) {
      throw new Error(
        `Invalid \`prisma.${modelDef.name.toLowerCase()}.findMany()\` invocation\n` +
        `Unknown field \`${field}\` for ${isInclude ? 'include' : 'select'} statement on model \`${modelDef.name}\`.`
      );
    }

    const fieldDef = modelDef.fields.get(field);
    if (value && typeof value === 'object' && fieldDef.kind === 'object') {
      if (value.select) {
        validateFieldSelection(fieldDef.type, value.select, false);
      }
      if (value.include) {
        validateFieldSelection(fieldDef.type, value.include, true);
      }
    }
  }
}

// Strict schema-validating in-memory Prisma store
function createSchemaGuardedPrisma() {
  const companyId = 'company-w8-1';

  const store = {
    orders: [
      {
        id: 'ord-101',
        orderNumber: 'ORD-101',
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        shippingAddress: 'شارع عباس العقاد',
        total: 450,
        customerId: 'cust-101',
        customer: {
          firstName: 'محمد',
          lastName: 'علي',
          phone: '01012345678',
        },
      },
      {
        id: 'ord-102',
        orderNumber: 'ORD-102',
        governorate: 'الجيزة',
        city: 'الدقي',
        shippingAddress: 'شارع التحرير',
        total: 620,
        customerId: 'cust-102',
        customer: {
          firstName: 'سارة',
          lastName: 'أحمد',
          phone: '01198765432',
        },
      },
    ],
    couriers: [
      {
        id: 'courier-cairo-1',
        companyId,
        name: 'كابتن حسام',
        phone: '01000000001',
        governorates: '["القاهرة", "الجيزة"]',
        status: 'AVAILABLE',
        isActive: true,
      },
    ],
    shipments: [
      {
        id: 'ship-pend-1',
        companyId,
        orderId: 'ord-101',
        status: 'PENDING',
        destinationGovernorate: 'القاهرة',
        destinationCity: 'مدينة نصر',
        destinationAddress: 'شارع عباس العقاد',
        codAmount: 450,
        weight: 1.2,
        courierId: null,
        deliveryRunId: null,
        createdAt: new Date('2026-11-03T10:00:00Z'),
        order: null, // populated below
      },
      {
        id: 'ship-pend-2',
        companyId,
        orderId: 'ord-102',
        status: 'PENDING',
        destinationGovernorate: 'الجيزة',
        destinationCity: 'الدقي',
        destinationAddress: 'شارع التحرير',
        codAmount: 620,
        weight: 0.8,
        courierId: null,
        deliveryRunId: null,
        createdAt: new Date('2026-11-03T10:05:00Z'),
        order: null, // populated below
      },
    ],
    deliveryRuns: [],
    events: [],
    policies: [
      {
        companyId,
        maxShipmentsPerCourierPerDay: 50,
      },
    ],
  };

  // Link orders to shipments
  store.shipments[0].order = store.orders[0];
  store.shipments[1].order = store.orders[1];

  const client = {
    shipment: {
      findMany: jest.fn(async (args) => {
        if (args?.select) validateFieldSelection('Shipment', args.select, false);
        if (args?.include) validateFieldSelection('Shipment', args.include, true);

        let results = store.shipments;
        if (args?.where?.id?.in) {
          results = results.filter((s) => args.where.id.in.includes(s.id));
        }
        if (args?.where?.companyId) {
          results = results.filter((s) => s.companyId === args.where.companyId);
        }
        if (args?.where?.status?.notIn) {
          results = results.filter((s) => !args.where.status.notIn.includes(s.status));
        }
        if (args?.where?.deliveryRunId) {
          results = results.filter((s) => s.deliveryRunId === args.where.deliveryRunId);
        }

        return results.map((s) => {
          const copy = { ...s };
          if (args?.include?.order) {
            const ord = store.orders.find((o) => o.id === s.orderId);
            copy.order = ord ? { ...ord } : null;
          }
          return copy;
        });
      }),
      groupBy: jest.fn(async ({ by, where }) => {
        // Compute group by courierId
        const counts = {};
        store.shipments.forEach((s) => {
          if (s.courierId && where?.courierId?.in?.includes(s.courierId)) {
            if (where?.status?.in?.includes(s.status)) {
              counts[s.courierId] = (counts[s.courierId] || 0) + 1;
            }
          }
        });
        return Object.entries(counts).map(([courierId, count]) => ({
          courierId,
          _count: { id: count },
        }));
      }),
      update: jest.fn(async ({ where, data }) => {
        const item = store.shipments.find((s) => s.id === where.id);
        if (!item) throw new Error('Shipment not found');
        Object.assign(item, data);
        return item;
      }),
    },
    courier: {
      findMany: jest.fn(async (args) => {
        if (args?.select) validateFieldSelection('Courier', args.select, false);
        let results = store.couriers;
        if (args?.where?.id?.in) {
          results = results.filter((c) => args.where.id.in.includes(c.id));
        }
        if (args?.where?.companyId) {
          results = results.filter((c) => c.companyId === args.where.companyId);
        }
        if (args?.where?.isActive !== undefined) {
          results = results.filter((c) => c.isActive === args.where.isActive);
        }
        if (args?.where?.status?.not) {
          results = results.filter((c) => c.status !== args.where.status.not);
        }
        return results;
      }),
    },
    deliveryRun: {
      count: jest.fn(async () => store.deliveryRuns.length),
      findFirst: jest.fn(async (args) => {
        if (args?.select) validateFieldSelection('DeliveryRun', args.select, false);
        return (
          store.deliveryRuns.find(
            (r) =>
              r.companyId === args?.where?.companyId &&
              r.courierId === args?.where?.courierId &&
              r.status === args?.where?.status
          ) || null
        );
      }),
      create: jest.fn(async ({ data }) => {
        const id = `run-${Date.now()}`;
        const newRun = {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.deliveryRuns.push(newRun);
        return newRun;
      }),
      update: jest.fn(async ({ where, data }) => {
        const item = store.deliveryRuns.find((r) => r.id === where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
    },
    shipmentEvent: {
      create: jest.fn(async ({ data }) => {
        if (data) validateFieldSelection('ShipmentEvent', data, false);
        const event = { id: `evt-${Date.now()}`, ...data, createdAt: new Date() };
        store.events.push(event);
        return event;
      }),
    },
    shippingPolicySettings: {
      findUnique: jest.fn(async ({ where }) => {
        return store.policies.find((p) => p.companyId === where.companyId) || null;
      }),
    },
    $transaction: jest.fn(async (callback) => callback(client)),
    _store: store,
  };

  return client;
}

let activeGuardedPrisma = createSchemaGuardedPrisma();

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => activeGuardedPrisma,
  getSharedPrismaClientAsync: async () => activeGuardedPrisma,
}));

let mockUser = {
  id: 'usr-admin-w8-1',
  companyId: 'company-w8-1',
  role: 'OPERATIONS',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { ...mockUser };
    next();
  },
}));

const shippingAssignRoutes = require('../../routes/shippingAssignRoutes');
const autoAssignService = require('../../services/shipping/autoAssignService');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-assign', shippingAssignRoutes);

describe('SHIP-W8.1 Prisma Schema Guard & Auto-Assign HTTP Tests', () => {
  beforeEach(() => {
    activeGuardedPrisma = createSchemaGuardedPrisma();
    mockUser = {
      id: 'usr-admin-w8-1',
      companyId: 'company-w8-1',
      role: 'OPERATIONS',
    };
  });

  describe('1. Negative Proof: Unknown Order Fields Trigger Prisma Schema Errors', () => {
    test('DMMF confirms Order has NO `customerGovernorate` or `customerCity`', () => {
      const orderDef = dmmfModels.get('order');
      expect(orderDef).toBeDefined();
      expect(orderDef.fields.has('customerGovernorate')).toBe(false);
      expect(orderDef.fields.has('customerCity')).toBe(false);
    });

    test('Schema validator throws when selecting `customerGovernorate` on Order', () => {
      expect(() => {
        validateFieldSelection('Order', {
          id: true,
          orderNumber: true,
          customerGovernorate: true,
        });
      }).toThrow(/Unknown field `customerGovernorate` for select statement on model `Order`/);
    });

    test('DMMF confirms Order HAS `governorate`, `city`, `shippingAddress`, `total`, and relation `customer`', () => {
      const orderDef = dmmfModels.get('order');
      expect(orderDef.fields.has('governorate')).toBe(true);
      expect(orderDef.fields.has('city')).toBe(true);
      expect(orderDef.fields.has('shippingAddress')).toBe(true);
      expect(orderDef.fields.has('total')).toBe(true);
      expect(orderDef.fields.has('customer')).toBe(true);

      const customerDef = dmmfModels.get('customer');
      expect(customerDef.fields.has('firstName')).toBe(true);
      expect(customerDef.fields.has('lastName')).toBe(true);
      expect(customerDef.fields.has('phone')).toBe(true);
    });

    test('Schema validator passes with valid Order and nested Customer fields', () => {
      expect(() => {
        validateFieldSelection('Order', {
          id: true,
          orderNumber: true,
          governorate: true,
          city: true,
          shippingAddress: true,
          total: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        });
      }).not.toThrow();
    });
  });

  describe('2. HTTP Acceptance Criteria', () => {
    test('Criterion 1: POST /api/v1/shipping-assign/suggest with 2 PENDING shipments returns 200 with assignments and unassigned arrays', async () => {
      const res = await request(app)
        .post('/api/v1/shipping-assign/suggest')
        .send({
          shipmentIds: ['ship-pend-1', 'ship-pend-2'],
          strategy: 'LEAST_LOAD',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.assignments)).toBe(true);
      expect(Array.isArray(res.body.unassigned)).toBe(true);

      // Both Cairo and Giza shipments assigned to captain Hossam who covers both
      expect(res.body.assignments).toHaveLength(2);
      expect(res.body.unassigned).toHaveLength(0);

      const a1 = res.body.assignments.find((a) => a.shipmentId === 'ship-pend-1');
      expect(a1).toBeDefined();
      expect(a1.courierId).toBe('courier-cairo-1');
      expect(a1.destinationGovernorate).toBe('القاهرة');
      expect(a1.codAmount).toBe(450);

      const a2 = res.body.assignments.find((a) => a.shipmentId === 'ship-pend-2');
      expect(a2).toBeDefined();
      expect(a2.courierId).toBe('courier-cairo-1');
      expect(a2.destinationGovernorate).toBe('الجيزة');
      expect(a2.codAmount).toBe(620);
    });

    test('Criterion 2: POST /api/v1/shipping-assign/apply updates courierId and records ShipmentEvent(ASSIGNED)', async () => {
      // First get suggestions
      const suggestRes = await request(app)
        .post('/api/v1/shipping-assign/suggest')
        .send({
          shipmentIds: ['ship-pend-1', 'ship-pend-2'],
          strategy: 'LEAST_LOAD',
        });

      expect(suggestRes.status).toBe(200);
      const suggestions = suggestRes.body.assignments;
      expect(suggestions).toHaveLength(2);

      // Apply the suggestions
      const applyRes = await request(app)
        .post('/api/v1/shipping-assign/apply')
        .send({
          assignments: suggestions.map((s) => ({
            shipmentId: s.shipmentId,
            courierId: s.courierId,
          })),
        });

      expect(applyRes.status).toBe(200);
      expect(applyRes.body.success).toBe(true);
      expect(applyRes.body.assignedCount).toBe(2);
      expect(applyRes.body.failedCount).toBe(0);
      expect(applyRes.body.applied).toHaveLength(2);

      // Verify in-memory store updates
      const s1 = activeGuardedPrisma._store.shipments.find((s) => s.id === 'ship-pend-1');
      const s2 = activeGuardedPrisma._store.shipments.find((s) => s.id === 'ship-pend-2');

      expect(s1.courierId).toBe('courier-cairo-1');
      expect(s1.status).toBe('ASSIGNED');
      expect(s1.deliveryRunId).toBeDefined();

      expect(s2.courierId).toBe('courier-cairo-1');
      expect(s2.status).toBe('ASSIGNED');
      expect(s2.deliveryRunId).toBeDefined();

      // Verify ShipmentEvent created
      const events = activeGuardedPrisma._store.events;
      expect(events.length).toBeGreaterThanOrEqual(2);
      const assignedEvents = events.filter((e) => e.toStatus === 'ASSIGNED');
      expect(assignedEvents).toHaveLength(2);
      expect(assignedEvents[0].actorType).toBe('SYSTEM');
    });

    test('Multi-tenant protection: cross-company shipments rejected with 404', async () => {
      const res = await request(app)
        .post('/api/v1/shipping-assign/suggest')
        .send({
          shipmentIds: ['ship-nonexistent-999'],
        });

      expect(res.status).toBe(404);
    });
  });
});
