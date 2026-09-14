const {
  buildDbAppPayloadFromCatalog,
  getUnresolvedMissingEntries,
  hasUnresolvedMissingEntries,
  parseArgs,
  resolveBundleAppIds,
  syncMissingMarketplaceCatalogEntries
} = require("../../scripts/sync_target_marketplace_catalog_entries");

function createCatalogApp(overrides = {}) {
  return {
    slug: "sales-boost",
    name: "Sales Boost",
    description: "Boost sales",
    category: "sales",
    pricingModel: "SUBSCRIPTION",
    monthlyPrice: 100,
    yearlyPrice: 1000,
    unitPrice: null,
    unitName: null,
    features: { automation: true },
    requiredApps: [],
    trialDays: 14,
    isActive: true,
    isPublic: true,
    isFeatured: false,
    isPopular: false,
    engineCompatibility: "v2",
    icon: "TrendingUp",
    logo: "/logo.svg",
    coverImage: "/cover.png",
    ...overrides
  };
}

describe("sync_target_marketplace_catalog_entries", () => {
  test("creates missing apps and bundles without overwriting existing rows", async () => {
    const catalogService = {
      getSnapshot: jest.fn().mockResolvedValue({
        meta: { catalogVersion: "test-version" },
        apps: [
          createCatalogApp({ slug: "existing-app", name: "Existing App" }),
          createCatalogApp({ slug: "new-app", name: "New App", requiredApps: ["existing-app"] })
        ],
        bundles: [
          {
            slug: "starter-bundle",
            name: "Starter Bundle",
            nameEn: "Starter Bundle",
            description: "Starter",
            monthlyPrice: 150,
            yearlyPrice: 1500,
            discount: 10,
            isActive: true,
            isFeatured: true,
            appSlugs: ["existing-app", "new-app"]
          }
        ]
      })
    };

    const prisma = {
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue([{ id: "db-existing", slug: "existing-app" }]),
        create: jest.fn(async ({ data }) => ({ id: `db-${data.slug}`, ...data }))
      },
      appBundle: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(async ({ data }) => ({ id: `bundle-${data.slug}`, ...data }))
      }
    };

    const summary = await syncMissingMarketplaceCatalogEntries({
      catalogService,
      prisma,
      executeDbOperation: (operation) => operation()
    });

    expect(prisma.marketplaceApp.create).toHaveBeenCalledTimes(1);
    expect(prisma.marketplaceApp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "new-app",
        name: "New App",
        requiredApps: ["existing-app"]
      })
    });
    expect(prisma.appBundle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "starter-bundle",
        appIds: ["db-existing", "db-new-app"]
      })
    });
    expect(summary.apps.existing).toEqual(["existing-app"]);
    expect(summary.apps.created).toEqual(["new-app"]);
    expect(summary.bundles.created).toEqual(["starter-bundle"]);
    expect(hasUnresolvedMissingEntries(summary)).toBe(false);
  });

  test("does not overwrite custom name or description of existing apps", async () => {
    const catalogService = {
      getSnapshot: jest.fn().mockResolvedValue({
        meta: { catalogVersion: "test-version" },
        apps: [
          createCatalogApp({
            slug: "existing-app",
            name: "Original Catalog Name",
            description: "Original Catalog Description",
            mainRoute: "/new-route"
          })
        ],
        bundles: []
      })
    };

    const prisma = {
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue([{ id: "db-existing", slug: "existing-app" }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn()
      },
      appBundle: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn()
      }
    };

    await syncMissingMarketplaceCatalogEntries({
      catalogService,
      prisma,
      executeDbOperation: (operation) => operation()
    });

    expect(prisma.marketplaceApp.updateMany).toHaveBeenCalledWith({
      where: { slug: "existing-app" },
      data: expect.not.objectContaining({
        name: "Original Catalog Name",
        description: "Original Catalog Description"
      })
    });
    expect(prisma.marketplaceApp.updateMany).toHaveBeenCalledWith({
      where: { slug: "existing-app" },
      data: expect.objectContaining({
        mainRoute: "/new-route"
      })
    });
  });

  test("dry-run reports planned creates without writing to DB", async () => {
    const catalogService = {
      getSnapshot: jest.fn().mockResolvedValue({
        meta: { catalogVersion: "test-version" },
        apps: [createCatalogApp({ slug: "new-app" })],
        bundles: [
          {
            slug: "starter-bundle",
            name: "Starter Bundle",
            description: "Starter",
            monthlyPrice: 150,
            discount: 10,
            isActive: true,
            isFeatured: false,
            appSlugs: ["new-app"]
          }
        ]
      })
    };

    const prisma = {
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn()
      },
      appBundle: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn()
      }
    };

    const summary = await syncMissingMarketplaceCatalogEntries({
      catalogService,
      prisma,
      dryRun: true,
      executeDbOperation: (operation) => operation()
    });

    expect(prisma.marketplaceApp.create).not.toHaveBeenCalled();
    expect(prisma.appBundle.create).not.toHaveBeenCalled();
    expect(summary.apps.planned).toEqual(["new-app"]);
    expect(summary.bundles.planned).toEqual(["starter-bundle"]);
    expect(hasUnresolvedMissingEntries(summary)).toBe(true);
  });

  test("skips bundles that reference unavailable apps", async () => {
    const resolution = resolveBundleAppIds(
      { appSlugs: ["known-app", "missing-app"] },
      new Map([["known-app", "db-known"]])
    );

    expect(resolution.appIds).toEqual(["db-known"]);
    expect(resolution.missingAppSlugs).toEqual(["missing-app"]);
  });

  test("normalizes catalog app payload for Prisma", () => {
    const payload = buildDbAppPayloadFromCatalog(
      createCatalogApp({
        pricingModel: "bad-value",
        monthlyPrice: 0,
        features: "{\"flag\":true}",
        requiredApps: "base-app,crm"
      })
    );

    expect(payload.pricingModel).toBe("FREE");
    expect(payload.features).toEqual({ flag: true });
    expect(payload.requiredApps).toEqual(["base-app", "crm"]);
    expect(payload.images).toEqual(["/cover.png"]);
  });

  test("parses safe CLI options", () => {
    expect(parseArgs(["--dry-run", "--fail-on-missing", "--json", "--apps-only", "--only-missing"])).toEqual({
      dryRun: true,
      failOnMissing: true,
      json: true,
      syncApps: true,
      syncBundles: false,
      help: false
    });
  });

  test("reports unresolved missing entries for deploy guard failures", () => {
    const unresolved = getUnresolvedMissingEntries({
      dryRun: false,
      apps: {
        planned: [],
        invalid: [{ reason: "missing_slug", name: "Untitled" }]
      },
      bundles: {
        planned: [],
        skippedMissingApps: [
          {
            slug: "broken-bundle",
            missingAppSlugs: ["missing-app"]
          }
        ]
      }
    });

    expect(unresolved).toEqual([
      {
        type: "app",
        slug: "Untitled",
        reason: "missing_slug"
      },
      {
        type: "bundle",
        slug: "broken-bundle",
        reason: "missing_app_refs",
        missingAppSlugs: ["missing-app"]
      }
    ]);
  });
});
