/**
 * SHIP-W7 Shipping Reports Acceptance Tests
 *
 * Verifies Acceptance Criteria:
 * 1. Company with 30 shipments (20 DELIVERED, 5 RETURNED, 5 PENDING) -> summary = exact numbers.
 * 2. 2 shipments delivered after a failed attempt out of 10 -> first-attempt success rate = 80% exactly.
 * 3. by-governorate: sum of rows = total shipments (no data loss).
 * 4. by-client: net of each row = collected - fees - returnFees (tested with decimals/fractions).
 * 5. Another company's user -> 0 rows / tenant isolation.
 * 6. Role authorization: OWNER / COMPANY_ADMIN / OPERATIONS allowed.
 */

const mockPrisma = {
  shipment: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  shipmentEvent: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  merchant: {
    findMany: jest.fn(),
  },
  clientRateCard: {
    findMany: jest.fn(),
  },
  shippingSettlementLine: {
    findMany: jest.fn(),
  },
  courier: {
    findMany: jest.fn(),
  },
  courierCommission: {
    groupBy: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-ops-1',
  companyId: 'company-a',
  role: 'OPERATIONS',
  name: 'Operations Manager',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { ...mockUser };
    next();
  },
  requireRole: (allowedRoles) => (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'غير مصرح' });
    }
    next();
  },
}));

const express = require('express');
const request = require('supertest');
const shippingReportsRoutes = require('../../routes/shippingReportsRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-reports', shippingReportsRoutes);

