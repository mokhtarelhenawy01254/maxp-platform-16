/**
 * Live auth-chain regression for courier mobile link tokens.
 *
 * Caught on production (2026-10-03): the mobile token payload had no id/userId, and
 * verifyToken rejects any token without a subject (INVALID_TOKEN_PAYLOAD) BEFORE it
 * ever reaches the COURIER branch — so every courier share link 401ed in production
 * while service-level and mock-auth tests stayed green.
 *
 * These tests run the REAL verifyToken middleware + REAL checkAppAccess against a
 * mocked prisma: a token without the subject must 401, and the fixed payload must
 * pass through the COURIER branch to the handler.
 */

process.env.JWT_SECRET = 'courier-mobile-token-regression-secret-2026';

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
  },
  deliveryRun: {
    findFirst: jest.fn(),
  },
  marketplaceApp: {
    findMany: jest.fn().mockResolvedValue([
      { id: 'app-courier', slug: 'internal-courier-fleet', isPublic: true, pricingModel: 'SUBSCRIPTION', monthlyPrice: 129 }
    ]),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
  executeWithRetry: (fn) => fn(),
}));

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const verifyToken = require('../../utils/verifyToken');

const courierRoutes = require('../../routes/courierRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/couriers', verifyToken.authenticateToken, courierRoutes);

const SECRET = 'courier-mobile-token-regression-secret-2026';

function signMobileToken(payload) {
  return jwt.sign({ role: 'COURIER', ...payload }, SECRET, { expiresIn: '1h' });
}

beforeEach(() => {
  jest.clearAllMocks();
  // App installed and active for the test company
  mockPrisma.company.findUnique.mockResolvedValue({
    id: 'comp-live',
    installedApps: [{ status: 'ACTIVE', app: { slug: 'internal-courier-fleet' } }]
  });
  // Courier exists and is active (COURIER branch lookup)
  mockPrisma.courier.findFirst.mockResolvedValue({
    id: 'courier-1',
    companyId: 'comp-live',
    name: 'كابتن الحي',
    phone: '01000000000',
    status: 'ON_DUTY',
    isActive: true
  });
  mockPrisma.deliveryRun.findFirst.mockResolvedValue({
    id: 'run-1',
    companyId: 'comp-live',
    courierId: 'courier-1',
    runNumber: 'RUN-20261003-777',
    status: 'DISPATCHED',
    totalShipments: 1,
    totalCODExpected: 500,
    shipments: []
  });
});

describe('courier mobile token auth chain (real verifyToken middleware)', () => {
  it('accepts the fixed payload (role + id/userId + courierId) and reaches the handler', async () => {
    const token = signMobileToken({
      id: 'courier-1',
      userId: 'courier-1',
      courierId: 'courier-1',
      runId: 'run-1',
      companyId: 'comp-live'
    });

    const res = await request(app)
      .get('/api/v1/couriers/runs/run-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.runNumber).toBe('RUN-20261003-777');
    // The COURIER branch must have run (tenant context set from the courier's company)
    expect(mockPrisma.courier.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'courier-1', companyId: 'comp-live' }) })
    );
  });

  it('also accepts the token via ?token= query (mobile link shape)', async () => {
    const token = signMobileToken({
      id: 'courier-1',
      userId: 'courier-1',
      courierId: 'courier-1',
      runId: 'run-1',
      companyId: 'comp-live'
    });

    const res = await request(app).get(`/api/v1/couriers/runs/run-1?token=${token}`);
    expect(res.status).toBe(200);
  });

  it('rejects the legacy payload WITHOUT a subject (the production bug shape) with 401', async () => {
    const legacyToken = signMobileToken({
      courierId: 'courier-1',
      runId: 'run-1',
      companyId: 'comp-live'
    });

    const res = await request(app)
      .get('/api/v1/couriers/runs/run-1')
      .set('Authorization', `Bearer ${legacyToken}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_TOKEN_PAYLOAD');
  });

  it('rejects a mobile token whose courier is inactive', async () => {
    mockPrisma.courier.findFirst.mockResolvedValueOnce(null);

    const token = signMobileToken({
      id: 'courier-dead',
      userId: 'courier-dead',
      courierId: 'courier-dead',
      runId: 'run-1',
      companyId: 'comp-live'
    });

    const res = await request(app)
      .get('/api/v1/couriers/runs/run-1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('COURIER_NOT_FOUND');
  });
});
