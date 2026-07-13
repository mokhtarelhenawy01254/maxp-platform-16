const { getMarketplaceCatalogDbDiff } = require("../../services/catalog/marketplaceCatalogDiffService");

describe("marketplaceCatalogDiffService", () => {
  test("builds summary with missing, extra, and changed entries", async () => {
    const mockCatalogService = {
      getAllApps: jest.fn().mockResolvedValue({
        data: [
          {
            slug: "store-basic",
            name: "Store Basic",
            description: "Store",
            category: "ECOMMERCE",
            pricingModel: "SUBSCRIPTION",
            monthlyPrice: 249,
            yearlyPrice: 2499,
            unitPrice: null,
            unitName: null,
            trialDays: 14,
            isActive: true,
            isPublic: true,
            isFeatured: true,
            isPopular: true,
            engineCompatibility: null,
            requiredApps: []
          },
          {
            slug: "crm-lite",
            name: "CRM Lite",
            description: "CRM",
            category: "CRM",
            pricingModel: "FREE",
            monthlyPrice: 0,
            yearlyPrice: 0,
            unitPrice: null,
            unitName: null,
            trialDays: 0,
            isActive: true,
            isPublic: true,
            isFeatured: false,
            isPopular: false,
            engineCompatibility: null,
            requiredApps: []
          }
        ],
        meta: { catalogVersion: "test-version" }
      }),
      getAllBundles: jest.fn().mockResolvedValue({
        data: [
          {
            slug: "starter-bundle",
            name: "Starter Bundle",
            description: "Starter",
            monthlyPrice: 399,
            yearlyPrice: 3999,
            discount: 20,
            isActive: true,
            isFeatured: false,
            appSlugs: ["store-basic"]
          }
        ],
        meta: { catalogVersion: "test-version" }
      })
    };

    const mockPrisma = {
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "db-app-store-basic",
            slug: "store-basic",
            name: "Store Basic",
            description: "Store",
            category: "ECOMMERCE",
            pricingModel: "SUBSCRIPTION",
            monthlyPrice: 199,
            yearlyPrice: 1999,
            unitPrice: null,
            unitName: null,
            trialDays: 14,
            isActive: true,
            isPublic: true,
            isFeatured: true,
            isPopular: true,
            engineCompatibility: null,
            requiredApps: []
          },
          {
            id: "db-app-extra",
            slug: "legacy-app",
            name: "Legacy App",
            description: "Legacy",
            category: "GENERAL",
            pricingModel: "SUBSCRIPTION",
            monthlyPrice: 99,
            yearlyPrice: 999,
            unitPrice: null,
            unitName: null,
            trialDays: 7,
            isActive: true,
            isPublic: true,
            isFeatured: false,
            isPopular: false,
            engineCompatibility: null,
            requiredApps: []
          }
        ])
      },
      appBundle: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "db-bundle-starter",
            slug: "starter-bundle",
            name: "Starter Bundle",
            description: "Starter",
            appIds: ["db-app-store-basic"],
            monthlyPrice: 399,
            yearlyPrice: 3999,
            discount: 15,
            isActive: true,
            isFeatured: false
          },
          {
            id: "db-bundle-extra",
            slug: "legacy-bundle",
            name: "Legacy Bundle",
            description: "Legacy",
            appIds: ["db-app-extra"],
            monthlyPrice: 199,
            yearlyPrice: null,
            discount: 5,
            isActive: true,
            isFeatured: false
          }
        ])
      }
    };

    const summary = await getMarketplaceCatalogDbDiff({
      catalogService: mockCatalogService,
      prisma: mockPrisma
    });

    expect(summary.totals.catalogApps).toBe(2);
    expect(summary.totals.dbApps).toBe(2);
    expect(summary.apps.missingInDb).toEqual(["crm-lite"]);
    expect(summary.apps.extraInDb).toEqual(["legacy-app"]);
    expect(summary.apps.changed.map((entry) => entry.slug)).toContain("store-basic");
    expect(summary.bundles.extraInDb).toEqual(["legacy-bundle"]);
    expect(summary.bundles.changed.map((entry) => entry.slug)).toContain("starter-bundle");
    expect(summary.totals.diffEntries).toBeGreaterThan(0);
  });

  test("throws a clear error when prisma client is unavailable", async () => {
    const mockCatalogService = {
      getAllApps: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      getAllBundles: jest.fn().mockResolvedValue({ data: [], meta: {} })
    };

    await expect(
      getMarketplaceCatalogDbDiff({
        catalogService: mockCatalogService,
        prisma: null
      })
    ).rejects.toThrow("Database client is unavailable");
  });
});
