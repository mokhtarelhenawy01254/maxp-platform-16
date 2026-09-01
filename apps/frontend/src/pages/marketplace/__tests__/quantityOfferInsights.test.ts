import { buildQuantityOfferInsights } from "../quantityOfferInsights";

describe("buildQuantityOfferInsights", () => {
  it("aggregates quantity-offer funnel metrics from usage feature totals", () => {
    const summary = buildQuantityOfferInsights({
      quantity_offer_panel_view: {
        actions: 24,
        quantity: 24,
        totalCost: 0,
      },
      quantity_offer_select: {
        actions: 12,
        quantity: 28,
        totalCost: 6400,
      },
      quantity_offer_copy_first_selection: {
        actions: 5,
        quantity: 14,
        totalCost: 0,
      },
      quantity_offer_add_to_cart: {
        actions: 8,
        quantity: 21,
        totalCost: 5040,
      },
      quantity_offer_order_created: {
        actions: 3,
        quantity: 8,
        totalCost: 1890,
      },
    });

    expect(summary.panelViews).toBe(24);
    expect(summary.offerSelections).toBe(12);
    expect(summary.copySelectionActions).toBe(5);
    expect(summary.addToCartActions).toBe(8);
    expect(summary.ordersCreated).toBe(3);
    expect(summary.unitsAddedToCart).toBe(21);
    expect(summary.unitsOrdered).toBe(8);
    expect(summary.trackedCartValue).toBe(5040);
    expect(summary.trackedOrderValue).toBe(1890);
    expect(summary.selectionRate).toBe(50);
    expect(summary.addToCartRate).toBe(33.33);
    expect(summary.orderCaptureRate).toBe(37.5);
    expect(summary.avgUnitsPerAdd).toBe(2.63);
    expect(summary.avgOrderValue).toBe(630);
  });

  it("returns zeroed metrics when there is no usage data", () => {
    expect(buildQuantityOfferInsights({})).toEqual({
      panelViews: 0,
      offerSelections: 0,
      copySelectionActions: 0,
      addToCartActions: 0,
      ordersCreated: 0,
      unitsAddedToCart: 0,
      unitsOrdered: 0,
      trackedCartValue: 0,
      trackedOrderValue: 0,
      selectionRate: 0,
      addToCartRate: 0,
      orderCaptureRate: 0,
      avgUnitsPerAdd: 0,
      avgOrderValue: 0,
    });
  });
});

import {
  normalizeQuantityOffer,
  normalizeQuantityOffers,
  createEmptyQuantityOffer,
  getQuantityOfferTotals,
  getDefaultQuantityOfferBuyText,
} from "../../../utils/quantityOffers";

describe("quantityOffers normalization and string preservation", () => {
  it("preserves spaces in buyText, helperText, and helperDescription during normalization", () => {
    const rawOffer = {
      id: "offer-1",
      quantity: 2,
      unitPrice: 500,
      buyText: "طقم من قطعتين ",
      helperText: "الأكثر توفيرًا ",
      helperDescription: "اختر لون ومقاس كل قطعة ",
    };

    const normalized = normalizeQuantityOffer(rawOffer);
    expect(normalized).not.toBeNull();
    expect(normalized?.buyText).toBe("طقم من قطعتين ");
    expect(normalized?.helperText).toBe("الأكثر توفيرًا ");
    expect(normalized?.helperDescription).toBe("اختر لون ومقاس كل قطعة ");
  });

  it("normalizes array of offers without stripping spaces", () => {
    const rawOffers = [
      {
        id: "offer-1",
        quantity: 2,
        unitPrice: 500,
        buyText: "طقم قطعتين ",
      },
      {
        id: "offer-2",
        quantity: 3,
        unitPrice: 400,
        buyText: "طقم 3 قطع ",
      },
    ];

    const normalized = normalizeQuantityOffers(rawOffers);
    expect(normalized).toHaveLength(2);
    expect(normalized[0].buyText).toBe("طقم قطعتين ");
    expect(normalized[1].buyText).toBe("طقم 3 قطع ");
  });

  it("calculates totals and default preview text correctly", () => {
    const offer = createEmptyQuantityOffer(2, 500);
    const totals = getQuantityOfferTotals(offer, 600);
    expect(totals.offerTotal).toBe(1000);
    expect(totals.originalTotal).toBe(1200);
    expect(totals.savings).toBe(200);

    const buyText = getDefaultQuantityOfferBuyText(offer, 600, "ج.م");
    expect(buyText).toContain("1000");
    expect(buyText).toContain("1200");
  });
});