describe('SHIP-W7: Shipping Reports Backend Acceptance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-ops-1',
      companyId: 'company-a',
      role: 'OPERATIONS',
      name: 'Operations Manager',
    };
  });

  // Acceptance Criterion 1 & 2
  describe('GET /api/v1/shipping-reports/summary', () => {
    it('Criterion 1: accurately aggregates 30 shipments (20 DELIVERED, 5 RETURNED, 5 PENDING)', async () => {
      mockPrisma.shipment.groupBy.mockResolvedValueOnce([
        { status: 'DELIVERED', _count: { _all: 20 } },
        { status: 'RETURNED', _count: { _all: 5 } },
        { status: 'PENDING', _count: { _all: 5 } },
      ]);

      mockPrisma.shipmentEvent.groupBy.mockResolvedValueOnce([
        { shipmentId: 's1', toStatus: 'DELIVERED', _count: { _all: 1 } },
      ]);
      mockPrisma.shipmentEvent.findMany.mockResolvedValueOnce([]);

      const res = await request(app).get('/api/v1/shipping-reports/summary');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.totals.totalShipments).toBe(30);
      expect(res.body.totals.delivered).toBe(20);
      expect(res.body.totals.returned).toBe(5);
      expect(res.body.totals.pending).toBe(5);
      expect(res.body.totals.failed).toBe(0);
      // RTO rate: 5 / (20 + 5) = 20%
      expect(res.body.totals.rtoRate).toBe(20);
    });

    it('Criterion 2: calculates first attempt success rate as 80% when 2 out of 10 delivered shipments had a prior failed attempt', async () => {
      mockPrisma.shipment.groupBy.mockResolvedValueOnce([
        { status: 'DELIVERED', _count: { _all: 10 } },
      ]);

      // 10 delivered shipments; s1 and s2 also had FAILED attempts
      mockPrisma.shipmentEvent.groupBy.mockResolvedValueOnce([
        { shipmentId: 's1', toStatus: 'DELIVERED', _count: { _all: 1 } },
        { shipmentId: 's1', toStatus: 'FAILED', _count: { _all: 1 } },
        { shipmentId: 's2', toStatus: 'DELIVERED', _count: { _all: 1 } },
        { shipmentId: 's2', toStatus: 'FAILED', _count: { _all: 1 } },
        { shipmentId: 's3', toStatus: 'DELIVERED', _count: { _all: 1 } },
        { shipmentId: 's4', toStatus: 'DELIVERED', _count: { _all: 1 } },
        { shipmentId: 's5', toStatus: 'DELIVERED', _count: { _all: 1 } },
        { shipmentId: 's6', toStatus: 'DELIVERED', _count: { _all: 1 } },
        { shipmentId: 's7', toStatus: 'DELIVERED', _count: { _all: 1 } },
        { shipmentId: 's8', toStatus: 'DELIVERED', _count: { _all: 1 } },
        { shipmentId: 's9', toStatus: 'DELIVERED', _count: { _all: 1 } },
        { shipmentId: 's10', toStatus: 'DELIVERED', _count: { _all: 1 } },
      ]);

      mockPrisma.shipmentEvent.findMany.mockResolvedValueOnce([
        { shipmentId: 's1', toStatus: 'PENDING', reasonCode: 'CREATED', createdAt: new Date('2026-11-01T08:00:00Z') },
        { shipmentId: 's1', toStatus: 'DELIVERED', reasonCode: null, createdAt: new Date('2026-11-01T14:00:00Z') }, // 6 hours
      ]);

      const res = await request(app).get('/api/v1/shipping-reports/summary');

      expect(res.status).toBe(200);
      expect(res.body.totals.firstAttemptSuccessRate).toBe(80);
      expect(res.body.totals.avgDeliveryHours).toBe(6);
    });
  });

  // Acceptance Criterion 3
  describe('GET /api/v1/shipping-reports/by-governorate', () => {
    it('Criterion 3: sum of rows exactly equals total shipments with zero loss', async () => {
      mockPrisma.shipment.groupBy.mockResolvedValueOnce([
        { destinationGovernorate: 'القاهرة', status: 'DELIVERED', _count: { _all: 12 } },
        { destinationGovernorate: 'القاهرة', status: 'RETURNED', _count: { _all: 2 } },
        { destinationGovernorate: 'الجيزة', status: 'DELIVERED', _count: { _all: 8 } },
        { destinationGovernorate: 'الجيزة', status: 'PENDING', _count: { _all: 3 } },
        { destinationGovernorate: null, status: 'DELIVERED', _count: { _all: 5 } }, // null/unassigned gov
      ]);

      mockPrisma.shipment.findMany.mockResolvedValueOnce([]);

      const res = await request(app).get('/api/v1/shipping-reports/by-governorate');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.rows.length).toBe(3);

      const sumShipments = res.body.rows.reduce((sum, r) => sum + r.shipments, 0);
      expect(sumShipments).toBe(30); // 14 + 11 + 5 = 30
      expect(res.body.totals.totalShipments).toBe(30);
    });
  });

  // Acceptance Criterion 4
  describe('GET /api/v1/shipping-reports/by-client', () => {
    it('Criterion 4: net of each row = collected - fees - returnFees with fraction precision', async () => {
      mockPrisma.shipment.groupBy.mockResolvedValueOnce([
        {
          merchantId: 'merchant-1',
          status: 'DELIVERED',
          _count: { _all: 10 },
          _sum: {
            collectedAmount: 1550.75,
            codAmount: 1550.75,
            cost: 250.25,
          },
        },
        {
          merchantId: 'merchant-1',
          status: 'RETURNED',
          _count: { _all: 2 },
          _sum: {
            collectedAmount: 0,
            codAmount: 0,
            cost: 0,
          },
        },
      ]);

      mockPrisma.merchant.findMany.mockResolvedValueOnce([
        { id: 'merchant-1', name: 'متجر الأناقة', phone: '01012345678' },
      ]);

      mockPrisma.clientRateCard.findMany.mockResolvedValueOnce([
        { merchantId: 'merchant-1', returnFee: 15.50 },
      ]);

      mockPrisma.shippingSettlementLine.findMany.mockResolvedValueOnce([]);

      const res = await request(app).get('/api/v1/shipping-reports/by-client');

      expect(res.status).toBe(200);
      expect(res.body.rows.length).toBe(1);

      const row = res.body.rows[0];
      // Collected: 1550.75
      // Shipping Fees: 250.25
      // Return Fees: 2 * 15.50 = 31.00
      // Net: 1550.75 - 250.25 - 31.00 = 1269.50
      expect(row.codCollected).toBe(1550.75);
      expect(row.shippingFees).toBe(250.25);
      expect(row.returnFees).toBe(31);
      expect(row.net).toBe(1269.5);
      expect(row.net).toBe(Number((row.codCollected - row.shippingFees - row.returnFees).toFixed(2)));
    });
  });

  // Acceptance Criterion 5
  describe('Tenant Isolation & Role Authorization', () => {
    it('Criterion 5: user from another company receives 0 rows', async () => {
      // Switched company to company-b
      mockUser.companyId = 'company-b';

      mockPrisma.shipment.groupBy.mockResolvedValueOnce([]);
      mockPrisma.shipmentEvent.groupBy.mockResolvedValueOnce([]);
      mockPrisma.shipmentEvent.findMany.mockResolvedValueOnce([]);

      const res = await request(app).get('/api/v1/shipping-reports/summary');

      expect(res.status).toBe(200);
      expect(res.body.totals.totalShipments).toBe(0);
      expect(res.body.rows.every(r => r.count === 0)).toBe(true);

      // Verify that Prisma received company-b filter
      expect(mockPrisma.shipment.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'company-b' }),
        })
      );
    });

    it('Role authorization: blocks unauthorized roles with 403', async () => {
      mockUser.role = 'COURIER'; // Not in OWNER, COMPANY_ADMIN, OPERATIONS, MANAGER

      const res = await request(app).get('/api/v1/shipping-reports/summary');
      expect(res.status).toBe(403);
    });

    it('Role authorization: allows OWNER role', async () => {
      mockUser.role = 'OWNER';

      mockPrisma.shipment.groupBy.mockResolvedValueOnce([]);
      mockPrisma.shipmentEvent.groupBy.mockResolvedValueOnce([]);
      mockPrisma.shipmentEvent.findMany.mockResolvedValueOnce([]);

      const res = await request(app).get('/api/v1/shipping-reports/summary');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/shipping-reports/by-courier', () => {
    it('aggregates courier delivered, returned, and commissions DUE/PAID', async () => {
      mockPrisma.courier.findMany.mockResolvedValueOnce([
        { id: 'c1', name: 'أحمد محمود', phone: '01122334455' },
      ]);

      mockPrisma.shipment.groupBy.mockResolvedValueOnce([
        { courierId: 'c1', status: 'DELIVERED', _count: { _all: 15 } },
        { courierId: 'c1', status: 'RETURNED', _count: { _all: 3 } },
      ]);

      mockPrisma.courierCommission.groupBy.mockResolvedValueOnce([
        { courierId: 'c1', status: 'DUE', _sum: { amount: 300.50 } },
        { courierId: 'c1', status: 'PAID', _sum: { amount: 150.00 } },
      ]);

      const res = await request(app).get('/api/v1/shipping-reports/by-courier');

      expect(res.status).toBe(200);
      expect(res.body.rows.length).toBe(1);
      const row = res.body.rows[0];
      expect(row.delivered).toBe(15);
      expect(row.returned).toBe(3);
      expect(row.commissionsDue).toBe(300.5);
      expect(row.commissionsPaid).toBe(150);
      expect(row.totalCommissions).toBe(450.5);
    });
  });
});
