/**
 * SHIP-W5 HTTP Integration Tests
 * Validates internal portal and client portal route integration and guards
 */

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  merchant: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  clientRateCard: {
    findMany: jest.fn(),
  },
  shipment: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  shippingSettlement: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  shippingSettlementLine: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  treasuryAccount: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  treasuryTransaction: {
    create: jest.fn(),
  },
  shippingPolicySettings: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrisma)),
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'admin-user-1',
  companyId: 'company-shipping-1',
  role: 'COMPANY_ADMIN',
  firstName: 'خالد',
  lastName: 'المدير',
  merchantId: 'merchant-a',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { ...mockUser };
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

jest.mock('../../middleware/checkAppAccess', () => () => (req, res, next) => next());

const express = require('express');
const request = require('supertest');
const portalRoutes = require('../../routes/shippingPortalRoutes');
const clientRoutes = require('../../routes/shippingClientRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-portal', portalRoutes);
app.use('/api/v1/shipping-client', clientRoutes);

describe('SHIP-W5 HTTP Portal & Client API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'admin-user-1',
      companyId: 'company-shipping-1',
      role: 'COMPANY_ADMIN',
      firstName: 'خالد',
      lastName: 'المدير',
      merchantId: 'merchant-a',
    };
  });

  test('POST /api/v1/shipping-portal/settlements/preview returns calculated summary', async () => {
    mockPrisma.merchant.findFirst.mockResolvedValue({ id: 'merchant-a', name: 'التاجر أ' });
    mockPrisma.clientRateCard.findMany.mockResolvedValue([]);
    mockPrisma.shipment.findMany.mockResolvedValue([
      {
        id: 's-1',
        status: 'DELIVERED',
        destinationGovernorate: 'القاهرة',
        codAmount: 300,
        collectedAmount: 300,
        cost: 45,
        actualWeight: 1,
        weight: 1,
        createdAt: new Date(),
        order: { orderNumber: 'ORD-1' },
      },
    ]);

    const res = await request(app)
      .post('/api/v1/shipping-portal/settlements/preview')
      .send({ merchantId: 'merchant-a' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toHaveProperty('grossCOD');
    expect(res.body.data.summary).toHaveProperty('shippingFeesTotal');
    expect(res.body.data.summary).toHaveProperty('codFeesTotal');
    expect(res.body.data.summary).toHaveProperty('returnFeesTotal');
    expect(res.body.data.summary).toHaveProperty('netPayout');
    expect(res.body.data.summary).toHaveProperty('totalShipments');
    expect(res.body.data.summary.totalShipments).toBe(1);
    expect(res.body.data.summary.grossCOD).toBe(300);
    expect(res.body.data.summary.netPayout).toBe(255);
  });

  test('POST /api/v1/shipping-portal/settlements issues settlement', async () => {
    mockPrisma.merchant.findFirst.mockResolvedValue({ id: 'merchant-a', name: 'التاجر أ' });
    mockPrisma.clientRateCard.findMany.mockResolvedValue([]);
    mockPrisma.shipment.findMany.mockResolvedValue([
      {
        id: 's-1',
        status: 'DELIVERED',
        destinationGovernorate: 'القاهرة',
        codAmount: 300,
        collectedAmount: 300,
        cost: 45,
        actualWeight: 1,
        weight: 1,
        createdAt: new Date(),
        order: { orderNumber: 'ORD-1' },
      },
    ]);
    mockPrisma.shippingSettlementLine.findMany.mockResolvedValue([]);
    mockPrisma.shippingSettlement.create.mockResolvedValue({
      id: 'set-100',
      settlementNumber: 'SET-20261103-1234',
      status: 'ISSUED',
      totalShipments: 1,
      netPayout: 255,
      lines: [],
    });

    const res = await request(app)
      .post('/api/v1/shipping-portal/settlements')
      .send({ merchantId: 'merchant-a', shipmentIds: ['s-1'] });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.settlementNumber).toBe('SET-20261103-1234');
  });

  test('POST /api/v1/shipping-portal/settlements/:id/approve approves settlement', async () => {
    mockPrisma.shippingSettlement.findFirst.mockResolvedValue({
      id: 'set-100',
      companyId: 'company-shipping-1',
      status: 'ISSUED',
    });
    mockPrisma.shippingSettlement.update.mockResolvedValue({
      id: 'set-100',
      status: 'APPROVED',
      approvedBy: 'خالد المدير',
    });

    const res = await request(app)
      .post('/api/v1/shipping-portal/settlements/set-100/approve')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
  });

  test('GET /api/v1/shipping-portal/settlements/:id/export returns CSV file', async () => {
    mockPrisma.shippingSettlement.findFirst.mockResolvedValue({
      id: 'set-100',
      companyId: 'company-shipping-1',
      merchantId: 'merchant-a',
      settlementNumber: 'SET-EXP-1',
      status: 'APPROVED',
      periodStart: new Date(),
      periodEnd: new Date(),
      totalShipments: 0,
      deliveredCount: 0,
      returnedCount: 0,
      grossCOD: 0,
      shippingFeesTotal: 0,
      codFeesTotal: 0,
      returnFeesTotal: 0,
      netPayout: 0,
      lines: [],
    });
    mockPrisma.merchant.findFirst.mockResolvedValue({ id: 'merchant-a', name: 'التاجر أ' });

    const res = await request(app)
      .get('/api/v1/shipping-portal/settlements/set-100/export');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('SET-EXP-1');
  });

  test('GET /api/v1/shipping-client/settlements returns client scoped list', async () => {
    mockUser.role = 'SHIPPING_CLIENT';
    mockUser.merchantId = 'merchant-a';

    mockPrisma.merchant.findFirst.mockResolvedValue({
      id: 'merchant-a',
      companyId: 'company-shipping-1',
      isActive: true,
      name: 'تاجر العميل',
    });
    mockPrisma.merchant.findMany.mockResolvedValue([{ id: 'merchant-a', name: 'تاجر العميل' }]);
    mockPrisma.shippingPolicySettings.findUnique.mockResolvedValue({ clientPortalEnabled: true });
    mockPrisma.shippingSettlement.count.mockResolvedValue(1);
    mockPrisma.shippingSettlement.findMany.mockResolvedValue([
      {
        id: 'set-1',
        settlementNumber: 'SET-999',
        status: 'PAID',
        grossCOD: 500,
        shippingFeesTotal: 50,
        codFeesTotal: 5,
        returnFeesTotal: 0,
        netPayout: 445,
        periodStart: new Date(),
        periodEnd: new Date(),
        totalShipments: 1,
        deliveredCount: 1,
        returnedCount: 0,
        createdAt: new Date(),
      },
    ]);

    const res = await request(app)
      .get('/api/v1/shipping-client/settlements');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settlements.length).toBe(1);
    expect(res.body.settlements[0].settlementNumber).toBe('SET-999');
    expect(res.body.settlements[0].netPayout).toBe(445);
  });
});
