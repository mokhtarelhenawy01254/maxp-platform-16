const mockGetMarketplaceCatalogDbDiff = jest.fn();
let mockPrisma;
const mockExecuteWithRetry = jest.fn(async (operation) => operation());

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  executeWithRetry: (...args) => mockExecuteWithRetry(...args)
}));

jest.mock("../../services/catalog/marketplaceCatalogDiffService", () => ({
  getMarketplaceCatalogDbDiff: (...args) => mockGetMarketplaceCatalogDbDiff(...args)
}));

const marketplaceManagementController = require("../../controller/marketplaceManagementController");

function createPrismaMock() {
  return {
    company: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn()
    },
    marketplaceApp: {
      findMany: jest.fn(),
      findUnique: jest.fn()
    },
    companyApp: {
      findUnique: jest.fn()
    },
    $transaction: jest.fn()
  };
}

function createResponseMock() {
  return {
    statusCode: 200,
    payload: null,
    status: jest.fn(function setStatus(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function setJson(payload) {
      this.payload = payload;
      return this;
    })
  };
}

describe("marketplaceManagementController.getCatalogDiff", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("returns full diff summary by default", async () => {
    const mockSummary = {
      comparedAt: "2026-03-06T00:00:00.000Z",
      catalogMeta: { catalogVersion: "v1" },
      totals: {
        catalogApps: 2,
        dbApps: 2,
        catalogBundles: 1,
        dbBundles: 1,
        diffEntries: 0
      },
      apps: { missingInDb: [], extraInDb: [], changed: [] },
      bundles: { missingInDb: [], extraInDb: [], changed: [] }
    };
    mockGetMarketplaceCatalogDbDiff.mockResolvedValue(mockSummary);

    const req = { query: {} };
    const res = createResponseMock();

    await marketplaceManagementController.getCatalogDiff(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.apps).toBeDefined();
    expect(res.payload.data.totals.diffEntries).toBe(0);
  });

  test("returns totals-only payload when includeDetails=false", async () => {
    const mockSummary = {
      comparedAt: "2026-03-06T00:00:00.000Z",
      catalogMeta: { catalogVersion: "v1" },
      totals: {
        catalogApps: 3,
        dbApps: 2,
        catalogBundles: 1,
        dbBundles: 1,
        diffEntries: 2
      },
      apps: { missingInDb: ["crm-lite"], extraInDb: [], changed: [] },
      bundles: { missingInDb: [], extraInDb: [], changed: [] }
    };
    mockGetMarketplaceCatalogDbDiff.mockResolvedValue(mockSummary);

    const req = { query: { includeDetails: "false" } };
    const res = createResponseMock();

    await marketplaceManagementController.getCatalogDiff(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.totals.diffEntries).toBe(2);
    expect(res.payload.data.apps).toBeUndefined();
    expect(res.payload.data.bundles).toBeUndefined();
  });

  test("returns 500 when diff generation fails", async () => {
    mockGetMarketplaceCatalogDbDiff.mockRejectedValue(new Error("boom"));

    const req = { query: {} };
    const res = createResponseMock();

    await marketplaceManagementController.getCatalogDiff(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toBe("Failed to generate catalog diff");
  });
});

describe("marketplaceManagementController marketplace coverage", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("returns companies with active app slugs and runtime app catalog", async () => {
    mockPrisma.company.findMany.mockResolvedValue([
      {
        id: "company-1",
        name: "Swan",
        email: "swan@example.com",
        slug: "swan",
        isActive: true,
        createdAt: new Date("2026-05-01T00:00:00Z"),
        installedApps: [
          {
            id: "install-1",
            status: "ACTIVE",
            activePricingModel: "SUBSCRIPTION",
            trialEndsAt: null,
            validUntil: null,
            app: {
              id: "app-1",
              slug: "procurement-pro",
              name: "Procurement Pro",
              icon: "clipboard-list",
              category: "PRODUCTIVITY",
              pricingModel: "SUBSCRIPTION"
            }
          }
        ]
      }
    ]);
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "app-1",
        slug: "procurement-pro",
        name: "Procurement Pro",
        icon: "clipboard-list",
        category: "PRODUCTIVITY",
        isActive: true,
        isPublic: true,
        pricingModel: "SUBSCRIPTION",
        monthlyPrice: 299,
        requiredApps: ["ecommerce-basic"]
      }
    ]);
    mockPrisma.company.count.mockResolvedValue(1);

    const res = createResponseMock();
    await marketplaceManagementController.getCoverage(
      { query: { search: "swan", limit: "50" } },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.totals.returnedCompanies).toBe(1);
    expect(res.payload.data.companies[0].activeAppSlugs).toEqual([
      "procurement-pro"
    ]);
    expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50
      }),
    );
  });

  test("installs requested app and required apps for a selected company", async () => {
    const requestedApp = {
      id: "app-procurement",
      slug: "procurement-pro",
      name: "Procurement Pro",
      icon: "clipboard-list",
      category: "PRODUCTIVITY",
      isActive: true,
      isPublic: true,
      pricingModel: "SUBSCRIPTION",
      trialDays: 14,
      requiredApps: ["ecommerce-basic"]
    };
    const requiredApp = {
      id: "app-ecommerce",
      slug: "ecommerce-basic",
      name: "Ecommerce Basic",
      icon: "store",
      category: "ECOMMERCE",
      isActive: true,
      isPublic: true,
      pricingModel: "SUBSCRIPTION",
      trialDays: 14,
      requiredApps: []
    };
    const tx = {
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue([requiredApp]),
        update: jest.fn().mockResolvedValue({})
      },
      companyApp: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: "install-procurement",
            companyId: "company-1",
            appId: "app-procurement",
            status: "TRIAL",
            app: {
              id: "app-procurement",
              name: "Procurement Pro",
              slug: "procurement-pro",
              icon: "clipboard-list",
              category: "PRODUCTIVITY"
            }
          }),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn()
      },
      companyWallet: {
        upsert: jest.fn().mockResolvedValue({})
      }
    };

    mockPrisma.company.findUnique.mockResolvedValue({
      id: "company-1",
      name: "Swan",
      email: "swan@example.com",
      isActive: true
    });
    mockPrisma.marketplaceApp.findUnique.mockResolvedValue(requestedApp);
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const res = createResponseMock();
    await marketplaceManagementController.installCompanyCoverageApp(
      {
        params: { companyId: "company-1", slug: "procurement-pro" },
        body: { pricingModel: "SUBSCRIPTION" }
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(tx.companyApp.create).toHaveBeenCalledTimes(2);
    expect(tx.marketplaceApp.update).toHaveBeenCalledTimes(2);
    expect(res.payload.data.autoInstalledApps).toEqual([
      { slug: "ecommerce-basic", name: "Ecommerce Basic" }
    ]);
    expect(res.payload.data.installation.app.slug).toBe("procurement-pro");
  });
});
