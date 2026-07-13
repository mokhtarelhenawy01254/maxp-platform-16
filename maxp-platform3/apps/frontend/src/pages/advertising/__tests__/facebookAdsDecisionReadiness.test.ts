import type { FacebookAdsDecisionRow } from "../facebookAdsDecisionReadiness";
import {
  isMissingProductCostDecision,
  summarizeMissingProductCosts,
} from "../facebookAdsDecisionReadiness";

const buildRow = (
  overrides: {
    adId?: string;
    productId?: string | null;
    productName?: string | null;
    costSource?: string;
    profitabilityReady?: boolean;
    spend?: number;
    purchases?: number;
  } = {},
): FacebookAdsDecisionRow =>
  ({
    ad: {
      id: overrides.adId || "ad-1",
      productId: overrides.productId,
      name: `Ad ${overrides.adId || "1"}`,
    },
    adSet: { id: "adset-1", name: "Ad Set" },
    campaign: { id: "campaign-1", name: "Campaign" },
    summary: {
      spend: overrides.spend ?? 0,
      purchases: overrides.purchases ?? 0,
    },
    decision: {
      status: "WATCH",
      label: "راقب",
      tone: "amber",
      priority: "MEDIUM",
      reason: "Missing cost",
      nextAction: "Complete product cost",
      confidence: { score: 55, level: "LOW" },
      metrics: {
        spend: overrides.spend ?? 0,
        purchases: overrides.purchases ?? 0,
      },
      economics: {
        productId: overrides.productId,
        productName: overrides.productName,
        price: 499,
        unitCost: 299.4,
        avgShipping: 0,
        grossProfitPerPurchase: 199.6,
        breakEvenCpa: 199.6,
        targetCpa: 159.68,
        breakEvenRoas: 2.5,
        targetRoas: 3.13,
        costSource: overrides.costSource || "ESTIMATED_60_PERCENT",
        profitabilityReady: overrides.profitabilityReady ?? false,
      },
      attribution: {
        exactOrders: 0,
        exactDeliveredOrders: 0,
        relatedOrders: 0,
        relatedDeliveredOrders: 0,
        cancelledOrders: 0,
        returnedOrders: 0,
      },
      tracking: {
        hasPixel: true,
        productLinked: Boolean(overrides.productId),
        costSource: overrides.costSource || "ESTIMATED_60_PERCENT",
      },
    },
  }) as FacebookAdsDecisionRow;

describe("facebookAdsDecisionReadiness", () => {
  it("detects product-linked decisions still using estimated product cost", () => {
    expect(
      isMissingProductCostDecision(
        buildRow({ productId: "product-1", costSource: "ESTIMATED_60_PERCENT" }),
      ),
    ).toBe(true);

    expect(
      isMissingProductCostDecision(
        buildRow({ productId: "product-1", costSource: "PRODUCT", profitabilityReady: true }),
      ),
    ).toBe(false);

    expect(isMissingProductCostDecision(buildRow({ productId: null }))).toBe(false);
  });

  it("groups missing product costs by spend and keeps totals across hidden groups", () => {
    const summary = summarizeMissingProductCosts(
      [
        buildRow({
          adId: "ad-1",
          productId: "product-low",
          productName: "Low Spend",
          spend: 20,
          purchases: 1,
        }),
        buildRow({
          adId: "ad-2",
          productId: "product-high",
          productName: "High Spend",
          spend: 120,
          purchases: 2,
        }),
        buildRow({
          adId: "ad-3",
          productId: "product-high",
          productName: "High Spend",
          spend: 80,
          purchases: 1,
        }),
        buildRow({
          adId: "ad-4",
          productId: "product-ready",
          costSource: "PRODUCT",
          profitabilityReady: true,
          spend: 999,
        }),
      ],
      1,
    );

    expect(summary.groups).toHaveLength(1);
    expect(summary.groups[0]).toMatchObject({
      productId: "product-high",
      ads: 2,
      spend: 200,
      purchases: 3,
    });
    expect(summary.totals).toEqual({
      products: 2,
      ads: 3,
      spend: 220,
      purchases: 4,
    });
  });
});
