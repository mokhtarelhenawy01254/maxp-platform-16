/**
 * SHIP-W12 Numerical Acceptance Tests
 *
 * Requirements:
 * 1. POST /couriers {governorate: "الدقهلية"} -> governorates=["الدقهلية"] in GET.
 * 2. POST /couriers {foo: "bar"} -> 400 mentioning foo.
 * 3. 30 shipments / 4 governorates with 4 couriers -> suggest 30, apply assignedCount=30, failedCount=0.
 * 4. Remove Dakahlia courier -> suggest -> assigned~22, failedCount = remainder, sum = 30; apply assignedCount + failedCount = 30 with NO_COURIER_COVERAGE.
 * 5. GET /shipping-reports/coverage returns governorate rows with correct rates, open shipments, active couriers, oldest unassigned parcel.
 */

const mockPrisma = {
  courier: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  shipment: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    groupBy: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  deliveryRun: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(),
  },
  companyApp: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'user-w12', companyId: 'company-w12', role: 'OPERATIONS' };
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

jest.mock('../../middleware/checkAppAccess', () => ({
  checkAppAccess: () => (req, res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const courierRoutes = require('../../routes/courierRoutes');
const shippingAssignRoutes = require('../../routes/shippingAssignRoutes');
const shippingReportsRoutes = require('../../routes/shippingReportsRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/couriers', courierRoutes);
app.use('/api/v1/shipping-assign', shippingAssignRoutes);
app.use('/api/v1/shipping-reports', shippingReportsRoutes);

describe('SHIP-W12: Courier Coverage & Distribution Counter Acceptance Tests', () => {
  const companyId = 'company-w12';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
  });

  describe('1. Courier governorate alias & unknown field validation', () => {
    it('1. POST /couriers {governorate: "الدقهلية"} stores ["الدقهلية"] and returns it in GET', async () => {
      let createdData = null;
      mockPrisma.courier.create.mockImplementation(({ data }) => {
        createdData = {
          id: 'courier-new-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return Promise.resolve(createdData);
      });

      // POST with singular alias governorate: "الدقهلية"
      const postRes = await request(app)
        .post('/api/v1/couriers')
        .send({ governorate: 'الدقهلية' })
        .expect(201);

      expect(postRes.body.success).toBe(true);
      expect(postRes.body.data.governorates).toEqual(['الدقهلية']);
      expect(createdData.governorates).toBe(JSON.stringify(['الدقهلية']));

      // Mock GET /couriers/:id
      mockPrisma.courier.findFirst.mockResolvedValueOnce({
        ...createdData,
        deliveryRuns: [],
      });

      const getRes = await request(app)
        .get(`/api/v1/couriers/${createdData.id}`)
        .expect(200);

      expect(getRes.body.success).toBe(true);
      expect(getRes.body.data.governorates).toEqual(['الدقهلية']);
    });

    it('governorates array wins when both governorates and governorate are sent', async () => {
      let createdData = null;
      mockPrisma.courier.create.mockImplementation(({ data }) => {
        createdData = {
          id: 'courier-conflict-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return Promise.resolve(createdData);
      });

      const postRes = await request(app)
        .post('/api/v1/couriers')
        .send({
          name: 'كابتن محمد',
          phone: '01011112222',
          governorate: 'الإسكندرية',
          governorates: ['الدقهلية', 'القاهرة'],
        })
        .expect(201);

      expect(postRes.body.success).toBe(true);
      expect(postRes.body.data.governorates).toEqual(['الدقهلية', 'القاهرة']);
    });

    it('2. POST /couriers {foo: "bar"} returns 400 mentioning foo', async () => {
      const res = await request(app)
        .post('/api/v1/couriers')
        .send({ foo: 'bar' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNKNOWN_FIELDS');
      expect(res.body.message).toContain('foo');
      expect(res.body.unknownFields).toContain('foo');
    });

    it('PUT /couriers/:id with unknown field also returns 400 mentioning it', async () => {
      const res = await request(app)
        .put('/api/v1/couriers/c-1')
        .send({ baz: 'qux' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('UNKNOWN_FIELDS');
      expect(res.body.message).toContain('baz');
    });
  });

  describe('2. Distribution counter & mathematical sum check (SHIP-W12)', () => {
    // 30 shipments across 4 governorates: Cairo (8), Giza (8), Alexandria (7), Dakahlia (7)
    const mock30Shipments = [
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `ship-cairo-${i + 1}`,
        companyId,
        status: 'PENDING',
        destinationGovernorate: 'القاهرة',
        codAmount: 100,
      })),
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `ship-giza-${i + 1}`,
        companyId,
        status: 'PENDING',
        destinationGovernorate: 'الجيزة',
        codAmount: 120,
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `ship-alex-${i + 1}`,
        companyId,
        status: 'PENDING',
        destinationGovernorate: 'الإسكندرية',
        codAmount: 150,
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `ship-dakahlia-${i + 1}`,
        companyId,
        status: 'PENDING',
        destinationGovernorate: 'الدقهلية',
        codAmount: 180,
      })),
    ];

    it('3. 30 shipments across 4 governorates with 4 couriers -> suggest 30, apply assignedCount=30, failedCount=0', async () => {
      mockPrisma.shipment.findMany.mockImplementation(({ where }) => {
        if (where?.id?.in) {
          return Promise.resolve(
            mock30Shipments.filter((s) => where.id.in.includes(s.id))
          );
        }
        if (where?.deliveryRunId) {
          return Promise.resolve(mock30Shipments);
        }
        return Promise.resolve(mock30Shipments);
      });

      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 60,
      });

      // 4 active couriers covering the 4 governorates
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c-cairo', companyId, name: 'كابتن القاهرة', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c-giza', companyId, name: 'كابتن الجيزة', governorates: '["الجيزة"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c-alex', companyId, name: 'كابتن الإسكندرية', governorates: '["الإسكندرية"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c-dakahlia', companyId, name: 'كابتن الدقهلية', governorates: '["الدقهلية"]', isActive: true, status: 'AVAILABLE' },
      ]);
      mockPrisma.shipment.groupBy.mockResolvedValue([]);
      mockPrisma.deliveryRun.findFirst.mockResolvedValue(null);
      mockPrisma.deliveryRun.count.mockResolvedValue(0);
      mockPrisma.deliveryRun.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `run-${data.courierId}`, ...data })
      );
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.deliveryRun.update.mockResolvedValue({});
      mockPrisma.shipmentEvent.create.mockResolvedValue({});

      // POST /suggest
      const suggestRes = await request(app)
        .post('/api/v1/shipping-assign/suggest')
        .send({ shipmentIds: mock30Shipments.map((s) => s.id) })
        .expect(200);

      expect(suggestRes.body.success).toBe(true);
      expect(suggestRes.body.assignedCount).toBe(30);
      expect(suggestRes.body.failedCount).toBe(0);
      expect(suggestRes.body.assignments).toHaveLength(30);
      expect(suggestRes.body.unassigned).toHaveLength(0);

      // POST /apply
      const applyRes = await request(app)
        .post('/api/v1/shipping-assign/apply')
        .send({
          assignments: suggestRes.body.assignments.map((a) => ({
            shipmentId: a.shipmentId,
            courierId: a.courierId,
          })),
        })
        .expect(200);

      expect(applyRes.body.success).toBe(true);
      expect(applyRes.body.assignedCount).toBe(30);
      expect(applyRes.body.failedCount).toBe(0);
      expect(applyRes.body.assignedCount + applyRes.body.failedCount).toBe(30);
    });

    it('4. Deleting Dakahlia courier -> suggest -> assigned≈23 (or 22), failedCount=7 (or 8), sum=30 with NO_COURIER_COVERAGE', async () => {
      mockPrisma.shipment.findMany.mockImplementation(({ where }) => {
        if (where?.id?.in) {
          return Promise.resolve(
            mock30Shipments.filter((s) => where.id.in.includes(s.id))
          );
        }
        if (where?.deliveryRunId) {
          return Promise.resolve(mock30Shipments);
        }
        return Promise.resolve(mock30Shipments);
      });

      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 60,
      });

      // Only 3 couriers (Dakahlia courier removed/deleted)
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c-cairo', companyId, name: 'كابتن القاهرة', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c-giza', companyId, name: 'كابتن الجيزة', governorates: '["الجيزة"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c-alex', companyId, name: 'كابتن الإسكندرية', governorates: '["الإسكندرية"]', isActive: true, status: 'AVAILABLE' },
      ]);
      mockPrisma.shipment.groupBy.mockResolvedValue([]);
      mockPrisma.deliveryRun.findFirst.mockResolvedValue(null);
      mockPrisma.deliveryRun.count.mockResolvedValue(0);
      mockPrisma.deliveryRun.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `run-${data.courierId}`, ...data })
      );
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.deliveryRun.update.mockResolvedValue({});
      mockPrisma.shipmentEvent.create.mockResolvedValue({});

      // 1. Suggest
      const suggestRes = await request(app)
        .post('/api/v1/shipping-assign/suggest')
        .send({ shipmentIds: mock30Shipments.map((s) => s.id) })
        .expect(200);

      expect(suggestRes.body.success).toBe(true);
      expect(suggestRes.body.assignedCount).toBe(23);
      expect(suggestRes.body.failedCount).toBe(7);
      expect(suggestRes.body.assignedCount + suggestRes.body.failedCount).toBe(30);

      // Verify unassigned Dakahlia shipments reason
      expect(suggestRes.body.unassigned).toHaveLength(7);
      suggestRes.body.unassigned.forEach((u) => {
        expect(u.destinationGovernorate).toBe('الدقهلية');
      });

      // 2. Apply: sends the suggested assignments + failed/unassigned
      const applyRes = await request(app)
        .post('/api/v1/shipping-assign/apply')
        .send({
          assignments: suggestRes.body.assignments.map((a) => ({
            shipmentId: a.shipmentId,
            courierId: a.courierId,
          })),
          unassigned: suggestRes.body.unassigned,
        })
        .expect(200);

      expect(applyRes.body.success).toBe(true);
      expect(applyRes.body.assignedCount).toBe(23);
      expect(applyRes.body.failedCount).toBe(7);
      expect(applyRes.body.assignedCount + applyRes.body.failedCount).toBe(30);
      expect(applyRes.body.failed).toHaveLength(7);
      applyRes.body.failed.forEach((f) => {
        expect(f.reason).toBe('NO_COURIER_COVERAGE');
      });
    });
  });

  describe('3. GET /shipping-reports/coverage (SHIP-W12)', () => {
    it('5. coverage returns governorate rows with correct metrics, openShipments, activeCouriers, coverageRate', async () => {
      // 1. Mock active couriers: Cairo (2 couriers), Alex (1 courier), Dakahlia (0 couriers)
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'كابتن 1', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c2', companyId, name: 'كابتن 2', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c3', companyId, name: 'كابتن 3', governorates: '["الإسكندرية"]', isActive: true, status: 'AVAILABLE' },
      ]);

      const now = new Date();
      const olderDate = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago
      const newerDate = new Date(now.getTime() - 12 * 60 * 60 * 1000);

      // 2. Mock open shipments:
      // Cairo: 10 shipments (10 assigned to c1) -> 100% coverage
      // Alex: 10 shipments (5 assigned, 5 unassigned) -> 50% coverage
      // Dakahlia: 5 shipments (all unassigned, no couriers) -> 0% coverage
      const openShipments = [
        ...Array.from({ length: 10 }, (_, i) => ({
          id: `ship-cairo-${i + 1}`,
          courierId: 'c1',
          status: 'ASSIGNED',
          createdAt: newerDate,
          destinationGovernorate: 'القاهرة',
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `ship-alex-assigned-${i + 1}`,
          courierId: 'c3',
          status: 'ASSIGNED',
          createdAt: newerDate,
          destinationGovernorate: 'الإسكندرية',
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `ship-alex-unassigned-${i + 1}`,
          courierId: null,
          status: 'PENDING',
          createdAt: i === 0 ? olderDate : newerDate,
          destinationGovernorate: 'الإسكندرية',
          order: { orderNumber: `ORD-ALEX-${i + 1}` },
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          id: `ship-dak-unassigned-${i + 1}`,
          courierId: null,
          status: 'PENDING',
          createdAt: olderDate,
          destinationGovernorate: 'الدقهلية',
          order: { orderNumber: `ORD-DAK-${i + 1}` },
        })),
      ];

      mockPrisma.shipment.findMany.mockResolvedValue(openShipments);

      const res = await request(app)
        .get('/api/v1/shipping-reports/coverage')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.summary).toBeDefined();

      const rows = res.body.data;
      const cairoRow = rows.find((r) => r.governorate === 'القاهرة');
      const alexRow = rows.find((r) => r.governorate === 'الإسكندرية');
      const dakRow = rows.find((r) => r.governorate === 'الدقهلية');

      expect(cairoRow).toBeDefined();
      expect(cairoRow.openShipments).toBe(10);
      expect(cairoRow.assignedShipments).toBe(10);
      expect(cairoRow.unassignedShipments).toBe(0);
      expect(cairoRow.activeCouriers).toBe(2);
      expect(cairoRow.coverageRate).toBe(100);
      expect(cairoRow.isCovered).toBe(true);

      expect(alexRow).toBeDefined();
      expect(alexRow.openShipments).toBe(10);
      expect(alexRow.assignedShipments).toBe(5);
      expect(alexRow.unassignedShipments).toBe(5);
      expect(alexRow.activeCouriers).toBe(1);
      expect(alexRow.coverageRate).toBe(50);
      expect(alexRow.isCovered).toBe(true);
      expect(alexRow.oldestUnassignedShipment).toBeDefined();
      expect(alexRow.oldestUnassignedShipment.shipmentId).toBe('ship-alex-unassigned-1');
      expect(alexRow.oldestUnassignedShipment.ageHours).toBeGreaterThanOrEqual(47);

      expect(dakRow).toBeDefined();
      expect(dakRow.openShipments).toBe(5);
      expect(dakRow.assignedShipments).toBe(0);
      expect(dakRow.unassignedShipments).toBe(5);
      expect(dakRow.activeCouriers).toBe(0);
      expect(dakRow.coverageRate).toBe(0);
      expect(dakRow.isCovered).toBe(false);

      expect(res.body.summary.coveredGovernorates).toBe(2);
      expect(res.body.summary.uncoveredGovernorates).toBe(1);
      expect(res.body.summary.totalOpenShipments).toBe(25);
      expect(res.body.summary.totalUnassignedShipments).toBe(10);
    });
  });
});
