const mockFindShippingInfo = jest.fn();
const mockRouteOrderToMerchant = jest.fn();
const mockCalculateCommissions = jest.fn();
const mockPrisma = {
  company: { findUnique: jest.fn() },
  order: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  customer: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  conversation: { findUnique: jest.fn() },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  safeQuery: jest.fn(async (operation) => operation()),
}));

jest.mock("../../services/wooCommerceAutoExportService", () => ({
  getWooCommerceAutoExportService: jest.fn(() => ({
    exportOrderAsync: jest.fn(),
  })),
}));

jest.mock("../../services/orderService", () => ({
  getDuplicateSettings: jest.fn(),
  findDuplicateOrder: jest.fn(),
  generateOrderNumber: jest.fn(async () => "ORD-TEST-1"),
}));

jest.mock("../../services/internalSyncService", () => ({
  pushOrderToProvider: jest.fn(),
}));

jest.mock("../../services/shippingService", () => ({
  findShippingInfo: (...args) => mockFindShippingInfo(...args),
}));

jest.mock("../../services/dropshippingService", () => ({
  routeOrderToMerchant: (...args) => mockRouteOrderToMerchant(...args),
}));

jest.mock("../../services/commissionService", () => ({
  calculateCommissions: (...args) => mockCalculateCommissions(...args),
}));

const EnhancedOrderService = require("../../services/enhancedOrderService");

describe("EnhancedOrderService shipping recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("recovers shipping from configured zones when the client sends zero", async () => {
    mockFindShippingInfo.mockResolvedValue({
      found: true,
      zoneId: "zone-cairo",
      price: 70,
      deliveryTime: "3-5 أيام",
      governorate: "القاهرة",
    });

    const service = new EnhancedOrderService();
    const costs = await service.calculateOrderCosts({
      companyId: "company-1",
      governorate: "القاهرة",
      products: [
        { price: 299, quantity: 1 },
      ],
      shippingCost: 0,
    });

    expect(mockFindShippingInfo).toHaveBeenCalledWith("القاهرة", "company-1");
    expect(costs.shipping).toBe(70);
    expect(costs.total).toBe(369);
  });

  test("keeps zero shipping when no matching zone can be recovered", async () => {
    mockFindShippingInfo.mockResolvedValue({
      found: false,
      price: null,
      deliveryTime: null,
      governorate: null,
    });

    const service = new EnhancedOrderService();
    const costs = await service.calculateOrderCosts({
      companyId: "company-1",
      governorate: "محافظة غير معروفة",
      products: [
        { price: 299, quantity: 1 },
      ],
      shippingCost: 0,
    });

    expect(mockFindShippingInfo).toHaveBeenCalledWith("محافظة غير معروفة", "company-1");
    expect(costs.shipping).toBe(0);
    expect(costs.total).toBe(299);
  });
});

describe("EnhancedOrderService affiliate merchant post creation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteOrderToMerchant.mockResolvedValue([{ id: "merchant-order-1" }]);
    mockCalculateCommissions.mockResolvedValue([
      { id: "commission-affiliate", type: "AFFILIATE" },
      { id: "commission-merchant", type: "MERCHANT" },
      { id: "commission-platform", type: "PLATFORM" },
    ]);
  });

  test("routes direct affiliate orders to merchants and calculates all commission splits", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      affiliateId: "affiliate-1",
      status: "PENDING",
      merchantOrders: [],
      commissions: [],
      orderItems: [
        {
          product: {
            isDropshipped: true,
            merchantProducts: [
              {
                id: "merchant-product-1",
                isActive: true,
                syncEnabled: true,
                merchant: { isActive: true },
              },
            ],
          },
        },
      ],
    });

    const service = new EnhancedOrderService();
    const result = await service.runAffiliateMerchantPostCreation({
      id: "order-1",
      status: "PENDING",
    });

    expect(mockRouteOrderToMerchant).toHaveBeenCalledWith("order-1");
    expect(mockCalculateCommissions).toHaveBeenCalledWith("order-1");
    expect(result).toEqual({
      routedToMerchant: true,
      merchantOrdersCount: 1,
      commissionsCount: 3,
    });
  });

  test("does not duplicate merchant orders or commissions when the order was already processed", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      affiliateId: "affiliate-1",
      status: "PENDING",
      merchantOrders: [{ id: "merchant-order-existing" }],
      commissions: [{ id: "commission-existing", status: "CONFIRMED" }],
      orderItems: [
        {
          product: {
            isDropshipped: true,
            merchantProducts: [
              {
                id: "merchant-product-1",
                isActive: true,
                syncEnabled: true,
                merchant: { isActive: true },
              },
            ],
          },
        },
      ],
    });

    const service = new EnhancedOrderService();
    const result = await service.runAffiliateMerchantPostCreation({
      id: "order-1",
      status: "PENDING",
    });

    expect(mockRouteOrderToMerchant).not.toHaveBeenCalled();
    expect(mockCalculateCommissions).not.toHaveBeenCalled();
    expect(result).toEqual({
      routedToMerchant: true,
      merchantOrdersCount: 1,
      commissionsCount: 1,
    });
  });
});
