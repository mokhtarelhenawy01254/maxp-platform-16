const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
  },
  order: {
    findFirst: jest.fn(),
  },
  conversionEvent: {
    create: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const analyticsService = require("../../services/analyticsService");

describe("analyticsService.trackConversionEvent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue({ id: "company-1" });
    mockPrisma.product.findFirst.mockResolvedValue({ id: "product-1" });
    mockPrisma.order.findFirst.mockResolvedValue({
      id: "order-id-1",
      orderNumber: "SWN-1001",
    });
    mockPrisma.conversionEvent.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: "conversion-1", ...data }),
    );
  });

  test("resolves storefront purchase orderNumber to the real Order.id", async () => {
    await analyticsService.trackConversionEvent({
      companyId: "company-1",
      sessionId: "session-1",
      eventType: "purchase",
      productId: "product-1",
      orderId: "SWN-1001",
      value: 499,
      metadata: { allProductIds: ["product-1"] },
    });

    expect(mockPrisma.order.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: "company-1",
        OR: [{ id: "SWN-1001" }, { orderNumber: "SWN-1001" }],
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });
    expect(mockPrisma.conversionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: "order-id-1",
        metadata: JSON.stringify({
          allProductIds: ["product-1"],
          orderId: "order-id-1",
          orderNumber: "SWN-1001",
        }),
      }),
    });
  });
});
