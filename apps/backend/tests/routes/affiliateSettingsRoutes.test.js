const express = require("express");
const request = require("supertest");

let mockCurrentUser = {
  id: "user-1",
  companyId: "company-1",
  role: "OWNER",
};

const mockPrisma = {
  affiliateSetting: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  marketplaceApp: {
    findMany: jest.fn(),
  },
  companyApp: {
    upsert: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

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

const affiliateSettingsRoutes = require("../../routes/affiliateSettingsRoutes");

describe("affiliateSettingsRoutes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = {
      id: "user-1",
      companyId: "company-1",
      role: "OWNER",
    };
    app = express();
    app.use(express.json());
    app.use("/affiliate-settings", affiliateSettingsRoutes);
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      { id: "app-affiliate", slug: "affiliate-pro" },
      { id: "app-orders", slug: "order-core" },
      { id: "app-inventory", slug: "inventory-pro" },
    ]);
    mockPrisma.companyApp.upsert.mockResolvedValue({});
  });

  test("GET / returns defaults including platform margin values when settings are missing", async () => {
    mockPrisma.affiliateSetting.findUnique.mockResolvedValue(null);

    const response = await request(app).get("/affiliate-settings");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        commissionType: "PERCENTAGE",
        commissionRate: 5,
        cookieDuration: 30,
        isActive: true,
        autoApproveAffiliates: false,
        defaultMinPayout: 100,
        defaultCanCreateOrdersForOthers: true,
        defaultCanViewCustomerData: true,
        requireIdentityDocument: false,
        identityDocumentLabel: "مستند إثبات الهوية",
        payoutSlaDays: 3,
        platformMarginType: "FIXED",
        platformMarginValue: 0,
      }),
    );
  });

  test("PUT / persists platform margin fields alongside the rest of the affiliate settings", async () => {
    mockPrisma.affiliateSetting.upsert.mockImplementation(async ({ create }) => ({
      id: "setting-1",
      ...create,
    }));

    const payload = {
      commissionType: "PERCENTAGE",
      commissionRate: "7.5",
      cookieDuration: "21",
      termsAndConditions: "custom terms",
      isActive: true,
      autoApproveAffiliates: true,
      defaultMinPayout: "150",
      defaultCanCreateOrdersForOthers: false,
      defaultCanViewCustomerData: false,
      requireIdentityDocument: true,
      identityDocumentLabel: "صورة البطاقة",
      payoutSlaDays: "5",
      platformMarginType: "PERCENTAGE",
      platformMarginValue: "12.5",
    };

    const response = await request(app)
      .put("/affiliate-settings")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockPrisma.affiliateSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: "company-1" },
        update: expect.objectContaining({
          autoApproveAffiliates: true,
          defaultMinPayout: 150,
          defaultCanCreateOrdersForOthers: false,
          defaultCanViewCustomerData: false,
          requireIdentityDocument: true,
          identityDocumentLabel: "صورة البطاقة",
          payoutSlaDays: 5,
          platformMarginType: "PERCENTAGE",
          platformMarginValue: 12.5,
          commissionRate: 7.5,
          cookieDuration: 21,
        }),
        create: expect.objectContaining({
          companyId: "company-1",
          autoApproveAffiliates: true,
          defaultMinPayout: 150,
          defaultCanCreateOrdersForOthers: false,
          defaultCanViewCustomerData: false,
          requireIdentityDocument: true,
          identityDocumentLabel: "صورة البطاقة",
          payoutSlaDays: 5,
          platformMarginType: "PERCENTAGE",
          platformMarginValue: 12.5,
          commissionRate: 7.5,
          cookieDuration: 21,
        }),
      }),
    );
    expect(mockPrisma.marketplaceApp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: {
            in: ["affiliate-pro", "order-core", "inventory-pro", "ecommerce-basic"],
          },
        },
      }),
    );
    expect(mockPrisma.companyApp.upsert).toHaveBeenCalledTimes(3);
    expect(response.body.enabledCoreApps).toEqual([
      "affiliate-pro",
      "order-core",
      "inventory-pro",
    ]);
  });

  test("PUT / treats string false boolean fields as false", async () => {
    mockPrisma.affiliateSetting.upsert.mockImplementation(async ({ update }) => ({
      id: "setting-1",
      companyId: "company-1",
      ...update,
    }));

    const response = await request(app)
      .put("/affiliate-settings")
      .send({
        commissionType: "PERCENTAGE",
        commissionRate: 5,
        cookieDuration: 30,
        termsAndConditions: "",
        isActive: "false",
        autoApproveAffiliates: "false",
        defaultMinPayout: 100,
        defaultCanCreateOrdersForOthers: "false",
        defaultCanViewCustomerData: "0",
        requireIdentityDocument: "true",
        identityDocumentLabel: "بطاقة أو سجل",
        payoutSlaDays: 3,
        platformMarginType: "FIXED",
        platformMarginValue: 0,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockPrisma.affiliateSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          isActive: false,
          autoApproveAffiliates: false,
          defaultCanCreateOrdersForOthers: false,
          defaultCanViewCustomerData: false,
          requireIdentityDocument: true,
        }),
        create: expect.objectContaining({
          isActive: false,
          autoApproveAffiliates: false,
          defaultCanCreateOrdersForOthers: false,
          defaultCanViewCustomerData: false,
          requireIdentityDocument: true,
        }),
      }),
    );
    expect(mockPrisma.companyApp.upsert).not.toHaveBeenCalled();
  });

  test("PUT / rejects invalid financial settings", async () => {
    const response = await request(app)
      .put("/affiliate-settings")
      .send({
        commissionType: "PERCENTAGE",
        commissionRate: 150,
        cookieDuration: 30,
        platformMarginType: "FIXED",
        platformMarginValue: 0,
        defaultMinPayout: -5,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(mockPrisma.affiliateSetting.upsert).not.toHaveBeenCalled();
  });

  test("GET / rejects affiliates who are not allowed to manage company affiliate settings", async () => {
    mockCurrentUser = {
      id: "affiliate-1",
      companyId: "company-1",
      role: "AFFILIATE",
    };

    const response = await request(app).get("/affiliate-settings");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("صلاحية");
  });

  test("PUT / rejects affiliates who are not allowed to manage company affiliate settings", async () => {
    mockCurrentUser = {
      id: "affiliate-1",
      companyId: "company-1",
      role: "AFFILIATE",
    };

    const response = await request(app)
      .put("/affiliate-settings")
      .send({ isActive: false });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("صلاحية");
  });
});
