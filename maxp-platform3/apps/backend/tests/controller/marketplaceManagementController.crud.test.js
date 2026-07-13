const mockUuidV4 = jest.fn(() => 'mocked-uuid');
jest.mock('uuid', () => ({ v4: () => mockUuidV4() }));

let mockPrisma;
const mockExecuteWithRetry = jest.fn(async (operation) => operation());

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
  executeWithRetry: (...args) => mockExecuteWithRetry(...args)
}));

jest.mock("../../utils/marketplaceAppSettings", () => ({
  buildInstalledMarketplaceAppSettings: jest.fn(() => ({ general: { enabled: true } }))
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
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    appPricingRule: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    appBundle: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    enterprisePlan: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    companyApp: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    companyWallet: {
      upsert: jest.fn()
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

describe("marketplaceManagementController.getAllApps", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("returns all apps excluding THEME/TEMPLATE with installation counts", async () => {
    const mockApps = [
      { id: "app-1", name: "App One", category: "ECOMMERCE", _count: { installations: 5 } },
      { id: "app-2", name: "App Two", category: "HR", _count: { installations: 0 } }
    ];
    mockPrisma.marketplaceApp.findMany.mockResolvedValue(mockApps);

    const res = createResponseMock();
    await marketplaceManagementController.getAllApps({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual(mockApps);
    expect(mockPrisma.marketplaceApp.findMany).toHaveBeenCalledWith({
      where: { category: { notIn: ['THEME', 'TEMPLATE'] } },
      include: { _count: { select: { installations: true } } },
      orderBy: { createdAt: 'desc' }
    });
  });

  test("returns 500 when query fails", async () => {
    mockPrisma.marketplaceApp.findMany.mockRejectedValue(new Error("DB error"));

    const res = createResponseMock();
    await marketplaceManagementController.getAllApps({}, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toBe('خطأ في جلب الأدوات');
  });
});

describe("marketplaceManagementController.createApp", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("creates an app with provided data", async () => {
    const inputData = {
      name: "Test App",
      slug: "test-app",
      description: "A test app",
      monthlyPrice: 99,
      category: "ECOMMERCE"
    };
    const createdApp = { id: "app-1", ...inputData };
    mockPrisma.marketplaceApp.create.mockResolvedValue(createdApp);

    const req = { body: { ...inputData } };
    const res = createResponseMock();
    await marketplaceManagementController.createApp(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.data).toEqual(createdApp);
    expect(mockPrisma.marketplaceApp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Test App", slug: "test-app" })
    });
  });

  test("generates slug from name when slug is not provided", async () => {
    const inputData = { name: "My New App!" };
    const createdApp = { id: "app-1", name: "My New App!", slug: "my-new-app" };
    mockPrisma.marketplaceApp.create.mockResolvedValue(createdApp);

    const req = { body: { ...inputData } };
    const res = createResponseMock();
    await marketplaceManagementController.createApp(req, res);

    expect(mockPrisma.marketplaceApp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ slug: "my-new-app" })
    });
  });

  test("parses numeric fields correctly", async () => {
    const inputData = {
      name: "Numeric Test",
      slug: "numeric-test",
      monthlyPrice: "199.50",
      yearlyPrice: "1990",
      trialDays: "14"
    };
    mockPrisma.marketplaceApp.create.mockResolvedValue({ id: "app-1", ...inputData });

    const req = { body: { ...inputData } };
    const res = createResponseMock();
    await marketplaceManagementController.createApp(req, res);

    expect(mockPrisma.marketplaceApp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        monthlyPrice: 199.5,
        yearlyPrice: 1990,
        trialDays: 14
      })
    });
  });

  test("returns 500 on creation failure", async () => {
    mockPrisma.marketplaceApp.create.mockRejectedValue(new Error("Unique constraint"));

    const req = { body: { name: "Fail App" } };
    const res = createResponseMock();
    await marketplaceManagementController.createApp(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.success).toBe(false);
  });
});

