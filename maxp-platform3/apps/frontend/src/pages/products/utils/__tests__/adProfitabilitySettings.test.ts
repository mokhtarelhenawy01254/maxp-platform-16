import { describe, expect, it } from "vitest";

import {
  buildAdProfitabilityPreview,
  getFacebookAdsDecisionSettings,
  normalizeFacebookAdsDecisionSettings,
} from "../adProfitabilitySettings";

describe("ad profitability settings helpers", () => {
  it("reads nested Meta ads decision settings with legacy aliases", () => {
    expect(
      getFacebookAdsDecisionSettings({
        metaAdsProfitability: {
          shippingCost: 40,
          paymentFeePercent: 2,
          expectedReturnRate: 10,
          targetNetProfit: 50,
          maxCPA: 170,
        },
      }),
    ).toEqual({
      expectedShipping: 40,
      paymentFeeRate: 2,
      returnRate: 10,
      requiredNetProfit: 50,
      configuredMaxCpa: 170,
    });
  });

  it("removes empty settings before saving product metadata", () => {
    expect(
      normalizeFacebookAdsDecisionSettings({
        expectedShipping: undefined,
        paymentFee: 0,
        returnRate: Number.NaN,
      }),
    ).toEqual({
      paymentFee: 0,
    });
  });

  it("uses product cost as the source of truth before variants or inventory", () => {
    const preview = buildAdProfitabilityPreview({
      formData: {
        name: "Sparkle Sneakers",
        description: "",
        price: 500,
        cost: 200,
        sku: "",
        category: "",
        stock: 0,
        trackInventory: true,
        lowStockThreshold: 5,
        isActive: true,
        enableCheckoutForm: true,
        showAddToCartButton: true,
        saleStartDate: "",
        saleEndDate: "",
        sizeGuide: "",
        tags: [],
        commissionType: "PERCENTAGE",
        allowAffiliateMarkup: false,
        affiliateVisibility: "ALL",
        affiliateVisibleAffiliateIds: [],
      },
      variants: [{ name: "Black", type: "color", sku: "", cost: 250, images: [], stock: 0, trackInventory: true, isActive: true, sortOrder: 0 }],
      inventoryCostSummary: { unitCost: 300, source: "INVENTORY_WEIGHTED_AVERAGE" },
      settings: {
        expectedShipping: 40,
        paymentFeeRate: 2,
        returnRate: 10,
        requiredNetProfit: 50,
      },
    });

    expect(preview.costSource).toBe("PRODUCT");
    expect(preview.unitCost).toBe(200);
    expect(preview.paymentFee).toBe(10);
    expect(preview.returnRate).toBe(0.1);
    expect(preview.targetCpa).toBe(175);
  });

  it("falls back to inventory cost when product and variant costs are missing", () => {
    const preview = buildAdProfitabilityPreview({
      formData: {
        name: "Sparkle Sneakers",
        description: "",
        price: 500,
        sku: "",
        category: "",
        stock: 0,
        trackInventory: true,
        lowStockThreshold: 5,
        isActive: true,
        enableCheckoutForm: true,
        showAddToCartButton: true,
        saleStartDate: "",
        saleEndDate: "",
        sizeGuide: "",
        tags: [],
        commissionType: "PERCENTAGE",
        allowAffiliateMarkup: false,
        affiliateVisibility: "ALL",
        affiliateVisibleAffiliateIds: [],
      },
      variants: [],
      inventoryCostSummary: { unitCost: 190, source: "INVENTORY_WEIGHTED_AVERAGE" },
      settings: {},
    });

    expect(preview.costSource).toBe("INVENTORY");
    expect(preview.unitCost).toBe(190);
    expect(preview.breakEvenCpa).toBe(310);
    expect(preview.isReady).toBe(true);
  });
});
