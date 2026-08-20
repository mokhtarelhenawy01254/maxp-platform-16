const {
  repairStaleRequiredApps
} = require("../../scripts/repair_stale_marketplace_required_apps");
const {
  deactivateDeprecatedApps,
  removeStaleRequiredAppReferences
} = require("../../scripts/deactivate_old_marketplace_apps");

function createDbApp(overrides = {}) {
  return {
    id: `db-${overrides.slug || "app"}`,
    slug: "app",
    name: "App",
    description: "desc",
    category: "general",
    pricingModel: "SUBSCRIPTION",
    monthlyPrice: 100,
    yearlyPrice: 1000,
    trialDays: 14,
    requiredApps: [],
    isActive: true,
    isPublic: true,
    ...overrides
  };
}

describe("repair_stale_marketplace_required_apps", () => {
  test("removes stale required-app references for legacy DB-only apps", async () => {
    const catalogService = {
      getSnapshot: jest.fn().mockResolvedValue({
        meta: { catalogVersion: "test" },
        apps: [{ slug: "store", name: "Store", requiredApps: [] }],
        bundles: []
      })
    };

    const apps = [
      createDbApp({
        slug: "manual-orders-pro",
        requiredApps: ["store-basic"]
      }),
      createDbApp({
        slug: "conversion-suite",
        requiredApps: ["store-basic", "ai-chat-basic"]
      }),
      createDbApp({
        slug: "store",
        requiredApps: [],
        isActive: true,
        isPublic: true
      }),
      createDbApp({
        slug: "ai-chat-basic",
        requiredApps: [],
        isActive: true,
        isPublic: true
      })
    ];

    const prisma = {
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue(apps),
        update: jest.fn(async ({ where, data }) => ({
          ...apps.find((app) => app.id === where.id),
          ...data
        }))
      }
    };

    const log = jest.fn();
    const summary = await repairStaleRequiredApps({ prisma, catalogService, log });

    expect(summary.reviewed).toBe(4);
    expect(summary.updated).toBe(2);
    expect(prisma.marketplaceApp.update).toHaveBeenCalledTimes(2);
    expect(prisma.marketplaceApp.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "db-manual-orders-pro" },
        data: expect.objectContaining({ requiredApps: [] })
      })
    );
    expect(prisma.marketplaceApp.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "db-conversion-suite" },
        data: expect.objectContaining({ requiredApps: ["ai-chat-basic"] })
      })
    );
  });

  test("aligns catalog apps to their catalog-defined requiredApps", async () => {
    const catalogService = {
      getSnapshot: jest.fn().mockResolvedValue({
        meta: { catalogVersion: "test" },
        apps: [
          {
            slug: "conversion-suite",
            name: "Conversion Suite",
            requiredApps: ["store"]
          }
        ],
        bundles: []
      })
    };

    const apps = [
      createDbApp({
        slug: "conversion-suite",
        requiredApps: ["store-basic"]
      }),
      createDbApp({
        slug: "store",
        requiredApps: [],
        isActive: true,
        isPublic: true
      })
    ];

    const prisma = {
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue(apps),
        update: jest.fn(async ({ where, data }) => ({
          ...apps.find((app) => app.id === where.id),
          ...data
        }))
      }
    };

    const summary = await repairStaleRequiredApps({ prisma, catalogService, log: jest.fn() });

    expect(summary.updated).toBe(1);
    expect(prisma.marketplaceApp.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "db-conversion-suite" },
        data: expect.objectContaining({ requiredApps: ["store"] })
      })
    );
  });

  test("is idempotent when no stale references exist", async () => {
    const catalogService = {
      getSnapshot: jest.fn().mockResolvedValue({ apps: [], bundles: [] })
    };

    const apps = [
      createDbApp({ slug: "manual-orders-pro", requiredApps: [] })
    ];

    const prisma = {
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue(apps),
        update: jest.fn()
      }
    };

    const summary = await repairStaleRequiredApps({ prisma, catalogService, log: jest.fn() });

    expect(summary.updated).toBe(0);
    expect(prisma.marketplaceApp.update).not.toHaveBeenCalled();
  });
});

describe("deactivate_old_marketplace_apps", () => {
  test("removes references to deprecated slugs before deactivating them", async () => {
    const apps = [
      createDbApp({ slug: "store-basic", isActive: true }),
      createDbApp({ slug: "store-pro", isActive: true }),
      createDbApp({ slug: "ecommerce-basic", isActive: false }),
      createDbApp({
        slug: "manual-orders-pro",
        requiredApps: ["store-basic"]
      }),
      createDbApp({
        slug: "conversion-suite",
        requiredApps: ["store-basic", "store-pro"]
      })
    ];

    const prisma = {
      marketplaceApp: {
        findUnique: jest.fn(async ({ where }) => apps.find((app) => app.slug === where.slug) || null),
        findMany: jest.fn(async () => apps),
        update: jest.fn(async ({ where, data }) => {
          const index = apps.findIndex((app) => app.id === where.id || app.slug === where.slug);
          apps[index] = { ...apps[index], ...data };
          return apps[index];
        })
      }
    };

    const log = jest.fn();
    const result = await deactivateDeprecatedApps({
      prisma,
      log,
      deprecatedSlugs: ["store-basic", "store-pro", "ecommerce-basic"]
    });

    expect(result.deactivated).toBe(2);
    expect(result.cleanedReferences).toBe(3);

    const manualOrders = apps.find((app) => app.slug === "manual-orders-pro");
    const conversion = apps.find((app) => app.slug === "conversion-suite");
    expect(manualOrders.requiredApps).toEqual([]);
    expect(conversion.requiredApps).toEqual([]);
    expect(apps.find((app) => app.slug === "store-basic").isActive).toBe(false);
    expect(apps.find((app) => app.slug === "store-pro").isActive).toBe(false);
  });

  test("removeStaleRequiredAppReferences only touches apps referencing the deprecated slug", async () => {
    const apps = [
      createDbApp({ slug: "unrelated", requiredApps: [] })
    ];

    const prisma = {
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue(apps),
        update: jest.fn()
      }
    };

    const cleaned = await removeStaleRequiredAppReferences(prisma, "store-basic");

    expect(cleaned).toBe(0);
    expect(prisma.marketplaceApp.update).not.toHaveBeenCalled();
  });
});