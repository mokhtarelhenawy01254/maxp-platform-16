const express = require("express");
const request = require("supertest");

const mockPrisma = {
  affiliate: {
    findFirst: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
};

const mockCreateEnhancedOrder = jest.fn();
const mockDisconnect = jest.fn();

jest.mock("../../middleware/auth", () => ({
  requireAuth: (req, _res, next) => {
    req.user = global.__ENHANCED_ORDER_VISIBILITY_TEST_USER__;
    next();
  },
}));

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

jest.mock("../../services/enhancedOrderService", () =>
  jest.fn().mockImplementation(() => ({
    createEnhancedOrder: mockCreateEnhancedOrder,
    disconnect: mockDisconnect,
  })),
);

jest.mock("../../utils/planLimitPayloads", () => ({
  ensureWithinPlanLimit: jest.fn(),
}));

jest.mock("../../services/whatsapp/WhatsAppNotificationService", () => ({
  sendOrderCreatedNotification: jest.fn().mockResolvedValue({ success: true }),
}));

const enhancedOrdersRoutes = require("../../routes/enhancedOrders");

describe("enhancedOrders affiliate product visibility", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    global.__ENHANCED_ORDER_VISIBILITY_TEST_USER__ = {
      id: "affiliate-user-1",
      email: "affiliate@test.local",
      role: "AFFILIATE",
      companyId: "company-1",
      firstName: "Aff",
      lastName: "User",
    };
    app = express();
    app.use(express.json());
    app.use("/orders-enhanced", enhancedOrdersRoutes);

    mockPrisma.affiliate.findFirst.mockResolvedValue({
      id: "affiliate-1",
      companyId: "company-1",
      status: "ACTIVE",
      canCreateOrdersForOthers: true,
    });
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        name: "Visible Product",
        metadata: null,
      },
    ]);
    mockCreateEnhancedOrder.mockResolvedValue({
      success: true,
      order: {
        id: "order-1",
        orderNumber: "ORD-1",
        customerPhone: "01000000000",
        customerName: "Customer",
        total: 100,
        items: [],
      },
    });
  });

  test("allows affiliate direct orders for visible products", async () => {
    const response = await request(app)
      .post("/orders-enhanced")
      .send({ products: [{ productId: "product-1", quantity: 1 }] });

    expect(response.status).toBe(201);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["product-1"] },
        companyId: "company-1",
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        metadata: true,
      },
    });
    expect(mockCreateEnhancedOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "company-1",
        affiliateId: "affiliate-1",
        orderSource: "AFFILIATE_DIRECT",
      }),
    );
  });

  test("rejects products hidden from all marketers", async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        name: "Hidden Product",
        metadata: JSON.stringify({ affiliateVisibility: "HIDDEN" }),
      },
    ]);

    const response = await request(app)
      .post("/orders-enhanced")
      .send({ products: [{ productId: "product-1", quantity: 1 }] });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("AFFILIATE_PRODUCT_NOT_VISIBLE");
    expect(response.body.productId).toBe("product-1");
    expect(mockCreateEnhancedOrder).not.toHaveBeenCalled();
  });

  test("rejects products assigned to another marketer", async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        name: "Selected Product",
        metadata: JSON.stringify({
          affiliateVisibility: "SELECTED",
          affiliateVisibleAffiliateIds: ["affiliate-2"],
        }),
      },
    ]);

    const response = await request(app)
      .post("/orders-enhanced")
      .send({ products: [{ productId: "product-1", quantity: 1 }] });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("AFFILIATE_PRODUCT_NOT_VISIBLE");
    expect(response.body.productId).toBe("product-1");
    expect(mockCreateEnhancedOrder).not.toHaveBeenCalled();
  });
});
