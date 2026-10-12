import {
  AOV_TOOLS_CATALOG,
  AOV_LIFECYCLE_LANES,
} from "../aovToolsCatalog";
import { buildQuantityOfferInsights } from "../../../marketplace/quantityOfferInsights";

describe("AOV Cockpit Catalog & Calculation Engine", () => {
  test("contains exactly 34 tools across the 4 lifecycle lanes", () => {
    expect(AOV_TOOLS_CATALOG.length).toBe(34);
    expect(AOV_LIFECYCLE_LANES.length).toBe(4);

    const prePurchaseTools = AOV_TOOLS_CATALOG.filter((t) => t.lane === "pre-purchase");
    const inPurchaseTools = AOV_TOOLS_CATALOG.filter((t) => t.lane === "in-purchase");
    const postPurchaseTools = AOV_TOOLS_CATALOG.filter((t) => t.lane === "post-purchase");
    const intelligenceTools = AOV_TOOLS_CATALOG.filter((t) => t.lane === "intelligence");

    expect(prePurchaseTools.length).toBe(12);
    expect(inPurchaseTools.length).toBe(8);
    expect(postPurchaseTools.length).toBe(8);
    expect(intelligenceTools.length).toBe(6);
  });

  test("validates that every tool has an id, name, subtitle, and valid settingsPath", () => {
    AOV_TOOLS_CATALOG.forEach((tool) => {
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.subtitle).toBeTruthy();
      expect(tool.settingsPath.startsWith("/")).toBe(true);
    });
  });

  test("computes quantity offer insights correctly when fed real featureMap", () => {
    const mockFeatureMap = {
      quantity_offer_panel_view: { actions: 100, quantity: 100, totalCost: 0 },
      quantity_offer_select: { actions: 35, quantity: 70, totalCost: 0 },
      quantity_offer_copy_first_selection: { actions: 5, quantity: 10, totalCost: 0 },
      quantity_offer_add_to_cart: { actions: 25, quantity: 50, totalCost: 12500 },
      quantity_offer_order_created: { actions: 20, quantity: 40, totalCost: 10000 },
    };

    const insights = buildQuantityOfferInsights(mockFeatureMap);

    expect(insights.panelViews).toBe(100);
    expect(insights.offerSelections).toBe(35);
    expect(insights.selectionRate).toBe(35);
    expect(insights.addToCartActions).toBe(25);
    expect(insights.addToCartRate).toBe(25);
    expect(insights.ordersCreated).toBe(20);
    expect(insights.orderCaptureRate).toBe(80);
    expect(insights.trackedOrderValue).toBe(10000);
    expect(insights.avgOrderValue).toBe(500);
  });
});
