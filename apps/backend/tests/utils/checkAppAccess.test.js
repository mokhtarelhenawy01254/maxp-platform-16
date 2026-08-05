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
    ]);
    expect(mockPrisma.marketplaceApp.findMany).toHaveBeenNthCalledWith(1, {
      where: { slug: { in: ["order-core", "ecommerce-basic"] } },
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
});
