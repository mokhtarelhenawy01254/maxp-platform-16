/**
 * SHIP-H1: Shipping Weight Extra Units Ceiling Tests
 * Verifies that fractional extra kg is rounded UP (Math.ceil) to the nearest whole kg,
 * preventing revenue leakage while preserving float safety (1e-9 epsilon) and base weight exemption.
 */

const mockPrisma = {
  clientRateCard: {
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
  id: 'user-test-1',
  companyId: 'company-test-1',
  role: 'MANAGER',
  name: 'Admin User',
};

jest.mock('../../utils/verifyToken', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { ...mockUser };
    next();
  },
}));

jest.mock('../../middleware/checkAppAccess', () => () => (req, res, next) => next());

const express = require('express');
const request = require('supertest');
const shippingPortalRoutes = require('../../routes/shippingPortalRoutes');
const { quotePrice } = require('../../services/shipping/policyService');

const app = express();
app.use(express.json());
app.use('/api/v1/shipping-portal', shippingPortalRoutes);

describe('SHIP-H1: Shipping Extra Weight Ceiling (Math.ceil)', () => {
  const standardCard = {
    id: 'card-ship-h1',
    name: 'Standard Client Tier',
    companyId: 'company-test-1',
    merchantId: 'merchant-test-1',
    governorateCode: null,
    basePrice: 70.0,
    baseWeightKg: 1.0,
    extraKgPrice: 10.0,
    codFeeFixed: 5.0,
    codFeePercent: 0.0,
    isActive: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.clientRateCard.findMany.mockResolvedValue([standardCard]);
    mockPrisma.merchant.findFirst.mockResolvedValue({
      id: 'merchant-test-1',
      companyId: 'company-test-1',
      name: 'Test Merchant',
    });
  });

  // 1. weightKg = baseWeightKg (1.0 kg -> 75 EGP, 0 extra)
  test('1. weightKg = baseWeightKg (1.0 kg) -> 75 EGP (0 extra units)', async () => {
    const quote = await quotePrice({
      companyId: 'company-test-1',
      merchantId: 'merchant-test-1',
      governorate: 'القاهرة',
      weightKg: 1.0,
      codAmount: 100,
      prisma: mockPrisma,
    });

    expect(quote.price).toBe(75);
    expect(quote.breakdown.basePrice).toBe(70);
    expect(quote.breakdown.extraUnits).toBe(0);
    expect(quote.breakdown.extraWeightFee).toBe(0);
    expect(quote.breakdown.codFee).toBe(5);
    expect(quote.breakdown.total).toBe(75);
  });

  // 2. weightKg = 1.0000001 (micro-fraction above base -> 85 EGP, 1 extra unit)
  test('2. weightKg = 1.0000001 (micro-fraction above base) -> 85 EGP (1 extra unit)', async () => {
    const quote = await quotePrice({
      companyId: 'company-test-1',
      merchantId: 'merchant-test-1',
      governorate: 'القاهرة',
      weightKg: 1.0000001,
      codAmount: 100,
      prisma: mockPrisma,
    });

    expect(quote.price).toBe(85);
    expect(quote.breakdown.extraUnits).toBe(1);
    expect(quote.breakdown.extraWeightFee).toBe(10);
    expect(quote.breakdown.codFee).toBe(5);
    expect(quote.breakdown.total).toBe(85);
  });

  // 3. weightKg = 1.2 kg -> 85 EGP (1 extra unit: 70 + 10 + 5)
  test('3. weightKg = 1.2 kg -> 85 EGP (1 extra unit: 70 + 10 + 5)', async () => {
    const quote = await quotePrice({
      companyId: 'company-test-1',
      merchantId: 'merchant-test-1',
      governorate: 'القاهرة',
      weightKg: 1.2,
      codAmount: 100,
      prisma: mockPrisma,
    });

    expect(quote.price).toBe(85);
    expect(quote.breakdown.extraUnits).toBe(1);
    expect(quote.breakdown.extraWeightFee).toBe(10);
    expect(quote.breakdown.codFee).toBe(5);
    expect(quote.breakdown.total).toBe(85);
  });

  // 4. weightKg = 2.5 kg -> 95 EGP (2 extra units: 70 + 20 + 5)
  test('4. weightKg = 2.5 kg -> 95 EGP (2 extra units: 70 + 20 + 5)', async () => {
    const quote = await quotePrice({
      companyId: 'company-test-1',
      merchantId: 'merchant-test-1',
      governorate: 'القاهرة',
      weightKg: 2.5,
      codAmount: 100,
      prisma: mockPrisma,
    });

    expect(quote.price).toBe(95);
    expect(quote.breakdown.extraUnits).toBe(2);
    expect(quote.breakdown.extraWeightFee).toBe(20);
    expect(quote.breakdown.codFee).toBe(5);
    expect(quote.breakdown.total).toBe(95);
  });

  // 5. weightKg = 3.2 kg -> 105 EGP (3 extra units: 70 + 30 + 5)
  test('5. weightKg = 3.2 kg -> 105 EGP (3 extra units: 70 + 30 + 5)', async () => {
    const quote = await quotePrice({
      companyId: 'company-test-1',
      merchantId: 'merchant-test-1',
      governorate: 'القاهرة',
      weightKg: 3.2,
      codAmount: 100,
      prisma: mockPrisma,
    });

    expect(quote.price).toBe(105);
    expect(quote.breakdown.extraUnits).toBe(3);
    expect(quote.breakdown.extraWeightFee).toBe(30);
    expect(quote.breakdown.codFee).toBe(5);
    expect(quote.breakdown.total).toBe(105);
  });

  // 6. weightKg = 4.0 kg -> 105 EGP (3 extra units: 70 + 30 + 5)
  test('6. weightKg = 4.0 kg -> 105 EGP (exact boundary: 3 extra units: 70 + 30 + 5)', async () => {
    const quote = await quotePrice({
      companyId: 'company-test-1',
      merchantId: 'merchant-test-1',
      governorate: 'القاهرة',
      weightKg: 4.0,
      codAmount: 100,
      prisma: mockPrisma,
    });

    expect(quote.price).toBe(105);
    expect(quote.breakdown.extraUnits).toBe(3);
    expect(quote.breakdown.extraWeightFee).toBe(30);
    expect(quote.breakdown.codFee).toBe(5);
    expect(quote.breakdown.total).toBe(105);
  });

  // 7. Explicit exemption: weightKg < baseWeightKg (0.5 kg) -> 0 extra units
  test('7. weightKg < baseWeightKg (0.5 kg) -> 75 EGP (0 extra units)', async () => {
    const quote = await quotePrice({
      companyId: 'company-test-1',
      merchantId: 'merchant-test-1',
      governorate: 'القاهرة',
      weightKg: 0.5,
      codAmount: 100,
      prisma: mockPrisma,
    });

    expect(quote.price).toBe(75);
    expect(quote.breakdown.extraUnits).toBe(0);
    expect(quote.breakdown.extraWeightFee).toBe(0);
    expect(quote.breakdown.total).toBe(75);
  });

  // 8. HTTP API Quote Route verification
  test('8. HTTP POST /api/v1/shipping-portal/quote calculates ceiling correctly for 1.2 kg', async () => {
    const res = await request(app)
      .post('/api/v1/shipping-portal/quote')
      .send({
        merchantId: 'merchant-test-1',
        governorate: 'القاهرة',
        weightKg: 1.2,
        codAmount: 100,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.price).toBe(85);
    expect(res.body.data.breakdown.extraUnits).toBe(1);
    expect(res.body.data.breakdown.extraWeightFee).toBe(10);
    expect(res.body.data.breakdown.total).toBe(85);
  });
});
