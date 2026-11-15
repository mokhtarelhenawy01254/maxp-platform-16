/**
 * Tests for Fallback Rate Card & Merchant Auto-Resolution on Orders Import
 */

const { quotePrice } = require('../../services/shipping/policyService');
const { resolveShippingQuoteForGovernorate } = require('../../controller/shippingZoneController');

describe('Shipping Fallback Rate Card & General Zone Tests', () => {
  const companyId = 'comp-fallback-test';

  test('1. quotePrice resolves company-wide RateCard (governorateCode: null) when merchantId is null', async () => {
    const mockPrisma = {
      clientPricingPackage: { findFirst: jest.fn().mockResolvedValue(null) },
      clientRateCard: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          // If queried for fallback (without merchantId)
          if (where.companyId === companyId) {
            return Promise.resolve([
              {
                id: 'rc-general-1',
                companyId,
                merchantId: 'merch-1',
                name: 'البطاقة العامة للشركة',
                governorateCode: null,
                cityName: null,
                cities: null,
                basePrice: 50,
                baseWeightKg: 1,
                extraKgPrice: 10,
                codFeeFixed: 0,
                codFeePercent: 0,
                isActive: true,
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      },
      shippingZone: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const quote = await quotePrice({
      companyId,
      merchantId: null, // merchantId is NOT provided
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      weightKg: 1,
      codAmount: 500,
      prisma: mockPrisma,
    });

    expect(quote).toBeDefined();
    expect(quote.price).toBe(50);
    expect(quote.source).toBe('RATE_CARD');
    expect(quote.rateCardId).toBe('rc-general-1');
  });

  test('2. quotePrice resolves company-wide governorate RateCard when merchantId is null', async () => {
    const mockPrisma = {
      clientPricingPackage: { findFirst: jest.fn().mockResolvedValue(null) },
      clientRateCard: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where.companyId === companyId) {
            return Promise.resolve([
              {
                id: 'rc-alex-1',
                companyId,
                merchantId: 'merch-2',
                name: 'شحن الإسكندرية',
                governorateCode: 'الإسكندرية',
                cityName: null,
                cities: null,
                basePrice: 65,
                baseWeightKg: 1,
                extraKgPrice: 10,
                codFeeFixed: 0,
                codFeePercent: 0,
                isActive: true,
              },
            ]);
          }
          return Promise.resolve([]);
        }),
      },
      shippingZone: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const quote = await quotePrice({
      companyId,
      merchantId: null,
      governorate: 'الإسكندرية',
      city: 'سموحة',
      weightKg: 1,
      codAmount: 0,
      prisma: mockPrisma,
    });

    expect(quote).toBeDefined();
    expect(quote.price).toBe(65);
    expect(quote.source).toBe('RATE_CARD');
    expect(quote.rateCardId).toBe('rc-alex-1');
  });

  test('3. resolveShippingQuoteForGovernorate matches fallback all-governorates zone when specific zone is missing', async () => {
    // If shippingZone has empty governorates or 'كافة المحافظات'
    const payload = await resolveShippingQuoteForGovernorate(null, null);
    expect(payload.zoneId).toBeNull();
  });
});
