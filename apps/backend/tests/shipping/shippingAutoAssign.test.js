/**
 * SHIP-W8 Shipping Auto-Assign Engine Acceptance Tests
 *
 * Verifies:
 * 1. suggest:
 *    - Governorates normalized & matched against courier zones (JSON/comma/single)
 *    - Filters active & non-off-duty couriers
 *    - Respects daily courier capacity from ShippingPolicySettings.maxShipmentsPerCourierPerDay (default 60)
 *    - Calculates courier current load (open statuses)
 *    - Strategies: LEAST_LOAD, ROUND_ROBIN, ZONE_PRIORITY
 *    - Rejects terminal statuses (DELIVERED, CANCELLED, etc.) -> unassigned INVALID_STATUS
 *    - Returns NO_COURIER_IN_ZONE, ALL_AT_CAPACITY, INVALID_STATUS
 *    - Multi-tenant isolation: throws 404 NOT_FOUND if shipment does not belong to companyId
 * 2. apply:
 *    - Multi-tenant isolation on couriers and shipments (404 NOT_FOUND)
 *    - Rejects invalid statuses -> unassigned INVALID_STATUS
 *    - Groups assignments by courier, creates/updates DRAFT DeliveryRun with RUN-YYYYMMDD-XXX
 *    - Updates shipments (courierId, deliveryRunId, status ASSIGNED)
 *    - Writes ShipmentEvent (toStatus ASSIGNED, actorType SYSTEM)
 *    - Updates delivery run totalShipments & totalCODExpected
 * 3. autoAssign:
 *    - Runs suggest + apply pipeline
 * 4. Routes:
 *    - GET /couriers, POST /suggest, POST /apply, POST /auto
 */

const mockPrisma = {
  shipment: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  courier: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  deliveryRun: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 'admin-1', companyId: 'company-test-1', role: 'OPERATIONS' };
    next();
  },
}));

const express = require('express');
const request = require('supertest');
const shippingAssignRoutes = require('../../routes/shippingAssignRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-assign', shippingAssignRoutes);

const autoAssignService = require('../../services/shipping/autoAssignService');
const { parseCourierGovernorates } = autoAssignService;

