let mockPrisma;

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn(async (operation) => operation()),
}));

jest.mock('../../controller/shippingZoneController', () => ({
  resolveShippingQuoteForGovernorate: jest.fn(),
}));

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { resolveShippingQuoteForGovernorate } = require('../../controller/shippingZoneController');
const shippingService = require('../../services/shippingService');

describe('shippingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      storePromotionSettings: {
        findUnique: jest.fn().mockResolvedValue({
          flatShippingEnabled: true,
          flatShippingFee: 0,
        }),
      },
      shippingZone: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    getSharedPrismaClient.mockReturnValue(mockPrisma);
    resolveShippingQuoteForGovernorate.mockResolvedValue({
      zoneId: 'zone-alex',
      price: 80,
      deliveryTime: '1-3 أيام عمل',
      governorate: 'الإسكندرية',
    });
  });

  test('can bypass flat shipping and use configured shipping zones for AI pricing', async () => {
    const shippingInfo = await shippingService.findShippingInfo('الإسكندرية', 'company-1', {
      allowFlatShipping: false,
    });

    expect(mockPrisma.storePromotionSettings.findUnique).not.toHaveBeenCalled();
    expect(resolveShippingQuoteForGovernorate).toHaveBeenCalledWith('company-1', 'الإسكندرية');
    expect(shippingInfo).toMatchObject({
      found: true,
      zoneId: 'zone-alex',
      price: 80,
      deliveryTime: '1-3 أيام عمل',
      governorate: 'الإسكندرية',
    });
  });

  test('keeps flat shipping as the default behavior for non-AI callers', async () => {
    const shippingInfo = await shippingService.findShippingInfo('الإسكندرية', 'company-1');

    expect(mockPrisma.storePromotionSettings.findUnique).toHaveBeenCalledWith({
      where: { companyId: 'company-1' },
    });
    expect(resolveShippingQuoteForGovernorate).not.toHaveBeenCalled();
    expect(shippingInfo).toMatchObject({
      found: true,
      price: 0,
      deliveryTime: '1-3 أيام عمل',
      governorate: 'الإسكندرية',
      isFlat: true,
    });
  });
});
