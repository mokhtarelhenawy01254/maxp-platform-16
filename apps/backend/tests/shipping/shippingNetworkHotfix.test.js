/**
 * SHIP-W6.1 Regression Guard Tests
 * Verifies /api/v1/shipping-companies/network avoids prisma include on ShippingPolicySettings
 * and correctly fetches & merges active network companies without 500 errors.
 */

const mockPrisma = {
  shippingPolicySettings: {
    findMany: jest.fn(),
  },
  company: {
    findMany: jest.fn(),
  },
  merchant: {
    findFirst: jest.fn(),
  },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: () => mockPrisma,
  getSharedPrismaClientAsync: async () => mockPrisma,
}));

let mockUser = {
  id: 'user-1',
  companyId: 'company-caller-1',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'رمز المصادقة مطلوب' });
    }
    req.user = { ...mockUser };
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const shippingCompaniesRoutes = require('../../routes/shippingCompaniesRoutes');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-companies', shippingCompaniesRoutes);

describe('SHIP-W6.1 /shipping-companies/network hotfix & regression tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      id: 'user-1',
      companyId: 'company-caller-1',
    };
  });

  test('GET /api/v1/shipping-companies/network without token returns 401', async () => {
    const res = await request(app).get('/api/v1/shipping-companies/network');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/v1/shipping-companies/network with token when no policies exist returns 200 with empty array', async () => {
    mockPrisma.shippingPolicySettings.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/shipping-companies/network')
      .set('Authorization', 'Bearer valid-company-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: [],
    });

    // Ensure findMany did NOT receive an include object
    expect(mockPrisma.shippingPolicySettings.findMany).toHaveBeenCalledWith({
      where: {
        companyId: { not: 'company-caller-1' },
      },
    });
    expect(mockPrisma.company.findMany).not.toHaveBeenCalled();
  });

  test('GET /api/v1/shipping-companies/network returns 200 with empty array if policies exist but companies are inactive', async () => {
    mockPrisma.shippingPolicySettings.findMany.mockResolvedValue([
      { companyId: 'carrier-inactive-1', operatingModel: 'INTERNAL', intakeMode: 'MIXED' },
    ]);
    mockPrisma.company.findMany.mockResolvedValue([]); // No active companies

    const res = await request(app)
      .get('/api/v1/shipping-companies/network')
      .set('Authorization', 'Bearer valid-company-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(mockPrisma.company.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['carrier-inactive-1'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        logo: true,
        phone: true,
        email: true,
        website: true,
      },
    });
  });

  test('GET /api/v1/shipping-companies/network returns 200 with formatted active carriers and link status', async () => {
    mockPrisma.shippingPolicySettings.findMany.mockResolvedValue([
      { companyId: 'carrier-comp-1', operatingModel: 'HYBRID', intakeMode: 'API' },
      { companyId: 'carrier-comp-2', operatingModel: 'INTERNAL', intakeMode: 'PORTAL' },
    ]);

    mockPrisma.company.findMany.mockResolvedValue([
      {
        id: 'carrier-comp-1',
        name: 'أكسبريس للشحن',
        logo: 'https://example.com/logo1.png',
        phone: '01000000001',
        email: 'express@shipping.com',
        website: 'https://express.com',
      },
      {
        id: 'carrier-comp-2',
        name: 'البرق للشحن السريع',
        logo: null,
        phone: '01000000002',
        email: null,
        website: null,
      },
    ]);

    // Carrier 1 is linked
    mockPrisma.merchant.findFirst.mockImplementation(async ({ where }) => {
      if (where.companyId === 'carrier-comp-1') {
        return { id: 'merchant-link-1', name: 'تاجر فرعي', commissionRate: 5 };
      }
      return null;
    });

    const res = await request(app)
      .get('/api/v1/shipping-companies/network')
      .set('Authorization', 'Bearer valid-company-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);

    expect(res.body.data[0]).toEqual({
      companyId: 'carrier-comp-1',
      name: 'أكسبريس للشحن',
      logo: 'https://example.com/logo1.png',
      phone: '01000000001',
      email: 'express@shipping.com',
      website: 'https://express.com',
      operatingModel: 'HYBRID',
      intakeMode: 'API',
      isLinked: true,
      merchantId: 'merchant-link-1',
    });

    expect(res.body.data[1]).toEqual({
      companyId: 'carrier-comp-2',
      name: 'البرق للشحن السريع',
      logo: null,
      phone: '01000000002',
      email: null,
      website: null,
      operatingModel: 'INTERNAL',
      intakeMode: 'PORTAL',
      isLinked: false,
      merchantId: null,
    });
  });
});
