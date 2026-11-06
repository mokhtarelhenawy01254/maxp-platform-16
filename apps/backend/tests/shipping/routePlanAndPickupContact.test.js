const mockPrisma = {
  routePlan: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  routeStop: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  shipment: {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  courier: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  deliveryRun: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  pickupRequest: {
    create: jest.fn(),
  },
  merchant: {
    findFirst: jest.fn(),
  },
  shippingBranch: {
    findFirst: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

jest.mock('../../services/courierService', () => ({
  createDeliveryRun: jest.fn(),
}));

jest.mock('../../services/shipping/policyService', () => ({
  getPolicy: jest.fn().mockResolvedValue({ maxShipmentsPerCourierPerDay: 60 }),
}));

const routePlanService = require('../../services/routePlanService');
const courierService = require('../../services/courierService');
const shippingPortalController = require('../../controller/shippingPortalController');
const shippingClientController = require('../../controller/shippingClientController');

describe('SHIP-W16: Route Plans & Pickup Contact Verification Suite', () => {
  const companyId = 'comp_test_ship_w16';
  const userId = 'usr_ops_001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1) Route Plan: 12 shipments in Cairo, courier assignment, and dispatch to DeliveryRun', () => {
    it('creates a route plan with 12 Cairo candidate shipments as ordered stops', async () => {
      const mockShipments = Array.from({ length: 12 }, (_, i) => ({
        id: `ship_${i + 1}`,
        destinationGovernorate: 'القاهرة',
        destinationCity: 'مدينة نصر',
        destinationAddress: `شارع ${i + 1}، الحي السابع`,
        status: 'READY_TO_SHIP',
        order: {
          customerName: `عميل ${i + 1}`,
          customerPhone: `010000000${i + 10}`,
          customerAddress: `شارع ${i + 1}، الحي السابع`,
          city: 'مدينة نصر',
          governorate: 'القاهرة',
        },
      }));

      mockPrisma.routeStop.findMany.mockResolvedValueOnce([]); // no active stops
      mockPrisma.shipment.findMany.mockResolvedValueOnce(mockShipments);
      mockPrisma.routePlan.create.mockImplementationOnce(({ data }) =>
        Promise.resolve({
          id: 'plan_cairo_12',
          ...data,
          stops: data.stops?.create || [],
        })
      );

      const plan = await routePlanService.createRoutePlan(companyId, {
        name: 'خط توزيع القاهرة ومدينة نصر',
        planDate: '2026-11-06',
        governorate: 'القاهرة',
        suggestShipments: true,
        userId,
      });

      expect(plan.id).toBe('plan_cairo_12');
      expect(plan.totalStops).toBe(12);
      expect(plan.totalShipments).toBe(12);
      expect(plan.status).toBe('READY');
      expect(plan.stops.length).toBe(12);
      expect(plan.stops[0].seq).toBe(1);
      expect(plan.stops[11].seq).toBe(12);
    });

    it('assigns an eligible Cairo courier within capacity (returns 200/updated plan)', async () => {
      mockPrisma.routePlan.findFirst.mockResolvedValueOnce({
        id: 'plan_cairo_12',
        companyId,
        governorate: 'القاهرة',
        totalShipments: 12,
        stops: Array.from({ length: 12 }, (_, i) => ({ id: `stop_${i}` })),
      });

      mockPrisma.courier.findFirst.mockResolvedValueOnce({
        id: 'courier_cairo_1',
        name: 'محمود عبد الفتاح',
        isActive: true,
        status: 'AVAILABLE',
        governorates: '["القاهرة", "الجيزة"]',
      });
      mockPrisma.shipment.count.mockResolvedValueOnce(10); // current load = 10, max = 60, total = 22 <= 60

      mockPrisma.routePlan.update.mockResolvedValueOnce({
        id: 'plan_cairo_12',
        courierId: 'courier_cairo_1',
        status: 'ASSIGNED',
      });

      const updated = await routePlanService.assignCourierToPlan(companyId, 'plan_cairo_12', {
        courierId: 'courier_cairo_1',
      });

      expect(updated.status).toBe('ASSIGNED');
      expect(updated.courierId).toBe('courier_cairo_1');
    });

    it('dispatches the plan: creates DeliveryRun with 12 shipments and links plan', async () => {
      const mockStops = Array.from({ length: 12 }, (_, i) => ({
        id: `stop_${i + 1}`,
        seq: i + 1,
        shipmentId: `ship_${i + 1}`,
        status: 'PENDING',
      }));

      mockPrisma.routePlan.findFirst.mockResolvedValueOnce({
        id: 'plan_cairo_12',
        planNumber: 'RPL-20261106-1234',
        companyId,
        courierId: 'courier_cairo_1',
        status: 'ASSIGNED',
        totalShipments: 12,
        stops: mockStops,
      });

      courierService.createDeliveryRun.mockResolvedValueOnce({
        id: 'run_cairo_001',
        runNumber: 'RUN-20261106-001',
        status: 'DISPATCHED',
        totalShipments: 12,
      });

      mockPrisma.routePlan.update.mockResolvedValueOnce({
        id: 'plan_cairo_12',
        deliveryRunId: 'run_cairo_001',
        status: 'DISPATCHED',
        stops: mockStops,
      });

      const result = await routePlanService.dispatchRoutePlan(companyId, 'plan_cairo_12', { userId });

      expect(courierService.createDeliveryRun).toHaveBeenCalledWith(
        companyId,
        expect.objectContaining({
          courierId: 'courier_cairo_1',
          shipmentIds: mockStops.map((s) => s.shipmentId),
        })
      );
      expect(result.plan.status).toBe('DISPATCHED');
      expect(result.plan.deliveryRunId).toBe('run_cairo_001');
      expect(result.deliveryRun.totalShipments).toBe(12);
    });
  });

  describe('2) Conflict Guard: Preventing same shipment in two active plans (409)', () => {
    it('rejects adding a shipment already in another active route plan with 409 Conflict', async () => {
      mockPrisma.routePlan.findFirst.mockResolvedValueOnce({
        id: 'plan_alex_02',
        companyId,
        status: 'DRAFT',
      });

      mockPrisma.routeStop.findFirst.mockResolvedValueOnce({
        id: 'stop_existing',
        shipmentId: 'ship_conflict_123',
        routePlan: {
          planNumber: 'RPL-20261106-999',
          name: 'خطة نشطة أخرى',
          status: 'READY',
        },
      });

      await expect(
        routePlanService.addStopsToPlan(companyId, 'plan_alex_02', {
          shipmentIds: ['ship_conflict_123'],
        })
      ).rejects.toMatchObject({
        statusCode: 409,
        code: 'SHIPMENT_ALREADY_IN_ACTIVE_PLAN',
      });
    });
  });

  describe('3) Courier Coverage Guard: Out of zone rejection (400)', () => {
    it('rejects assigning courier outside plan governorate with 400 and clear message', async () => {
      mockPrisma.routePlan.findFirst.mockResolvedValueOnce({
        id: 'plan_cairo_12',
        companyId,
        governorate: 'القاهرة',
        totalShipments: 10,
        stops: [{ id: 's1' }],
      });

      mockPrisma.courier.findFirst.mockResolvedValueOnce({
        id: 'courier_alex_only',
        name: 'كريم الإسكندراني',
        isActive: true,
        status: 'AVAILABLE',
        governorates: '["الإسكندرية", "البحيرة"]',
      });

      await expect(
        routePlanService.assignCourierToPlan(companyId, 'plan_cairo_12', {
          courierId: 'courier_alex_only',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'COURIER_ZONE_MISMATCH',
      });
    });
  });

  describe('4) Pickup Request from Company Dashboard: Team Member Selection', () => {
    it('rejects pickup creation without contactUserId nor contactName with 400 CONTACT_USER_REQUIRED', async () => {
      const req = {
        user: { companyId },
        body: {
          pickupAddress: 'مخزن القاهرة الرئيسي',
          governorate: 'القاهرة',
          scheduledDate: '2026-11-07',
          contactPhone: '01012345678',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await shippingPortalController.createPickupRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CONTACT_USER_REQUIRED',
        })
      );
    });

    it('creates pickup with 201 when valid contactUserId from company team is provided', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'usr_team_ops_1',
        firstName: 'طارق',
        lastName: 'العوضي',
        email: 'tarek@company.com',
        phone: '01011223344',
        isActive: true,
      });

      mockPrisma.pickupRequest.create.mockImplementationOnce(({ data }) =>
        Promise.resolve({
          id: 'pkp_001',
          ...data,
          pickupNumber: 'PKP-20261106-0001',
        })
      );

      const req = {
        user: { companyId },
        body: {
          contactUserId: 'usr_team_ops_1',
          contactPhone: '01011223344',
          pickupAddress: 'مخزن التجمع الخامس',
          governorate: 'القاهرة',
          scheduledDate: '2026-11-07',
          expectedParcels: 5,
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await shippingPortalController.createPickupRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          pickup: expect.objectContaining({
            contactUserId: 'usr_team_ops_1',
            contactName: 'طارق العوضي',
            contactEmployeeName: 'طارق العوضي',
          }),
        })
      );
    });
  });

  describe('5) Pickup Request from Client Portal: Free Text & Phone Validation', () => {
    it('creates pickup with 201 for client with free text and valid phone without contactUserId', async () => {
      mockPrisma.pickupRequest.create.mockImplementationOnce(({ data }) =>
        Promise.resolve({
          id: 'client_pkp_001',
          ...data,
          pickupNumber: 'PKP-20261106-0002',
        })
      );

      const req = {
        user: { companyId },
        shippingClientId: 'merchant_client_99',
        merchant: { name: 'متجر زينة', phone: '01099887766' },
        body: {
          contactName: 'أمير مصطفى (مسؤول مستودع التاجر)',
          contactPhone: '01099887766',
          pickupAddress: 'شارع الهرم الرئيسي',
          governorate: 'الجيزة',
          scheduledDate: '2026-11-07',
          expectedParcels: 3,
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await shippingClientController.createPickup(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            contactName: 'أمير مصطفى (مسؤول مستودع التاجر)',
            contactPhone: '01099887766',
          }),
        })
      );
    });

    it('rejects client pickup with invalid phone format (400)', async () => {
      const req = {
        user: { companyId },
        shippingClientId: 'merchant_client_99',
        merchant: { name: 'متجر زينة' },
        body: {
          contactName: 'أيمن',
          contactPhone: 'abc12345', // invalid phone
          pickupAddress: 'شارع التحرير',
          governorate: 'القاهرة',
          scheduledDate: '2026-11-07',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await shippingClientController.createPickup(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_PHONE_NUMBER',
        })
      );
    });
  });
});