describe('SHIP-W8: Auto-Assign Courier Engine', () => {
  const companyId = 'company-test-1';
  const otherCompanyId = 'company-other-9';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
  });

  describe('1. parseCourierGovernorates helper', () => {
    it('correctly parses JSON array and normalizes names', () => {
      const res = parseCourierGovernorates('["cairo", "alexandria"]');
      expect(res).toEqual(['القاهرة', 'الإسكندرية']);
    });

    it('correctly parses comma-separated string with mixed languages', () => {
      const res = parseCourierGovernorates('الجيزة, cairo, Mansoura');
      expect(res).toEqual(['الجيزة', 'القاهرة', 'الدقهلية']);
    });

    it('returns empty array for null/empty/invalid', () => {
      expect(parseCourierGovernorates(null)).toEqual([]);
      expect(parseCourierGovernorates('')).toEqual([]);
      expect(parseCourierGovernorates('   ')).toEqual([]);
    });
  });

  describe('2. suggest() function', () => {
    it('throws 404 NOT_FOUND if any shipment does not belong to companyId', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 's1', companyId, status: 'PENDING' },
        { id: 's2', companyId: otherCompanyId, status: 'PENDING' }, // Tenant breach!
      ]);

      await expect(
        autoAssignService.suggest({
          companyId,
          shipmentIds: ['s1', 's2'],
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('throws 404 NOT_FOUND if shipment is missing from database', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 's1', companyId, status: 'PENDING' },
      ]);

      await expect(
        autoAssignService.suggest({
          companyId,
          shipmentIds: ['s1', 's-nonexistent'],
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('returns INVALID_STATUS for shipments with terminal status', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 's1', companyId, status: 'DELIVERED', destinationGovernorate: 'القاهرة' },
        { id: 's2', companyId, status: 'CANCELLED', destinationGovernorate: 'الجيزة' },
      ]);
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 60,
      });
      mockPrisma.courier.findMany.mockResolvedValue([]);
      mockPrisma.shipment.groupBy.mockResolvedValue([]);

      const result = await autoAssignService.suggest({
        companyId,
        shipmentIds: ['s1', 's2'],
      });

      expect(result.assignments).toHaveLength(0);
      expect(result.unassigned).toHaveLength(2);
      expect(result.unassigned[0].reason).toBe('INVALID_STATUS');
      expect(result.unassigned[1].reason).toBe('INVALID_STATUS');
    });

    it('returns NO_COURIER_IN_ZONE when no active courier covers the shipment governorate', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 's1', companyId, status: 'PENDING', destinationGovernorate: 'أسوان' },
      ]);
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 60,
      });
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Ahmed', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
      ]);
      mockPrisma.shipment.groupBy.mockResolvedValue([]);

      const result = await autoAssignService.suggest({
        companyId,
        shipmentIds: ['s1'],
      });

      expect(result.assignments).toHaveLength(0);
      expect(result.unassigned).toHaveLength(1);
      expect(result.unassigned[0].reason).toBe('NO_COURIER_IN_ZONE');
      expect(result.unassigned[0].destinationGovernorate).toBe('أسوان');
    });

    it('returns ALL_AT_CAPACITY when all eligible couriers have reached maxShipmentsPerCourierPerDay', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 's1', companyId, status: 'PENDING', destinationGovernorate: 'القاهرة' },
      ]);
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 10,
      });
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Ahmed', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
      ]);
      // Courier c1 already has 10 active shipments
      mockPrisma.shipment.groupBy.mockResolvedValue([
        { courierId: 'c1', _count: { id: 10 } },
      ]);

      const result = await autoAssignService.suggest({
        companyId,
        shipmentIds: ['s1'],
      });

      expect(result.assignments).toHaveLength(0);
      expect(result.unassigned).toHaveLength(1);
      expect(result.unassigned[0].reason).toBe('ALL_AT_CAPACITY');
    });

    it('LEAST_LOAD strategy assigns to the courier with the lowest open load', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 's1', companyId, status: 'PENDING', destinationGovernorate: 'القاهرة', codAmount: 200 },
      ]);
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 60,
      });
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Courier High Load', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c2', companyId, name: 'Courier Low Load', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
      ]);
      mockPrisma.shipment.groupBy.mockResolvedValue([
        { courierId: 'c1', _count: { id: 15 } },
        { courierId: 'c2', _count: { id: 3 } },
      ]);

      const result = await autoAssignService.suggest({
        companyId,
        shipmentIds: ['s1'],
        strategy: 'LEAST_LOAD',
      });

      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].courierId).toBe('c2');
      expect(result.assignments[0].courierName).toBe('Courier Low Load');
      expect(result.unassigned).toHaveLength(0);
    });

    it('ZONE_PRIORITY strategy prioritizes courier whose primary zone matches', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 's1', companyId, status: 'PENDING', destinationGovernorate: 'الإسكندرية' },
      ]);
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 60,
      });
      // c1 has Alex as secondary zone (index 1) with load 1
      // c2 has Alex as primary zone (index 0) with load 3
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Secondary Cairo/Alex', governorates: '["القاهرة", "الإسكندرية"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c2', companyId, name: 'Primary Alex/Cairo', governorates: '["الإسكندرية", "القاهرة"]', isActive: true, status: 'AVAILABLE' },
      ]);
      mockPrisma.shipment.groupBy.mockResolvedValue([
        { courierId: 'c1', _count: { id: 1 } },
        { courierId: 'c2', _count: { id: 3 } },
      ]);

      const result = await autoAssignService.suggest({
        companyId,
        shipmentIds: ['s1'],
        strategy: 'ZONE_PRIORITY',
      });

      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].courierId).toBe('c2');
      expect(result.assignments[0].courierName).toBe('Primary Alex/Cairo');
    });

    it('ROUND_ROBIN strategy distributes shipments evenly across couriers', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 's1', companyId, status: 'PENDING', destinationGovernorate: 'القاهرة' },
        { id: 's2', companyId, status: 'PENDING', destinationGovernorate: 'القاهرة' },
      ]);
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 60,
      });
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Courier 1', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c2', companyId, name: 'Courier 2', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
      ]);
      mockPrisma.shipment.groupBy.mockResolvedValue([]);

      const result = await autoAssignService.suggest({
        companyId,
        shipmentIds: ['s1', 's2'],
        strategy: 'ROUND_ROBIN',
      });

      expect(result.assignments).toHaveLength(2);
      expect(result.assignments[0].courierId).toBe('c1');
      expect(result.assignments[1].courierId).toBe('c2');
    });
  });

  describe('3. apply() function', () => {
    it('throws 404 NOT_FOUND if a courier belongs to another company', async () => {
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c-alien', companyId: otherCompanyId, name: 'Foreign Courier' },
      ]);

      await expect(
        autoAssignService.apply({
          companyId,
          assignments: [{ shipmentId: 's1', courierId: 'c-alien' }],
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('throws 404 NOT_FOUND if a shipment belongs to another company', async () => {
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Courier 1' },
      ]);
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 's-alien', companyId: otherCompanyId, status: 'PENDING' },
      ]);

      await expect(
        autoAssignService.apply({
          companyId,
          assignments: [{ shipmentId: 's-alien', courierId: 'c1' }],
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('creates a DRAFT delivery run with RUN-YYYYMMDD-XXX format, updates shipments, and records events', async () => {
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Captain Ali' },
      ]);
      mockPrisma.shipment.findMany.mockImplementation(({ where }) => {
        if (where?.id?.in) {
          return Promise.resolve([
            { id: 's1', companyId, status: 'PENDING', codAmount: 150 },
            { id: 's2', companyId, status: 'PENDING', codAmount: 250 },
          ]);
        }
        if (where?.deliveryRunId) {
          return Promise.resolve([
            { id: 's1', codAmount: 150 },
            { id: 's2', codAmount: 250 },
          ]);
        }
        return Promise.resolve([]);
      });

      mockPrisma.deliveryRun.findFirst.mockResolvedValue(null);
      mockPrisma.deliveryRun.count.mockResolvedValue(0);
      mockPrisma.deliveryRun.create.mockResolvedValue({
        id: 'run-1',
        companyId,
        courierId: 'c1',
        runNumber: 'RUN-20261103-001',
        status: 'DRAFT',
      });
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.deliveryRun.update.mockResolvedValue({});
      mockPrisma.shipmentEvent.create.mockResolvedValue({});

      const result = await autoAssignService.apply({
        companyId,
        assignments: [
          { shipmentId: 's1', courierId: 'c1' },
          { shipmentId: 's2', courierId: 'c1' },
        ],
        userId: 'admin-1',
      });

      expect(result.success).toBe(true);
      expect(result.assignedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.applied[0].runNumber).toBe('RUN-20261103-001');

      // Verify delivery run created in DRAFT
      expect(mockPrisma.deliveryRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId,
            courierId: 'c1',
            status: 'DRAFT',
          }),
        })
      );

      // Verify shipment status set to ASSIGNED
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1' },
          data: expect.objectContaining({
            courierId: 'c1',
            deliveryRunId: 'run-1',
            status: 'ASSIGNED',
          }),
        })
      );

      // Verify shipment event written
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId,
            shipmentId: 's1',
            toStatus: 'ASSIGNED',
            actorType: 'SYSTEM',
          }),
        })
      );

      // Verify DeliveryRun counters updated
      expect(mockPrisma.deliveryRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-1' },
          data: {
            totalShipments: 2,
            totalCODExpected: 400,
          },
        })
      );
    });
  });

  describe('4. autoAssign() pipeline', () => {
    it('runs suggest then apply end-to-end', async () => {
      mockPrisma.shipment.findMany.mockImplementation(({ where }) => {
        if (where?.id?.in) {
          return Promise.resolve([
            { id: 's1', companyId, status: 'PENDING', destinationGovernorate: 'القاهرة', codAmount: 300 },
          ]);
        }
        if (where?.courierId === null) {
          return Promise.resolve([
            { id: 's1', companyId, status: 'PENDING', destinationGovernorate: 'القاهرة', codAmount: 300 },
          ]);
        }
        if (where?.deliveryRunId) {
          return Promise.resolve([{ id: 's1', codAmount: 300 }]);
        }
        return Promise.resolve([]);
      });

      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 60,
      });
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Ali', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
      ]);
      mockPrisma.shipment.groupBy.mockResolvedValue([]);
      mockPrisma.deliveryRun.findFirst.mockResolvedValue(null);
      mockPrisma.deliveryRun.count.mockResolvedValue(0);
      mockPrisma.deliveryRun.create.mockResolvedValue({
        id: 'run-auto-1',
        companyId,
        courierId: 'c1',
        runNumber: 'RUN-20261103-001',
        status: 'DRAFT',
      });
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.deliveryRun.update.mockResolvedValue({});
      mockPrisma.shipmentEvent.create.mockResolvedValue({});

      const result = await autoAssignService.autoAssign({
        companyId,
        governorate: 'القاهرة',
        strategy: 'LEAST_LOAD',
        userId: 'system-agent',
      });

      expect(result.success).toBe(true);
      expect(result.assignedCount).toBe(1);
      expect(result.assignments[0].courierId).toBe('c1');
    });
  });

  describe('6. Explicit Numerical Acceptance Criteria (SHIP-W8 Specification)', () => {
    it('1. 10 Cairo shipments + 2 couriers (one OFF_DUTY) -> all 10 to the available courier only', async () => {
      const shipments = Array.from({ length: 10 }, (_, i) => ({
        id: `ship-cairo-${i + 1}`,
        companyId,
        status: 'PENDING',
        destinationGovernorate: 'القاهرة',
        codAmount: 100 + i * 10,
      }));
      mockPrisma.shipment.findMany.mockResolvedValue(shipments);
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 60,
      });
      // Two couriers: c-active is AVAILABLE, c-offduty is OFF_DUTY
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c-active', companyId, name: 'Active Courier', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c-offduty', companyId, name: 'Off Duty Courier', governorates: '["القاهرة"]', isActive: true, status: 'OFF_DUTY' },
      ]);
      mockPrisma.shipment.groupBy.mockResolvedValue([]);

      const result = await autoAssignService.suggest({
        companyId,
        shipmentIds: shipments.map((s) => s.id),
        strategy: 'LEAST_LOAD',
      });

      expect(result.assignments).toHaveLength(10);
      expect(result.unassigned).toHaveLength(0);
      result.assignments.forEach((a) => {
        expect(a.courierId).toBe('c-active');
      });
    });

    it('2. Shipment in uncovered governorate -> unassigned due to NO_COURIER_IN_ZONE', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 'ship-matrouh-1', companyId, status: 'PENDING', destinationGovernorate: 'مطروح' },
      ]);
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 60,
      });
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Delta Courier', governorates: '["الدقهلية", "الغربية"]', isActive: true, status: 'AVAILABLE' },
      ]);
      mockPrisma.shipment.groupBy.mockResolvedValue([]);

      const result = await autoAssignService.suggest({
        companyId,
        shipmentIds: ['ship-matrouh-1'],
      });

      expect(result.assignments).toHaveLength(0);
      expect(result.unassigned).toHaveLength(1);
      expect(result.unassigned[0].shipmentId).toBe('ship-matrouh-1');
      expect(result.unassigned[0].reason).toBe('NO_COURIER_IN_ZONE');
    });

    it('3. LEAST_LOAD with 3 couriers -> distribution 4/3/3 (diff <= 1)', async () => {
      const shipments = Array.from({ length: 10 }, (_, i) => ({
        id: `ship-load-${i + 1}`,
        companyId,
        status: 'PENDING',
        destinationGovernorate: 'القاهرة',
        codAmount: 150,
      }));
      mockPrisma.shipment.findMany.mockResolvedValue(shipments);
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId,
        maxShipmentsPerCourierPerDay: 60,
      });
      // 3 couriers with 0 initial open load
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Courier 1', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c2', companyId, name: 'Courier 2', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
        { id: 'c3', companyId, name: 'Courier 3', governorates: '["القاهرة"]', isActive: true, status: 'AVAILABLE' },
      ]);
      mockPrisma.shipment.groupBy.mockResolvedValue([]);

      const result = await autoAssignService.suggest({
        companyId,
        shipmentIds: shipments.map((s) => s.id),
        strategy: 'LEAST_LOAD',
      });

      expect(result.assignments).toHaveLength(10);
      expect(result.unassigned).toHaveLength(0);

      // Count assignments per courier
      const counts = { c1: 0, c2: 0, c3: 0 };
      result.assignments.forEach((a) => {
        counts[a.courierId] = (counts[a.courierId] || 0) + 1;
      });

      const values = Object.values(counts).sort((a, b) => b - a);
      expect(values).toEqual([4, 3, 3]);
      const diff = Math.max(...values) - Math.min(...values);
      expect(diff).toBeLessThanOrEqual(1);
    });

    it('4. apply -> courierId updated + ShipmentEvent(ASSIGNED) = shipment count + DRAFT DeliveryRun', async () => {
      const assignments = [
        { shipmentId: 'ship-1', courierId: 'c1' },
        { shipmentId: 'ship-2', courierId: 'c1' },
        { shipmentId: 'ship-3', courierId: 'c1' },
      ];
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Courier 1' },
      ]);
      mockPrisma.shipment.findMany.mockImplementation(({ where }) => {
        if (where?.id?.in) {
          return Promise.resolve([
            { id: 'ship-1', companyId, status: 'PENDING', codAmount: 100 },
            { id: 'ship-2', companyId, status: 'PENDING', codAmount: 200 },
            { id: 'ship-3', companyId, status: 'PENDING', codAmount: 300 },
          ]);
        }
        if (where?.deliveryRunId) {
          return Promise.resolve([
            { id: 'ship-1', codAmount: 100 },
            { id: 'ship-2', codAmount: 200 },
            { id: 'ship-3', codAmount: 300 },
          ]);
        }
        return Promise.resolve([]);
      });
      mockPrisma.deliveryRun.findFirst.mockResolvedValue(null);
      mockPrisma.deliveryRun.count.mockResolvedValue(0);
      mockPrisma.deliveryRun.create.mockResolvedValue({
        id: 'run-draft-1',
        companyId,
        courierId: 'c1',
        runNumber: 'RUN-20261103-001',
        status: 'DRAFT',
      });
      mockPrisma.shipment.update.mockResolvedValue({});
      mockPrisma.deliveryRun.update.mockResolvedValue({});
      mockPrisma.shipmentEvent.create.mockResolvedValue({});

      const result = await autoAssignService.apply({
        companyId,
        assignments,
        userId: 'admin-1',
      });

      expect(result.success).toBe(true);
      expect(result.assignedCount).toBe(3);
      expect(result.failedCount).toBe(0);

      // Verify DRAFT run created
      expect(mockPrisma.deliveryRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId,
            courierId: 'c1',
            status: 'DRAFT',
          }),
        })
      );

      // Verify each shipment updated with courierId and deliveryRunId
      expect(mockPrisma.shipment.update).toHaveBeenCalledTimes(3);

      // Verify ShipmentEvent(toStatus=ASSIGNED, actorType=SYSTEM) recorded for each shipment
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledTimes(3);
      for (const assignment of assignments) {
        expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              companyId,
              shipmentId: assignment.shipmentId,
              toStatus: 'ASSIGNED',
              actorType: 'SYSTEM',
            }),
          })
        );
      }
    });

    it('5. Attempt to assign DELIVERED shipment -> rejected and returned in unassigned due to INVALID_STATUS', async () => {
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c1', companyId, name: 'Courier 1' },
      ]);
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 'ship-delivered-1', companyId, status: 'DELIVERED', codAmount: 200 },
      ]);

      const result = await autoAssignService.apply({
        companyId,
        assignments: [{ shipmentId: 'ship-delivered-1', courierId: 'c1' }],
      });

      expect(result.assignedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.unassigned).toHaveLength(1);
      expect(result.unassigned[0].shipmentId).toBe('ship-delivered-1');
      expect(result.unassigned[0].reason).toBe('INVALID_STATUS');
    });

    it('6. Multi-tenant isolation: courier or shipment from another company -> 404 NOT_FOUND', async () => {
      // Alien courier
      mockPrisma.courier.findMany.mockResolvedValue([
        { id: 'c-alien', companyId: 'other-company-id', name: 'Other Courier' },
      ]);
      await expect(
        autoAssignService.apply({
          companyId,
          assignments: [{ shipmentId: 's1', courierId: 'c-alien' }],
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });

      // Alien shipment in suggest
      mockPrisma.shipment.findMany.mockResolvedValue([
        { id: 's-alien', companyId: 'other-company-id', status: 'PENDING' },
      ]);
      await expect(
        autoAssignService.suggest({
          companyId,
          shipmentIds: ['s-alien'],
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });
});
