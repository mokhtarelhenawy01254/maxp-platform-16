/**
 * Shipping Portal W3 Backend Acceptance Tests (SHIP-W3)
 *
 * Verifies Acceptance Criteria 4, 5, 6 and Failure Reasons CRUD:
 * 4. Sending FAILED without reason -> 400. With valid reason -> failureReasonCode saved + event.
 * 5. reattempt -> attemptCount + 1, nextAttemptDate updated, event REATTEMPT_SCHEDULED created.
 * 6. shipment with attemptCount=3 and afterMaxAttempts=AUTO_RTO -> after run-rto becomes RETURNED + RTO event
 *    (in REVIEW mode -> review tag without changing status).
 * 7. DeliveryFailureReason CRUD & Seeding (GET/POST/PATCH) with role authorization.
 */

const mockPrisma = {
  shipment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  deliveryFailureReason: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
  },
  courier: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(),
  },
  company: {
    findMany: jest.fn(),
  },
  returnRequest: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-w3-ops',
  companyId: 'company-w3-test',
  role: 'OPERATIONS',
  name: 'Operations Manager',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = mockUser;
    next();
  },
}));

jest.mock('../../middleware/checkAppAccess', () => () => (req, res, next) => next());

const express = require('express');
const request = require('supertest');
const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');
const courierService = require('../../services/courierService');
const shippingRtoService = require('../../services/shipping/shippingRtoService');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-portal', shippingPortalRoutes);

