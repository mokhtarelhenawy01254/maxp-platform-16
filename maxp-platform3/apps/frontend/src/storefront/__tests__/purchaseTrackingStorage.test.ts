// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredPurchaseTracking,
  getStoredPurchaseTracking,
  hasMarkedPurchaseTracked,
  markPurchaseTracked,
  persistPurchaseTracking,
} from "../utils/purchaseTrackingStorage";

const trackingPayload = {
  eventId: "pixel-evt-1",
  orderNumber: "ORD-123",
  total: 998,
  phone: "01000000000",
  customerName: "Swan Customer",
  paymentMethod: "cod",
  items: [
    {
      id: "line-1",
      productId: "product-1",
      variantId: "variant-1",
      name: "Swan Sneaker",
      quantity: 2,
      price: 499,
      attributes: {
        Color: "Beige",
      },
      quantityOffer: {
        groupId: "offer-group",
        offerId: "offer-1",
        offerLabel: "Two pairs",
        offerQuantity: 2,
        freeShipping: true,
      },
    },
  ],
};

describe("purchaseTrackingStorage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("persists checkout purchase tracking by order number and as the recent payload", () => {
    persistPurchaseTracking(trackingPayload);

    expect(getStoredPurchaseTracking("ORD-123")).toEqual(trackingPayload);
    expect(getStoredPurchaseTracking()).toEqual(trackingPayload);
  });

  it("clears stored purchase tracking after the thank-you page consumes it", () => {
    persistPurchaseTracking(trackingPayload);
    clearStoredPurchaseTracking("ORD-123");

    expect(getStoredPurchaseTracking("ORD-123")).toBeNull();
    expect(getStoredPurchaseTracking()).toBeNull();
  });

  it("marks a purchase as tracked to avoid duplicate Pixel Purchase events on reload", () => {
    expect(hasMarkedPurchaseTracked(trackingPayload)).toBe(false);

    markPurchaseTracked(trackingPayload);

    expect(hasMarkedPurchaseTracked(trackingPayload)).toBe(true);
  });
});
