const mockPrisma = {
  order: {
    findUnique: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
  },
  merchant: {
    findUnique: jest.fn(),
  },
  merchantProduct: {
    update: jest.fn(),
  },
  inventory: {
    findFirst: jest.fn(),
  },
};

const merchantService = require("../../services/merchantService");

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../services/merchantService", () => ({
  createMerchantOrder: jest.fn(),
  fulfillMerchantOrder: jest.fn(),
}));

const dropshippingService = require("../../services/dropshippingService");

describe("dropshippingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("routes a single-merchant order to the matching merchant order workflow", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-1",
      orderItems: [
        {
          productId: "product-1",
          quantity: 1,
          product: {
            merchantProducts: [
              {
                id: "merchant-product-1",
                merchantId: "merchant-1",
                stock: 4,
                merchantPrice: 75,
                isActive: true,
                syncEnabled: true,
                merchant: {
                  id: "merchant-1",
                  isActive: true,
                  autoFulfill: false,
                  fulfillmentMode: "MERCHANT",
                },
              },
            ],
          },
        },
      ],
    });
    merchantService.createMerchantOrder.mockResolvedValue({
      id: "merchant-order-1",
    });

    const result = await dropshippingService.routeOrderToMerchant("order-1");

    expect(result).toEqual([{ id: "merchant-order-1" }]);
    expect(merchantService.createMerchantOrder).toHaveBeenCalledWith(
      "order-1",
      "merchant-1",
      expect.arrayContaining([
        expect.objectContaining({
          fulfillmentSource: "MERCHANT",
          merchantProduct: expect.objectContaining({ id: "merchant-product-1" }),
        }),
      ]),
    );
  });

  test("checks merchant availability using active synced merchant products", async () => {
    mockPrisma.product.findUnique.mockResolvedValue({
      id: "product-1",
      merchantProducts: [
        {
          id: "merchant-product-1",
          isActive: true,
          syncEnabled: true,
          stock: 8,
          merchantPrice: 65,
          merchant: {
            id: "merchant-1",
            name: "Merchant Co",
            isActive: true,
            fulfillmentMode: "MERCHANT",
          },
        },
      ],
    });

    const result = await dropshippingService.checkMerchantAvailability(
      "product-1",
      3,
    );

    expect(result.available).toBe(true);
    expect(result.price).toBe(65);
    expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
      where: { id: "product-1" },
      include: {
        merchantProducts: {
          where: {
            isActive: true,
            syncEnabled: true,
          },
          include: {
            merchant: true,
          },
        },
      },
    });
  });

  test("splits a multi-merchant order and auto-fulfills merchants that enable it", async () => {
    mockPrisma.order.findUnique.mockResolvedValue({
      id: "order-2",
      orderItems: [
        {
          productId: "product-1",
          quantity: 1,
          product: {
            merchantProducts: [
              {
                id: "merchant-product-1",
                merchantId: "merchant-1",
                stock: 5,
                merchantPrice: 75,
                isActive: true,
                syncEnabled: true,
                merchant: {
                  id: "merchant-1",
                  isActive: true,
                  autoFulfill: false,
                  fulfillmentMode: "MERCHANT",
                },
              },
            ],
          },
        },
        {
          productId: "product-2",
          quantity: 2,
          product: {
            merchantProducts: [
              {
                id: "merchant-product-2",
                merchantId: "merchant-2",
                stock: 5,
                merchantPrice: 95,
                isActive: true,
                syncEnabled: true,
                merchant: {
                  id: "merchant-2",
                  isActive: true,
                  autoFulfill: true,
                  fulfillmentMode: "MERCHANT",
                },
              },
            ],
          },
        },
      ],
    });
    merchantService.createMerchantOrder
      .mockResolvedValueOnce({
        id: "merchant-order-1",
        status: "PENDING",
      })
      .mockResolvedValueOnce({
        id: "merchant-order-2",
        status: "PENDING",
      });
    merchantService.fulfillMerchantOrder.mockResolvedValue({
      id: "merchant-order-2",
      status: "FULFILLED",
    });

    const result = await dropshippingService.routeOrderToMerchant("order-2");

    expect(merchantService.createMerchantOrder).toHaveBeenNthCalledWith(
      1,
      "order-2",
      "merchant-1",
      expect.arrayContaining([
        expect.objectContaining({
          fulfillmentSource: "MERCHANT",
        }),
      ]),
    );
    expect(merchantService.createMerchantOrder).toHaveBeenNthCalledWith(
      2,
      "order-2",
      "merchant-2",
      expect.arrayContaining([
        expect.objectContaining({
          fulfillmentSource: "MERCHANT",
        }),
      ]),
    );
    expect(merchantService.fulfillMerchantOrder).toHaveBeenCalledWith(
      "merchant-order-2",
      expect.objectContaining({
        trackingNumber: expect.stringContaining("AUTO-"),
        merchantOrderId: expect.stringContaining("AUTO-"),
      }),
    );
    expect(result).toEqual([
      { id: "merchant-order-1", status: "PENDING" },
      { id: "merchant-order-2", status: "FULFILLED" },
    ]);
  });
});
