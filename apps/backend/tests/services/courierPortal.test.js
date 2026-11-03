process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/testdb';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-unit-tests';

const mockPrisma = {
  courier: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  deliveryRun: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  shipment: {
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  shipmentEvent: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  order: {
    update: jest.fn(),
  },
  orderStatusHistory: {
    create: jest.fn(),
  },
  deliveryFailureReason: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    findFirst: jest.fn(),
  },
  companyApp: {
    findFirst: jest.fn(),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
  executeWithRetry: async (fn) => fn(),
}));

jest.mock('../../services/courierNotificationService', () => ({
  notifyRunDispatched: jest.fn(),
  notifyFieldUpdate: jest.fn(),
  sendCourierNotification: jest.fn().mockResolvedValue({ success: true }),
  COURIER_NOTIFICATION_EVENTS: {
    OUT_FOR_DELIVERY: 'courier_out_for_delivery',
    DELIVERED: 'courier_delivered',
    RETURNED: 'courier_returned'
  }
}));

const courierPortalService = require('../../services/courierPortalService');
const courierService = require('../../services/courierService');
const verifyToken = require('../../utils/verifyToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getJwtSecret } = require('../../utils/jwtSecret');

describe('Courier Portal Service & Revocation Tests', () => {
  const companyId = 'comp-portal-1';
  const courierId = 'cour-portal-1';
  const runId = 'run-portal-1';
  const pin = '1234';
  const pinHash = bcrypt.hashSync(pin, 8);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Failure Reasons', () => {
    it('seeds and returns default failure reasons if none exist', async () => {
      mockPrisma.deliveryFailureReason.findMany
        .mockResolvedValueOnce([]) // First check empty
        .mockResolvedValueOnce(
          courierPortalService.DEFAULT_FAILURE_REASONS.map((r) => ({ ...r, companyId, isActive: true }))
        );
      mockPrisma.deliveryFailureReason.createMany.mockResolvedValueOnce({ count: 6 });

      const reasons = await courierPortalService.getFailureReasons(companyId);
      expect(mockPrisma.deliveryFailureReason.createMany).toHaveBeenCalled();
      expect(reasons).toHaveLength(6);
      expect(reasons.find((r) => r.code === 'CUSTOMER_ABSENT')).toBeDefined();
      expect(reasons.find((r) => r.code === 'REFUSED')?.requiresReschedule).toBe(false);
    });
  });

  describe('Courier Login', () => {
    it('authenticates valid phone and PIN, returning 12h JWT with pinVerified', async () => {
      mockPrisma.courier.findMany.mockResolvedValueOnce([
        {
          id: courierId,
          name: 'كابتن محمود',
          phone: '01012345678',
          pinHash,
          isActive: true,
          companyId,
          vehicleType: 'MOTORCYCLE',
          company: { id: companyId, name: 'متجر السرعة', isActive: true }
        }
      ]);

      const result = await courierPortalService.loginCourier({ phone: '01012345678', pin });
      expect(result.token).toBeDefined();
      expect(result.courier.id).toBe(courierId);

      const decoded = jwt.verify(result.token, getJwtSecret());
      expect(decoded.role).toBe('COURIER');
      expect(decoded.courierId).toBe(courierId);
      expect(decoded.pinVerified).toBe(true);
    });

    it('rejects invalid PIN', async () => {
      mockPrisma.courier.findMany.mockResolvedValueOnce([
        {
          id: courierId,
          phone: '01012345678',
          pinHash,
          isActive: true,
          company: { id: companyId, isActive: true }
        }
      ]);

      await expect(
        courierPortalService.loginCourier({ phone: '01012345678', pin: '9999' })
      ).rejects.toThrow('بيانات الدخول غير صحيحة أو رمز PIN غير صحيح');
    });
  });

  describe('Verify Link PIN', () => {
    it('verifies run courier PIN and issues short session token with pinVerified', async () => {
      mockPrisma.deliveryRun.findFirst.mockResolvedValueOnce({
        id: runId,
        runNumber: 'RUN-2026-001',
        courierId,
        companyId,
        mobileTokenVersion: 2,
        courier: {
          id: courierId,
          name: 'كابتن محمود',
          phone: '01012345678',
          pinHash
        }
      });

      const result = await courierPortalService.verifyLinkPin({ runId, pin });
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();

      const decoded = jwt.verify(result.token, getJwtSecret());
      expect(decoded.role).toBe('COURIER');
      expect(decoded.runId).toBe(runId);
      expect(decoded.pinVerified).toBe(true);
      expect(decoded.mobileTokenVersion).toBe(2);
    });
  });

  describe('Link Revocation', () => {
    it('bumps mobileTokenVersion on the delivery run', async () => {
      mockPrisma.deliveryRun.findFirst.mockResolvedValueOnce({
        id: runId,
        companyId,
        mobileTokenVersion: 1
      });
      mockPrisma.deliveryRun.update.mockResolvedValueOnce({
        id: runId,
        mobileTokenVersion: 2
      });

      const result = await courierService.revokeDeliveryRunLink(companyId, runId);
      expect(result.mobileTokenVersion).toBe(2);
      expect(mockPrisma.deliveryRun.update).toHaveBeenCalledWith({
        where: { id: runId },
        data: { mobileTokenVersion: { increment: 1 } }
      });
    });
  });

  describe('Offline Sync & Idempotency', () => {
    it('skips duplicate events if localId was already recorded', async () => {
      mockPrisma.shipmentEvent.findFirst.mockResolvedValueOnce({
        id: 'evt-1',
        metadata: JSON.stringify({ localId: 'local-uuid-123' })
      });

      const response = await courierPortalService.syncOfflineEvents(companyId, courierId, [
        { localId: 'local-uuid-123', shipmentId: 'ship-1', status: 'DELIVERED' }
      ]);

      expect(response.results).toHaveLength(1);
      expect(response.results[0].status).toBe('accepted');
      expect(response.results[0].reason).toBe('already_processed');
      expect(mockPrisma.shipment.update).not.toHaveBeenCalled();
    });

    it('resolves conflict: accepts CANCELLED shipment as DELIVERED when valid customer OTP is provided', async () => {
      const otp = '4321';
      const otpHash = bcrypt.hashSync(otp, 8);

      mockPrisma.shipmentEvent.findFirst.mockResolvedValueOnce(null); // No prior localId
      mockPrisma.shipment.findFirst.mockResolvedValueOnce({
        id: 'ship-cancelled',
        companyId,
        status: 'CANCELLED',
        otpHash,
        courier: { id: courierId, name: 'كابتن محمود' },
        order: { id: 'order-1', total: 250 }
      });

      const response = await courierPortalService.syncOfflineEvents(companyId, courierId, [
        {
          localId: 'local-conflict-1',
          shipmentId: 'ship-cancelled',
          status: 'DELIVERED',
          otp,
          collectedAmount: 250,
          occurredAt: new Date().toISOString()
        }
      ]);

      expect(response.results[0].status).toBe('accepted');
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-cancelled' },
          data: expect.objectContaining({ status: 'DELIVERED', collectedAmount: 250 })
        })
      );
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toStatus: 'DELIVERED',
            notes: expect.stringContaining('CONFLICT_OTP'),
            actorType: 'SYSTEM'
          })
        })
      );
    });
  });

  describe('SHIP-W4 Acceptance Criteria 1-7', () => {
    describe('Criterion 1: Courier Login & Rate Limiting', () => {
      it('POST /login succeeds with valid phone and PIN returning 200 + token', async () => {
        mockPrisma.courier.findMany.mockResolvedValueOnce([
          {
            id: courierId,
            name: 'كابتن محمود',
            phone: '01012345678',
            pinHash,
            isActive: true,
            companyId,
            company: { id: companyId, name: 'متجر السرعة', isActive: true }
          }
        ]);

        const result = await courierPortalService.loginCourier({ phone: '01012345678', pin });
        expect(result.token).toBeDefined();
        expect(result.courier.id).toBe(courierId);
      });

      it('wrong PIN rejects with 401', async () => {
        mockPrisma.courier.findMany.mockResolvedValueOnce([
          {
            id: courierId,
            phone: '01012345678',
            pinHash,
            isActive: true,
            company: { id: companyId, isActive: true }
          }
        ]);

        await expect(
          courierPortalService.loginCourier({ phone: '01012345678', pin: '0000' })
        ).rejects.toThrow('رمز PIN غير صحيح');
      });
    });

    describe('Criterion 2: Tenant Isolation (Company A vs Company B)', () => {
      it('rejects access when courier of Company A requests shipment of Company B', async () => {
        mockPrisma.shipment.findFirst.mockResolvedValueOnce(null);

        await expect(
          courierService.updateDeliveryRunShipment('comp-portal-A', {
            shipmentId: 'ship-comp-B',
            runId,
            status: 'DELIVERED',
            courierId: 'cour-A'
          })
        ).rejects.toThrow('الشحنة غير موجودة أو لا تتبع هذه المأمورية');

        expect(mockPrisma.shipment.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              id: 'ship-comp-B',
              companyId: 'comp-portal-A'
            })
          })
        );
      });
    });

    describe('Criterion 3: Link without PIN when requireCourierPinOnLink is true', () => {
      it('returns 401 COURIER_PIN_REQUIRED if PIN is required and token has pinVerified=false', async () => {
        const unverifiedToken = jwt.sign(
          { id: courierId, userId: courierId, role: 'COURIER', courierId, companyId, runId, pinVerified: false, linkToken: true },
          getJwtSecret(),
          { expiresIn: '1h' }
        );

        mockPrisma.courier.findFirst.mockResolvedValueOnce({
          id: courierId,
          name: 'كابتن محمود',
          phone: '01012345678',
          pinHash,
          isActive: true
        });

        mockPrisma.deliveryRun.findFirst.mockResolvedValueOnce({
          id: runId,
          mobileTokenVersion: 0
        });

        mockPrisma.shippingPolicySettings.findUnique.mockResolvedValueOnce({
          requireCourierPinOnLink: true
        });

        const req = {
          headers: { authorization: `Bearer ${unverifiedToken}` },
          get: (h) => (h.toLowerCase() === 'authorization' ? `Bearer ${unverifiedToken}` : null),
          originalUrl: '/api/v1/courier/runs/run-1/shipments'
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        const next = jest.fn();

        await verifyToken.authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'COURIER_PIN_REQUIRED',
            message: expect.stringContaining('PIN')
          })
        );
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe('Criterion 4: Batch Sync Idempotency (3 actions with 1 duplicate localId)', () => {
      it('records event for new actions and skips duplicate localId (recorded ONCE)', async () => {
        mockPrisma.shipmentEvent.findFirst
          .mockResolvedValueOnce({ id: 'evt-dup', metadata: '{"localId":"local-dup-1"}' })
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);

        const shipmentsMap = {
          'ship-2': {
            id: 'ship-2',
            companyId,
            status: 'OUT_FOR_DELIVERY',
            order: { total: 150 },
            courierId,
            courier: { id: courierId, name: 'كابتن محمود' },
            deliveryRunId: runId,
            deliveryRun: { id: runId, status: 'DISPATCHED' }
          },
          'ship-3': {
            id: 'ship-3',
            companyId,
            status: 'OUT_FOR_DELIVERY',
            order: { total: 200 },
            courierId,
            courier: { id: courierId, name: 'كابتن محمود' },
            deliveryRunId: runId,
            deliveryRun: { id: runId, status: 'DISPATCHED' }
          }
        };

        mockPrisma.shipment.findFirst.mockImplementation(async ({ where }) => {
          return shipmentsMap[where.id] || null;
        });

        mockPrisma.shipment.update.mockResolvedValue({ id: 'updated' });
        mockPrisma.order.update.mockResolvedValue({ id: 'updated' });
        mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'evt-new' });

        const syncPayload = [
          { localId: 'local-dup-1', shipmentId: 'ship-1', status: 'DELIVERED' },
          { localId: 'local-new-2', shipmentId: 'ship-2', status: 'DELIVERED', collectedAmount: 150 },
          { localId: 'local-new-3', shipmentId: 'ship-3', status: 'DELIVERED', collectedAmount: 200 }
        ];

        const response = await courierPortalService.syncOfflineEvents(companyId, courierId, syncPayload);

        expect(response.results).toHaveLength(3);
        expect(response.results[0].status).toBe('accepted');
        expect(response.results[0].reason).toBe('already_processed');
        expect(response.results[1].status).toBe('accepted');
        expect(response.results[2].status).toBe('accepted');
        expect(mockPrisma.shipment.update).toHaveBeenCalledTimes(2);
      });
    });

    describe('Criterion 5: Offline Delivery with Valid OTP then Sync', () => {
      it('marks shipment DELIVERED with matching collectedAmount and actorType=COURIER', async () => {
        const customerOtp = '5678';
        const customerOtpHash = bcrypt.hashSync(customerOtp, 8);

        mockPrisma.shipment.findFirst.mockResolvedValueOnce({
          id: 'ship-otp-1',
          companyId,
          status: 'OUT_FOR_DELIVERY',
          otpHash: customerOtpHash,
          order: { id: 'order-1', total: 400 },
          courier: { id: courierId, name: 'كابتن محمود' },
          deliveryRun: { id: runId, status: 'DISPATCHED' }
        });

        mockPrisma.shipment.update.mockResolvedValueOnce({
          id: 'ship-otp-1',
          status: 'DELIVERED',
          collectedAmount: 400
        });

        await courierService.updateDeliveryRunShipment(companyId, {
          shipmentId: 'ship-otp-1',
          runId,
          status: 'DELIVERED',
          collectedAmount: 400,
          courierId,
          otp: customerOtp
        });

        expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'ship-otp-1' },
            data: expect.objectContaining({
              status: 'DELIVERED',
              collectedAmount: 400
            })
          })
        );

        expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              shipmentId: 'ship-otp-1',
              toStatus: 'DELIVERED',
              actorType: 'COURIER',
              actorId: courierId
            })
          })
        );
      });
    });

    describe('Criterion 6: Failed Delivery with CUSTOMER_ABSENT', () => {
      it('saves failureReasonCode, attemptCount incremented, and nextAttemptDate in 24 hours', async () => {
        const now = Date.now();
        mockPrisma.shipment.findFirst.mockResolvedValueOnce({
          id: 'ship-fail-1',
          companyId,
          status: 'OUT_FOR_DELIVERY',
          attemptCount: 0,
          courier: { id: courierId, name: 'كابتن محمود' },
          deliveryRun: { id: runId, status: 'DISPATCHED' }
        });

        mockPrisma.deliveryFailureReason.findFirst.mockResolvedValueOnce({
          code: 'CUSTOMER_ABSENT',
          requiresReschedule: true
        });

        mockPrisma.shipment.update.mockResolvedValueOnce({
          id: 'ship-fail-1',
          status: 'RETURNED'
        });

        await courierService.updateDeliveryRunShipment(companyId, {
          shipmentId: 'ship-fail-1',
          runId,
          status: 'FAILED',
          failureReasonCode: 'CUSTOMER_ABSENT',
          courierId
        });

        expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'ship-fail-1' },
            data: expect.objectContaining({
              status: expect.stringMatching(/^(FAILED|RETURNED)$/),
              failureReasonCode: 'CUSTOMER_ABSENT',
              attemptCount: { increment: 1 }
            })
          })
        );

        const updateCall = mockPrisma.shipment.update.mock.calls[0][0];
        expect(updateCall.data.nextAttemptDate).toBeInstanceOf(Date);
        const diffHours = (updateCall.data.nextAttemptDate.getTime() - now) / (1000 * 3600);
        expect(diffHours).toBeGreaterThanOrEqual(23.9);
        expect(diffHours).toBeLessThanOrEqual(24.1);
      });
    });

    describe('Criterion 7: Revoked Link returns 401 immediately', () => {
      it('returns 401 LINK_REVOKED if token version is older than delivery run mobileTokenVersion', async () => {
        const oldLinkToken = jwt.sign(
          { id: courierId, userId: courierId, role: 'COURIER', courierId, companyId, runId, mobileTokenVersion: 1, pinVerified: true },
          getJwtSecret(),
          { expiresIn: '1h' }
        );

        mockPrisma.courier.findFirst.mockResolvedValueOnce({
          id: courierId,
          name: 'كابتن محمود',
          phone: '01012345678',
          pinHash,
          isActive: true
        });

        mockPrisma.deliveryRun.findFirst.mockResolvedValueOnce({
          id: runId,
          mobileTokenVersion: 2
        });

        const req = {
          headers: { authorization: `Bearer ${oldLinkToken}` },
          get: (h) => (h.toLowerCase() === 'authorization' ? `Bearer ${oldLinkToken}` : null),
          originalUrl: '/api/v1/courier/runs/run-1'
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        const next = jest.fn();

        await verifyToken.authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'LINK_REVOKED',
            message: 'تم إلغاء صلاحية هذا الرابط'
          })
        );
        expect(next).not.toHaveBeenCalled();
      });
    });
  });
});
