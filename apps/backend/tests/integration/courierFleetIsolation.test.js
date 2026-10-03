const express = require('express');
const request = require('supertest');

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  companyApp: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  courier: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  deliveryRun: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  shipment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  treasuryAccount: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  treasuryTransaction: {
    create: jest.fn(),
  },
  marketplaceApp: {
    findMany: jest.fn().mockResolvedValue([
      { id: 'app-courier', slug: 'internal-courier-fleet', isPublic: true, pricingModel: 'SUBSCRIPTION', monthlyPrice: 129 }
    ]),
  },
  order: {
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrisma)),
};

process.env.JWT_SECRET = 'test-super-secret-jwt-key-for-courier-fleet-2026';

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
  executeWithRetry: (fn) => fn(),
}));

let mockUser = { id: 'usr-admin-1', companyId: 'comp-isolated-a', role: 'COMPANY_ADMIN' };

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = mockUser;
    next();
  },
  requireRole: (allowedRoles) => (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'صلاحيات غير كافية' });
    }
    next();
  },
}));

const courierRoutes = require('../../routes/courierRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/couriers', courierRoutes);

describe('Internal Courier Fleet Isolation & App Access Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'usr-admin-1', companyId: 'comp-isolated-a', role: 'COMPANY_ADMIN' };
  });

  describe('1. Marketplace App Gating & Isolation (slug: internal-courier-fleet)', () => {
    it('blocks access with 403 APP_NOT_ACTIVE when company does NOT have internal-courier-fleet installed', async () => {
      // Company has no installed apps matching internal-courier-fleet
      mockPrisma.company.findUnique.mockResolvedValueOnce({
        id: 'comp-isolated-a',
        installedApps: [],
      });

      const res = await request(app).get('/api/v1/couriers');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.needsActivation).toBe(true);
      expect(res.body.app?.slug).toBe('internal-courier-fleet');
    });

    it('blocks access with 403 when company only has order-shipping-turbo or store apps (Strict Isolation)', async () => {
      // Company has order-shipping-turbo and store-pro, but NOT internal-courier-fleet
      mockPrisma.company.findUnique.mockResolvedValueOnce({
        id: 'comp-isolated-a',
        installedApps: [
          { status: 'ACTIVE', app: { slug: 'order-shipping-turbo' } },
          { status: 'ACTIVE', app: { slug: 'store-pro' } }
        ],
      });

      const res = await request(app).get('/api/v1/couriers');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.needsActivation).toBe(true);
      expect(res.body.app?.slug).toBe('internal-courier-fleet');
    });

    it('grants access when internal-courier-fleet is installed and ACTIVE', async () => {
      mockPrisma.company.findUnique.mockResolvedValueOnce({
        id: 'comp-isolated-a',
        installedApps: [
          { status: 'ACTIVE', app: { slug: 'internal-courier-fleet' } }
        ],
      });
      mockPrisma.courier.findMany.mockResolvedValueOnce([]);

      const res = await request(app).get('/api/v1/couriers');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('2. Role-Based Permissions for Field Couriers & Managers', () => {
    beforeEach(() => {
      // Allow app access
      mockPrisma.company.findUnique.mockResolvedValue({
        id: 'comp-isolated-a',
        installedApps: [
          { status: 'ACTIVE', app: { slug: 'internal-courier-fleet' } }
        ],
      });
    });

    it('allows COURIER role to read assigned run and update delivery status', async () => {
      mockUser = { id: 'courier-1', courierId: 'courier-1', companyId: 'comp-isolated-a', role: 'COURIER' };

      mockPrisma.deliveryRun.findFirst.mockResolvedValueOnce({
        id: 'run-1',
        companyId: 'comp-isolated-a',
        courierId: 'courier-1',
        runNumber: 'RUN-20260926-001',
        status: 'DISPATCHED',
        totalShipments: 1,
        totalCODExpected: 500,
        shipments: [
          {
            id: 'ship-1',
            status: 'OUT_FOR_DELIVERY',
            order: { total: 500 }
          }
        ]
      });

      const res = await request(app).get('/api/v1/couriers/runs/run-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.runNumber).toBe('RUN-20260926-001');
    });

    it('forbids COURIER role from creating runs or settling runs (Managers only)', async () => {
      mockUser = { id: 'courier-1', courierId: 'courier-1', companyId: 'comp-isolated-a', role: 'COURIER' };

      const resCreate = await request(app)
        .post('/api/v1/couriers/runs')
        .send({ courierId: 'c1', orderIds: ['o1'] });

      expect(resCreate.status).toBe(403);

      const resSettle = await request(app)
        .post('/api/v1/couriers/runs/run-1/settle')
        .send({ actualCashReceived: 500 });

      expect(resSettle.status).toBe(403);
    });

    it('routes GET /runs to the run list, not the courier /:id shadow (route-order regression)', async () => {
      // GET /:id used to be declared before GET /runs — the run list was captured as
      // getCourier("runs") and 404ed with "المندوب غير موجود". Static paths must win.
      mockPrisma.deliveryRun.count.mockResolvedValueOnce(1);
      mockPrisma.deliveryRun.findMany.mockResolvedValueOnce([
        {
          id: 'run-9',
          companyId: 'comp-isolated-a',
          courierId: 'courier-1',
          runNumber: 'RUN-20261003-001',
          status: 'DISPATCHED',
          totalCODExpected: 100,
          totalCODCollected: 0,
          courier: { id: 'courier-1', name: 'كابتن', phone: '010' },
          shipments: []
        }
      ]);

      const res = await request(app).get('/api/v1/couriers/runs');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].runNumber).toBe('RUN-20261003-001');
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('3. Mobile Link Generation Endpoint (/runs/:id/share-link)', () => {
    it('returns shareUrl with mobileToken and courier details', async () => {
      mockPrisma.company.findUnique.mockResolvedValueOnce({
        id: 'comp-isolated-a',
        installedApps: [
          { status: 'ACTIVE', app: { slug: 'internal-courier-fleet' } }
        ],
      });

      mockPrisma.deliveryRun.findFirst.mockResolvedValueOnce({
        id: 'run-88',
        companyId: 'comp-isolated-a',
        courierId: 'courier-77',
        runNumber: 'RUN-20260926-088',
        status: 'DISPATCHED',
        courier: {
          id: 'courier-77',
          name: 'كابتن محمود',
          phone: '01012345678'
        },
        shipments: []
      });

      const res = await request(app).get('/api/v1/couriers/runs/run-88/share-link');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.runNumber).toBe('RUN-20260926-088');
      expect(res.body.data.shareUrl).toContain('/courier/run/run-88');
      expect(res.body.data.courierName).toBe('كابتن محمود');
    });
  });
});
