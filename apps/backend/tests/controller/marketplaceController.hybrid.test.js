const mockCatalogService = {
  getAllApps: jest.fn(),
  getAllBundles: jest.fn(),
  getAppBySlug: jest.fn(),
  getBundleBySlug: jest.fn()
};

const mockBusinessSpecialtyService = {
  getCompanySpecialtyAppSlugs: jest.fn()
};

const mockExecuteWithRetry = jest.fn(async (operation) => operation());
let mockPrisma;

function createPrismaMock() {
  return {
    marketplaceApp: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn()
    },
    companyApp: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn()
    },
    appBundle: {
      findUnique: jest.fn(),
      findMany: jest.fn()
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

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: () => mockPrisma,
  executeWithRetry: (...args) => mockExecuteWithRetry(...args)
}));

jest.mock("../../services/catalog/marketplaceCatalogService", () => ({
  marketplaceCatalogService: mockCatalogService
}));

jest.mock("../../services/businessSpecialtyService", () => mockBusinessSpecialtyService);

const marketplaceController = require("../../controller/marketplaceController");

describe("Marketplace Controller Hybrid", () => {
  const originalCatalogSource = process.env.CATALOG_SOURCE;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    process.env.CATALOG_SOURCE = "file";
    mockBusinessSpecialtyService.getCompanySpecialtyAppSlugs.mockResolvedValue({
      applied: false,
      specialty: null,
      appSlugs: []
    });
  });

  afterAll(() => {
    process.env.CATALOG_SOURCE = originalCatalogSource;
  });

  test("getAllApps returns apps from file catalog source", async () => {
    mockCatalogService.getAllApps.mockResolvedValue({
      data: [
        {
          id: "cat-app-store-basic",
          slug: "store-basic",
          name: "Store Basic",
          description: "Store app",
          category: "ECOMMERCE",
          monthlyPrice: 249,
          yearlyPrice: 2499,
          pricingModel: "SUBSCRIPTION",
          isActive: true,
          isPublic: true,
          isFeatured: true,
          isPopular: true,
          trialDays: 14,
          installCount: 0,
          rating: 0,
          reviewCount: 0
        }
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      meta: { catalogVersion: "test", catalogHash: "hash" }
    });

    const req = { query: { page: 1, limit: 20 }, user: null };
    const res = createResponseMock();

    await marketplaceController.getAllApps(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toHaveLength(1);
    expect(res.payload.data[0].slug).toBe("store-basic");
    expect(res.payload.catalog.source).toBe("file");
    expect(mockPrisma.marketplaceApp.findMany).not.toHaveBeenCalled();
  });

  test("getAllApps returns DB apps when catalog source is db", async () => {
    process.env.CATALOG_SOURCE = "db";
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "db-app-store-basic",
        slug: "store-basic",
        name: "Store Basic",
        description: "DB app",
        category: "ECOMMERCE",
        monthlyPrice: 249,
        yearlyPrice: 2499,
        features: "[\"Storefront\", \"Themes\"]",
        requiredApps: "[\"ecommerce-basic\"]",
        isActive: true,
        isPublic: true,
        _count: {
          installations: 12,
          reviews: 3
        }
      }
    ]);
    mockPrisma.marketplaceApp.count.mockResolvedValue(1);

    const req = { query: { page: 1, limit: 20 }, user: null };
    const res = createResponseMock();

    await marketplaceController.getAllApps(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toHaveLength(1);
    expect(res.payload.data[0].slug).toBe("store-basic");
    expect(res.payload.data[0].isInstalled).toBe(false);
    expect(res.payload.data[0].features).toEqual(["Storefront", "Themes"]);
    expect(res.payload.data[0].requiredApps).toEqual(["ecommerce-basic"]);
    expect(res.payload.pagination.total).toBe(1);
    expect(res.payload.catalog).toBeUndefined();
    expect(mockCatalogService.getAllApps).not.toHaveBeenCalled();
    expect(mockPrisma.marketplaceApp.findMany).toHaveBeenCalled();
    expect(mockPrisma.marketplaceApp.count).toHaveBeenCalled();
  });

  test("getAllApps keeps the full DB catalog for authenticated specialty companies", async () => {
    process.env.CATALOG_SOURCE = "db";
    mockBusinessSpecialtyService.getCompanySpecialtyAppSlugs.mockResolvedValue({
      applied: true,
      specialty: {
        id: "bizsp_ecommerce_retail",
        slug: "ecommerce-retail",
        nameAr: "التجارة والمتاجر",
        nameEn: "E-commerce & Retail"
      },
      appSlugs: ["store-basic"]
    });
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "db-app-store-basic",
        slug: "store-basic",
        name: "Store Basic",
        description: "Store app",
        category: "ECOMMERCE",
        monthlyPrice: 249,
        yearlyPrice: 2499,
        features: {},
        requiredApps: [],
        isActive: true,
        isPublic: true,
        _count: {
          installations: 12,
          reviews: 3
        }
      },
      {
        id: "db-app-hr-payroll",
        slug: "hr-payroll",
        name: "HR Payroll",
        description: "Payroll app",
        category: "HR",
        monthlyPrice: 299,
        yearlyPrice: 2999,
        features: {},
        requiredApps: [],
        isActive: true,
        isPublic: true,
        _count: {
          installations: 4,
          reviews: 1
        }
      }
    ]);
    mockPrisma.marketplaceApp.count.mockResolvedValue(2);
    mockPrisma.companyApp.findMany.mockResolvedValue([]);

    const req = {
      query: { page: 1, limit: 200 },
      user: { id: "user-1", companyId: "company-1" }
    };
    const res = createResponseMock();

    await marketplaceController.getAllApps(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.map((app) => app.slug)).toEqual([
      "store-basic",
      "hr-payroll"
    ]);
    expect(res.payload.specialty.slug).toBe("ecommerce-retail");
    expect(res.payload.data.find((app) => app.slug === "store-basic").isRecommendedForSpecialty).toBe(true);
    expect(res.payload.data.find((app) => app.slug === "hr-payroll").isRecommendedForSpecialty).toBe(false);

    const findManyArgs = mockPrisma.marketplaceApp.findMany.mock.calls[0][0];
    expect(findManyArgs.where.slug).toBeUndefined();
  });

  test("getAllApps DB search only queries MarketplaceApp schema fields", async () => {
    process.env.CATALOG_SOURCE = "db";
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceApp.count.mockResolvedValue(0);

    const req = {
      query: {
        category: "ECOMMERCE",
        search: "c",
        sort: "featured",
        page: 1,
        limit: 20
      },
      user: null
    };
    const res = createResponseMock();

    await marketplaceController.getAllApps(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);

    const findManyArgs = mockPrisma.marketplaceApp.findMany.mock.calls[0][0];
    expect(findManyArgs.where).toMatchObject({
      isActive: true,
      isPublic: true,
      category: "ECOMMERCE",
      OR: [
        { name: { contains: "c", mode: "insensitive" } },
        { description: { contains: "c", mode: "insensitive" } }
      ]
    });
    expect(JSON.stringify(findManyArgs.where)).not.toContain("nameEn");
  });

  test("getAllApps in hybrid mode enriches catalog apps with DB stats and installation state", async () => {
    process.env.CATALOG_SOURCE = "hybrid";
    mockCatalogService.getAllApps.mockResolvedValue({
      data: [
        {
          id: "cat-app-store-basic",
          slug: "store-basic",
          name: "Store Basic",
          description: "Catalog app",
          category: "ECOMMERCE",
          monthlyPrice: 249,
          yearlyPrice: 2499,
          pricingModel: "SUBSCRIPTION",
          isActive: true,
          isPublic: true,
          installCount: 1,
          rating: 1,
          reviewCount: 1
        }
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      meta: { catalogVersion: "test", catalogHash: "hash" }
    });

    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "db-app-store-basic",
        slug: "store-basic",
        name: "DB Customized Store Name",
        description: "DB Customized Description",
        installCount: 25,
        rating: 4.7,
        reviewCount: 11
      }
    ]);
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        appId: "db-app-store-basic",
        status: "ACTIVE",
        activePricingModel: "SUBSCRIPTION"
      }
    ]);

    const req = {
      query: { page: 1, limit: 20 },
      user: { companyId: "company-1" }
    };
    const res = createResponseMock();

    await marketplaceController.getAllApps(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.catalog.source).toBe("hybrid");
    expect(res.payload.data[0].id).toBe("db-app-store-basic");
    expect(res.payload.data[0].name).toBe("DB Customized Store Name");
    expect(res.payload.data[0].description).toBe("DB Customized Description");
    expect(res.payload.data[0].installCount).toBe(25);
    expect(res.payload.data[0].rating).toBe(4.7);
    expect(res.payload.data[0].reviewCount).toBe(11);
    expect(res.payload.data[0].isInstalled).toBe(true);
    expect(res.payload.data[0].activePricingModel).toBe("SUBSCRIPTION");
  });

  test("getAllApps defaults to hybrid when catalog source is unset outside production", async () => {
    delete process.env.CATALOG_SOURCE;

    mockCatalogService.getAllApps.mockResolvedValue({
      data: [
        {
          id: "cat-app-conversion-suite",
          slug: "conversion-suite",
          name: "Conversion Suite",
          description: "Catalog app",
          category: "MARKETING",
          monthlyPrice: 349,
          yearlyPrice: 3499,
          pricingModel: "SUBSCRIPTION",
          isActive: true,
          isPublic: true,
          installCount: 0,
          rating: 0,
          reviewCount: 0
        }
      ],
      pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      meta: { catalogVersion: "test", catalogHash: "hash" }
    });
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([]);

    const req = { query: { page: 1, limit: 20 }, user: null };
    const res = createResponseMock();

    await marketplaceController.getAllApps(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.catalog.source).toBe("hybrid");
    expect(res.payload.data[0].slug).toBe("conversion-suite");
    expect(mockCatalogService.getAllApps).toHaveBeenCalled();
  });

  test("getBundles in hybrid mode merges DB app details into catalog bundles", async () => {
    process.env.CATALOG_SOURCE = "hybrid";
    mockCatalogService.getAllBundles.mockResolvedValue({
      data: [
        {
          id: "cat-bundle-starter",
          slug: "starter-bundle",
          name: "Starter Bundle",
          description: "Catalog bundle",
          monthlyPrice: 399,
          yearlyPrice: 3999,
          discount: 20,
          isActive: true,
          apps: [
            {
              id: "cat-app-store-basic",
              slug: "store-basic",
              name: "Store Basic",
              description: "Catalog desc",
              monthlyPrice: 120
            }
          ]
        }
      ],
      meta: { catalogVersion: "test", catalogHash: "hash" }
    });

    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "db-app-store-basic",
        slug: "store-basic",
        name: "Store Basic DB",
        description: "DB desc",
        monthlyPrice: 249,
        logo: "https://example.com/logo.png"
      }
    ]);

    const req = { query: {}, user: null };
    const res = createResponseMock();

    await marketplaceController.getBundles(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.catalog.source).toBe("hybrid");
    expect(res.payload.data).toHaveLength(1);
    expect(res.payload.data[0].apps[0].id).toBe("db-app-store-basic");
    expect(res.payload.data[0].apps[0].name).toBe("Store Basic DB");
    expect(res.payload.data[0].apps[0].monthlyPrice).toBe(249);
    expect(res.payload.data[0].appIds).toContain("db-app-store-basic");
  });

  test("getBundles in DB mode resolves bundle app tokens by id, slug, or JSON string", async () => {
    process.env.CATALOG_SOURCE = "db";
    mockBusinessSpecialtyService.getCompanySpecialtyAppSlugs.mockResolvedValue({
      applied: true,
      specialty: {
        id: "bizsp_ecommerce_retail",
        slug: "ecommerce-retail",
        nameAr: "التجارة والمتاجر",
        nameEn: "E-commerce & Retail"
      },
      appSlugs: ["store-basic"]
    });
    const dbApps = [
      {
        id: "db-app-store-basic",
        slug: "store-basic",
        name: "Store Basic",
        description: "Store",
        monthlyPrice: 249,
        logo: null
      },
      {
        id: "db-app-ai-chat-basic",
        slug: "ai-chat-basic",
        name: "AI Chat Basic",
        description: "AI",
        monthlyPrice: 0,
        logo: null
      },
      {
        id: "db-app-crm-basic",
        slug: "crm-basic",
        name: "CRM Basic",
        description: "CRM",
        monthlyPrice: 149,
        logo: null
      }
    ];

    mockPrisma.appBundle.findMany.mockResolvedValue([
      {
        id: "bundle-slugs",
        slug: "slug-bundle",
        name: "Slug Bundle",
        appIds: ["store-basic", "db-app-ai-chat-basic"],
        monthlyPrice: 399,
        yearlyPrice: 3999,
        discount: 20,
        isActive: true,
        isFeatured: true
      },
      {
        id: "bundle-json",
        slug: "json-bundle",
        name: "JSON Bundle",
        appIds: "[\"crm-basic\", \"store-basic\"]",
        monthlyPrice: 299,
        yearlyPrice: 2999,
        discount: 15,
        isActive: true,
        isFeatured: false
      }
    ]);

    mockPrisma.marketplaceApp.findMany.mockImplementation(async ({ where }) => {
      const ids = where.OR[0].id.in;
      const slugs = where.OR[1].slug.in;
      return dbApps.filter((app) => ids.includes(app.id) || slugs.includes(app.slug));
    });

    const req = { query: {}, user: null };
    const res = createResponseMock();

    await marketplaceController.getBundles(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toHaveLength(2);
    expect(res.payload.data[0].appIds).toEqual([
      "db-app-store-basic",
      "db-app-ai-chat-basic"
    ]);
    expect(res.payload.data[0].apps.map((app) => app.slug)).toEqual([
      "store-basic",
      "ai-chat-basic"
    ]);
    expect(res.payload.data[1].appIds).toEqual([
      "db-app-crm-basic",
      "db-app-store-basic"
    ]);
    expect(res.payload.data[1].apps.map((app) => app.slug)).toEqual([
      "crm-basic",
      "store-basic"
    ]);
  });

  test("installApp syncs app from file catalog when missing in DB", async () => {
    const catalogApp = {
      id: "cat-app-store-basic",
      slug: "store-basic",
      name: "Store Basic",
      description: "Storefront app",
      category: "ECOMMERCE",
      pricingModel: "SUBSCRIPTION",
      monthlyPrice: 249,
      yearlyPrice: 2499,
      trialDays: 14,
      features: {},
      requiredApps: [],
      isActive: true,
      isPublic: true,
      isFeatured: true,
      isPopular: true,
      rating: 0,
      reviewCount: 0,
      installCount: 0
    };

    const syncedDbApp = {
      id: "db-app-store-basic",
      slug: "store-basic",
      name: "Store Basic",
      pricingModel: "SUBSCRIPTION",
      trialDays: 14,
      icon: null,
      requiredApps: [],
      isActive: true
    };

    const tx = {
      companyApp: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: "inst-1",
            companyId: "company-1",
            appId: "db-app-store-basic",
            activePricingModel: "SUBSCRIPTION",
            status: "TRIAL"
          }),
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({
          id: "inst-1",
          companyId: "company-1",
          appId: "db-app-store-basic",
          activePricingModel: "SUBSCRIPTION",
          status: "TRIAL"
        })
      },
      marketplaceApp: {
        update: jest.fn().mockResolvedValue({})
      },
      companyWallet: {
        findUnique: jest.fn().mockResolvedValue({ id: "wallet-1", balance: 5000, currency: "EGP" }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({})
      },
      transaction: {
        create: jest.fn().mockResolvedValue({})
      }
    };

    mockPrisma.marketplaceApp.findUnique.mockResolvedValue(null);
    mockPrisma.marketplaceApp.upsert.mockResolvedValue(syncedDbApp);
    mockPrisma.companyApp.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));
    mockCatalogService.getAppBySlug.mockResolvedValue(catalogApp);
    mockBusinessSpecialtyService.getCompanySpecialtyAppSlugs.mockResolvedValue({
      applied: true,
      specialty: {
        id: "bizsp_ecommerce_retail",
        slug: "ecommerce-retail",
        nameAr: "التجارة والمتاجر",
        nameEn: "E-commerce & Retail"
      },
      appSlugs: ["analytics-basic"]
    });

    const req = {
      params: { slug: "store-basic" },
      body: { pricingModel: "SUBSCRIPTION" },
      user: { companyId: "company-1" }
    };
    const res = createResponseMock();

    await marketplaceController.installApp(req, res);

    expect(mockPrisma.marketplaceApp.upsert).toHaveBeenCalled();
    expect(tx.companyApp.create).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.app.slug).toBe("store-basic");
    expect(res.payload.data.autoInstalledRequiredApps).toEqual([]);
  });

  test("installApp auto-installs required apps before activating the requested app", async () => {
    const catalogApps = {
      "conversion-suite": {
        id: "cat-app-conversion-suite",
        slug: "conversion-suite",
        name: "Conversion Suite",
        description: "Conversion app",
        category: "MARKETING",
        pricingModel: "SUBSCRIPTION",
        monthlyPrice: 349,
        yearlyPrice: 3499,
        trialDays: 14,
        features: {},
        requiredApps: ["store-basic"],
        isActive: true,
        isPublic: true,
        isFeatured: true,
        isPopular: true,
        rating: 0,
        reviewCount: 0,
        installCount: 0
      },
      "store-basic": {
        id: "cat-app-store-basic",
        slug: "store-basic",
        name: "Store Basic",
        description: "Store app",
        category: "ECOMMERCE",
        pricingModel: "SUBSCRIPTION",
        monthlyPrice: 249,
        yearlyPrice: 2499,
        trialDays: 14,
        features: {},
        requiredApps: [],
        isActive: true,
        isPublic: true,
        isFeatured: true,
        isPopular: true,
        rating: 0,
        reviewCount: 0,
        installCount: 0
      }
    };

    const syncedApps = {
      "conversion-suite": {
        id: "db-app-conversion-suite",
        slug: "conversion-suite",
        name: "Conversion Suite",
        pricingModel: "SUBSCRIPTION",
        trialDays: 14,
        icon: null,
        requiredApps: ["store-basic"],
        isActive: true
      },
      "store-basic": {
        id: "db-app-store-basic",
        slug: "store-basic",
        name: "Store Basic",
        pricingModel: "SUBSCRIPTION",
        trialDays: 14,
        icon: null,
        requiredApps: [],
        isActive: true
      }
    };

    const tx = {
      companyApp: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: "inst-conversion",
            companyId: "company-1",
            appId: "db-app-conversion-suite",
            activePricingModel: "SUBSCRIPTION",
            status: "TRIAL"
          }),
        update: jest.fn(),
        create: jest
          .fn()
          .mockResolvedValueOnce({
            id: "inst-store",
            companyId: "company-1",
            appId: "db-app-store-basic",
            activePricingModel: "SUBSCRIPTION",
            status: "TRIAL"
          })
          .mockResolvedValueOnce({
            id: "inst-conversion",
            companyId: "company-1",
            appId: "db-app-conversion-suite",
            activePricingModel: "SUBSCRIPTION",
            status: "TRIAL"
          })
      },
      marketplaceApp: {
        update: jest.fn().mockResolvedValue({})
      },
      companyWallet: {
        findUnique: jest.fn().mockResolvedValue({ id: "wallet-1", balance: 5000, currency: "EGP" }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({})
      },
      transaction: {
        create: jest.fn().mockResolvedValue({})
      }
    };

    mockPrisma.marketplaceApp.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockPrisma.marketplaceApp.upsert
      .mockResolvedValueOnce(syncedApps["conversion-suite"])
      .mockResolvedValueOnce(syncedApps["store-basic"]);
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));
    mockCatalogService.getAppBySlug.mockImplementation(async (slug) => catalogApps[slug] || null);

    const req = {
      params: { slug: "conversion-suite" },
      body: { pricingModel: "SUBSCRIPTION" },
      user: { companyId: "company-1" }
    };
    const res = createResponseMock();

    await marketplaceController.installApp(req, res);

    expect(tx.companyApp.create).toHaveBeenCalledTimes(2);
    expect(tx.marketplaceApp.update).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.app.slug).toBe("conversion-suite");
    expect(res.payload.data.autoInstalledRequiredApps).toEqual([
      { slug: "store-basic", name: "Store Basic" }
    ]);
  });

  test("subscribeToBundle resolves file bundle and syncs apps before transaction", async () => {
    const appCatalog = {
      "store-basic": {
        id: "cat-app-store-basic",
        slug: "store-basic",
        name: "Store Basic",
        description: "Store",
        category: "ECOMMERCE",
        pricingModel: "SUBSCRIPTION",
        monthlyPrice: 249,
        yearlyPrice: 2499,
        trialDays: 14,
        requiredApps: [],
        features: {},
        isActive: true,
        isPublic: true
      },
      "analytics-basic": {
        id: "cat-app-analytics-basic",
        slug: "analytics-basic",
        name: "Analytics Basic",
        description: "Analytics",
        category: "ANALYTICS",
        pricingModel: "SUBSCRIPTION",
        monthlyPrice: 199,
        yearlyPrice: 1999,
        trialDays: 14,
        requiredApps: [],
        features: {},
        isActive: true,
        isPublic: true
      }
    };

    const dbAppsBySlug = {
      "store-basic": {
        id: "db-app-store-basic",
        slug: "store-basic",
        name: "Store Basic",
        isActive: true,
        isPublic: true
      },
      "analytics-basic": {
        id: "db-app-analytics-basic",
        slug: "analytics-basic",
        name: "Analytics Basic",
        isActive: true,
        isPublic: true
      }
    };

    const tx = {
      companyWallet: {
        findUnique: jest.fn().mockResolvedValue({ id: "wallet-1", balance: 5000, currency: "EGP" }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({})
      },
      transaction: {
        create: jest.fn().mockResolvedValue({})
      },
      companyApp: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({})
      },
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue([
          { id: "db-app-store-basic", slug: "store-basic" },
          { id: "db-app-analytics-basic", slug: "analytics-basic" }
        ]),
        update: jest.fn().mockResolvedValue({})
      }
    };

    mockPrisma.appBundle.findUnique.mockResolvedValue(null);
    mockPrisma.marketplaceApp.findUnique.mockResolvedValue(null);
    mockPrisma.marketplaceApp.upsert.mockImplementation(async ({ where }) => {
      const slug = where?.slug;
      return dbAppsBySlug[slug];
    });
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

    mockCatalogService.getBundleBySlug.mockResolvedValue({
      id: "cat-bundle-starter",
      slug: "starter-bundle",
      name: "Starter Bundle",
      description: "Starter",
      monthlyPrice: 399,
      yearlyPrice: 3999,
      discount: 20,
      isActive: true,
      isFeatured: false,
      appSlugs: ["store-basic", "analytics-basic"],
      apps: [
        { id: "cat-app-store-basic", slug: "store-basic", name: "Store Basic", description: "Store", monthlyPrice: 249 },
        { id: "cat-app-analytics-basic", slug: "analytics-basic", name: "Analytics Basic", description: "Analytics", monthlyPrice: 199 }
      ]
    });
    mockCatalogService.getAppBySlug.mockImplementation(async (slug) => appCatalog[slug] || null);

    const req = {
      params: { slug: "starter-bundle" },
      user: { companyId: "company-1" }
    };
    const res = createResponseMock();

    await marketplaceController.subscribeToBundle(req, res);

    expect(mockCatalogService.getBundleBySlug).toHaveBeenCalledWith("starter-bundle", { onlyActive: true });
    expect(mockPrisma.marketplaceApp.upsert).toHaveBeenCalledTimes(2);
    expect(tx.companyApp.findMany).toHaveBeenCalledTimes(1);
    expect(tx.companyApp.create).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });

  test("subscribeToBundle prefers catalog bundle over legacy DB bundle in hybrid mode", async () => {
    process.env.CATALOG_SOURCE = "hybrid";

    const appCatalog = {
      "store-basic": {
        id: "cat-app-store-basic",
        slug: "store-basic",
        name: "Store Basic",
        description: "Store",
        category: "ECOMMERCE",
        pricingModel: "SUBSCRIPTION",
        monthlyPrice: 249,
        yearlyPrice: 2499,
        trialDays: 14,
        requiredApps: [],
        features: {},
        isActive: true,
        isPublic: true
      },
      "analytics-basic": {
        id: "cat-app-analytics-basic",
        slug: "analytics-basic",
        name: "Analytics Basic",
        description: "Analytics",
        category: "ANALYTICS",
        pricingModel: "SUBSCRIPTION",
        monthlyPrice: 199,
        yearlyPrice: 1999,
        trialDays: 14,
        requiredApps: [],
        features: {},
        isActive: true,
        isPublic: true
      },
      "crm-lite": {
        id: "cat-app-crm-lite",
        slug: "crm-lite",
        name: "CRM Lite",
        description: "CRM",
        category: "CRM",
        pricingModel: "FREE",
        monthlyPrice: 0,
        yearlyPrice: 0,
        trialDays: 0,
        requiredApps: [],
        features: {},
        isActive: true,
        isPublic: true
      }
    };

    const dbAppsBySlug = {
      "store-basic": {
        id: "db-app-store-basic",
        slug: "store-basic",
        name: "Store Basic",
        isActive: true,
        isPublic: true
      },
      "analytics-basic": {
        id: "db-app-analytics-basic",
        slug: "analytics-basic",
        name: "Analytics Basic",
        isActive: true,
        isPublic: true
      },
      "crm-lite": {
        id: "db-app-crm-lite",
        slug: "crm-lite",
        name: "CRM Lite",
        isActive: true,
        isPublic: true
      }
    };

    const tx = {
      companyWallet: {
        findUnique: jest.fn().mockResolvedValue({ id: "wallet-1", balance: 5000, currency: "EGP" }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({})
      },
      transaction: {
        create: jest.fn().mockResolvedValue({})
      },
      companyApp: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({})
      },
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue([
          { id: "db-app-store-basic", slug: "store-basic" },
          { id: "db-app-analytics-basic", slug: "analytics-basic" },
          { id: "db-app-crm-lite", slug: "crm-lite" }
        ]),
        update: jest.fn().mockResolvedValue({})
      }
    };

    mockPrisma.appBundle.findUnique.mockResolvedValue({
      id: "legacy-bundle-starter",
      slug: "starter-bundle",
      name: "Legacy Starter",
      appIds: ["legacy-ai-chat-pro", "legacy-ai-image-studio"]
    });
    mockPrisma.marketplaceApp.findUnique.mockImplementation(async ({ where }) => dbAppsBySlug[where?.slug] || null);
    mockPrisma.marketplaceApp.upsert.mockImplementation(async ({ where }) => dbAppsBySlug[where?.slug] || null);
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

    mockCatalogService.getBundleBySlug.mockResolvedValue({
      id: "cat-bundle-starter",
      slug: "starter-bundle",
      name: "Starter Bundle",
      description: "Starter",
      monthlyPrice: 399,
      yearlyPrice: 3999,
      discount: 20,
      isActive: true,
      isFeatured: false,
      appSlugs: ["store-basic", "analytics-basic", "crm-lite"],
      apps: [
        { id: "cat-app-store-basic", slug: "store-basic", name: "Store Basic", description: "Store", monthlyPrice: 249 },
        { id: "cat-app-analytics-basic", slug: "analytics-basic", name: "Analytics Basic", description: "Analytics", monthlyPrice: 199 },
        { id: "cat-app-crm-lite", slug: "crm-lite", name: "CRM Lite", description: "CRM", monthlyPrice: 0 }
      ]
    });
    mockCatalogService.getAppBySlug.mockImplementation(async (slug) => appCatalog[slug] || null);

    const req = {
      params: { slug: "starter-bundle" },
      user: { companyId: "company-1" }
    };
    const res = createResponseMock();

    await marketplaceController.subscribeToBundle(req, res);

    expect(mockCatalogService.getBundleBySlug).toHaveBeenCalledWith("starter-bundle", { onlyActive: true });
    expect(mockPrisma.appBundle.findUnique).not.toHaveBeenCalled();
    expect(tx.companyApp.create).toHaveBeenCalledTimes(3);

    const createdAppIds = tx.companyApp.create.mock.calls.map(([call]) => call.data.appId);
    expect(createdAppIds).toEqual(
      expect.arrayContaining(["db-app-store-basic", "db-app-analytics-basic", "db-app-crm-lite"]),
    );
    expect(createdAppIds).not.toEqual(
      expect.arrayContaining(["legacy-ai-chat-pro", "legacy-ai-image-studio"]),
    );
    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });

  it("getMarketplaceLogs returns activity logs for company", async () => {
    mockPrisma.activityLog = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "log-1",
          action: "INSTALL_APP",
          description: 'قام أحمد بتثبيت وتفعيل تطبيق "WhatsApp Cloud API"',
          targetName: "WhatsApp Cloud API",
          targetId: "app-wa",
          createdAt: new Date("2026-09-26T00:00:00Z"),
          metadata: JSON.stringify({ appSlug: "whatsapp-cloud-api" }),
          user: { id: "u-1", name: "أحمد", email: "ahmed@example.com", role: "ADMIN", avatar: null }
        },
        {
          id: "log-2",
          action: "UNINSTALL_APP",
          description: 'قام أحمد بإلغاء تثبيت تطبيق "Bulk Search"',
          targetName: "Bulk Search",
          targetId: "app-bs",
          createdAt: new Date("2026-09-25T12:00:00Z"),
          metadata: JSON.stringify({ appSlug: "bulk-search" }),
          user: { id: "u-1", name: "أحمد", email: "ahmed@example.com", role: "ADMIN", avatar: null }
        }
      ]),
      count: jest.fn().mockImplementation(async ({ where }) => {
        if (where?.action === "INSTALL_APP") return 1;
        if (where?.action === "UNINSTALL_APP") return 1;
        return 2;
      })
    };

    const req = {
      user: { companyId: "company-1", id: "u-1" },
      query: { page: "1", limit: "20" }
    };
    const res = createResponseMock();

    await marketplaceController.getMarketplaceLogs(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data.logs).toHaveLength(2);
    expect(res.payload.data.stats.totalInstalls).toBe(1);
    expect(res.payload.data.stats.totalUninstalls).toBe(1);
    expect(res.payload.data.logs[0].action).toBe("INSTALL_APP");
    expect(res.payload.data.logs[0].user.name).toBe("أحمد");
  });
});

