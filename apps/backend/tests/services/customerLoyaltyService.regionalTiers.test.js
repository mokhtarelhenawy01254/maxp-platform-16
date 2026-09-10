const loyaltyService = require('../../services/hr/customerLoyaltyService');
const sharedDatabase = require('../../services/sharedDatabase');

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(),
}));

describe('customerLoyaltyService - Regional & Hierarchical Tiers', () => {
  const companyId = 'company-test';
  const programId = 'program-test';
  let prisma;

  beforeEach(() => {
    prisma = {
      customerLoyaltyTier: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      order: {
        findFirst: jest.fn(),
        aggregate: jest.fn(),
      },
      customerLoyaltyRecord: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        findFirst: jest.fn(),
      },
      customerLoyaltyProgram: {
        findFirst: jest.fn(),
      },
    };
    sharedDatabase.getSharedPrismaClient.mockReturnValue(prisma);
  });

  describe('_governoratesOverlap', () => {
    it('detects no overlap between distinct regional lists', () => {
      expect(loyaltyService._governoratesOverlap(['القاهرة'], ['الإسكندرية'])).toBe(false);
      expect(loyaltyService._governoratesOverlap(['القاهرة', 'الجيزة'], ['المنصورة', 'طنطا'])).toBe(false);
    });

    it('detects overlap between shared regions', () => {
      expect(loyaltyService._governoratesOverlap(['القاهرة', 'الجيزة'], ['الجيزة', 'الإسكندرية'])).toBe(true);
    });

    it('treats empty or * as overlapping with all governorates', () => {
      expect(loyaltyService._governoratesOverlap([], ['القاهرة'])).toBe(true);
      expect(loyaltyService._governoratesOverlap(['*'], ['الإسكندرية'])).toBe(true);
    });
  });

  describe('_assertNoTierRangeConflict with regional isolation', () => {
    it('allows identical metric ranges if target governorates do not overlap', async () => {
      prisma.customerLoyaltyTier.findMany.mockResolvedValue([
        {
          id: 'tier-cairo',
          name: 'Cairo Bronze',
          nameAr: 'برونزي القاهرة',
          minSpent: '0',
          maxSpent: '1000',
          minItems: null,
          maxItems: null,
          minPoints: null,
          maxPoints: null,
          benefits: JSON.stringify({ targetGovernorates: ['القاهرة'] }),
        },
      ]);

      await expect(
        loyaltyService._assertNoTierRangeConflict(
          prisma,
          companyId,
          programId,
          'SPENT',
          null,
          { min: 0, max: 1000 },
          ['الإسكندرية']
        )
      ).resolves.not.toThrow();
    });

    it('throws error when ranges overlap within the same governorate', async () => {
      prisma.customerLoyaltyTier.findMany.mockResolvedValue([
        {
          id: 'tier-cairo-1',
          name: 'Cairo Bronze',
          nameAr: 'برونزي القاهرة',
          minSpent: '0',
          maxSpent: '1000',
          minItems: null,
          maxItems: null,
          minPoints: null,
          maxPoints: null,
          benefits: JSON.stringify({ targetGovernorates: ['القاهرة'] }),
        },
      ]);

      await expect(
        loyaltyService._assertNoTierRangeConflict(
          prisma,
          companyId,
          programId,
          'SPENT',
          null,
          { min: 500, max: 1500 },
          ['القاهرة']
        )
      ).rejects.toThrow('حدود المستوى تتداخل مع مستوى آخر');
    });
  });

  describe('determineTier - Regional and Compound Evaluation', () => {
    const cairoTier = {
      id: 'tier-cairo-gold',
      name: 'Cairo Gold',
      nameAr: 'ذهبي القاهرة',
      priority: 10,
      calculationType: 'SPENT',
      minSpent: '2000',
      maxSpent: null,
      benefits: JSON.stringify({
        targetGovernorates: ['القاهرة', 'الجيزة'],
        conditions: { minOrders: 3 },
      }),
    };

    const globalTier = {
      id: 'tier-global-gold',
      name: 'Global Gold',
      nameAr: 'ذهبي عام',
      priority: 5,
      calculationType: 'SPENT',
      minSpent: '1500',
      maxSpent: null,
      benefits: JSON.stringify({
        targetGovernorates: [],
      }),
    };

    it('selects Cairo-specific tier when governorate matches and compound conditions are met', async () => {
      prisma.customerLoyaltyTier.findMany.mockResolvedValue([cairoTier, globalTier]);

      const matched = await loyaltyService.determineTier(
        companyId,
        programId,
        2500,
        'SPENT',
        { customerId: 'cust-1', governorate: 'القاهرة', ordersCount: 4, totalSpent: 2500 }
      );

      expect(matched).toBeDefined();
      expect(matched.id).toBe('tier-cairo-gold');
    });

    it('falls back to global tier if Cairo customer does not meet Cairo compound condition', async () => {
      prisma.customerLoyaltyTier.findMany.mockResolvedValue([cairoTier, globalTier]);

      const matched = await loyaltyService.determineTier(
        companyId,
        programId,
        2500,
        'SPENT',
        { customerId: 'cust-1', governorate: 'القاهرة', ordersCount: 2, totalSpent: 2500 }
      );

      expect(matched).toBeDefined();
      expect(matched.id).toBe('tier-global-gold');
    });

    it('selects global tier for a customer from another governorate (e.g. أسوان)', async () => {
      prisma.customerLoyaltyTier.findMany.mockResolvedValue([cairoTier, globalTier]);

      const matched = await loyaltyService.determineTier(
        companyId,
        programId,
        2000,
        'SPENT',
        { customerId: 'cust-2', governorate: 'أسوان', ordersCount: 1, totalSpent: 2000 }
      );

      expect(matched).toBeDefined();
      expect(matched.id).toBe('tier-global-gold');
    });
  });

  describe('resolveCustomerGovernorate', () => {
    it('extracts governorate directly from order.governorate', async () => {
      prisma.order.findFirst.mockResolvedValue({
        governorate: ' الإسكندرية ',
        shippingAddress: null,
        city: 'المنتزه',
      });

      const gov = await loyaltyService.resolveCustomerGovernorate(companyId, 'cust-1');
      expect(gov).toBe('الإسكندرية');
    });

    it('extracts governorate from parsed shippingAddress JSON if order.governorate is missing', async () => {
      prisma.order.findFirst.mockResolvedValue({
        governorate: null,
        shippingAddress: JSON.stringify({ governorate: 'الجيزة', address: 'شارع الهرم' }),
        city: null,
      });

      const gov = await loyaltyService.resolveCustomerGovernorate(companyId, 'cust-1');
      expect(gov).toBe('الجيزة');
    });
  });
});
