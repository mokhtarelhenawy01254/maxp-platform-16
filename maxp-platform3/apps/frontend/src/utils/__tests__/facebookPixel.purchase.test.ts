import { createFacebookPurchaseDispatchPlan } from "../facebookPixel";

const purchaseEventData = {
  content_ids: ["product-1"],
  contents: [{ id: "product-1", quantity: 2, item_price: 100 }],
  content_type: "product",
  value: 200,
  currency: "EGP",
  num_items: 1,
};

describe("createFacebookPurchaseDispatchPlan", () => {
  it("preserves Purchase value for unsupported browser currencies", () => {
    const prepared = createFacebookPurchaseDispatchPlan(
      purchaseEventData,
      "EGP",
    );

    expect(prepared.trackingMethod).toBe("trackCustom");
    expect(prepared.monetaryFieldsMode).toBe(
      "unsupported_currency_track_custom",
    );
    expect(prepared.eventData).toMatchObject({
      content_ids: ["product-1"],
      contents: [{ id: "product-1", quantity: 2, item_price: 100 }],
      content_type: "product",
      value: 200,
      currency: "EGP",
      num_items: 1,
    });
  });

  it("uses standard Purchase for Meta-supported browser currencies", () => {
    const prepared = createFacebookPurchaseDispatchPlan(
      { ...purchaseEventData, currency: "USD" },
      "USD",
    );

    expect(prepared.trackingMethod).toBe("track");
    expect(prepared.monetaryFieldsMode).toBe("included");
    expect(prepared.eventData).toMatchObject({
      value: 200,
      currency: "USD",
    });
  });
});
