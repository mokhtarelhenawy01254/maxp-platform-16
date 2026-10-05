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

jest.mock("../../utils/verifyToken", () => ({
  authenticateToken: (req, res, next) => {
    if (!mockCurrentUser) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    req.user = mockCurrentUser;
    return next();
  },
  requireRole: (roles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
    }
    return next();
  },
  requireSuperAdmin: (req, res, next) => {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  },
  requireCompanyAccess: (req, res, next) => next(),
  optionalAuth: (req, res, next) => next(),
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
  sendOrderStatusNotification: jest.fn().mockResolvedValue({ success: true }),
  sendOrderCreationNotification: jest.fn().mockResolvedValue({ success: true }),
}));

const enhancedOrdersRoutes = require("../../routes/enhancedOrders");

describe("enhancedOrders affiliate policy", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = {
      id: "affiliate-user-1",
      email: "affiliate@test.local",
      role: "AFFILIATE",
      companyId: "company-1",
      firstName: "Aff",
      lastName: "User",
    };
    global.__ENHANCED_ORDER_TEST_USER__ = mockCurrentUser;
    app = express();
    app.use(express.json());
    app.use("/orders-enhanced", enhancedOrdersRoutes);
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        name: "Visible Product",
        metadata: null,
      },
    ]);
  });

  test("rejects AFFILIATE manual orders when direct-order permission is disabled", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({
      id: "affiliate-1",
      companyId: "company-1",
      status: "ACTIVE",
      canCreateOrdersForOthers: false,
    });

    const response = await request(app)
      .post("/orders-enhanced")
      .send({ products: [{ productId: "product-1", quantity: 1 }] });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("AFFILIATE_DIRECT_ORDERS_DISABLED");
    expect(mockPrisma.affiliate.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "affiliate-user-1",
        companyId: "company-1",
      },
    });
    expect(mockCreateEnhancedOrder).not.toHaveBeenCalled();
  });

  test("allows AFFILIATE manual orders when direct-order permission is enabled", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({
      id: "affiliate-1",
      companyId: "company-1",
      status: "ACTIVE",
      canCreateOrdersForOthers: true,
    });
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

  test("rejects AFFILIATE manual orders for products hidden from all marketers", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({
      id: "affiliate-1",
      companyId: "company-1",
      status: "ACTIVE",
      canCreateOrdersForOthers: true,
    });
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

  test("rejects AFFILIATE manual orders for products assigned to another marketer", async () => {
    mockPrisma.affiliate.findFirst.mockResolvedValue({
      id: "affiliate-1",
      companyId: "company-1",
      status: "ACTIVE",
      canCreateOrdersForOthers: true,
    });
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
