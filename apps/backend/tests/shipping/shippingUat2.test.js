/**
 * SHIP-UAT-2: Shipping Policy API, Live RTO Maintenance, Courier Settlement, and Linked Support Tickets
 */

const request = require('supertest');
const express = require('express');

const mockPrisma = {
  shippingPolicySettings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  shipment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
  },
  deliveryRun: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  treasuryAccount: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  treasuryTransaction: {
    create: jest.fn(),
  },
  courier: {
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
  },
  courierCommission: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn().mockResolvedValue([]),
  },
  companyApp: {
    findFirst: jest.fn(),
  },
  returnRequest: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  supportTicket: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  supportMessage: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-uat2-owner',
  companyId: 'company-uat2-a',
  role: 'OWNER',
  firstName: 'Owner',
  lastName: 'User',
  email: 'owner@company-a.com',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    if (!mockUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    req.user = mockUser;
    next();
  },
  requireRole: (roles) => (req, res, next) => {
    if (!mockUser) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  },
}));

const checkAppAccessMock = jest.fn(() => (req, res, next) => next());
checkAppAccessMock.checkAppAccess = checkAppAccessMock;

jest.mock('../../middleware/checkAppAccess', () => checkAppAccessMock);

const shippingPolicyRoutes = require('../../routes/shippingPolicyRoutes');
const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');
const courierRoutes = require('../../routes/courierRoutes');
const supportRoutes = require('../../routes/supportRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping', shippingPolicyRoutes);
app.use('/api/v1/shipping-portal', shippingPortalRoutes);
app.use('/api/v1/couriers', courierRoutes);
app.use('/api/v1/support', supportRoutes);

