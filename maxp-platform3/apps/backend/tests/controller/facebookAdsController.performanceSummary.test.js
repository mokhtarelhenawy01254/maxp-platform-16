const mockGetCampaignInsightsSummary = jest.fn();
const mockGetGeoPerformanceBreakdown = jest.fn();
const mockGetPerformanceBreakdown = jest.fn();
const mockGetCampaigns = jest.fn();
const mockGetAdSets = jest.fn();
const mockGetAds = jest.fn();
const mockGetInsights = jest.fn();
const mockGetAdQualityMetrics = jest.fn();

jest.mock("../../services/facebookAdsService", () =>
  jest.fn().mockImplementation(() => ({
    getCampaignInsightsSummary: mockGetCampaignInsightsSummary,
    getGeoPerformanceBreakdown: mockGetGeoPerformanceBreakdown,
    getPerformanceBreakdown: mockGetPerformanceBreakdown,
    getCampaigns: mockGetCampaigns,
    getAdSets: mockGetAdSets,
    getAds: mockGetAds,
    getInsights: mockGetInsights,
    getAdQualityMetrics: mockGetAdQualityMetrics,
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
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  facebookAd: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  facebookAdInsight: {
    findMany: jest.fn(),
  },
  product: {
    findFirst: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
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

describe("facebookAdsController.getPerformanceSummary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.company.findUnique.mockResolvedValue({
      facebookAdsAccessToken: "ads-token",
      facebookUserAccessToken: null,
    });
    mockPrisma.facebookAdAccount.findFirst.mockResolvedValue({
      id: "local-ad-account",
      accountId: "1120545302307751",
      isActive: true,
    });
    mockPrisma.facebookCampaign.findMany.mockResolvedValue([
      {
        id: "campaign-local",
        facebookCampaignId: "120247478091430580",
        name: "Chunky Sneaker",
        objective: "OUTCOME_SALES",
        status: "ACTIVE",
        pixelId: "1989842325284174",
        facebookAdsets: [],
      },
    ]);
    mockPrisma.facebookCampaign.findFirst.mockResolvedValue(null);
    mockPrisma.facebookCampaign.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "campaign-created",
        ...data,
      }),
    );
    mockPrisma.facebookCampaign.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "campaign-updated",
        ...data,
      }),
    );
    mockPrisma.facebookAd.findFirst.mockReset();
    mockPrisma.facebookAd.findMany.mockReset();
    mockPrisma.facebookAdInsight.findMany.mockReset();
    mockPrisma.product.findFirst.mockReset();
    mockPrisma.product.findFirst.mockResolvedValue(null);
    mockPrisma.order.findMany.mockReset();
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockGetInsights.mockReset();
    mockGetAdQualityMetrics.mockReset();
  });

  test("decision summary never exposes stored Facebook access tokens", async () => {
    mockPrisma.facebookAd.findMany.mockResolvedValue([
      {
        id: "ad-local",
        adSetId: "adset-local",
        companyId: "company-1",
        name: "Sparkle Sneakers Ad",
        status: "ACTIVE",
        facebookAdId: "120-ad",
        creativeType: "CAROUSEL",
        primaryText: "Sparkle Sneakers",
        linkUrl: "https://swan.maxp.online/product/sparkle-sneakers-3",
        settings: "{}",
        facebookAdInsights: [],
        facebookAdset: {
          id: "adset-local",
          campaignId: "campaign-local",
          name: "Sparkle Ad Set",
          status: "ACTIVE",
          budgetType: "DAILY",
          budgetAmount: 300,
          settings: "{}",
          facebookCampaign: {
            id: "campaign-local",
            companyId: "company-1",
            adAccountId: "local-ad-account",
            name: "Sparkle Campaign",
            objective: "OUTCOME_SALES",
            status: "ACTIVE",
            facebookCampaignId: "120-campaign",
            budgetType: "DAILY",
            budgetAmount: 300,
            pixelId: "pixel-1",
            settings: "{}",
            facebookAdAccount: {
              id: "local-ad-account",
              accountId: "1120545302307751",
              name: "swan",
              accessToken: "stored-secret-token",
              access_token: "stored-secret-token-snake",
              isActive: true,
            },
          },
        },
      },
    ]);
    mockPrisma.product.findFirst.mockResolvedValue({
      id: "product-1",
      companyId: "company-1",
      name: "Sparkle Sneakers",
      slug: "sparkle-sneakers-3",
      price: 499,
      cost: 199,
      productVariants: [],
    });
    mockPrisma.order.findMany.mockResolvedValue([]);

    const req = {
      user: { companyId: "company-1" },
      query: { adAccountId: "1120545302307751" },
    };
    const res = createResponseMock();

    await facebookAdsController.getDecisionSummary(req, res);

    expect(res.statusCode).toBe(200);
    const payloadJson = JSON.stringify(res.payload);
    expect(payloadJson).not.toContain("stored-secret-token");
    expect(payloadJson).not.toContain("accessToken");
    expect(payloadJson).not.toContain("access_token");
    expect(res.payload.data.rows[0].campaign.facebookAdAccount).toEqual(
      expect.objectContaining({
        id: "local-ad-account",
        accountId: "1120545302307751",
      }),
    );
    expect(res.payload.data.rows[0].campaign.adAccount).toEqual(
      expect.objectContaining({
        id: "local-ad-account",
        accountId: "1120545302307751",
      }),
    );
  });

  test("can sync campaign headers without pulling the full ad set and ad structure", async () => {
    mockGetCampaigns.mockResolvedValue({
      success: true,
      data: [
        {
          id: "120-sync-campaign",
          name: "Swan quick sync",
          objective: "OUTCOME_SALES",
          account_id: "1120545302307751",
          status: "ACTIVE",
          configured_status: "ACTIVE",
          effective_status: "ACTIVE",
          updated_time: "2026-05-05T00:35:00+0000",
        },
      ],
    });

    const req = {
      user: { companyId: "company-1" },
      body: {
        adAccountId: "1120545302307751",
        includeStructure: false,
      },
    };
    const res = createResponseMock();

    await facebookAdsController.syncFromFacebook(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockGetCampaigns).toHaveBeenCalledWith(
      "1120545302307751",
      expect.arrayContaining(["id", "name", "objective"]),
    );
    expect(mockGetAdSets).not.toHaveBeenCalled();
    expect(mockGetAds).not.toHaveBeenCalled();
    expect(mockPrisma.facebookCampaign.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "company-1",
          facebookCampaignId: "120-sync-campaign",
          adAccountId: "local-ad-account",
        }),
      }),
    );
    expect(res.payload.meta).toEqual(
      expect.objectContaining({
        structureSyncSkipped: true,
        syncedAdSets: 0,
        syncedAds: 0,
      }),
    );
  });

  test("uses Meta campaign-level insights for imported Ads Manager campaigns", async () => {
    mockGetCampaignInsightsSummary.mockResolvedValue({
      success: true,
      data: [
        {
          campaign_id: "120247478091430580",
          impressions: "1000",
          clicks: "50",
          spend: "125.50",
          reach: "850",
          frequency: "1.18",
          inline_link_clicks: "45",
          actions: [
            { action_type: "omni_purchase", value: "3" },
            { action_type: "landing_page_view", value: "35" },
          ],
          action_values: [{ action_type: "omni_purchase", value: "900" }],
          purchase_roas: [{ action_type: "omni_purchase", value: "7.17" }],
        },
      ],
    });

    const req = {
      user: { companyId: "company-1" },
      query: { startDate: "2026-04-01", endDate: "2026-04-30" },
    };
    const res = createResponseMock();

    await facebookAdsController.getPerformanceSummary(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.facebookCampaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "company-1",
          adAccountId: "local-ad-account",
        },
      }),
    );
    expect(mockGetCampaignInsightsSummary).toHaveBeenCalledWith(
      "1120545302307751",
      { since: "2026-04-01", until: "2026-04-30" },
    );
    expect(res.payload.data.adAccount).toEqual(
      expect.objectContaining({
        id: "local-ad-account",
        accountId: "1120545302307751",
      }),
    );
    expect(res.payload.data.totals).toEqual(
      expect.objectContaining({
        impressions: 1000,
        clicks: 50,
        spend: 125.5,
        purchases: 3,
        purchaseValue: 900,
        landingPageViews: 35,
        roas: expect.any(Number),
      }),
    );
    expect(res.payload.data.campaigns[0]).toEqual(
      expect.objectContaining({
        id: "campaign-local",
        performanceSource: "META",
        performance: expect.objectContaining({
          spend: 125.5,
          purchases: 3,
        }),
      }),
    );
  });

  test("hydrates ad details from live Meta insights before falling back to local rows", async () => {
    const localAd = {
      id: "ad-local",
      companyId: "company-1",
      adSetId: "adset-local",
      facebookAdId: "120-meta-ad",
      name: "Chunky - catalog",
      status: "ACTIVE",
      creativeType: "SYNCED_META",
      primaryText: "Synced from Meta",
      facebookAdInsights: [],
      facebookAdset: {
        id: "adset-local",
        facebookAdSetId: "120-meta-adset",
        name: "Catalog women",
        status: "ACTIVE",
        budgetType: "DAILY",
        budgetAmount: 300,
        facebookCampaign: {
          id: "campaign-local",
          facebookCampaignId: "120-meta-campaign",
          name: "Catalog campaign",
          objective: "OUTCOME_SALES",
          status: "ACTIVE",
          budgetType: "DAILY",
          budgetAmount: 300,
          pixelId: "1989842325284174",
          facebookAdAccount: {
            id: "local-ad-account",
            accountId: "1120545302307751",
            name: "swan",
            currency: "EGP",
          },
        },
      },
    };

    mockPrisma.facebookAd.findFirst.mockResolvedValue(localAd);
    mockPrisma.facebookAdInsight.findMany.mockResolvedValue([]);
    mockPrisma.facebookAd.findMany.mockResolvedValue([
      localAd,
      {
        ...localAd,
        id: "ad-sibling",
        facebookAdId: "120-meta-sibling",
        name: "Sibling ad",
      },
    ]);
    mockGetInsights.mockImplementation((nodeId, range) => {
      if (nodeId === "120-meta-ad" && range.since === "2026-05-01") {
        return Promise.resolve({
          success: true,
          data: [
            {
              impressions: "1000",
              clicks: "80",
              spend: "250",
              reach: "900",
              frequency: "1.11",
              inline_link_clicks: "70",
              actions: [
                { action_type: "omni_purchase", value: "5" },
                { action_type: "landing_page_view", value: "50" },
              ],
              action_values: [{ action_type: "omni_purchase", value: "1000" }],
              purchase_roas: [{ action_type: "omni_purchase", value: "4" }],
            },
          ],
        });
      }

      if (nodeId === "120-meta-ad" && range.since === "2026-04-26") {
        return Promise.resolve({
          success: true,
          data: [
            {
              impressions: "500",
              clicks: "20",
              spend: "100",
              reach: "450",
              frequency: "1.05",
              inline_link_clicks: "18",
              actions: [{ action_type: "landing_page_view", value: "15" }],
              action_values: [],
              purchase_roas: [],
            },
          ],
        });
      }

      if (nodeId === "120-meta-adset") {
        return Promise.resolve({
          success: true,
          data: [
            {
              impressions: "2000",
              clicks: "120",
              spend: "400",
              reach: "1700",
              actions: [{ action_type: "omni_purchase", value: "7" }],
              action_values: [{ action_type: "omni_purchase", value: "1300" }],
            },
          ],
        });
      }

      if (nodeId === "120-meta-campaign") {
        return Promise.resolve({
          success: true,
          data: [
            {
              impressions: "3000",
              clicks: "160",
              spend: "600",
              reach: "2500",
              actions: [{ action_type: "omni_purchase", value: "9" }],
              action_values: [{ action_type: "omni_purchase", value: "1800" }],
            },
          ],
        });
      }

      return Promise.resolve({
        success: true,
        data: [
          {
            impressions: "300",
            clicks: "10",
            spend: "50",
            actions: [{ action_type: "omni_purchase", value: "1" }],
            action_values: [{ action_type: "omni_purchase", value: "200" }],
          },
        ],
      });
    });
    mockGetAdQualityMetrics.mockResolvedValue({
      success: true,
      metrics: {
        qualityRanking: "ABOVE_AVERAGE",
        engagementRateRanking: "AVERAGE",
        conversionRateRanking: "AVERAGE",
      },
    });

    const req = {
      user: { companyId: "company-1" },
      params: { adId: "ad-local" },
      query: { startDate: "2026-05-01", endDate: "2026-05-05" },
    };
    const res = createResponseMock();

    await facebookAdsController.getAdDetails(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockGetInsights).toHaveBeenCalledWith("120-meta-ad", {
      since: "2026-05-01",
      until: "2026-05-05",
    });
    expect(res.payload.data.meta.performanceSource).toBe("META");
    expect(res.payload.data.summary).toEqual(
      expect.objectContaining({
        impressions: 1000,
        spend: 250,
        purchases: 5,
        purchaseValue: 1000,
      }),
    );
    expect(res.payload.data.verdict.status).toBe("SCALE");
    expect(res.payload.data.adSetSummary.spend).toBe(400);
    expect(res.payload.data.campaignSummary.spend).toBe(600);
    expect(res.payload.data.siblingAds[1].metrics.purchases).toBe(1);
    expect(res.payload.data.quality.available).toBe(true);
  });

  test("lists campaigns only for the active ad account by default", async () => {
    const req = {
      user: { companyId: "company-1" },
      query: {},
      body: {},
    };
    const res = createResponseMock();

    await facebookAdsController.getCampaigns(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.facebookAdAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "company-1",
          isActive: true,
        },
      }),
    );
    expect(mockPrisma.facebookCampaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: "company-1",
          adAccountId: "local-ad-account",
        },
      }),
    );
    expect(res.payload.count).toBe(1);
    expect(res.payload.meta).toEqual(
      expect.objectContaining({
        accountScoped: true,
        adAccount: expect.objectContaining({
          accountId: "1120545302307751",
        }),
      }),
    );
  });

  test("marks delivery readiness from campaign, ad set, and ad statuses", async () => {
    mockPrisma.facebookCampaign.findMany.mockResolvedValue([
      {
        id: "campaign-active-ad-paused",
        facebookCampaignId: "120-paused-ad",
        name: "Campaign active but ad paused",
        objective: "OUTCOME_SALES",
        status: "ACTIVE",
        settings: JSON.stringify({
          meta: { configuredStatus: "ACTIVE", effectiveStatus: "ACTIVE" },
        }),
        facebookAdsets: [
          {
            id: "adset-active",
            status: "ACTIVE",
            settings: JSON.stringify({
              meta: { configuredStatus: "ACTIVE", effectiveStatus: "ACTIVE" },
            }),
            facebookAds: [
              {
                id: "ad-paused",
                status: "PAUSED",
                settings: JSON.stringify({
                  meta: { configuredStatus: "PAUSED", effectiveStatus: "PAUSED" },
                }),
              },
            ],
          },
        ],
      },
      {
        id: "campaign-delivering",
        facebookCampaignId: "120-delivering",
        name: "Campaign delivering",
        objective: "OUTCOME_SALES",
        status: "ACTIVE",
        settings: JSON.stringify({
          meta: { configuredStatus: "ACTIVE", effectiveStatus: "ACTIVE" },
        }),
        facebookAdsets: [
          {
            id: "adset-delivering",
            status: "ACTIVE",
            settings: JSON.stringify({
              meta: { configuredStatus: "ACTIVE", effectiveStatus: "ACTIVE" },
            }),
            facebookAds: [
              {
                id: "ad-delivering",
                status: "ACTIVE",
                settings: JSON.stringify({
                  meta: { configuredStatus: "ACTIVE", effectiveStatus: "ACTIVE" },
                }),
              },
            ],
          },
        ],
      },
    ]);

    const req = {
      user: { companyId: "company-1" },
      query: {},
      body: {},
    };
    const res = createResponseMock();

    await facebookAdsController.getCampaigns(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.data[0]).toEqual(
      expect.objectContaining({
        id: "campaign-active-ad-paused",
        deliveryReadiness: expect.objectContaining({
          isDeliverable: false,
          status: "ACTIVE_NOT_DELIVERING",
          counts: expect.objectContaining({
            adSetsActive: 1,
            adsActiveInActiveAdSets: 0,
          }),
        }),
      }),
    );
    expect(res.payload.data[0].deliveryReadiness.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "NO_ACTIVE_ADS" }),
      ]),
    );
    expect(res.payload.data[0].adSets[0].ads[0].effectiveStatus).toBe("PAUSED");
    expect(res.payload.data[1].deliveryReadiness).toEqual(
      expect.objectContaining({
        isDeliverable: true,
        status: "DELIVERING",
      }),
    );
  });

  test("aggregates geo performance from the selected ad account only", async () => {
    mockGetGeoPerformanceBreakdown.mockResolvedValue({
      success: true,
      data: [
        {
          campaign_id: "120247478091430580",
          campaign_name: "Swan High Skotch",
          region: "Cairo Governorate",
          impressions: "1000",
          clicks: "40",
          spend: "200.00",
          reach: "900",
          frequency: "1.11",
          inline_link_clicks: "35",
          actions: [
            { action_type: "omni_purchase", value: "4" },
            { action_type: "landing_page_view", value: "30" },
          ],
          action_values: [{ action_type: "omni_purchase", value: "800" }],
        },
        {
          campaign_id: "120247478091430580",
          campaign_name: "Swan High Skotch",
          region: "Giza Governorate",
          impressions: "500",
          clicks: "10",
          spend: "50.00",
          reach: "450",
          actions: [{ action_type: "omni_purchase", value: "1" }],
          action_values: [{ action_type: "omni_purchase", value: "120" }],
        },
      ],
    });

    const req = {
      user: { companyId: "company-1" },
      query: {
        adAccountId: "1120545302307751",
        breakdown: "region",
        startDate: "2026-04-01",
        endDate: "2026-04-30",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.getGeoPerformanceBreakdown(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockPrisma.facebookAdAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          OR: expect.arrayContaining([
            { id: "1120545302307751" },
            { accountId: "1120545302307751" },
          ]),
        }),
      }),
    );
    expect(mockGetGeoPerformanceBreakdown).toHaveBeenCalledWith(
      "1120545302307751",
      { since: "2026-04-01", until: "2026-04-30" },
      "region",
    );
    expect(res.payload.data.breakdown).toBe("region");
    expect(res.payload.data.rows).toHaveLength(2);
    expect(res.payload.data.rows[0]).toEqual(
      expect.objectContaining({
        label: "Cairo Governorate",
        campaignsCount: 1,
        metrics: expect.objectContaining({
          spend: 200,
          purchases: 4,
          purchaseValue: 800,
          cpa: 50,
          roas: 4,
        }),
      }),
    );
    expect(res.payload.data.totals).toEqual(
      expect.objectContaining({
        spend: 250,
        purchases: 5,
        purchaseValue: 920,
      }),
    );
  });

  test("returns campaign-level age and gender breakdowns for decision reports", async () => {
    mockGetPerformanceBreakdown.mockResolvedValue({
      success: true,
      dimensions: ["age", "gender"],
      data: [
        {
          campaign_id: "120247478091430580",
          campaign_name: "Swan High Skotch",
          age: "25-34",
          gender: "female",
          impressions: "1200",
          clicks: "60",
          spend: "180.00",
          reach: "900",
          frequency: "1.2",
          inline_link_clicks: "55",
          actions: [
            { action_type: "omni_purchase", value: "3" },
            { action_type: "landing_page_view", value: "40" },
          ],
          action_values: [{ action_type: "omni_purchase", value: "750" }],
        },
        {
          campaign_id: "120247478091430580",
          campaign_name: "Swan High Skotch",
          age: "35-44",
          gender: "female",
          impressions: "700",
          clicks: "20",
          spend: "90.00",
          reach: "620",
          actions: [{ action_type: "omni_purchase", value: "0" }],
          action_values: [],
        },
      ],
    });

    const req = {
      user: { companyId: "company-1" },
      query: {
        adAccountId: "1120545302307751",
        breakdown: "age_gender",
        startDate: "2026-04-01",
        endDate: "2026-04-30",
      },
    };
    const res = createResponseMock();

    await facebookAdsController.getPerformanceBreakdownReport(req, res);

    expect(res.statusCode).toBe(200);
    expect(mockGetPerformanceBreakdown).toHaveBeenCalledWith(
      "1120545302307751",
      { since: "2026-04-01", until: "2026-04-30" },
      "age_gender",
    );
    expect(res.payload.data.breakdown).toBe("age_gender");
    expect(res.payload.data.rows[0]).toEqual(
      expect.objectContaining({
        label: "25-34 / نساء",
        campaignsCount: 1,
        metrics: expect.objectContaining({
          spend: 180,
          purchases: 3,
          purchaseValue: 750,
          roas: expect.any(Number),
        }),
      }),
    );
    expect(res.payload.data.campaigns[0]).toEqual(
      expect.objectContaining({
        campaignId: "120247478091430580",
        campaignName: "Swan High Skotch",
        rows: expect.arrayContaining([
          expect.objectContaining({ label: "25-34 / نساء" }),
        ]),
      }),
    );
  });
});
