let mockPrisma;

const mockExecuteWithRetry = jest.fn(async (operation) => operation());

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClientAsync: jest.fn(async () => mockPrisma),
  executeWithRetry: (...args) => mockExecuteWithRetry(...args),
}));

const {
  storefrontThemeCatalogService,
} = require("../../services/storefrontThemeCatalogService");

describe("storefrontThemeCatalogService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      company: {
        findUnique: jest.fn(),
      },
      marketplaceApp: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      storefrontSettings: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      companyApp: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      transaction: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jest
      .spyOn(storefrontThemeCatalogService, "ensureCatalogSynced")
      .mockResolvedValue(undefined);
    jest
      .spyOn(storefrontThemeCatalogService, "syncCatalogForRead")
      .mockResolvedValue(undefined);
    jest
      .spyOn(storefrontThemeCatalogService, "loadPresetManifests")
      .mockResolvedValue([
        {
          id: "bold-fashion",
          name: "Bold Fashion",
          description: "Theme",
          preview: { colors: [] },
          pageStats: {
            homeSections: 1,
            shopSections: 1,
            checkoutSections: 1,
            pdpSections: 1,
            cartSections: 1,
            totalSections: 5,
          },
        },
      ]);

    storefrontThemeCatalogService.clearDefaultThemeCache();
    mockPrisma.companyApp.findMany.mockResolvedValue([]);
    mockPrisma.storefrontSettings.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("purchaseThemeForCompany deducts the wallet and creates a one-time ownership", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: "cmp_1",
      name: "Acme",
      currency: "EGP",
      settings: "{}",
    });
    mockPrisma.marketplaceApp.findUnique.mockResolvedValue({
      id: "app_theme_1",
      slug: "bold-fashion",
      name: "Bold Fashion",
      category: "THEME",
      pricingModel: "SUBSCRIPTION",
      monthlyPrice: 200,
      yearlyPrice: 0,
      trialDays: 0,
      isActive: true,
      isPublic: true,
    });
    mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
      companyId: "cmp_1",
      designTokens: {
        themeId: "modern-minimal",
      },
    });
    mockPrisma.companyApp.findUnique.mockResolvedValue(null);

    const mockTx = {
      marketplaceApp: {
        findUnique: jest.fn().mockResolvedValue({ id: "app_theme_1" }),
        update: jest.fn().mockResolvedValue({}),
      },
      companyWallet: {
        findUnique: jest.fn().mockResolvedValue({
          id: "wallet_1",
          companyId: "cmp_1",
          balance: 500,
          currency: "EGP",
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({
          id: "wallet_1",
          companyId: "cmp_1",
          balance: 300,
          currency: "EGP",
        }),
      },
      companyApp: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "company_app_1",
          status: "ACTIVE",
          activePricingModel: "SUBSCRIPTION",
          trialEndsAt: null,
          validUntil: null,
          nextBillingAt: null,
        }),
        update: jest.fn(),
      },
      transaction: {
        create: jest.fn().mockResolvedValue({ id: "txn_1" }),
      },
      billingHistory: {
        create: jest.fn().mockResolvedValue({ id: "bill_1" }),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockTx));
    jest
      .spyOn(storefrontThemeCatalogService, "getCompanyCatalog")
      .mockResolvedValue([
        {
          themeId: "bold-fashion",
          isOwned: true,
          isCurrentTheme: false,
          canSelect: true,
          canActivate: true,
          canPurchase: false,
          pricingModel: "ONE_TIME",
          monthlyPrice: 200,
        },
      ]);

    const result = await storefrontThemeCatalogService.purchaseThemeForCompany(
      "bold-fashion",
      { companyId: "cmp_1" },
    );

    expect(mockTx.companyWallet.update).toHaveBeenCalledWith({
      where: { companyId: "cmp_1" },
      data: {
        balance: { decrement: 200 },
      },
    });
    expect(mockTx.companyApp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "cmp_1",
          appId: "app_theme_1",
          activePricingModel: "SUBSCRIPTION",
          status: "ACTIVE",
        }),
      }),
    );
    expect(result.wallet).toEqual({
      balance: 300,
      currency: "EGP",
    });
    expect(result.theme?.themeId).toBe("bold-fashion");
  });

  test("applyThemeForCompany rejects paid themes that were not purchased", async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: "cmp_2",
      name: "Acme",
      currency: "EGP",
      settings: "{}",
    });
    mockPrisma.marketplaceApp.findUnique.mockResolvedValue({
      id: "app_theme_2",
      slug: "bold-fashion",
      name: "Bold Fashion",
      category: "THEME",
      pricingModel: "SUBSCRIPTION",
      monthlyPrice: 250,
      yearlyPrice: 0,
      trialDays: 0,
      isActive: true,
      isPublic: true,
    });
    mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
      companyId: "cmp_2",
      designTokens: {
        themeId: "modern-minimal",
      },
    });
    mockPrisma.companyApp.findUnique.mockResolvedValue(null);

    await expect(
      storefrontThemeCatalogService.applyThemeForCompany("bold-fashion", {
        companyId: "cmp_2",
      }),
    ).rejects.toMatchObject({
      code: "THEME_PURCHASE_REQUIRED",
    });
  });

  test("syncCatalog preserves archived storefront theme visibility", async () => {
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "app_theme_1",
        slug: "bold-fashion",
        name: "Bold Fashion",
        description: "Theme",
        monthlyPrice: 0,
        yearlyPrice: 0,
        pricingModel: "FREE",
        isActive: false,
        isPublic: false,
        isFeatured: false,
        trialDays: 0,
        installCount: 4,
        features: {},
        icon: "Storefront",
        category: "THEME",
      },
    ]);
    mockPrisma.marketplaceApp.upsert.mockResolvedValue({});

    await storefrontThemeCatalogService.syncCatalog();

    expect(mockPrisma.marketplaceApp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "bold-fashion" },
        update: expect.objectContaining({
          isActive: false,
          isPublic: false,
        }),
      }),
    );
  });


  test("getDefaultThemeId returns the active public catalog default", async () => {
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "app_theme_1",
        slug: "bold-fashion",
        name: "Bold Fashion",
        description: "Theme",
        monthlyPrice: 0,
        yearlyPrice: 0,
        pricingModel: "FREE",
        isActive: true,
        isPublic: true,
        isFeatured: false,
        trialDays: 0,
        installCount: 4,
        features: {
          isDefaultStorefrontTheme: true,
        },
        icon: "Storefront",
      },
    ]);

    const result = await storefrontThemeCatalogService.getDefaultThemeId();

    expect(result).toBe("bold-fashion");
    expect(mockPrisma.marketplaceApp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "THEME",
          slug: { in: ["bold-fashion"] },
        }),
      }),
    );
  });

  test("setDefaultTheme marks one theme as default and keeps it available", async () => {
    storefrontThemeCatalogService.loadPresetManifests.mockResolvedValue([
      {
        id: "bold-fashion",
        name: "Bold Fashion",
        description: "Theme",
        preview: { colors: [] },
        pageStats: {
          homeSections: 1,
          shopSections: 1,
          checkoutSections: 1,
          pdpSections: 1,
          cartSections: 1,
          totalSections: 5,
        },
      },
      {
        id: "smart-bazaar",
        name: "Smart Bazaar",
        description: "Theme",
        preview: { colors: [] },
        pageStats: {
          homeSections: 1,
          shopSections: 1,
          checkoutSections: 1,
          pdpSections: 1,
          cartSections: 1,
          totalSections: 5,
        },
      },
    ]);
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "app_theme_1",
        slug: "bold-fashion",
        name: "Bold Fashion",
        description: "Theme",
        monthlyPrice: 0,
        yearlyPrice: 0,
        pricingModel: "FREE",
        isActive: true,
        isPublic: true,
        isFeatured: false,
        trialDays: 0,
        installCount: 4,
        features: {
          isDefaultStorefrontTheme: true,
        },
        icon: "Storefront",
      },
      {
        id: "app_theme_2",
        slug: "smart-bazaar",
        name: "Smart Bazaar",
        description: "Theme",
        monthlyPrice: 0,
        yearlyPrice: 0,
        pricingModel: "FREE",
        isActive: false,
        isPublic: false,
        isFeatured: false,
        trialDays: 0,
        installCount: 0,
        features: {},
        icon: "Storefront",
      },
    ]);
    mockPrisma.marketplaceApp.update.mockResolvedValue({});
    jest
      .spyOn(storefrontThemeCatalogService, "getAdminCatalog")
      .mockResolvedValue([
        {
          themeId: "smart-bazaar",
          isDefaultTheme: true,
          isActive: true,
          isPublic: true,
        },
      ]);

    const result = await storefrontThemeCatalogService.setDefaultTheme("smart-bazaar");

    expect(mockPrisma.marketplaceApp.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "smart-bazaar" },
        data: expect.objectContaining({
          isActive: true,
          isPublic: true,
          features: expect.objectContaining({
            isDefaultStorefrontTheme: true,
          }),
        }),
      }),
    );
    expect(mockPrisma.marketplaceApp.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "bold-fashion" },
        data: expect.objectContaining({
          features: expect.objectContaining({
            isDefaultStorefrontTheme: false,
          }),
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        themeId: "smart-bazaar",
        isDefaultTheme: true,
      }),
    );
  });

  test("updateTheme rejects disabling the current default storefront theme", async () => {
    mockPrisma.marketplaceApp.findUnique.mockResolvedValue({
      id: "app_theme_1",
      slug: "bold-fashion",
      description: "Theme",
      isActive: true,
      isPublic: true,
      features: {
        isDefaultStorefrontTheme: true,
      },
    });

    await expect(
      storefrontThemeCatalogService.updateTheme("bold-fashion", {
        isActive: false,
        isPublic: true,
      }),
    ).rejects.toMatchObject({
      code: "DEFAULT_THEME_LOCKED",
    });
    expect(mockPrisma.marketplaceApp.update).not.toHaveBeenCalled();
  });


  test("getCompanyPurchaseHistory returns purchased themes with wallet transaction details", async () => {
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "app_theme_1",
        slug: "bold-fashion",
        name: "Bold Fashion",
        description: "Theme",
        monthlyPrice: 199,
        yearlyPrice: 0,
        pricingModel: "SUBSCRIPTION",
        isActive: true,
        isPublic: true,
        isFeatured: true,
      },
    ]);
    mockPrisma.companyApp.findMany.mockResolvedValue([
      {
        id: "company_app_1",
        appId: "app_theme_1",
        status: "ACTIVE",
        activePricingModel: "SUBSCRIPTION",
        settings: {
          themeId: "bold-fashion",
          purchasedAt: "2026-03-26T10:00:00.000Z",
          activatedAt: "2026-03-26T10:05:00.000Z",
          purchaseAmount: 199,
          purchaseCurrency: "EGP",
          walletTransactionId: "txn_1",
          walletReferenceId: "THEME_PURCHASE_bold-fashion_12345",
        },
        createdAt: new Date("2026-03-26T10:00:00.000Z"),
        updatedAt: new Date("2026-03-26T10:05:00.000Z"),
      },
    ]);
    mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
      designTokens: {
        themeId: "bold-fashion",
      },
    });
    mockPrisma.transaction.findMany.mockResolvedValue([
      {
        id: "txn_1",
        type: "PAYMENT",
        status: "COMPLETED",
        amount: 199,
        description: "شراء قالب المتجر: Bold Fashion",
        referenceId: "THEME_PURCHASE_bold-fashion_12345",
        createdAt: new Date("2026-03-26T10:00:00.000Z"),
      },
    ]);

    const result = await storefrontThemeCatalogService.getCompanyPurchaseHistory({
      companyId: "cmp_1",
      limit: 10,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        themeId: "bold-fashion",
        pricingModel: "ONE_TIME",
        purchaseAmount: 199,
        isCurrentTheme: true,
        walletTransactionId: "txn_1",
        walletTransaction: expect.objectContaining({
          id: "txn_1",
          referenceId: "THEME_PURCHASE_bold-fashion_12345",
          amount: 199,
        }),
      }),
    );
  });

  test("syncCatalog keeps archived storefront presets inactive and hidden", async () => {
    mockPrisma.marketplaceApp.findMany.mockResolvedValue([
      {
        id: "app_theme_1",
        slug: "bold-fashion",
        name: "Bold Fashion",
        description: "Stored theme",
        monthlyPrice: 0,
        yearlyPrice: 0,
        pricingModel: "FREE",
        isActive: false,
        isPublic: false,
        isFeatured: false,
        trialDays: 0,
        installCount: 4,
        features: {},
        icon: "Storefront",
        category: "THEME",
      },
    ]);
    mockPrisma.marketplaceApp.upsert.mockResolvedValue({});

    await storefrontThemeCatalogService.syncCatalog();

    expect(mockPrisma.marketplaceApp.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "bold-fashion" },
        update: expect.objectContaining({
          isActive: false,
          isPublic: false,
        }),
      }),
    );
  });

  test("getCompanyCatalog keeps archived theme presets unavailable on read", async () => {
    mockPrisma.marketplaceApp.findMany
      .mockResolvedValueOnce([
        {
          id: "app_theme_1",
          slug: "bold-fashion",
          name: "Bold Fashion",
          description: "Stored theme",
          monthlyPrice: 0,
          yearlyPrice: 0,
          pricingModel: "FREE",
          isActive: false,
          isPublic: false,
          isFeatured: false,
          trialDays: 0,
          installCount: 4,
          features: {},
          icon: "Storefront",
        },
      ]);
    mockPrisma.companyApp.findMany.mockResolvedValue([]);

    const result = await storefrontThemeCatalogService.getCompanyCatalog({
      companyId: "cmp_1",
      currentThemeId: "",
      includeUnavailable: true,
    });

    expect(storefrontThemeCatalogService.syncCatalogForRead).not.toHaveBeenCalled();
    expect(mockPrisma.marketplaceApp.findMany).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(0);
  });
});
