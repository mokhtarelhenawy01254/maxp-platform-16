const request = require("supertest");
const express = require("express");

const mockGetMarketplaceCatalogDbDiff = jest.fn();

jest.mock("../../middleware/superAdminMiddleware", () => ({
  authenticateToken: (req, res, next) => next(),
  requireSuperAdmin: (req, res, next) => next()
}));

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(),
  executeWithRetry: jest.fn()
}));

jest.mock("../../services/catalog/marketplaceCatalogDiffService", () => ({
  getMarketplaceCatalogDbDiff: (...args) => mockGetMarketplaceCatalogDbDiff(...args)
}));

const marketplaceManagementRoutes = require("../../routes/marketplaceManagementRoutes");

describe("marketplaceManagementRoutes catalog diff endpoint", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/api/v1/super-admin/marketplace-management", marketplaceManagementRoutes);
  });

  test("GET /catalog/diff returns full summary", async () => {
    mockGetMarketplaceCatalogDbDiff.mockResolvedValue({
      comparedAt: "2026-03-06T00:00:00.000Z",
      catalogMeta: { catalogVersion: "test" },
      totals: {
        catalogApps: 1,
        dbApps: 1,
        catalogBundles: 1,
        dbBundles: 1,
        diffEntries: 0
      },
      apps: { missingInDb: [], extraInDb: [], changed: [] },
      bundles: { missingInDb: [], extraInDb: [], changed: [] }
    });

    const response = await request(app).get("/api/v1/super-admin/marketplace-management/catalog/diff");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.apps).toBeDefined();
    expect(response.body.data.totals.diffEntries).toBe(0);
  });

  test("GET /catalog/diff?includeDetails=false returns totals-only", async () => {
    mockGetMarketplaceCatalogDbDiff.mockResolvedValue({
      comparedAt: "2026-03-06T00:00:00.000Z",
      catalogMeta: { catalogVersion: "test" },
      totals: {
        catalogApps: 2,
        dbApps: 1,
        catalogBundles: 1,
        dbBundles: 1,
        diffEntries: 1
      },
      apps: { missingInDb: ["crm-lite"], extraInDb: [], changed: [] },
      bundles: { missingInDb: [], extraInDb: [], changed: [] }
    });

    const response = await request(app).get("/api/v1/super-admin/marketplace-management/catalog/diff?includeDetails=false");

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totals.diffEntries).toBe(1);
    expect(response.body.data.apps).toBeUndefined();
    expect(response.body.data.bundles).toBeUndefined();
  });
});