describe('SHIP-UAT-2: Policy API, RTO, Courier Settlement, and Support Tickets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-uat2-owner',
      companyId: 'company-uat2-a',
      role: 'OWNER',
      firstName: 'Owner',
      lastName: 'User',
      email: 'owner@company-a.com',
    };
  });

  describe('1. Shipping Policy API (GET / PUT /api/v1/shipping/policy)', () => {
    test('GET /policy returns default settings if company has none stored', async () => {
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/shipping/policy')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.deliveryAttempts).toBe(3);
      expect(res.body.data.afterAttemptsAction).toBe('REVIEW');
      expect(res.body.data.companyId).toBe('company-uat2-a');
    });

    test('PUT /policy updates whitelisted fields and persists via upsert', async () => {
      mockPrisma.shippingPolicySettings.upsert.mockResolvedValueOnce({
        id: 'pol-1',
        companyId: 'company-uat2-a',
        deliveryAttempts: 4,
        attemptIntervalHours: 48,
        afterAttemptsAction: 'RTO',
        codSettlementMode: 'AUTO',
        proofOfDelivery: 'OTP',
        publicTrackingMode: 'WAYBILL',
        clientPortalEnabled: true,
        courierPortalEnabled: true,
        offlineEnabled: false,
        maxShipmentsPerCourierPerDay: 50,
        maxWeightKg: 10,
        maxCodAmount: 5000,
        invoiceVatPercent: 14,
      });

      const res = await request(app)
        .put('/api/v1/shipping/policy')
        .send({
          deliveryAttempts: 4,
          afterAttemptsAction: 'RTO',
          attemptIntervalHours: 48,
          offlineEnabled: false,
          maxShipmentsPerCourierPerDay: 50,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockPrisma.shippingPolicySettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 'company-uat2-a' },
          update: expect.objectContaining({
            deliveryAttempts: 4,
            afterAttemptsAction: 'RTO',
            attemptIntervalHours: 48,
            offlineEnabled: false,
            maxShipmentsPerCourierPerDay: 50,
          }),
        })
      );
    });

    test('PUT /policy rejects non-whitelisted keys with HTTP 400', async () => {
      const res = await request(app)
        .put('/api/v1/shipping/policy')
        .send({
          deliveryAttempts: 3,
          maliciousKey: 'attack_payload',
          anotherUnknown: true,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('مفاتيح غير مسموح بها');
      expect(mockPrisma.shippingPolicySettings.upsert).not.toHaveBeenCalled();
    });

    test('Policy API blocks unauthorized roles with 403', async () => {
      mockUser = { id: 'u-courier', companyId: 'company-uat2-a', role: 'COURIER' };

      await request(app).get('/api/v1/shipping/policy').expect(403);
      await request(app).put('/api/v1/shipping/policy').send({ deliveryAttempts: 2 }).expect(403);
    });

    test('Cross-tenant isolation: company B cannot view or modify company A policy', async () => {
      mockUser = { id: 'u-comp-b', companyId: 'company-uat2-b', role: 'COMPANY_ADMIN' };
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValueOnce({
        companyId: 'company-uat2-b',
        deliveryAttempts: 5,
        afterAttemptsAction: 'REVIEW',
      });

      const getRes = await request(app).get('/api/v1/shipping/policy').expect(200);
      expect(mockPrisma.shippingPolicySettings.findUnique).toHaveBeenCalledWith({
        where: { companyId: 'company-uat2-b' },
      });
      expect(getRes.body.data.companyId).toBe('company-uat2-b');
    });
  });

  describe('2. Scenario D8 — RTO Maintenance Flow', () => {
    test('D8.1 RTO mode: shipment with attemptCount=3 transitions to RETURNED + logs AUTO_RTO event', async () => {
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValueOnce({
        companyId: 'company-uat2-a',
        deliveryAttempts: 3,
        afterAttemptsAction: 'RTO',
      });

      mockPrisma.shipment.findMany.mockResolvedValueOnce([
        {
          id: 'shipment-d8-1',
          companyId: 'company-uat2-a',
          trackingNumber: 'TRK-D8-001',
          status: 'FAILED',
          attemptCount: 3,
          events: [],
        },
      ]);

      mockPrisma.shipment.update.mockResolvedValueOnce({
        id: 'shipment-d8-1',
        status: 'RETURNED',
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/maintenance/run-rto')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rtoCount).toBe(1);
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'shipment-d8-1' },
          data: expect.objectContaining({ status: 'RETURNED' }),
        })
      );
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipmentId: 'shipment-d8-1',
            toStatus: 'RETURNED',
            reasonCode: 'AUTO_RTO',
            actorType: 'SYSTEM',
          }),
        })
      );
    });

    test('D8.2 REVIEW mode: shipment status is NOT changed and NEEDS_RTO_REVIEW event is tagged', async () => {
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValueOnce({
        companyId: 'company-uat2-a',
        deliveryAttempts: 3,
        afterAttemptsAction: 'REVIEW',
      });

      mockPrisma.shipment.findMany.mockResolvedValueOnce([
        {
          id: 'shipment-d8-2',
          companyId: 'company-uat2-a',
          trackingNumber: 'TRK-D8-002',
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
      expect(mockPrisma.shipment.update).not.toHaveBeenCalled();
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipmentId: 'shipment-d8-2',
            reasonCode: 'NEEDS_RTO_REVIEW',
            actorType: 'SYSTEM',
          }),
        })
      );
    });
  });

  describe('3. Scenario D9 — Courier Settlement', () => {
    test('settling run with 1 delivered (COD 100) and 1 failed marks run SETTLED, creates treasury deposit, and creates DUE commission for delivered parcel only', async () => {
      const mockRun = {
        id: 'run-d9-1',
        companyId: 'company-uat2-a',
        courierId: 'courier-d9',
        runNumber: 'RUN-20261104-001',
        status: 'DISPATCHED',
        courier: {
          id: 'courier-d9',
          name: 'كابتن محمود',
          commissionType: 'FIXED_PER_ORDER',
          commissionAmount: 25,
        },
        shipments: [
          {
            id: 'ship-delivered',
            status: 'DELIVERED',
            collectedAmount: 100,
            orderId: null,
            order: null,
          },
          {
            id: 'ship-failed',
            status: 'FAILED',
            collectedAmount: 0,
            orderId: null,
            order: null,
          },
        ],
      };

      mockPrisma.deliveryRun.findFirst.mockResolvedValueOnce(mockRun);
      mockPrisma.deliveryRun.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrisma.deliveryRun.update.mockResolvedValueOnce({ ...mockRun, status: 'SETTLED' });

      mockPrisma.treasuryAccount.findFirst.mockResolvedValue({
        id: 'treasury-main',
        companyId: 'company-uat2-a',
        name: 'الخزينة الرئيسية',
        balance: 1000,
      });
      mockPrisma.treasuryAccount.update.mockResolvedValueOnce({
        id: 'treasury-main',
        balance: 1100,
      });

      mockPrisma.treasuryTransaction.create.mockResolvedValueOnce({
        id: 'txn-1',
        type: 'DEPOSIT',
        amount: 100,
      });

      mockPrisma.courierCommission.createMany.mockResolvedValueOnce({ count: 1 });

      const res = await request(app)
        .post('/api/v1/couriers/runs/run-d9-1/settle')
        .send({
          actualCashReceived: 100,
        })
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify delivery run claimed as SETTLED with totalCODCollected = 100
      expect(mockPrisma.deliveryRun.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'run-d9-1', companyId: 'company-uat2-a', status: { notIn: ['SETTLED'] } },
          data: expect.objectContaining({
            status: 'SETTLED',
            totalCODCollected: 100,
          }),
        })
      );

      // Verify treasury deposit transaction created
      expect(mockPrisma.treasuryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-uat2-a',
            amount: 100,
            type: 'DEPOSIT',
            referenceType: 'COURIER_REMITTANCE',
            referenceId: 'run-d9-1',
          }),
        })
      );

      // Verify CourierCommission created for the 1 delivered shipment only (status DUE)
      expect(mockPrisma.courierCommission.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              courierId: 'courier-d9',
              deliveryRunId: 'run-d9-1',
              shipmentId: 'ship-delivered',
              amount: 25,
              status: 'DUE',
            }),
          ],
        })
      );
    });

    test('GET /api/v1/couriers/commissions lists DUE commissions', async () => {
      mockPrisma.courierCommission.groupBy.mockResolvedValueOnce([
        {
          courierId: 'courier-d9',
          status: 'DUE',
          _sum: { amount: 25 },
          _count: { _all: 1 },
        },
      ]);
      mockPrisma.courierCommission.findMany.mockResolvedValueOnce([
        {
          id: 'comm-1',
          courierId: 'courier-d9',
          amount: 25,
          status: 'DUE',
          shipmentId: 'ship-delivered',
          courier: { id: 'courier-d9', name: 'كابتن محمود', phone: '01000000000' },
        },
      ]);
      mockPrisma.courierCommission.count.mockResolvedValueOnce(1);
      mockPrisma.courier.findMany.mockResolvedValueOnce([
        { id: 'courier-d9', name: 'كابتن محمود', phone: '01000000000' },
      ]);

      const res = await request(app)
        .get('/api/v1/couriers/commissions')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('DUE');
      expect(res.body.data[0].amount).toBe(25);
    });
  });

  describe('4. Scenario D13 — Support Ticket Linked to Shipment', () => {
    test('creates support ticket linked to shipmentId + subject contains waybill number', async () => {
      mockPrisma.supportTicket.create.mockResolvedValueOnce({
        id: 'tkt-cuid-1',
        ticketId: 'TKT-SHIP-001',
        subject: 'استفسار عن الشحنة #TRK-20261104-999',
        description: 'متابعة موعد تسليم الشحنة',
        category: 'INQUIRY',
        status: 'OPEN',
        userId: 'user-uat2-owner',
        companyId: 'company-uat2-a',
        shipmentId: 'shipment-target-id',
        orderId: 'order-target-id',
        priority: 'MEDIUM',
      });

      mockPrisma.supportMessage.create.mockResolvedValueOnce({
        id: 'msg-1',
        content: 'متابعة موعد تسليم الشحنة',
      });

      const res = await request(app)
        .post('/api/v1/support/tickets')
        .send({
          subject: 'استفسار عن الشحنة #TRK-20261104-999',
          content: 'متابعة موعد تسليم الشحنة',
          category: 'inquiry',
          shipmentId: 'shipment-target-id',
          orderId: 'order-target-id',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.ticket.status).toBe('open');
      expect(res.body.ticket.shipmentId).toBe('shipment-target-id');
      expect(mockPrisma.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipmentId: 'shipment-target-id',
            orderId: 'order-target-id',
            companyId: 'company-uat2-a',
          }),
        })
      );
    });

    test('GET /api/v1/support/tickets lists company tickets and includes messageCount', async () => {
      mockPrisma.supportTicket.findMany.mockResolvedValueOnce([
        {
          id: 'tkt-cuid-1',
          ticketId: 'TKT-SHIP-001',
          subject: 'استفسار عن الشحنة #TRK-20261104-999',
          status: 'OPEN',
          category: 'INQUIRY',
          companyId: 'company-uat2-a',
          shipmentId: 'shipment-target-id',
          _count: { SupportMessage: 2 },
          SupportMessage: [{ content: 'رسالة 2' }],
        },
      ]);
      mockPrisma.supportTicket.count.mockResolvedValueOnce(1);

      const res = await request(app)
        .get('/api/v1/support/tickets')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.tickets).toHaveLength(1);
      expect(res.body.tickets[0].messageCount).toBe(2);
      expect(res.body.tickets[0].shipmentId).toBe('shipment-target-id');
    });

    test('adding message to ticket adds SupportMessage', async () => {
      mockPrisma.supportTicket.findFirst.mockResolvedValueOnce({
        id: 'tkt-cuid-1',
        ticketId: 'TKT-SHIP-001',
        userId: 'user-uat2-owner',
        companyId: 'company-uat2-a',
        status: 'OPEN',
      });
      mockPrisma.supportMessage.create.mockResolvedValueOnce({
        id: 'msg-2',
        content: 'تحديث من العميل',
      });

      const res = await request(app)
        .post('/api/v1/support/tickets/TKT-SHIP-001/messages')
        .send({ content: 'تحديث من العميل' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockPrisma.supportMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'tkt-cuid-1',
            content: 'تحديث من العميل',
          }),
        })
      );
    });

    test('company owner/admin can close ticket (status: CLOSED)', async () => {
      mockPrisma.supportTicket.findFirst.mockResolvedValueOnce({
        id: 'tkt-cuid-1',
        ticketId: 'TKT-SHIP-001',
        userId: 'user-uat2-owner',
        companyId: 'company-uat2-a',
        status: 'OPEN',
      });
      mockPrisma.supportTicket.update.mockResolvedValueOnce({
        id: 'tkt-cuid-1',
        ticketId: 'TKT-SHIP-001',
        status: 'CLOSED',
        closedAt: new Date(),
        companyId: 'company-uat2-a',
      });

      const res = await request(app)
        .patch('/api/v1/support/tickets/TKT-SHIP-001/status')
        .send({ status: 'closed' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockPrisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tkt-cuid-1' },
          data: expect.objectContaining({
            status: 'CLOSED',
          }),
        })
      );
    });
  });
});
