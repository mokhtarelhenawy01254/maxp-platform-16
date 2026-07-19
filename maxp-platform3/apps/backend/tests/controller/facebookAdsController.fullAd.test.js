const mockCreateFullAd = jest.fn();
const mockCreateAd = jest.fn();
const mockCreateAdSet = jest.fn();
const mockUploadImage = jest.fn();
const mockUploadVideo = jest.fn();
const mockGetFacebookPages = jest.fn();
const mockGetFacebookPixels = jest.fn();

jest.mock("../../services/facebookAdsService", () =>
  jest.fn().mockImplementation(() => ({
    createFullAd: mockCreateFullAd,
    createAd: mockCreateAd,
    createAdSet: mockCreateAdSet,
    uploadImage: mockUploadImage,
    uploadVideo: mockUploadVideo,
    getFacebookPages: mockGetFacebookPages,
    getFacebookPixels: mockGetFacebookPixels,
  })),
);

const mockPrisma = {
  company: {
    findUnique: jest.fn(),
  },
  facebookAdAccount: {
    findFirst: jest.fn(),
  },
  facebookCampaign: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  facebookAdset: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  facebookAd: {
    create: jest.fn(),
  },
  facebookAdsPublishRequest: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
  },
  facebookPage: {
    findFirst: jest.fn(),
  },
  storefrontSettings: {
    findUnique: jest.fn(),
  },
};

jest.mock("../../services/sharedDatabase", () => ({
  getSharedPrismaClient: jest.fn(() => mockPrisma),
}));

const facebookAdsController = require("../../controller/facebookAdsController");

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
    }),
  };
}

function createValidBody(overrides = {}) {
  return {
    adAccountId: "123456789",
    clientRequestId: "request-1",
    campaignName: "Swan launch",
    objective: "OUTCOME_SALES",
    budgetOptimization: true,
    budgetType: "DAILY",
    budgetAmount: 10,
    pageId: "page-1",
    creativeType: "SINGLE_IMAGE",
    primaryText: "New Swan offer",
    headline: "Shop Swan",
    description: "Limited offer",
    callToAction: "SHOP_NOW",
    linkUrl: "https://swan.mokhtarelhenawy.online/product/chunky-sneaker",
    imageUrl: "https://cdn.example/image.jpg",
    pixelId: "pixel-1",
    status: "PAUSED",
    ...overrides,
  };
}

