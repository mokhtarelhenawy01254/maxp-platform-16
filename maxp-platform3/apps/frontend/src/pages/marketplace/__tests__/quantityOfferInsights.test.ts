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
