/**
 * SHIP-T1 Acceptance Tests: Shipping Status Machine & Returns Lifecycle (Turbo reference)
 *
 * Verifies Acceptance Criteria:
 * 1. ASSIGNED -> DELIVERED directly -> 409 INVALID_TRANSITION (must go OUT_FOR_DELIVERY first).
 * 2. OUT_FOR_DELIVERY -> DELIVERED -> 200 + event + collectedAmount.
 * 3. FAILED x3 -> RETURNED_AT_COMPANY (RTO policy) -> 200.
 * 4. RETURNED_AT_COMPANY -> RETURNED_DAMAGED / RETURNED_LOST -> 200 + deduction in courier commission.
 * 5. RETURNED_RECEIVED -> RESHIPPED -> 200 + child shipment linked to parent via parentShipmentId.
 * 6. DELIVERED -> REMITTED -> 200 + remittedAt recorded.
 * 7. Policy settings toggle disables optional statuses (POSTPONED, RESHIPPED, INCOMPLETE).
 * 8. Public tracking returns customer-friendly status without operational jargon.
 */

const request = require('supertest');
const express = require('express');

// Mock Prisma
const mockPrisma = {
  shipment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  courierCommission: {
    create: jest.fn(),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(),
  },
  deliveryFailureReason: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-ops-1',
  companyId: 'company-t1-test',
  role: 'OPERATIONS',
  name: 'Operations Officer',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = mockUser;
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

jest.mock('../../middleware/checkAppAccess', () => () => (req, res, next) => next());

const shippingStatusMachine = require('../../services/shipping/shippingStatusMachine');
const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');
const publicShipmentTrackingController = require('../../controller/publicShipmentTrackingController');

const app = express();
app.use(express.json());
app.use('/api/shipping-portal', shippingPortalRoutes);
app.get('/api/public/shipments/track/:waybill', publicShipmentTrackingController.trackShipmentByWaybill);

describe('SHIP-T1: Shipping Status Machine & Returns Lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Directed Graph Transitions & Validation', () => {
    it('rejects ASSIGNED -> DELIVERED directly with INVALID_TRANSITION (Criterion 1)', () => {
      const allowed = shippingStatusMachine.canTransition('ASSIGNED', 'DELIVERED');
      expect(allowed).toBe(false);

      const transitions = shippingStatusMachine.getAllowedTransitions('ASSIGNED');
      expect(transitions).not.toContain('DELIVERED');
      expect(transitions).toContain('PICKED_UP');
      expect(transitions).toContain('OUT_FOR_DELIVERY');
      expect(transitions).toContain('CANCELLED');
    });

    it('allows OUT_FOR_DELIVERY -> DELIVERED (Criterion 2)', () => {
      const allowed = shippingStatusMachine.canTransition('OUT_FOR_DELIVERY', 'DELIVERED');
      expect(allowed).toBe(true);
    });

    it('allows FAILED -> OUT_FOR_DELIVERY (Reattempt) and FAILED -> RETURNED_AT_COMPANY (Criterion 3)', () => {
      expect(shippingStatusMachine.canTransition('FAILED', 'OUT_FOR_DELIVERY')).toBe(true);
      expect(shippingStatusMachine.canTransition('FAILED', 'RETURNED_AT_COMPANY')).toBe(true);
    });

    it('allows RETURNED_AT_COMPANY -> RETURNED_DAMAGED / RETURNED_LOST / RETURNED_RECEIVED (Criterion 4)', () => {
      expect(shippingStatusMachine.canTransition('RETURNED_AT_COMPANY', 'RETURNED_DAMAGED')).toBe(true);
      expect(shippingStatusMachine.canTransition('RETURNED_AT_COMPANY', 'RETURNED_LOST')).toBe(true);
      expect(shippingStatusMachine.canTransition('RETURNED_AT_COMPANY', 'RETURNED_RECEIVED')).toBe(true);
    });

    it('allows RETURNED_RECEIVED -> RESHIPPED and RETURNED_RECEIVED -> CLOSED (Criterion 5)', () => {
      expect(shippingStatusMachine.canTransition('RETURNED_RECEIVED', 'RESHIPPED')).toBe(true);
      expect(shippingStatusMachine.canTransition('RETURNED_RECEIVED', 'CLOSED')).toBe(true);
    });

    it('allows DELIVERED -> REMITTED when not yet remitted, rejects once remitted (Criterion 6)', () => {
      expect(shippingStatusMachine.canTransition('DELIVERED', 'REMITTED', { remittedAt: null })).toBe(true);
      expect(shippingStatusMachine.canTransition('DELIVERED', 'REMITTED', { remittedAt: new Date() })).toBe(false);
    });

    it('permits CANCELLED only from initial stages (PENDING, ASSIGNED, INCOMPLETE)', () => {
      expect(shippingStatusMachine.canTransition('PENDING', 'CANCELLED')).toBe(true);
      expect(shippingStatusMachine.canTransition('ASSIGNED', 'CANCELLED')).toBe(true);
      expect(shippingStatusMachine.canTransition('INCOMPLETE', 'CANCELLED')).toBe(true);
      expect(shippingStatusMachine.canTransition('DELIVERED', 'CANCELLED')).toBe(false);
      expect(shippingStatusMachine.canTransition('OUT_FOR_DELIVERY', 'CANCELLED')).toBe(false);
    });
  });

  describe('2. Policy Settings Toggles (Criterion 7)', () => {
    it('disables POSTPONED transition when allowPostponedStatus is false in policy', () => {
      const policyWithoutPostponed = { allowPostponedStatus: false, allowReshippedStatus: true };
      const allowed = shippingStatusMachine.canTransition('OUT_FOR_DELIVERY', 'POSTPONED', {
        policy: policyWithoutPostponed,
      });
      expect(allowed).toBe(false);

      const transitions = shippingStatusMachine.getAllowedTransitions('OUT_FOR_DELIVERY', {
        policy: policyWithoutPostponed,
      });
      expect(transitions).not.toContain('POSTPONED');
    });

    it('disables RESHIPPED transition when allowReshippedStatus is false in policy', () => {
      const policyWithoutReshipped = { allowReshippedStatus: false };
      const allowed = shippingStatusMachine.canTransition('RETURNED_RECEIVED', 'RESHIPPED', {
        policy: policyWithoutReshipped,
      });
      expect(allowed).toBe(false);
    });
  });

  describe('3. Financial Loss Settlement & Reshipment Logic', () => {
    it('opens courier commission loss deduction on RETURNED_DAMAGED (Criterion 4)', async () => {
      const mockShipment = {
        id: 'ship-dmg-1',
        companyId: 'company-t1-test',
        status: 'RETURNED_AT_COMPANY',
        courierId: 'courier-44',
        codAmount: 500,
        cost: 65,
      };

      mockPrisma.shipment.findFirst.mockResolvedValue(mockShipment);
      mockPrisma.shipment.update.mockResolvedValue({
        ...mockShipment,
        status: 'RETURNED_DAMAGED',
      });
      mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'evt-dmg' });
      mockPrisma.courierCommission.create.mockResolvedValue({ id: 'comm-loss-1' });

      const result = await shippingStatusMachine.applyTransition(mockShipment, 'RETURNED_DAMAGED', {
        actor: mockUser,
        reason: 'Broken in transit',
        lossAmount: 500,
      });

      expect(result.shipment.status).toBe('RETURNED_DAMAGED');
      expect(result.lossSettlement).toBeDefined();
      expect(mockPrisma.courierCommission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyId: 'company-t1-test',
            courierId: 'courier-44',
            shipmentId: 'ship-dmg-1',
            commissionType: 'DEDUCTION',
            amount: -500,
          }),
        })
      );
    });

    it('creates linked child shipment on reshipment (Criterion 5)', async () => {
      const originalShipment = {
        id: 'orig-ship-10',
        companyId: 'company-t1-test',
        trackingNumber: 'TRK-ORIG-10',
        status: 'RETURNED_RECEIVED',
        recipientName: 'Ahmed Omar',
        recipientPhone: '01011112222',
        destinationGovernorate: 'Cairo',
        destinationCity: 'Nasr City',
        destinationAddress: '15 Tayaran St',
        codAmount: 350,
        cost: 60,
      };

      mockPrisma.shipment.findFirst.mockResolvedValue(originalShipment);
      mockPrisma.shipment.update.mockResolvedValue({
        ...originalShipment,
        status: 'RESHIPPED',
      });
      mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'evt-reship' });

      mockPrisma.shipment.create.mockResolvedValue({
        id: 'child-ship-20',
        companyId: 'company-t1-test',
        trackingNumber: 'TRK-RESHIP-20',
        status: 'PENDING',
        parentShipmentId: 'orig-ship-10',
        recipientName: 'Ahmed Omar',
        recipientPhone: '01011112222',
        codAmount: 350,
      });

      const result = await shippingStatusMachine.applyTransition(originalShipment, 'RESHIPPED', {
        actor: mockUser,
        reason: 'Customer requested redelivery with new address',
      });

      expect(result.shipment.status).toBe('RESHIPPED');
      expect(result.childShipment).toBeDefined();
      expect(result.childShipment.parentShipmentId).toBe('orig-ship-10');
      expect(mockPrisma.shipment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parentShipmentId: 'orig-ship-10',
            recipientName: 'Ahmed Omar',
            status: 'PENDING',
          }),
        })
      );
    });
  });

  describe('4. HTTP Endpoints & Live Contract Verification', () => {
    it('PATCH /api/shipping-portal/shipments/:id/status returns 409 INVALID_TRANSITION when jumping ASSIGNED -> DELIVERED (Criterion 1)', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-jump-1',
        companyId: 'company-t1-test',
        status: 'ASSIGNED',
        events: [],
      });

      const res = await request(app)
        .patch('/api/shipping-portal/shipments/ship-jump-1/status')
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('INVALID_TRANSITION');
      expect(res.body.currentStatus).toBe('ASSIGNED');
      expect(res.body.targetStatus).toBe('DELIVERED');
      expect(Array.isArray(res.body.allowedTransitions)).toBe(true);
      expect(res.body.allowedTransitions).not.toContain('DELIVERED');
    });

    it('PATCH /api/shipping-portal/shipments/:id/status returns 200 when OUT_FOR_DELIVERY -> DELIVERED with collected COD (Criterion 2)', async () => {
      const activeShipment = {
        id: 'ship-ofd-1',
        companyId: 'company-t1-test',
        status: 'OUT_FOR_DELIVERY',
        codAmount: 450,
        events: [],
      };

      mockPrisma.shipment.findFirst.mockResolvedValue(activeShipment);
      mockPrisma.shipment.update.mockResolvedValue({
        ...activeShipment,
        status: 'DELIVERED',
        collectedAmount: 450,
        deliveredAt: new Date(),
      });
      mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'evt-del-1' });

      const res = await request(app)
        .patch('/api/shipping-portal/shipments/ship-ofd-1/status')
        .send({ status: 'DELIVERED', collectedAmount: 450, notes: 'Cash collected successfully' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DELIVERED');
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toStatus: 'DELIVERED',
            notes: 'Cash collected successfully',
          }),
        })
      );
    });

    it('PATCH /api/shipping-portal/shipments/:id/status marks DELIVERED -> REMITTED with remittedAt (Criterion 6)', async () => {
      const deliveredShipment = {
        id: 'ship-remit-1',
        companyId: 'company-t1-test',
        status: 'DELIVERED',
        remittedAt: null,
        codAmount: 800,
        events: [],
      };

      mockPrisma.shipment.findFirst.mockResolvedValue(deliveredShipment);
      mockPrisma.shipment.update.mockResolvedValue({
        ...deliveredShipment,
        status: 'REMITTED',
        remittedAt: new Date(),
      });
      mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'evt-remit-1' });

      const res = await request(app)
        .patch('/api/shipping-portal/shipments/ship-remit-1/status')
        .send({ status: 'REMITTED', notes: 'Settled to merchant via InstaPay' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('REMITTED');
    });

    it('POST /api/shipping-portal/shipments/:id/reship creates child linked shipment (Criterion 5)', async () => {
      const returnedShipment = {
        id: 'ship-ret-rec-1',
        companyId: 'company-t1-test',
        trackingNumber: 'TRK-OLD-1',
        status: 'RETURNED_RECEIVED',
        recipientName: 'Kareem Tarek',
        recipientPhone: '01122334455',
        destinationGovernorate: 'Giza',
        destinationAddress: 'Dokki Plaza',
        codAmount: 200,
        events: [],
      };

      mockPrisma.shipment.findFirst.mockResolvedValue(returnedShipment);
      mockPrisma.shipment.update.mockResolvedValue({
        ...returnedShipment,
        status: 'RESHIPPED',
      });
      mockPrisma.shipmentEvent.create.mockResolvedValue({ id: 'evt-reship-http' });

      const newChild = {
        id: 'ship-child-reship-9',
        companyId: 'company-t1-test',
        trackingNumber: 'TRK-NEW-9',
        status: 'PENDING',
        parentShipmentId: 'ship-ret-rec-1',
        recipientName: 'Kareem Tarek',
        recipientPhone: '01122334455',
        codAmount: 200,
      };
      mockPrisma.shipment.create.mockResolvedValue(newChild);

      const res = await request(app)
        .post('/api/shipping-portal/shipments/ship-ret-rec-1/reship')
        .send({ reason: 'Address corrected by recipient' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.childShipment).toBeDefined();
      expect(res.body.childShipment.parentShipmentId).toBe('ship-ret-rec-1');
    });

    it('GET /api/shipping-portal/status-counts returns count for all 12 Turbo statuses', async () => {
      mockPrisma.shipment.groupBy.mockResolvedValue([
        { status: 'PENDING', _count: { id: 14 } },
        { status: 'ASSIGNED', _count: { id: 8 } },
        { status: 'OUT_FOR_DELIVERY', _count: { id: 5 } },
        { status: 'DELIVERED', _count: { id: 42 } },
        { status: 'RETURNED_AT_COMPANY', _count: { id: 3 } },
        { status: 'REMITTED', _count: { id: 30 } },
      ]);

      const res = await request(app).get('/api/shipping-portal/status-counts');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.PENDING).toBe(14);
      expect(res.body.data.DELIVERED).toBe(42);
      expect(res.body.data.REMITTED).toBe(30);
      expect(res.body.data.RETURNED_DAMAGED).toBe(0);
      expect(res.body.data.RETURNED_LOST).toBe(0);
      expect(res.body.data.RESHIPPED).toBe(0);
      expect(res.body.data.ALL).toBeGreaterThanOrEqual(102);
    });
  });

  describe('5. Public Tracking Customer-Facing Presentation (Criterion 8)', () => {
    it('returns simplified customer status and friendly event labels without internal operational jargon', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-pub-1',
        trackingNumber: 'TRK-PUB-1',
        waybillNumber: 'WB-PUB-1',
        status: 'RETURNED_AT_COMPANY',
        recipientName: 'Mohamed Salah',
        recipientPhone: '01099887766',
        destinationGovernorate: 'Alexandria',
        destinationCity: 'Sidi Gaber',
        events: [
          {
            id: 'evt-pub-1',
            fromStatus: 'OUT_FOR_DELIVERY',
            toStatus: 'RETURNED_AT_COMPANY',
            createdAt: new Date(),
            note: 'Returned to hub after 3 attempts',
          },
        ],
      });

      const res = await request(app).get('/api/public/shipments/track/WB-PUB-1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerStatus).toBe('عادت الشحنة إلى مقر الشركة');
      expect(res.body.data.statusLabel).toBe('مرتجعات في الشركة');
      expect(res.body.data.events[0].toStatusLabel).toBe('عادت الشحنة إلى مقر الشركة');
    });
  });
});
