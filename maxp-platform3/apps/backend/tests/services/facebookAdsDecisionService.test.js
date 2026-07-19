const {
  buildAdDecisionForAd,
} = require("../../services/facebookAdsDecisionService");

const dateRange = {
  rangeStart: new Date("2026-05-01T00:00:00.000Z"),
  rangeEnd: new Date("2026-05-08T23:59:59.999Z"),
};

const baseProduct = {
  id: "product_1",
  name: "Sparkle Sneakers",
  price: 500,
  cost: 200,
  productVariants: [],
};

function buildPrisma({ product = baseProduct, orders = [] } = {}) {
  return {
    product: {
      findFirst: jest.fn().mockResolvedValue(product),
    },
    order: {
      findMany: jest.fn().mockResolvedValue(orders),
    },
  };
}

function buildAd(overrides = {}) {
  return {
    id: "local_ad_1",
    productId: "product_1",
    facebookAdId: "meta_ad_1",
    linkUrl: "https://swan.maxp.online/product/sparkle-sneakers-3",
    facebookAdset: {
      id: "local_adset_1",
      facebookAdSetId: "meta_adset_1",
      facebookCampaign: {
        id: "local_campaign_1",
        facebookCampaignId: "meta_campaign_1",
        objective: "OUTCOME_SALES",
        pixelId: "pixel_1",
      },
    },
    ...overrides,
  };
}

function buildOrder({
  status = "DELIVERED",
  total = 500,
  shipping = 0,
  adId = "meta_ad_1",
} = {}) {
  return {
    id: `order_${Math.random()}`,
    orderNumber: "S-1001",
    status,
    total,
    shipping,
    metadata: JSON.stringify({
      attribution: {
        source: "facebook",
        adId,
        adSetId: "meta_adset_1",
        campaignId: "meta_campaign_1",
      },
    }),
    orderItems: [
      {
        quantity: 1,
        price: 500,
        basePrice: null,
        merchantPrice: null,
        product: {
          id: "product_1",
          name: "Sparkle Sneakers",
          price: 500,
          cost: 200,
        },
        productVariant: null,
      },
    ],
  };
}

describe("facebookAdsDecisionService", () => {
  test("marks profitable ads as scale candidates", async () => {
    const prisma = buildPrisma({
      orders: [
        buildOrder(),
        buildOrder(),
        buildOrder(),
        buildOrder(),
      ],
    });

    const decision = await buildAdDecisionForAd({
      prisma,
      companyId: "company_1",
      ad: buildAd(),
      dateRange,
      summary: {
        impressions: 5000,
        clicks: 250,
        linkClicks: 220,
        landingPageViews: 200,
        spend: 300,
        purchases: 4,
        purchaseValue: 2000,
        ctr: 5,
        frequency: 1.7,
      },
    });

    expect(decision.status).toBe("SCALE");
    expect(decision.economics.targetCpa).toBe(240);
    expect(decision.metrics.estimatedProfit).toBe(900);
    expect(decision.attribution.exactDeliveredOrders).toBe(4);
  });

  test("marks ads that pass product-margin spend without purchases as kill candidates", async () => {
    const prisma = buildPrisma();

    const decision = await buildAdDecisionForAd({
      prisma,
      companyId: "company_1",
      ad: buildAd(),
      dateRange,
      summary: {
        impressions: 4000,
        clicks: 120,
        linkClicks: 100,
        landingPageViews: 90,
        spend: 320,
        purchases: 0,
        purchaseValue: 0,
        ctr: 3,
        frequency: 1.2,
      },
    });

    expect(decision.status).toBe("KILL");
    expect(decision.economics.breakEvenCpa).toBe(300);
    expect(decision.metrics.estimatedProfit).toBe(-320);
  });

  test("gates sales decisions when tracking is missing", async () => {
    const prisma = buildPrisma();

    const decision = await buildAdDecisionForAd({
      prisma,
      companyId: "company_1",
      ad: buildAd({
        facebookAdset: {
          id: "local_adset_1",
          facebookAdSetId: "meta_adset_1",
          facebookCampaign: {
            id: "local_campaign_1",
            facebookCampaignId: "meta_campaign_1",
            objective: "OUTCOME_SALES",
            pixelId: null,
          },
        },
      }),
      dateRange,
      summary: {
        impressions: 1000,
        clicks: 40,
        linkClicks: 35,
        landingPageViews: 30,
        spend: 60,
        purchases: 0,
        purchaseValue: 0,
        ctr: 4,
        frequency: 1.1,
      },
    });

    expect(decision.status).toBe("FIX_TRACKING");
    expect(decision.tracking.hasPixel).toBe(false);
  });
});
