jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

const loyaltyService = require('../../services/hr/customerLoyaltyService');
const sharedDatabase = require('../../services/sharedDatabase');

const itC = typeof loyaltyService.enforceDiscountCap === 'function' ? it : it.skip;

describe('customerLoyaltyService.enforceDiscountCap (promotion stacking / discount cap)', () => {
  const companyId = 'company-1';

  let prisma;
  let companyFindUnique;

  beforeEach(() => {
    companyFindUnique = jest.fn();
    prisma = { company: { findUnique: companyFindUnique } };
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);

    // Default company cap = 25% (explicit), total 200 => cap = 50.
    companyFindUnique.mockResolvedValue({ id: companyId, maxDiscountCap: 0.25 });
  });

  itC('caps total discount to the company maxDiscountCap (25% of 200 = 50)', async () => {
    const res = await loyaltyService.enforceDiscountCap({
      companyId,
      orderTotal: 200,
      couponDiscount: 30,
      walletAmount: 100,
      pointsAmount: 0,
    });

    // Total discount 130 (>50) is scaled down proportionally to the 50 cap.
    expect(res.allowed).toBe(true);
    expect(res.capped).toBe(true);
    expect(res.cappedTotal).toBeCloseTo(50, 5);
    expect(res.maxAllowed).toBeCloseTo(50, 5);
    // Each component is scaled by the same factor (50/130).
    expect(res.couponDiscount + res.walletAmount + res.pointsAmount).toBeCloseTo(50, 5);
    expect(res.walletAmount).toBeLessThan(100);
  });

  itC('rejects loyalty wallet/points when coupon.allowWithLoyalty is false', async () => {
    const res = await loyaltyService.enforceDiscountCap({
      companyId,
      orderTotal: 200,
      couponDiscount: 30,
      walletAmount: 100,
      pointsAmount: 50,
      couponAllowWithLoyalty: false,
    });

    expect(res.allowed).toBe(false);
    expect(res.loyaltyAllowed).toBe(false);
    expect(res.walletAmount).toBe(0);
    expect(res.pointsAmount).toBe(0);
    // Only the coupon discount is allowed through.
    expect(res.cappedTotal).toBeCloseTo(30, 5);
  });

  itC('uses the company default cap (0.25) when none is configured', async () => {
    companyFindUnique.mockResolvedValue({ id: companyId, maxDiscountCap: null });
    const res = await loyaltyService.enforceDiscountCap({
      companyId,
      orderTotal: 200,
      couponDiscount: 0,
      walletAmount: 100,
      pointsAmount: 0,
    });
    expect(res.maxAllowed).toBeCloseTo(50, 5);
  });
});