describe("marketplaceManagementController.updateApp", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("updates an app and removes id from updateData", async () => {
    mockPrisma.marketplaceApp.update.mockResolvedValue({
      id: "app-1",
      name: "Updated App",
      slug: "updated-app"
    });

    const req = {
      params: { id: "app-1" },
      body: { name: "Updated App", id: "malicious-id", monthlyPrice: "150" }
    };
    const res = createResponseMock();
    await marketplaceManagementController.updateApp(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(mockPrisma.marketplaceApp.update).toHaveBeenCalledWith({
      where: { id: "app-1" },
      data: expect.not.objectContaining({ id: expect.anything() })
    });
  });

  test("returns 500 on update failure", async () => {
    mockPrisma.marketplaceApp.update.mockRejectedValue(new Error("Not found"));

    const req = { params: { id: "nonexistent" }, body: { name: "X" } };
    const res = createResponseMock();
    await marketplaceManagementController.updateApp(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.success).toBe(false);
  });
});

describe("marketplaceManagementController.deleteApp", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("deletes app with no installations successfully", async () => {
    mockPrisma.marketplaceApp.findUnique.mockResolvedValue({
      id: "app-1",
      name: "Deletable App",
      _count: { installations: 0 }
    });
    mockPrisma.marketplaceApp.delete.mockResolvedValue({ id: "app-1" });

    const req = { params: { id: "app-1" } };
    const res = createResponseMock();
    await marketplaceManagementController.deleteApp(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.message).toBe('تم حذف الأداة بنجاح');
    expect(mockPrisma.marketplaceApp.delete).toHaveBeenCalledWith({ where: { id: "app-1" } });
  });

  test("returns 400 when app has active installations", async () => {
    mockPrisma.marketplaceApp.findUnique.mockResolvedValue({
      id: "app-1",
      name: "Installed App",
      _count: { installations: 3 }
    });

    const req = { params: { id: "app-1" } };
    const res = createResponseMock();
    await marketplaceManagementController.deleteApp(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toContain('3 شركة');
    expect(mockPrisma.marketplaceApp.delete).not.toHaveBeenCalled();
  });

  test("returns 404 when app does not exist", async () => {
    mockPrisma.marketplaceApp.findUnique.mockResolvedValue(null);

    const req = { params: { id: "nonexistent" } };
    const res = createResponseMock();
    await marketplaceManagementController.deleteApp(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toBe('الأداة غير موجودة');
  });

  test("returns 500 on Prisma error", async () => {
    mockPrisma.marketplaceApp.findUnique.mockRejectedValue(new Error("DB timeout"));

    const req = { params: { id: "app-1" } };
    const res = createResponseMock();
    await marketplaceManagementController.deleteApp(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload.success).toBe(false);
  });
});

describe("marketplaceManagementController pricing rules CRUD", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("getAllPricingRules returns all rules", async () => {
    const rules = [{ id: "rule-1", feature: "Extra Users", price: 50 }];
    mockPrisma.appPricingRule.findMany.mockResolvedValue(rules);

    const res = createResponseMock();
    await marketplaceManagementController.getAllPricingRules({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toEqual(rules);
  });

  test("createPricingRule creates a rule", async () => {
    const rule = { id: "rule-1", feature: "Extra Users", price: 50, unit: "user" };
    mockPrisma.appPricingRule.create.mockResolvedValue(rule);

    const req = { body: { feature: "Extra Users", price: 50, unit: "user" } };
    const res = createResponseMock();
    await marketplaceManagementController.createPricingRule(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toEqual(rule);
  });

  test("deletePricingRule deletes a rule", async () => {
    mockPrisma.appPricingRule.delete.mockResolvedValue({ id: "rule-1" });

    const req = { params: { id: "rule-1" } };
    const res = createResponseMock();
    await marketplaceManagementController.deletePricingRule(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });
});

describe("marketplaceManagementController bundles CRUD", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("getAllBundles returns bundles with resolved apps by id and slug", async () => {
    const savedBundles = [
      {
        id: "bundle-1",
        name: "Starter Bundle",
        appIds: ["app-id-1", "app-slug-2"],
        monthlyPrice: 399,
        discount: 20
      }
    ];
    mockPrisma.appBundle.findMany.mockResolvedValue(savedBundles);
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      { id: "app-id-1", name: "App One", slug: "app-one", monthlyPrice: 199 },
      { id: "app-id-2", name: "App Two", slug: "app-slug-2", monthlyPrice: 299 }
    ]);

    const res = createResponseMock();
    await marketplaceManagementController.getAllBundles({}, res);

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.marketplaceApp.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: { in: ["app-id-1", "app-slug-2"] } },
          { slug: { in: ["app-id-1", "app-slug-2"] } }
        ]
      },
      select: { id: true, name: true, slug: true, monthlyPrice: true }
    });
    expect(res.payload.data[0].apps).toHaveLength(2);
    expect(res.payload.data[0].name).toBe("Starter Bundle");
  });

  test("getAllBundles handles empty appIds gracefully", async () => {
    mockPrisma.appBundle.findMany.mockResolvedValue([
      { id: "bundle-1", name: "Empty Bundle", appIds: null, monthlyPrice: 100, discount: 0 }
    ]);
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([]);

    const res = createResponseMock();
    await marketplaceManagementController.getAllBundles({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data[0].apps).toEqual([]);
  });

  test("createBundle converts apps array to appIds", async () => {
    const inputData = {
      name: "New Bundle",
      monthlyPrice: 499,
      discount: 15,
      apps: [
        { id: "app-1", slug: "app-one", name: "App One" },
        { id: "app-2", slug: "app-two", name: "App Two" }
      ]
    };
    const savedBundle = { id: "bundle-1", name: "New Bundle", appIds: ["app-one", "app-two"] };
    mockPrisma.appBundle.create.mockResolvedValue(savedBundle);

    const req = { body: { ...inputData } };
    const res = createResponseMock();
    await marketplaceManagementController.createBundle(req, res);

    expect(mockPrisma.appBundle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        appIds: ["app-one", "app-two"],
        name: "New Bundle"
      })
    });
    expect(res.statusCode).toBe(200);
  });

  test("createBundle uses appIds from req.body if provided directly", async () => {
    const inputData = {
      name: "Direct IDs Bundle",
      monthlyPrice: 299,
      appIds: ["slug-1", "slug-2"]
    };
    mockPrisma.appBundle.create.mockResolvedValue({ id: "bundle-1", ...inputData });

    const req = { body: { ...inputData } };
    const res = createResponseMock();
    await marketplaceManagementController.createBundle(req, res);

    expect(mockPrisma.appBundle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ appIds: ["slug-1", "slug-2"] })
    });
  });

  test("createBundle handles string-only apps array", async () => {
    const inputData = {
      name: "String Bundle",
      monthlyPrice: 199,
      apps: ["app-slug-1", "app-slug-2"]
    };
    mockPrisma.appBundle.create.mockResolvedValue({ id: "bundle-1", name: "String Bundle" });

    const req = { body: { ...inputData } };
    const res = createResponseMock();
    await marketplaceManagementController.createBundle(req, res);

    expect(mockPrisma.appBundle.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ appIds: ["app-slug-1", "app-slug-2"] })
    });
  });

  test("updateBundle converts apps to appIds", async () => {
    mockPrisma.appBundle.update.mockResolvedValue({ id: "bundle-1", name: "Updated" });

    const req = {
      params: { id: "bundle-1" },
      body: { name: "Updated", apps: [{ slug: "app-one" }, { slug: "app-two" }] }
    };
    const res = createResponseMock();
    await marketplaceManagementController.updateBundle(req, res);

    expect(mockPrisma.appBundle.update).toHaveBeenCalledWith({
      where: { id: "bundle-1" },
      data: expect.objectContaining({ appIds: ["app-one", "app-two"] })
    });
  });

  test("deleteBundle deletes a bundle", async () => {
    mockPrisma.appBundle.delete.mockResolvedValue({ id: "bundle-1" });

    const req = { params: { id: "bundle-1" } };
    const res = createResponseMock();
    await marketplaceManagementController.deleteBundle(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
  });
});

