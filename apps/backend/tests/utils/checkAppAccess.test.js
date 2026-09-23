const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  marketplaceApp: {
    findMany: jest.fn(),
  },
  companyApp: {
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  executeWithRetry: jest.fn(async (operation) => operation()),
}));

const sharedDatabase = require("../../services/sharedDatabase");
const {
  checkAppAccess,
  getCandidateAppSlugs,
} = require("../../middleware/checkAppAccess");

const createResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("checkAppAccess middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sharedDatabase.executeWithRetry.mockImplementation(async (operation) => operation());
    mockPrisma.company.findUnique.mockResolvedValue({});
  });

  it("expands legacy order route access slugs to the installed ecommerce app", async () => {
    const req = {
      user: {
        companyId: "company-1",
      },
    };
    const res = createResponse();
    const next = jest.fn();

    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "app-1",
        slug: "ecommerce-basic",
        name: "Ecommerce Basic",
      },
    ]);
    mockPrisma.companyApp.findUnique.mockResolvedValue({
      id: "company-app-1",
      status: "ACTIVE",
    });

    await checkAppAccess("order-core")(req, res, next);

    expect(getCandidateAppSlugs("order-core")).toEqual([
      "order-core",
      "ecommerce-basic",
      "store-basic",
      "store",
      "pos-pro",
      "cafe-restaurant-pro",
    ]);
    expect(mockPrisma.marketplaceApp.findMany).toHaveBeenNthCalledWith(1, {
      where: { slug: { in: ["order-core", "ecommerce-basic", "store-basic", "store", "pos-pro", "cafe-restaurant-pro"] } },
    });
    expect(mockPrisma.companyApp.findUnique).toHaveBeenCalledWith({
      where: {
        companyId_appId: { companyId: "company-1", appId: "app-1" },
      },
    });
    expect(req.marketplaceApp).toEqual(
      expect.objectContaining({
        slug: "ecommerce-basic",
      }),
    );
    expect(next).toHaveBeenCalled();
  });

  it("expands unified-inbox to messaging apps like whatsapp-business and facebook-pages-connect", async () => {
    const req = {
      user: {
        companyId: "company-1",
      },
    };
    const res = createResponse();
    const next = jest.fn();

    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "app-wa",
        slug: "whatsapp-business",
        name: "WhatsApp Business",
      },
    ]);
    mockPrisma.companyApp.findUnique.mockResolvedValue({
      id: "company-app-wa",
      status: "ACTIVE",
    });

    await checkAppAccess("unified-inbox")(req, res, next);

    expect(getCandidateAppSlugs("unified-inbox")).toEqual([
      "unified-inbox",
      "whatsapp-business",
      "whatsapp-integration",
      "whatsapp-inbox",
      "facebook-pages-connect",
      "instagram-business",
      "tiktok-integrations",
      "telegram-business",
      "telegram-integration",
      "crm-lite",
      "crm-basic",
    ]);
    expect(mockPrisma.marketplaceApp.findMany).toHaveBeenCalledWith({
      where: {
        slug: {
          in: [
            "unified-inbox",
            "whatsapp-business",
            "whatsapp-integration",
            "whatsapp-inbox",
            "facebook-pages-connect",
            "instagram-business",
            "tiktok-integrations",
            "telegram-business",
            "telegram-integration",
            "crm-lite",
            "crm-basic",
          ],
        },
      },
    });
    expect(req.marketplaceApp).toEqual(
      expect.objectContaining({
        slug: "whatsapp-business",
      }),
    );
    expect(next).toHaveBeenCalled();
  });

  it("keeps returning 404 when neither the requested slug nor its aliases exist", async () => {
    const req = {
      user: {
        companyId: "company-1",
      },
    };
    const res = createResponse();
    const next = jest.fn();

    mockPrisma.marketplaceApp.findMany.mockResolvedValue([]);

    await checkAppAccess("order-core")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "الأداة غير موجودة",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("does NOT auto-heal legacy aliases or resurrect cancelled apps when user explicitly cancelled the app", async () => {
    const req = {
      user: {
        companyId: "company-1",
      },
    };
    const res = createResponse();
    const next = jest.fn();

    mockPrisma.company.findUnique.mockResolvedValue({
      trialModeEnabled: true,
      trialEndsAt: new Date(Date.now() + 86400000),
    });

    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      { id: "app-core", slug: "order-core", name: "إدارة الطلبات" },
      { id: "app-store", slug: "store-basic", name: "المتجر" },
    ]);

    // Primary app is cancelled
    mockPrisma.companyApp.findUnique.mockImplementation(async ({ where }) => {
      if (where.companyId_appId.appId === "app-core") {
        return { id: "ca-1", status: "CANCELLED" };
      }
      return null;
    });

    await checkAppAccess("order-core")(req, res, next);

    expect(mockPrisma.companyApp.upsert).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "APP_CANCELLED",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});

