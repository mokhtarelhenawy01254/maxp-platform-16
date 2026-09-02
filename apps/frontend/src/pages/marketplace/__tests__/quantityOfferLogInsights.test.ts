import { describe, it, expect } from "vitest";
import { buildQuantityOfferLogInsights } from "../quantityOfferLogInsights";

describe("buildQuantityOfferLogInsights", () => {
  it("groups quantity offer logs by product and tier", () => {
    const insights = buildQuantityOfferLogInsights([
      {
        feature: "quantity_offer_panel_view",
        quantity: 3,
        metadata: {
          productId: "prod-1",
          productName: "Atlas Shoe",
        },
      },
      {
        feature: "quantity_offer_select",
        quantity: 2,
        totalCost: 610,
        metadata: {
          productId: "prod-1",
          productName: "Atlas Shoe",
          offerId: "offer-2",
          offerLabel: "اشتري القطعتين بـ610",
          offerQuantity: 2,
        },
      },
      {
        feature: "quantity_offer_add_to_cart",
        quantity: 2,
        totalCost: 610,
        metadata: {
          productId: "prod-1",
          productName: "Atlas Shoe",
          offerId: "offer-2",
          offerLabel: "اشتري القطعتين بـ610",
          offerQuantity: 2,
        },
      },
      {
        feature: "quantity_offer_order_created",
        quantity: 2,
        totalCost: 610,
        metadata: {
          productId: "prod-1",
          productName: "Atlas Shoe",
          offerId: "offer-2",
          offerLabel: "اشتري القطعتين بـ610",
          offerQuantity: 2,
        },
      },
      {
        feature: "quantity_offer_panel_view",
        quantity: 2,
        metadata: {
          productId: "prod-2",
          productName: "Nova Tee",
        },
      },
    ]);

    expect(insights.sampledLogCount).toBe(5);
    expect(insights.products[0]).toMatchObject({
      productId: "prod-1",
      productName: "Atlas Shoe",
      panelViews: 1,
      selections: 1,
      addToCartActions: 1,
      ordersCreated: 1,
      trackedCartValue: 610,
      trackedOrderValue: 610,
    });
    expect(insights.offers[0]).toMatchObject({
      productId: "prod-1",
      offerId: "offer-2",
      offerLabel: "اشتري القطعتين بـ610",
      offerQuantity: 2,
      selections: 1,
      addToCartActions: 1,
      ordersCreated: 1,
      trackedCartValue: 610,
      trackedOrderValue: 610,
    });
  });
});
