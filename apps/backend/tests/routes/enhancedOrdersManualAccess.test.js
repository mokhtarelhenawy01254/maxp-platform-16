const express = require("express");
const request = require("supertest");

const mockPrisma = {
  companyApp: {
    findMany: jest.fn(),
  },
};

jest.mock("../../utils/verifyToken", () => ({
  authenticateToken: (req, res, next) => {
    if (!mockCurrentUser) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    req.user = mockCurrentUser;
    return next();
  },
  requireRole: (roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
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
    createEnhancedOrder: jest.fn(),
    disconnect: jest.fn(),
  })),
);

jest.mock("../../utils/planLimitPayloads", () => ({
  ensureWithinPlanLimit: jest.fn(),
}));

jest.mock("../../services/whatsapp/WhatsAppNotificationService", () => ({
  sendOrderCreatedNotification: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("../../services/customerBlocklistService", () => ({
  isBlocked: jest.fn().mockResolvedValue(false),
}));

let mockCurrentUser;

const enhancedOrdersRoutes = require("../../routes/enhancedOrders");

describe("enhancedOrders manual-access", () => {
  let app;

  const OWNER_USER = {
    id: "owner-user-1",
    email: "owner@test.local",
    role: "OWNER",
    companyId: "company-1",
    firstName: "Own",
    lastName: "er",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { ...OWNER_USER };
    app = express();
    app.use(express.json());
    app.use("/orders-enhanced", enhancedOrdersRoutes);
  });

  it("returns NONE/not installed when no manual-orders app record exists", async () => {
    mockPrisma.companyApp.findMany.mockResolvedValue([]);

    const res = await request(app).get("/orders-enhanced/manual-access").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ subscription: "NONE", installed: false });
  });

  it("returns ACTIVE when a TRIAL/ACTIVE manual-orders app record exists", async () => {
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        status: "ACTIVE",
        app: { slug: "manual-orders-pro", name: "الطلبات اليدوية" },
      },
    ]);

    const res = await request(app).get("/orders-enhanced/manual-access").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.subscription).toBe("ACTIVE");
    expect(res.body.data.installed).toBe(true);
    expect(res.body.data.app.slug).toBe("manual-orders-pro");
  });

  it("returns EXPIRED when the record exists but is not active", async () => {
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        status: "EXPIRED",
        app: { slug: "manual-orders-pro", name: "الطلبات اليدوية" },
      },
    ]);

    const res = await request(app).get("/orders-enhanced/manual-access").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.subscription).toBe("EXPIRED");
    expect(res.body.data.installed).toBe(true);
    expect(res.body.data.status).toBe("EXPIRED");
  });

  it("returns ACTIVE for SUPER_ADMIN without a company record", async () => {
    mockCurrentUser = { id: "sa-1", role: "SUPER_ADMIN", email: "sa@maxp.local" };
    mockPrisma.companyApp.findMany.mockResolvedValue([]);

    const res = await request(app).get("/orders-enhanced/manual-access").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ subscription: "ACTIVE", installed: true });
  });

  it("returns ACTIVE for AFFILIATE when affiliate-pro is active", async () => {
    mockCurrentUser = { id: "aff-1", role: "AFFILIATE", companyId: "company-1", email: "aff@maxp.local" };
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        status: "ACTIVE",
        app: { slug: "affiliate-pro", name: "نظام الأفليت" },
      },
    ]);

    const res = await request(app).get("/orders-enhanced/manual-access").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.subscription).toBe("ACTIVE");
    expect(res.body.data.installed).toBe(true);
  });
});