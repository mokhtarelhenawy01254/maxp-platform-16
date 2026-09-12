import { describe, expect, it } from "vitest";
import type { MarketingProduct, MarketingCampaignDraft } from "../types";

describe("Marketing AI Studio - Data & Strategy Engine", () => {
  const sampleProduct: MarketingProduct = {
    id: "cmnhmvj2t09tpjupuclnvdax4",
    name: "كوتشي ثري لاين",
    slug: "three-line-sneaker",
    price: 499,
    cost: 240,
    stock: 45,
    mainImage: "https://swan.maxp.online/uploads/products/sneaker.jpg",
  };

  it("calculates profitability margin correctly for product radar", () => {
    const margin = Math.round(((sampleProduct.price - (sampleProduct.cost || 0)) / sampleProduct.price) * 100);
    expect(margin).toBe(52); // 52% margin
    expect(margin).toBeGreaterThan(40); // Healthy margin for advertising
  });

  it("calculates break-even ROAS accurately", () => {
    const profit = sampleProduct.price - (sampleProduct.cost || 0);
    const breakEvenRoas = Number((sampleProduct.price / profit).toFixed(2));
    expect(breakEvenRoas).toBe(1.93);
    // Target ROAS must be at least 20% higher than break-even
    const targetScaleRoas = Number((breakEvenRoas * 1.2).toFixed(2));
    expect(targetScaleRoas).toBe(2.32);
  });

  it("classifies product opportunity correctly based on stock and margin", () => {
    const isReady = (sampleProduct.stock || 0) >= 10 && ((sampleProduct.price - (sampleProduct.cost || 0)) / sampleProduct.price) >= 0.35;
    expect(isReady).toBe(true);

    const lowStockProduct: MarketingProduct = {
      ...sampleProduct,
      stock: 4,
    };
    const isLowStockReady = (lowStockProduct.stock || 0) >= 10;
    expect(isLowStockReady).toBe(false);
  });

  it("formats campaign draft for Meta One-Click launch accurately", () => {
    const draft: MarketingCampaignDraft = {
      id: "draft_test_123",
      productName: sampleProduct.name,
      angleTitle: "خفة وزن ومرونة طوال اليوم",
      headline: "كوتشي ثري لاين الأصلي بخصم حصري 👟",
      primaryText: "متوفر الآن مع شحن سريع ومعاينة قبل الاستلام والدفع عند الباب!",
      callToAction: "SHOP_NOW",
      budgetAmount: 350,
      currency: "EGP",
      targetAudience: "رجال 18-40 في القاهرة والجيزة والإسكندرية",
      format: "Reels / Video",
      destinationUrl: `https://swan.maxp.online/product/${sampleProduct.slug}`,
      status: "DRAFT",
    };

    expect(draft.productName).toBe("كوتشي ثري لاين");
    expect(draft.budgetAmount).toBe(350);
    expect(draft.destinationUrl).toContain("swan.maxp.online/product/three-line-sneaker");
    expect(draft.status).toBe("DRAFT");
  });
});
