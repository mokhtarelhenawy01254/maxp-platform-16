/**
 * SHIP-W11 Acceptance Test Suite
 * Covers:
 * 1. SHP-09: Shipment Deduplication (clientReference 409 + orderId 409)
 * 2. SHP-07: Bulk Shipment Import (CSV/XLSX up to 500 rows, 47 created / 3 failed)
 * 3. SHP-21/22: Delivery OTP Policy (requireDeliveryOtp, OTP_REQUIRED, OTP_INVALID, OTP_LOCKED)
 * 4. SHP-30: RTO Return Leg Cost (rtoChargeReturnLeg, rtoReturnLegPrice, rtoCost, rtoCostTotal in profit report)
 */

const bcrypt = require('bcryptjs');

const mockPrisma = {
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
  shipment: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  shipmentEvent: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  clientRateCard: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  merchant: {
    findFirst: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  shippingCompany: {
    findFirst: jest.fn(),
  },
  shippingZone: {
    findMany: jest.fn(),
  },
  deliveryFailureReason: {
    findFirst: jest.fn(),
  },
  courier: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  deliveryRun: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  companyApp: {
    findFirst: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-w11-1',
  companyId: 'company-w11-1',
  role: 'COMPANY_ADMIN',
  name: 'Admin User',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { ...mockUser };
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

jest.mock('../../middleware/checkAppAccess', () => {
  const checkAppAccess = () => (req, res, next) => next();
  checkAppAccess.checkAppAccess = checkAppAccess;
  return checkAppAccess;
});

const mockZoneResolver = jest.fn();
jest.mock('../../controller/shippingZoneController', () => {
  const original = jest.requireActual('../../controller/shippingZoneController');
  return {
    ...original,
    resolveShippingQuoteForGovernorate: (...args) => mockZoneResolver(...args),
  };
});

const express = require('express');
const request = require('supertest');

const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');
const shipmentsRoutes = require('../../routes/shipmentsRoutes');
const courierService = require('../../services/courierService');
const profitService = require('../../services/shipping/profitService');
const policyService = require('../../services/shipping/policyService');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-portal', shippingPortalRoutes);
app.use('/api/v1/shipments', shipmentsRoutes);

describe('SHIP-W11 Acceptance Gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-w11-1',
      companyId: 'company-w11-1',
      role: 'COMPANY_ADMIN',
      name: 'Admin User',
    };
    mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
    mockPrisma.shipmentEvent.create.mockImplementation(async ({ data }) => ({
      id: 'event-1',
      ...data,
      createdAt: new Date(),
    }));
    mockZoneResolver.mockImplementation(async (companyId, gov) => {
      if (!gov || gov === 'منطقة غير مخدومة نهائيا' || gov.includes('غير مخدومة')) {
        return null;
      }
      return {
        zoneId: 'zone-cairo-1',
        price: 50,
        deliveryTime: '1-2 أيام',
        governorate: 'القاهرة',
      };
    });
    mockPrisma.clientRateCard.findMany.mockResolvedValue([]);
  });

  // ==========================================
  // 1) منع تكرار الشحنة (SHP-09)
  // ==========================================
  describe('1) منع تكرار الشحنة (SHP-09)', () => {
    test('1.1: First creation with clientReference returns 201 + trackingNumber', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue(null);
      mockPrisma.shipment.create.mockImplementation(async ({ data }) => ({
        id: 'ship-w11-01',
        ...data,
        trackingNumber: 'TRK-W11-01',
        status: 'PENDING',
      }));

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments')
        .send({
          recipientName: 'علي كمال',
          recipientPhone: '01011112222',
          destinationGovernorate: 'القاهرة',
          destinationAddress: 'المعادي',
          clientReference: 'ORDER-EXT-1001',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trackingNumber).toBe('TRK-W11-01');
      expect(res.body.data.clientReference).toBe('ORDER-EXT-1001');
    });

    test('1.2: Second creation with SAME clientReference returns 409 with existing trackingNumber', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-w11-01',
        trackingNumber: 'TRK-W11-01',
        clientReference: 'ORDER-EXT-1001',
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments')
        .send({
          recipientName: 'علي كمال',
          recipientPhone: '01011112222',
          destinationGovernorate: 'القاهرة',
          destinationAddress: 'المعادي',
          clientReference: 'ORDER-EXT-1001',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('DUPLICATE_CLIENT_REFERENCE');
      expect(res.body.trackingNumber).toBe('TRK-W11-01');
      expect(mockPrisma.shipment.create).not.toHaveBeenCalled();
    });

    test('1.3: Creation with existing active orderId returns 409 with existing trackingNumber', async () => {
      mockPrisma.shipment.findFirst.mockImplementation(async ({ where }) => {
        if (where.orderId) {
          return { id: 'ship-w11-existing', trackingNumber: 'TRK-ACTIVE-01', status: 'PENDING' };
        }
        return null;
      });

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments')
        .send({
          recipientName: 'أحمد محمود',
          recipientPhone: '01222223333',
          destinationGovernorate: 'القاهرة',
          destinationAddress: 'مدينة نصر',
          orderId: 'order-123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('DUPLICATE_ORDER_SHIPMENT');
      expect(res.body.trackingNumber).toBe('TRK-ACTIVE-01');
      expect(mockPrisma.shipment.create).not.toHaveBeenCalled();
    });

    test('1.4: Legacy /api/v1/shipments/create also rejects duplicate clientReference with 409', async () => {
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-legacy-01',
        trackingNumber: 'TRK-LEGACY-01',
        clientReference: 'REF-DUP-99',
      });

      const res = await request(app)
        .post('/api/v1/shipments/create')
        .send({
          recipientName: 'محمود حسن',
          recipientPhone: '01099998888',
          governorate: 'القاهرة',
          address: 'التحرير',
          clientReference: 'REF-DUP-99',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('DUPLICATE_CLIENT_REFERENCE');
      expect(res.body.trackingNumber).toBe('TRK-LEGACY-01');
    });
  });

  // ==========================================
  // 2) استيراد شحنات بالجملة (SHP-07)
  // ==========================================
  describe('2) استيراد شحنات بالجملة (SHP-07)', () => {
    test('2.1: Rejects batch exceeding 500 rows with 400 MAX_ROWS_EXCEEDED', async () => {
      const rows = Array.from({ length: 501 }, (_, i) => ({
        recipientName: `عميل ${i}`,
        recipientPhone: '01011112222',
        governorate: 'القاهرة',
      }));

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments/bulk')
        .send({ rows });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MAX_ROWS_EXCEEDED');
    });

    test('2.2: Live test: 50 rows with 3 errors -> 47 created + 3 failed (PHONE_REQUIRED, GOVERNORATE_NOT_SERVED, DUPLICATE)', async () => {
      mockPrisma.shipment.findFirst.mockImplementation(async ({ where }) => {
        if (where.clientReference === 'REF-ALREADY-EXISTS') {
          return { id: 'ship-old', trackingNumber: 'TRK-OLD-99' };
        }
        return null;
      });

      mockPrisma.shipment.create.mockImplementation(async ({ data }) => ({
        id: `ship-${Math.random()}`,
        ...data,
      }));

      // Build 50 rows:
      // Row 10: missing phone -> PHONE_REQUIRED
      // Row 20: unserved governorate -> GOVERNORATE_NOT_SERVED
      // Row 30: duplicate clientReference -> DUPLICATE
      // Remaining 47 rows: completely valid
      const rows = [];
      for (let i = 1; i <= 50; i++) {
        if (i === 10) {
          // Missing phone
          rows.push({
            recipientName: `عميل ${i}`,
            recipientPhone: '',
            governorate: 'القاهرة',
            address: 'شارع 1',
            weightKg: 1.5,
            codAmount: 200,
            clientReference: `REF-ROW-${i}`,
          });
        } else if (i === 20) {
          // Governorate not served
          rows.push({
            recipientName: `عميل ${i}`,
            recipientPhone: '01011112222',
            governorate: 'منطقة غير مخدومة نهائيا',
            address: 'شارع 2',
            weightKg: 1,
            codAmount: 300,
            clientReference: `REF-ROW-${i}`,
          });
        } else if (i === 30) {
          // Duplicate reference
          rows.push({
            recipientName: `عميل ${i}`,
            recipientPhone: '01033334444',
            governorate: 'القاهرة',
            address: 'شارع 3',
            weightKg: 2,
            codAmount: 150,
            clientReference: 'REF-ALREADY-EXISTS',
          });
        } else {
          rows.push({
            recipientName: `عميل صالح ${i}`,
            recipientPhone: `010000000${i.toString().padStart(2, '0')}`,
            governorate: i % 2 === 0 ? 'Alexandria' : 'القاهرة',
            address: `العنوان ${i}`,
            weightKg: 1.2,
            codAmount: 100 + i,
            clientReference: `REF-ROW-${i}`,
          });
        }
      }

      const res = await request(app)
        .post('/api/v1/shipping-portal/shipments/bulk')
        .send({ rows });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.created).toBe(47);
      expect(res.body.failed.length).toBe(3);

      const reasons = res.body.failed.map((f) => f.reason);
      expect(reasons).toContain('PHONE_REQUIRED');
      expect(reasons).toContain('GOVERNORATE_NOT_SERVED');
      expect(reasons).toContain('DUPLICATE');

      const phoneErr = res.body.failed.find((f) => f.reason === 'PHONE_REQUIRED');
      expect(phoneErr.row).toBe(10);

      const govErr = res.body.failed.find((f) => f.reason === 'GOVERNORATE_NOT_SERVED');
      expect(govErr.row).toBe(20);

      const dupErr = res.body.failed.find((f) => f.reason === 'DUPLICATE');
      expect(dupErr.row).toBe(30);
      expect(dupErr.trackingNumber).toBe('TRK-OLD-99');
    });
  });

  // ==========================================
  // 3) OTP للتسليم (SHP-21/22)
  // ==========================================
  describe('3) OTP للتسليم (SHP-21/22)', () => {
    test('3.1: Policy GET and PUT supports requireDeliveryOtp', async () => {
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId: 'company-w11-1',
        requireDeliveryOtp: false,
      });

      mockPrisma.shippingPolicySettings.upsert.mockResolvedValue({
        companyId: 'company-w11-1',
        requireDeliveryOtp: true,
      });

      const putRes = await request(app)
        .put('/api/v1/shipping-portal/policy')
        .send({ requireDeliveryOtp: true });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.requireDeliveryOtp).toBe(true);
    });

    test('3.2: When requireDeliveryOtp is true, DELIVERED without OTP throws OTP_REQUIRED', async () => {
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId: 'company-w11-1',
        requireDeliveryOtp: true,
      });

      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-otp-1',
        companyId: 'company-w11-1',
        status: 'OUT_FOR_DELIVERY',
        otpHash: bcrypt.hashSync('4321', 10),
        otpAttempts: 0,
      });

      await expect(
        courierService.updateDeliveryRunShipment('company-w11-1', {
          shipmentId: 'ship-otp-1',
          runId: 'run-1',
          status: 'DELIVERED',
          otp: '', // No OTP provided
        })
      ).rejects.toMatchObject({
        code: 'OTP_REQUIRED',
        statusCode: 400,
      });
    });

    test('3.3: When requireDeliveryOtp is true, wrong OTP throws OTP_INVALID and increments attempts', async () => {
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId: 'company-w11-1',
        requireDeliveryOtp: true,
      });

      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-otp-1',
        companyId: 'company-w11-1',
        status: 'OUT_FOR_DELIVERY',
        otpHash: bcrypt.hashSync('4321', 10),
        otpAttempts: 2,
      });

      mockPrisma.shipment.update.mockResolvedValue({});

      await expect(
        courierService.updateDeliveryRunShipment('company-w11-1', {
          shipmentId: 'ship-otp-1',
          runId: 'run-1',
          status: 'DELIVERED',
          otp: '9999', // wrong OTP
        })
      ).rejects.toMatchObject({
        code: 'OTP_INVALID',
        statusCode: 400,
      });

      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-otp-1' },
          data: expect.objectContaining({ otpAttempts: 3 }),
        })
      );
    });

    test('3.4: 5 consecutive wrong OTP attempts throws OTP_LOCKED', async () => {
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId: 'company-w11-1',
        requireDeliveryOtp: true,
      });

      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-otp-1',
        companyId: 'company-w11-1',
        status: 'OUT_FOR_DELIVERY',
        otpHash: bcrypt.hashSync('4321', 10),
        otpAttempts: 4, // 5th attempt will lock
      });

      mockPrisma.shipment.update.mockResolvedValue({});

      await expect(
        courierService.updateDeliveryRunShipment('company-w11-1', {
          shipmentId: 'ship-otp-1',
          runId: 'run-1',
          status: 'DELIVERED',
          otp: '0000',
        })
      ).rejects.toMatchObject({
        code: 'OTP_LOCKED',
        statusCode: 429,
      });

      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-otp-1' },
          data: expect.objectContaining({
            otpAttempts: 5,
            otpLockedUntil: expect.any(Date),
          }),
        })
      );
    });

    test('3.5: Correct OTP delivers successfully and resets otpAttempts', async () => {
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId: 'company-w11-1',
        requireDeliveryOtp: true,
      });

      const correctCode = '5821';
      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-otp-1',
        companyId: 'company-w11-1',
        status: 'OUT_FOR_DELIVERY',
        otpHash: bcrypt.hashSync(correctCode, 10),
        otpAttempts: 3,
      });

      mockPrisma.shipment.update.mockImplementation(async ({ data }) => ({
        id: 'ship-otp-1',
        status: 'DELIVERED',
        ...data,
      }));

      const res = await courierService.updateDeliveryRunShipment('company-w11-1', {
        shipmentId: 'ship-otp-1',
        runId: 'run-1',
        status: 'DELIVERED',
        otp: correctCode,
      });

      expect(res.status).toBe('DELIVERED');
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ship-otp-1' },
          data: expect.objectContaining({
            status: 'DELIVERED',
            otpAttempts: 0,
            otpLockedUntil: null,
          }),
        })
      );
    });

    test('3.6: When requireDeliveryOtp is false, delivery without OTP succeeds normally', async () => {
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId: 'company-w11-1',
        requireDeliveryOtp: false,
      });

      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-no-otp',
        companyId: 'company-w11-1',
        status: 'OUT_FOR_DELIVERY',
        otpHash: null,
      });

      mockPrisma.shipment.update.mockImplementation(async ({ data }) => ({
        id: 'ship-no-otp',
        status: 'DELIVERED',
        ...data,
      }));

      const res = await courierService.updateDeliveryRunShipment('company-w11-1', {
        shipmentId: 'ship-no-otp',
        runId: 'run-1',
        status: 'DELIVERED',
      });

      expect(res.status).toBe('DELIVERED');
    });
  });

  // ==========================================
  // 4) تكلفة RTO (SHP-30)
  // ==========================================
  describe('4) تكلفة RTO (SHP-30)', () => {
    test('4.1: Policy supports rtoChargeReturnLeg and rtoReturnLegPrice', async () => {
      mockPrisma.shippingPolicySettings.upsert.mockResolvedValue({
        companyId: 'company-w11-1',
        rtoChargeReturnLeg: true,
        rtoReturnLegPrice: 40,
      });

      const res = await request(app)
        .put('/api/v1/shipping-portal/policy')
        .send({
          rtoChargeReturnLeg: true,
          rtoReturnLegPrice: 40,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.rtoChargeReturnLeg).toBe(true);
      expect(res.body.data.rtoReturnLegPrice).toBe(40);
    });

    test('4.2: Returning a 70 EGP shipment with policy rtoReturnLegPrice=40 sets rtoCost=40 and margin = 70 - 40 = 30', async () => {
      mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({
        companyId: 'company-w11-1',
        rtoChargeReturnLeg: true,
        rtoReturnLegPrice: 40,
      });

      mockPrisma.shipment.findFirst.mockResolvedValue({
        id: 'ship-rto-1',
        companyId: 'company-w11-1',
        status: 'OUT_FOR_DELIVERY',
        cost: 70,
        courierCost: 0,
      });

      mockPrisma.shipment.update.mockImplementation(async ({ data }) => ({
        id: 'ship-rto-1',
        cost: 70,
        courierCost: 0,
        ...data,
      }));

      const res = await request(app)
        .patch('/api/v1/shipping-portal/shipments/ship-rto-1/status')
        .send({ status: 'RETURNED' });

      expect(res.status).toBe(200);
      expect(res.body.data.rtoCost).toBe(40);
      expect(res.body.data.marginAmount).toBe(30);

      // Verify ShipmentEvent(RTO_COST_APPLIED) was recorded
      expect(mockPrisma.shipmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipmentId: 'ship-rto-1',
            reasonCode: 'RTO_COST_APPLIED',
          }),
        })
      );
    });

    test('4.3: Profit report displays rtoCostTotal and factors RTO cost into gross margin', async () => {
      mockPrisma.shipment.findMany.mockResolvedValue([
        // Delivered shipment: revenue 100, courierCost 20, margin 80
        {
          id: 'ship-del-1',
          cost: 100,
          courierCost: 20,
          marginAmount: 80,
          rtoCost: null,
          status: 'DELIVERED',
          merchant: { name: 'تاجر أ' },
          courier: { name: 'مندوب أ' },
        },
        // Returned shipment: revenue 70, courierCost 0, rtoCost 40, margin 30
        {
          id: 'ship-ret-1',
          cost: 70,
          courierCost: 0,
          marginAmount: 30,
          rtoCost: 40,
          status: 'RETURNED',
          merchant: { name: 'تاجر أ' },
          courier: { name: 'مندوب أ' },
        },
      ]);

      const report = await profitService.getProfitReport({
        companyId: 'company-w11-1',
      });

      expect(report.success).toBe(true);
      expect(report.totals.shipments).toBe(2);
      expect(report.totals.revenue).toBe(170); // 100 + 70
      expect(report.totals.courierCost).toBe(20);
      expect(report.totals.rtoCostTotal).toBe(40); // rtoCostTotal verified!
      expect(report.totals.margin).toBe(110); // 170 - 20 - 40 = 110!
    });
  });
});