describe("facebookAdsController.createFullAd", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue({
      facebookAdsAccessToken: "ads-token",
      facebookUserAccessToken: null,
    });
    mockPrisma.facebookAdAccount.findFirst.mockResolvedValue({
      id: "local-ad-account",
      accountId: "123456789",
      isActive: true,
    });
    mockPrisma.facebookCampaign.create.mockResolvedValue({
      id: "campaign-local",
      name: "Swan launch",
    });
    mockPrisma.facebookAdset.create.mockResolvedValue({
      id: "adset-local",
      name: "Swan launch - AdSet",
    });
    mockPrisma.facebookAd.create.mockResolvedValue({
      id: "ad-local",
      name: "Swan launch - Ad",
    });
    mockPrisma.facebookAdsPublishRequest.findUnique.mockResolvedValue(null);
    mockPrisma.facebookAdsPublishRequest.findFirst.mockResolvedValue(null);
    mockPrisma.facebookAdsPublishRequest.create.mockResolvedValue({
      id: "publish-request-1",
      clientRequestId: "request-1",
      status: "IN_PROGRESS",
    });
    mockPrisma.facebookAdsPublishRequest.update.mockResolvedValue({});
    mockPrisma.product.findFirst.mockResolvedValue({
      id: "product-1",
      name: "Chunky Sneaker",
      slug: "chunky-sneaker",
      isActive: true,
      isHidden: false,
      stock: 12,
      trackInventory: true,
      deletedAt: null,
    });
    mockPrisma.facebookPage.findFirst.mockResolvedValue({
      id: "stored-page-1",
      pageId: "page-1",
    });
    mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
      facebookPixelEnabled: true,
      facebookPixelId: "pixel-1",
      pixelStatus: "active",
      pixelTrackPurchase: true,
      facebookPixelConfigs: [
        {
          id: "pixel-config-1",
          isActive: true,
          trackPurchase: true,
        },
      ],
    });
    mockGetFacebookPages.mockResolvedValue({
      success: true,
      data: [{ id: "page-1", name: "Swan" }],
    });
    mockGetFacebookPixels.mockResolvedValue({
      success: true,
      data: [{ id: "pixel-1", name: "Purchase Pixel" }],
    });
    mockCreateFullAd.mockResolvedValue({
      success: true,
      campaignId: "fb-campaign",
      adSetId: "fb-adset",
      adId: "fb-ad",
      creativeId: "fb-creative",
      imageHash: "uploaded-hash",
    });
  });

  test("persists full-ad results using existing Prisma fields", async () => {
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody(),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(mockPrisma.facebookAdsPublishRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-1",
          clientRequestId: expect.any(String),
          status: "IN_PROGRESS",
        }),
      }),
    );
    expect(mockPrisma.facebookCampaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pixelId: "pixel-1",
          budgetType: "DAILY",
          budgetAmount: 10,
        }),
      }),
    );
    expect(mockPrisma.facebookAdset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          budgetType: "DAILY",
          budgetAmount: 10,
          settings: expect.stringContaining('"budgetSource":"CAMPAIGN"'),
        }),
      }),
    );
    expect(mockPrisma.facebookAdset.create.mock.calls[0][0].data).not.toHaveProperty(
      "companyId",
    );

    const adCreateData = mockPrisma.facebookAd.create.mock.calls[0][0].data;
    expect(adCreateData).toEqual(
      expect.objectContaining({
        creativeType: "SINGLE_IMAGE",
        primaryText: "New Swan offer",
        headline: "Shop Swan",
        description: "Limited offer",
        callToAction: "SHOP_NOW",
        linkUrl: "https://swan.mokhtarelhenawy.online/product/chunky-sneaker",
        imageUrl: "https://cdn.example/image.jpg",
        imageHash: "uploaded-hash",
      }),
    );
    expect(adCreateData).not.toHaveProperty("creativeData");
    expect(JSON.parse(adCreateData.creative)).toEqual(
      expect.objectContaining({
        creativeId: "fb-creative",
        pageId: "page-1",
      }),
    );
  });

  test("rejects unsupported flexible creatives before calling Meta", async () => {
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({ creativeType: "FLEXIBLE" }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toContain("غير مدعوم");
    expect(mockCreateFullAd).not.toHaveBeenCalled();
    expect(mockPrisma.facebookCampaign.create).not.toHaveBeenCalled();
  });

  test("rejects too-low EGP full-ad budgets before calling Meta", async () => {
    mockPrisma.facebookAdAccount.findFirst.mockResolvedValue({
      id: "local-ad-account",
      accountId: "123456789",
      currency: "EGP",
      isActive: true,
    });
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({ budgetAmount: 10 }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual(
      expect.objectContaining({
        errorCode: "BUDGET_BELOW_ACCOUNT_MINIMUM",
        field: "budgetAmount",
        minimumBudgetAmount: 200,
        currency: "EGP",
      }),
    );
    expect(mockCreateFullAd).not.toHaveBeenCalled();
    expect(mockPrisma.facebookCampaign.create).not.toHaveBeenCalled();
  });


  test("normalizes traffic full-ad delivery settings before calling Meta", async () => {
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({
        objective: "OUTCOME_TRAFFIC",
        pixelId: "accidental-pixel",
        conversionEvent: "PURCHASE",
        attributionWindow: "7d_click_1d_view",
        bidStrategy: "LOWEST_COST_WITHOUT_CAP",
        targeting: {
          locations: ["EG"],
          customAudiences: ["238custom"],
        },
      }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockCreateFullAd).toHaveBeenCalledWith(
      expect.objectContaining({
        objective: "OUTCOME_TRAFFIC",
        optimizationGoal: "LINK_CLICKS",
        attributionWindow: "1d_click",
        bidStrategy: "LOWEST_COST",
        pixelId: undefined,
        conversionEvent: undefined,
        targeting: expect.objectContaining({
          customAudiences: ["238custom"],
        }),
      }),
    );
    const adSetSettings = JSON.parse(
      mockPrisma.facebookAdset.create.mock.calls[0][0].data.settings,
    );
    expect(adSetSettings.attributionWindow).toBe("1d_click");
  });

  test("rejects capped bid strategies without a bid value", async () => {
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({
        bidStrategy: "BID_CAP",
        bidValue: undefined,
      }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual(
      expect.objectContaining({
        errorCode: "BID_VALUE_REQUIRED",
        field: "bidValue",
      }),
    );
    expect(mockCreateFullAd).not.toHaveBeenCalled();
  });

  test("requires explicit backend confirmation before ACTIVE publish", async () => {
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({ status: "ACTIVE", budgetAmount: 200 }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.payload.errorCode).toBe("ACTIVE_PUBLISH_CONFIRMATION_REQUIRED");
    expect(mockCreateFullAd).not.toHaveBeenCalled();
  });

  test("requires a stable client request id before publish", async () => {
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({
        clientRequestId: "",
        idempotencyKey: "",
        budgetAmount: 200,
      }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual(
      expect.objectContaining({
        errorCode: "FACEBOOK_AD_PUBLISH_IDEMPOTENCY_REQUIRED",
        field: "clientRequestId",
      }),
    );
    expect(mockPrisma.facebookAdsPublishRequest.create).not.toHaveBeenCalled();
    expect(mockCreateFullAd).not.toHaveBeenCalled();
  });

  test("requires the selected page to be connected to the current company", async () => {
    mockPrisma.facebookPage.findFirst.mockResolvedValue(null);
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({ clientRequestId: "request-1", budgetAmount: 200 }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual(
      expect.objectContaining({
        errorCode: "FACEBOOK_PAGE_NOT_READY_FOR_COMPANY",
        field: "pageId",
      }),
    );
    expect(mockPrisma.facebookAdsPublishRequest.create).not.toHaveBeenCalled();
    expect(mockCreateFullAd).not.toHaveBeenCalled();
  });

  test("requires a pixel for website sales full-ad publishes", async () => {
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({ pixelId: "", budgetAmount: 200 }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual(
      expect.objectContaining({
        errorCode: "FACEBOOK_PIXEL_REQUIRED",
        field: "pixelId",
      }),
    );
    expect(mockGetFacebookPixels).not.toHaveBeenCalled();
    expect(mockCreateFullAd).not.toHaveBeenCalled();
    expect(mockPrisma.facebookAdsPublishRequest.create).not.toHaveBeenCalled();
  });

  test("requires the selected sales pixel to be enabled for storefront purchase tracking", async () => {
    mockPrisma.storefrontSettings.findUnique.mockResolvedValue({
      facebookPixelEnabled: false,
      facebookPixelId: null,
      pixelStatus: "not_configured",
      pixelTrackPurchase: false,
      facebookPixelConfigs: [],
    });
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({ budgetAmount: 200 }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual(
      expect.objectContaining({
        errorCode: "FACEBOOK_PIXEL_NOT_READY_FOR_STORE",
        field: "pixelId",
      }),
    );
    expect(mockCreateFullAd).not.toHaveBeenCalled();
    expect(mockPrisma.facebookAdsPublishRequest.create).not.toHaveBeenCalled();
  });

  test("returns stored result for duplicate publish request ids", async () => {
    mockPrisma.facebookAdsPublishRequest.findUnique.mockResolvedValue({
      id: "publish-request-1",
      companyId: "company-1",
      clientRequestId: "request-1",
      status: "SUCCEEDED",
      responsePayload: JSON.stringify({
        success: true,
        data: {
          facebookIds: {
            campaignId: "fb-campaign",
            adSetId: "fb-adset",
            adId: "fb-ad",
            creativeId: "fb-creative",
          },
        },
      }),
    });
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({ clientRequestId: "request-1" }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.success).toBe(true);
    expect(res.payload.idempotency).toEqual(
      expect.objectContaining({ clientRequestId: "request-1", reused: true }),
    );
    expect(mockCreateFullAd).not.toHaveBeenCalled();
  });

  test("rejects reused publish request ids with a different payload", async () => {
    mockPrisma.facebookAdsPublishRequest.findUnique.mockResolvedValue({
      id: "publish-request-1",
      companyId: "company-1",
      clientRequestId: "request-1",
      requestHash: "different-hash",
      status: "SUCCEEDED",
      responsePayload: JSON.stringify({ success: true }),
    });
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({ clientRequestId: "request-1" }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.payload.errorCode).toBe("FACEBOOK_AD_PUBLISH_PAYLOAD_MISMATCH");
    expect(mockCreateFullAd).not.toHaveBeenCalled();
  });

  test("locks concurrent duplicate publish request ids before calling Meta", async () => {
    mockPrisma.facebookAdsPublishRequest.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "publish-request-1",
        companyId: "company-1",
        clientRequestId: "request-1",
        status: "IN_PROGRESS",
      });
    mockPrisma.facebookAdsPublishRequest.create.mockRejectedValueOnce({
      code: "P2002",
    });
    const req = {
      user: { companyId: "company-1" },
      body: createValidBody({ clientRequestId: "request-1" }),
    };
    const res = createResponseMock();

    await facebookAdsController.createFullAd(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.payload.errorCode).toBe("FACEBOOK_AD_PUBLISH_REQUEST_LOCKED");
    expect(res.payload.idempotency).toEqual(
      expect.objectContaining({ clientRequestId: "request-1", reused: true }),
    );
    expect(mockCreateFullAd).not.toHaveBeenCalled();
  });

});

describe("facebookAdsController campaign hierarchy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue({
      facebookAdsAccessToken: "ads-token",
      facebookUserAccessToken: null,
    });
    mockPrisma.facebookCampaign.findFirst.mockResolvedValue({
      id: "campaign-local",
      companyId: "company-1",
      facebookCampaignId: "fb-campaign",
      facebookAdAccount: {
        id: "local-ad-account",
        accountId: "123456789",
      },
    });
    mockPrisma.facebookAdAccount.findFirst.mockResolvedValue({
      id: "local-ad-account",
      accountId: "123456789",
      isActive: true,
    });
    mockCreateAdSet
      .mockResolvedValueOnce({ success: true, adSetId: "fb-adset-1" })
      .mockResolvedValueOnce({ success: true, adSetId: "fb-adset-2" });
    mockPrisma.facebookAdset.create
      .mockImplementationOnce(({ data }) => Promise.resolve({ id: "adset-local-1", ...data }))
      .mockImplementationOnce(({ data }) => Promise.resolve({ id: "adset-local-2", ...data }));
  });

  test("allows more than one ad set under the same campaign", async () => {
    const buildReq = (name) => ({
      user: { companyId: "company-1" },
      params: { campaignId: "campaign-local" },
      body: {
        name,
        status: "PAUSED",
        targeting: {
          ageMin: 18,
          ageMax: 45,
          genders: ["female"],
          locations: ["EG"],
        },
        budgetType: "DAILY",
        budgetAmount: 200,
        optimizationGoal: "OFFSITE_CONVERSIONS",
        billingEvent: "IMPRESSIONS",
      },
    });
    const firstRes = createResponseMock();
    const secondRes = createResponseMock();

    await facebookAdsController.createAdSet(buildReq("Swan women Cairo"), firstRes);
    await facebookAdsController.createAdSet(buildReq("Swan women Alexandria"), secondRes);

    expect(firstRes.statusCode).toBe(200);
    expect(secondRes.statusCode).toBe(200);
    expect(mockCreateAdSet).toHaveBeenCalledTimes(2);
    expect(mockCreateAdSet).toHaveBeenNthCalledWith(
      1,
      "fb-campaign",
      expect.objectContaining({ name: "Swan women Cairo" }),
    );
    expect(mockCreateAdSet).toHaveBeenNthCalledWith(
      2,
      "fb-campaign",
      expect.objectContaining({ name: "Swan women Alexandria" }),
    );
    expect(mockPrisma.facebookAdset.create.mock.calls.map((call) => call[0].data)).toEqual([
      expect.objectContaining({ campaignId: "campaign-local", name: "Swan women Cairo" }),
      expect.objectContaining({ campaignId: "campaign-local", name: "Swan women Alexandria" }),
    ]);
  });
});

