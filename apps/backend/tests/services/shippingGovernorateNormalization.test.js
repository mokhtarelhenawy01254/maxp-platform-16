const mockFindShippingInfo = jest.fn();
const mockPrisma = {
  company: { findUnique: jest.fn() },
  order: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(async ({ data }) => ({ id: 'order-1', ...data })),
    update: jest.fn(),
  },
  customer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(async ({ data }) => ({ id: 'cust-1', ...data })),
    update: jest.fn(),
  },
  conversation: { findUnique: jest.fn() },
};

jest.mock('../../services/sharedDatabase', () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
  safeQuery: jest.fn(async (operation) => operation()),
}));

jest.mock('../../services/wooCommerceAutoExportService', () => ({
  getWooCommerceAutoExportService: jest.fn(() => ({
    exportOrderAsync: jest.fn(),
  })),
}));

jest.mock('../../services/orderService', () => ({
  getDuplicateSettings: jest.fn(async () => ({ enabled: false })),
  findDuplicateOrder: jest.fn(async () => null),
  generateOrderNumber: jest.fn(async () => 'ORD-165169-374'),
}));

jest.mock('../../services/internalSyncService', () => ({
  pushOrderToProvider: jest.fn(),
}));

jest.mock('../../services/shippingService', () => ({
  findShippingInfo: (...args) => mockFindShippingInfo(...args),
}));

const EnhancedOrderService = require('../../services/enhancedOrderService');
const { normalizeOrderLocation } = require('../../utils/orderLocationNormalizer');

describe('R3 - Shipping Governorate Normalization & Zero-Shipping Fix', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EnhancedOrderService();
  });

  test('Case 1: Order with shippingAddress only (English "Alexandria") -> shipping = 90 & Order.governorate = "الإسكندرية"', async () => {
    mockFindShippingInfo.mockImplementation(async (governorate, companyId) => {
      if (governorate === 'الإسكندرية' || governorate === 'Alexandria') {
        return {
          found: true,
          zoneId: 'zone-alex',
          price: 90,
          deliveryTime: '2-3 أيام',
          governorate: 'الإسكندرية',
        };
      }
      return { found: false, price: null, deliveryTime: null, governorate: null };
    });

    const orderPayload = {
      companyId: 'company-alex',
      customerName: 'أحمد محمود',
      customerPhone: '01012345678',
      shippingAddress: {
        governorate: 'Alexandria',
        city: 'Alexandria',
        address: 'شارع فؤاد، محطة الرمل',
      },
      products: [
        { price: 349, quantity: 1, productName: 'منتج تجريبي' }
      ],
      shippingCost: 0, // Client sent 0 or uncalculated shipping
    };

    // 1. Calculate costs
    const costs = await service.calculateOrderCosts(orderPayload);

    // Verify shipping was recovered from the matching zone for Alexandria
    expect(mockFindShippingInfo).toHaveBeenCalledWith('الإسكندرية', 'company-alex');
    expect(costs.shipping).toBe(90);
    expect(costs.subtotal).toBe(349);
    expect(costs.total).toBe(439);
    expect(costs.shippingLine).toBeDefined();
    expect(costs.shippingLine.cost).toBe(90);
    expect(costs.shippingLine.governorate).toBe('الإسكندرية');

    // 2. Prepare order data
    const prepared = await service.prepareOrderData({
      ...orderPayload,
      customer: { id: 'cust-1', firstName: 'أحمد', lastName: 'محمود', phone: '01012345678' },
      conversation: null,
      orderNumber: 'ORD-165169-374',
      costs,
    });

    // Verify governorate is normalized and NOT null
    expect(prepared.governorate).toBe('الإسكندرية');
    expect(prepared.city).toBe('Alexandria');
    expect(prepared.shipping).toBe(90);
    expect(prepared.total).toBe(439);

    const parsedShippingAddr = JSON.parse(prepared.shippingAddress);
    expect(parsedShippingAddr.governorate).toBe('الإسكندرية');
  });

  test('Case 2: Order with Arabic governorate in base field ("الإسكندرية") -> same result (zero regression)', async () => {
    mockFindShippingInfo.mockImplementation(async (governorate, companyId) => {
      if (governorate === 'الإسكندرية') {
        return {
          found: true,
          zoneId: 'zone-alex',
          price: 90,
          deliveryTime: '2-3 أيام',
          governorate: 'الإسكندرية',
        };
      }
      return { found: false, price: null, deliveryTime: null, governorate: null };
    });

    const orderPayload = {
      companyId: 'company-alex',
      customerName: 'محمد علي',
      customerPhone: '01123456789',
      governorate: 'الإسكندرية',
      city: 'سموحة',
      customerAddress: 'سموحة، شارع ألبرت الأول',
      products: [
        { price: 349, quantity: 1, productName: 'منتج تجريبي' }
      ],
      shippingCost: 0,
    };

    const costs = await service.calculateOrderCosts(orderPayload);
    expect(mockFindShippingInfo).toHaveBeenCalledWith('الإسكندرية', 'company-alex');
    expect(costs.shipping).toBe(90);
    expect(costs.total).toBe(439);

    const prepared = await service.prepareOrderData({
      ...orderPayload,
      customer: { id: 'cust-2', firstName: 'محمد', lastName: 'علي', phone: '01123456789' },
      conversation: null,
      orderNumber: 'ORD-027710-925',
      costs,
    });

    expect(prepared.governorate).toBe('الإسكندرية');
    expect(prepared.city).toBe('سموحة');
    expect(prepared.shipping).toBe(90);
    expect(prepared.total).toBe(439);
  });

  test('Case 3: Order without any governorate -> legacy fallback behavior preserved with clear log', async () => {
    mockFindShippingInfo.mockResolvedValue({ found: false, price: null, deliveryTime: null, governorate: null });

    const orderPayload = {
      companyId: 'company-unknown',
      customerName: 'عميل بدون عنوان',
      customerPhone: '01234567890',
      products: [
        { price: 200, quantity: 1 }
      ],
      shippingCost: 0,
    };

    const costs = await service.calculateOrderCosts(orderPayload);

    // Fallback behavior: shippingCost 0 stays 0 when no governorate is available
    expect(costs.shipping).toBe(0);
    expect(costs.total).toBe(200);

    const prepared = await service.prepareOrderData({
      ...orderPayload,
      customer: { id: 'cust-3', firstName: 'عميل', lastName: 'بدون عنوان', phone: '01234567890' },
      conversation: null,
      orderNumber: 'ORD-756445-809',
      costs,
    });

    // Governorate should be null or unspecified without crashing
    expect(prepared.governorate == null || prepared.governorate === 'غير محدد').toBe(true);
    expect(prepared.shipping).toBe(0);
    expect(prepared.total).toBe(200);
  });

  test('Case 4: JSON string shippingAddress with state/region field is correctly parsed and normalized', () => {
    const rawData = {
      shippingAddress: JSON.stringify({
        state: 'Cairo',
        city: 'Nasr City',
        street: 'Abbas El Akkad',
      })
    };

    const normalized = normalizeOrderLocation(rawData);
    expect(normalized.governorate).toBe('القاهرة');
    expect(normalized.city).toBe('Nasr City');
    expect(normalized.address).toBe('Abbas El Akkad');
  });
});