describe('Shipping Portal W3 Acceptance Tests', () => {
  const companyId = 'company-w3-test';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-w3-ops',
      companyId,
      role: 'OPERATIONS',
      name: 'Operations Manager',
    };
  });

  describe('Criterion 4: Mandatory Failure Reason on FAILED', () => {
    test('PATCH /shipments/:id/status fails with 400 when status is FAILED but failureReasonCode is missing', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValueOnce({
        id: 'ship-fail-check',
        companyId,
        status: 'OUT_FOR_DELIVERY',
      });

      const res = await request(app)
        .patch('/api/v1/shipping-portal/shipments/ship-fail-check/status')
        .send({ status: 'FAILED' }) // Missing failureReasonCode
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('سبب الفشل مطلوب');
    });

    test('courierService.updateDeliveryRunShipment throws 400 when status is FAILED without failureReasonCode', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValueOnce({
        id: 'ship-courier-fail',
        companyId,
        status: 'OUT_FOR_DELIVERY',
      });

      await expect(
        courierService.updateDeliveryRunShipment(companyId, {
          shipmentId: 'ship-courier-fail',
          status: 'FAILED',
          // Missing failureReasonCode
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        code: 'FAILURE_REASON_REQUIRED',
      });
    });

    test('PATCH /shipments/:id/status succeeds with valid failureReasonCode -> saves reason, increments attempts, and records event', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValueOnce({
        id: 'ship-fail-ok',
        companyId,
        status: 'OUT_FOR_DELIVERY',
        attemptCount: 1,
      });

      mockPrisma.deliveryFailureReason.findFirst.mockResolvedValueOnce({
        id: 'reason-1',
        companyId,
        code: 'CUSTOMER_ABSENT',
        labelAr: 'العميل غير متواجد',
        requiresReschedule: true,
      });

      mockPrisma.shipment.update.mockResolvedValueOnce({
        id: 'ship-fail-ok',
        companyId,
        status: 'FAILED',
        failureReasonCode: 'CUSTOMER_ABSENT',
        attemptCount: 2,
        nextAttemptDate: new Date(Date.now() + 24 * 3600 * 1000),
      });

      const res = await request(app)
        .patch('/api/v1/shipping-portal/shipments/ship-fail-ok/status')
        .send({
          status: 'FAILED',
          failureReasonCode: 'CUSTOMER_ABSENT',
          notes: 'اتصلت بالعميل ورن ومردش',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-fail-ok' },
          data: expect.objectContaining({
            status: 'FAILED',
            failureReasonCode: 'CUSTOMER_ABSENT',
            attemptCount: { increment: 1 },
          }),
        })
      );

      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId,
            shipmentId: 'ship-fail-ok',
            toStatus: 'FAILED',
            reasonCode: 'CUSTOMER_ABSENT',
            actorType: 'ADMIN',
          }),
        })
      );
    });
  });

  describe('Criterion 5: POST /shipments/:id/reattempt', () => {
    test('increments attemptCount, updates nextAttemptDate, and adds REATTEMPT_SCHEDULED event', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValueOnce({
        id: 'ship-reattempt-1',
        companyId,
        status: 'FAILED',
        attemptCount: 2,
        courierId: 'courier-1',
      });

      const nextDate = new Date('2026-11-05T12:00:00Z');

      mockPrisma.shipment.update.mockResolvedValueOnce({
        id: 'ship-reattempt-1',
        status: 'OUT_FOR_DELIVERY',
        attemptCount: 3,
        nextAttemptDate: nextDate,
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments/ship-reattempt-1/reattempt')
        .send({
          nextAttemptDate: nextDate.toISOString(),
          notes: 'العميل أكد إنه متواجد يوم الخميس ظهراً',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-reattempt-1' },
          data: expect.objectContaining({
            attemptCount: { increment: 1 },
            nextAttemptDate: nextDate,
            status: 'OUT_FOR_DELIVERY',
          }),
        })
      );

      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipmentId: 'ship-reattempt-1',
            reasonCode: 'REATTEMPT_SCHEDULED',
            actorType: 'ADMIN',
          }),
        })
      );
    });

    test('rejects reattempt if shipment is DELIVERED or CANCELLED', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValueOnce({
        id: 'ship-delivered',
        companyId,
        status: 'DELIVERED',
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments/ship-delivered/reattempt')
        .send({ nextAttemptDate: new Date().toISOString() })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('لا يمكن إعادة جدولة');
    });
  });

  describe('Criterion 6: Automated RTO Evaluation (AUTO_RTO vs REVIEW)', () => {
    test('AUTO_RTO mode: shipment with attemptCount >= maxAttempts becomes RETURNED with AUTO_RTO event', async () => {
      // 1. Policy is AUTO_RTO with 3 max attempts
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValueOnce({
        companyId,
        deliveryAttempts: 3,
        afterAttemptsAction: 'AUTO_RTO',
      });

      // 2. Candidate shipment in FAILED status with 3 attempts
      mockPrisma.shipment.findMany.mockResolvedValueOnce([
        {
          id: 'ship-rto-candidate',
          companyId,
          trackingNumber: 'TRK-RTO-001',
          status: 'FAILED',
          attemptCount: 3,
          orderId: 'order-1',
          order: { customerId: 'cust-1' },
          events: [],
        },
      ]);

      mockPrisma.shipment.update.mockResolvedValueOnce({
        id: 'ship-rto-candidate',
        status: 'RETURNED',
      });

      mockPrisma.returnRequest.findFirst.mockResolvedValueOnce(null);
      mockPrisma.returnRequest.create.mockResolvedValueOnce({ id: 'ret-1' });

      // Run RTO maintenance
      const res = await request(app)
        .post('/api/v1/shipping-portal/maintenance/run-rto')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rtoCount).toBe(1);

      // Verify status became RETURNED
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-rto-candidate' },
          data: expect.objectContaining({ status: 'RETURNED' }),
        })
      );

      // Verify AUTO_RTO event was logged
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipmentId: 'ship-rto-candidate',
            toStatus: 'RETURNED',
            reasonCode: 'AUTO_RTO',
            actorType: 'SYSTEM',
          }),
        })
      );
    });

    test('REVIEW mode: flags with NEEDS_RTO_REVIEW event tag without changing shipment status', async () => {
      // 1. Policy is REVIEW with 3 max attempts
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValueOnce({
        companyId,
        deliveryAttempts: 3,
        afterAttemptsAction: 'REVIEW',
      });

      // 2. Candidate shipment in FAILED status with 3 attempts
      mockPrisma.shipment.findMany.mockResolvedValueOnce([
        {
          id: 'ship-review-candidate',
          companyId,
          trackingNumber: 'TRK-REVIEW-001',
          status: 'FAILED',
          attemptCount: 3,
          events: [],
        },
      ]);

      const res = await request(app)
        .post('/api/v1/shipping-portal/maintenance/run-rto')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewCount).toBe(1);
      expect(res.body.data.rtoCount).toBe(0);

      // Status must NOT be updated to RETURNED
      expect(mockPrisma.shipment.update).not.toHaveBeenCalled();

      // NEEDS_RTO_REVIEW event recorded
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipmentId: 'ship-review-candidate',
            reasonCode: 'NEEDS_RTO_REVIEW',
            actorType: 'SYSTEM',
          }),
        })
      );
    });
  });

  describe('Failure Reasons CRUD (GET/POST/PATCH)', () => {
    test('GET /failure-reasons returns reasons and seeds defaults if none exist', async () => {
      // First call returns empty, triggers createMany, then returns seeded list
      mockPrisma.deliveryFailureReason.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { id: 'r-1', code: 'CUSTOMER_ABSENT', labelAr: 'العميل غير متواجد', requiresReschedule: true },
          { id: 'r-2', code: 'REFUSED', labelAr: 'رفض الاستلام من قبل العميل', requiresReschedule: false },
        ]);

      mockPrisma.deliveryFailureReason.createMany.mockResolvedValueOnce({ count: 6 });

      const res = await request(app)
        .get('/api/v1/shipping-portal/failure-reasons')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(mockPrisma.deliveryFailureReason.createMany).toHaveBeenCalled();
    });

    test('POST /failure-reasons creates a custom failure reason', async () => {
      mockPrisma.deliveryFailureReason.findFirst.mockResolvedValueOnce(null);
      mockPrisma.deliveryFailureReason.create.mockResolvedValueOnce({
        id: 'r-custom-1',
        companyId,
        code: 'CUSTOMER_TRAVELING',
        labelAr: 'العميل مسافر',
        labelEn: 'Customer Traveling',
        requiresReschedule: true,
        isActive: true,
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/failure-reasons')
        .send({
          code: 'customer_traveling',
          labelAr: 'العميل مسافر',
          labelEn: 'Customer Traveling',
          requiresReschedule: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('CUSTOMER_TRAVELING');
    });

    test('POST /failure-reasons returns 409 if code already exists', async () => {
      mockPrisma.deliveryFailureReason.findFirst.mockResolvedValueOnce({
        id: 'r-existing',
        code: 'WRONG_ADDRESS',
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/failure-reasons')
        .send({
          code: 'WRONG_ADDRESS',
          labelAr: 'عنوان خاطئ',
        })
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('مسجل مسبقاً');
    });

    test('PATCH /failure-reasons/:id updates failure reason details', async () => {
      mockPrisma.deliveryFailureReason.findFirst.mockResolvedValueOnce({
        id: 'r-update-1',
        companyId,
        code: 'POSTPONED',
      });

      mockPrisma.deliveryFailureReason.update.mockResolvedValueOnce({
        id: 'r-update-1',
        labelAr: 'تأجيل بناء على طلب العميل',
        requiresReschedule: true,
        isActive: true,
      });

      const res = await request(app)
        .patch('/api/v1/shipping-portal/failure-reasons/r-update-1')
        .send({
          labelAr: 'تأجيل بناء على طلب العميل',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.labelAr).toBe('تأجيل بناء على طلب العميل');
    });

    test('rejects failure reason management if user role is unauthorized', async () => {
      mockUser.role = 'GUEST';

      const res = await request(app)
        .post('/api/v1/shipping-portal/failure-reasons')
        .send({
          code: 'HACK',
          labelAr: 'اختراق',
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('غير مصرح لك');
    });
  });
});