describe("facebookAdsController.createAd", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue({
      facebookAdsAccessToken: "ads-token",
      facebookUserAccessToken: null,
    });
    mockPrisma.facebookAdset.findFirst.mockResolvedValue({
      id: "adset-local",
      facebookAdSetId: "fb-adset",
      facebookCampaign: {
        companyId: "company-1",
        facebookAdAccount: {
          id: "local-ad-account",
          accountId: "123456789",
        },
      },
    });
    mockPrisma.facebookAd.create.mockResolvedValue({
      id: "ad-local",
      name: "Swan carousel 2",
    });
    mockUploadImage
      .mockResolvedValueOnce({ success: true, hash: "card-hash-1" })
      .mockResolvedValueOnce({ success: true, hash: "card-hash-2" });
    mockCreateAd.mockResolvedValue({
      success: true,
      adId: "fb-ad-2",
      creativeId: "fb-creative-2",
    });
  });

  test("adds carousel ads to an existing Meta ad set and persists card payloads", async () => {
    const req = {
      user: { companyId: "company-1" },
      params: { adSetId: "adset-local" },
      body: {
        name: "Swan carousel 2",
        status: "PAUSED",
        pageId: "page-1",
        creativeType: "CAROUSEL",
        primaryText: "More Swan product angles",
        headline: "Swan High Skotch",
        description: "More product photos",
        callToAction: "SHOP_NOW",
        linkUrl: "https://swan.example/products/high-skotch",
        carouselCards: [
          {
            imageUrl: "https://cdn.example/1.jpg",
            headline: "Color one",
            linkUrl: "https://swan.example/products/high-skotch?card=1",
          },
          {
            imageUrl: "https://cdn.example/2.jpg",
            headline: "Color two",
            linkUrl: "https://swan.example/products/high-skotch?card=2",
          },
        ],
      },
    };
    const res = createResponseMock();

    await facebookAdsController.createAd(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockUploadImage).toHaveBeenCalledTimes(2);
    expect(mockCreateAd).toHaveBeenCalledWith(
      "fb-adset",
      expect.objectContaining({
        pageId: "page-1",
        creativeType: "CAROUSEL",
        carouselCards: [
          expect.objectContaining({ imageHash: "card-hash-1" }),
          expect.objectContaining({ imageHash: "card-hash-2" }),
        ],
      }),
    );

    const adCreateData = mockPrisma.facebookAd.create.mock.calls[0][0].data;
    expect(adCreateData).toEqual(
      expect.objectContaining({
        facebookAdId: "fb-ad-2",
        creativeType: "CAROUSEL",
        carouselCount: 2,
      }),
    );
    expect(JSON.parse(adCreateData.carouselImages)).toHaveLength(2);
    expect(JSON.parse(adCreateData.creative)).toEqual(
      expect.objectContaining({
        creativeId: "fb-creative-2",
        pageId: "page-1",
        creativeType: "CAROUSEL",
      }),
    );
  });

  test("allows more than one ad under the same ad set", async () => {
    mockCreateAd
      .mockResolvedValueOnce({
        success: true,
        adId: "fb-ad-1",
        creativeId: "fb-creative-1",
      })
      .mockResolvedValueOnce({
        success: true,
        adId: "fb-ad-2",
        creativeId: "fb-creative-2",
      });
    mockPrisma.facebookAd.create
      .mockImplementationOnce(({ data }) => Promise.resolve({ id: "ad-local-1", ...data }))
      .mockImplementationOnce(({ data }) => Promise.resolve({ id: "ad-local-2", ...data }));
    const buildReq = (name, primaryText) => ({
      user: { companyId: "company-1" },
      params: { adSetId: "adset-local" },
      body: {
        name,
        status: "PAUSED",
        pageId: "page-1",
        creativeType: "SINGLE_IMAGE",
        primaryText,
        headline: "Swan High Skotch",
        description: "Product photo",
        callToAction: "SHOP_NOW",
        linkUrl: "https://swan.example/products/high-skotch",
        imageHash: "ready-image-hash",
      },
    });
    const firstRes = createResponseMock();
    const secondRes = createResponseMock();

    await facebookAdsController.createAd(buildReq("Swan creative 1", "First Swan angle"), firstRes);
    await facebookAdsController.createAd(buildReq("Swan creative 2", "Second Swan angle"), secondRes);

    expect(firstRes.statusCode).toBe(200);
    expect(secondRes.statusCode).toBe(200);
    expect(mockCreateAd).toHaveBeenCalledTimes(2);
    expect(mockCreateAd).toHaveBeenNthCalledWith(
      1,
      "fb-adset",
      expect.objectContaining({ name: "Swan creative 1" }),
    );
    expect(mockCreateAd).toHaveBeenNthCalledWith(
      2,
      "fb-adset",
      expect.objectContaining({ name: "Swan creative 2" }),
    );
    expect(mockPrisma.facebookAd.create.mock.calls.map((call) => call[0].data)).toEqual([
      expect.objectContaining({ adSetId: "adset-local", name: "Swan creative 1" }),
      expect.objectContaining({ adSetId: "adset-local", name: "Swan creative 2" }),
    ]);
  });
});