describe("marketplaceManagementController enterprise plans CRUD", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("getAllEnterprisePlans returns plans with company info", async () => {
    const plans = [
      { id: "plan-1", name: "Custom Plan", company: { name: "Big Co", email: "big@co.com" } }
    ];
    mockPrisma.enterprisePlan.findMany.mockResolvedValue(plans);

    const res = createResponseMock();
    await marketplaceManagementController.getAllEnterprisePlans({}, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toEqual(plans);
    expect(mockPrisma.enterprisePlan.findMany).toHaveBeenCalledWith({
      include: { company: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
  });

  test("creates and deletes enterprise plan", async () => {
    const plan = { id: "plan-1", name: "Enterprise Plan", companyId: "company-1" };
    mockPrisma.enterprisePlan.create.mockResolvedValue(plan);

    const req = { body: { name: "Enterprise Plan", companyId: "company-1" } };
    const res = createResponseMock();
    await marketplaceManagementController.createEnterprisePlan(req, res);
    expect(res.statusCode).toBe(200);

    mockPrisma.enterprisePlan.delete.mockResolvedValue(plan);
    const delReq = { params: { id: "plan-1" } };
    const delRes = createResponseMock();
    await marketplaceManagementController.deleteEnterprisePlan(delReq, delRes);
    expect(delRes.statusCode).toBe(200);
    expect(delRes.payload.success).toBe(true);
  });
});

describe("marketplaceManagementController coverage edge cases", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createPrismaMock();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test("getCoverage handles limit clamping", async () => {
    mockPrisma.company.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([]);
    mockPrisma.company.count.mockResolvedValue(0);

    await marketplaceManagementController.getCoverage(
      { query: { limit: "9999" } },
      createResponseMock()
    );

    expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 500 })
    );
  });

  test("getCoverage handles invalid limit", async () => {
    mockPrisma.company.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([]);
    mockPrisma.company.count.mockResolvedValue(0);

    await marketplaceManagementController.getCoverage(
      { query: { limit: "abc" } },
      createResponseMock()
    );

    expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 })
    );
  });

  test("getCoverage handles search filter", async () => {
    mockPrisma.company.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([]);
    mockPrisma.company.count.mockResolvedValue(0);

    await marketplaceManagementController.getCoverage(
      { query: { search: "swan" } },
      createResponseMock()
    );

    expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ name: { contains: "swan", mode: "insensitive" } })
          ])
        })
      })
    );
  });

  test("installCompanyCoverageApp returns 404 when company not found", async () => {
    mockPrisma.company.findUnique.mockResolvedValue(null);

    const req = { params: { companyId: "missing-company", slug: "some-app" }, body: {} };
    const res = createResponseMock();
    await marketplaceManagementController.installCompanyCoverageApp(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload.message).toBe("Company not found");
  });

  test("installCompanyCoverageApp returns 404 when app not installable", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({ id: "company-1", isActive: true });
    mockPrisma.marketplaceApp.findUnique.mockResolvedValue({ id: "app-1", isActive: false });

    const req = { params: { companyId: "company-1", slug: "inactive-app" }, body: {} };
    const res = createResponseMock();
    await marketplaceManagementController.installCompanyCoverageApp(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload.message).toBe("Marketplace app is not installable");
  });

  test("installCompanyCoverageApp returns 400 when required apps are missing", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({ id: "company-1", isActive: true });
    mockPrisma.marketplaceApp.findUnique.mockResolvedValue({
      id: "app-1",
      slug: "main-app",
      name: "Main App",
      isActive: true,
      isPublic: true,
      category: "ECOMMERCE",
      pricingModel: "SUBSCRIPTION",
      requiredApps: ["missing-required-app"],
      trialDays: 0
    });

    const tx = {
      marketplaceApp: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn()
      },
      companyApp: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      companyWallet: { upsert: jest.fn() }
    };
    mockPrisma.$transaction.mockImplementation(async (callback) => callback(tx));

    const req = { params: { companyId: "company-1", slug: "main-app" }, body: {} };
    const res = createResponseMock();
    await marketplaceManagementController.installCompanyCoverageApp(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toBe("Required marketplace apps are missing");
    expect(res.payload.requiredApps).toBeDefined();
  });
});


