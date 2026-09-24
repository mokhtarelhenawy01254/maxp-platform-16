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

  it("isolates purchase tracking per company and prevents cross-tenant leaks", () => {
    const storeATracking = {
      ...trackingPayload,
      orderNumber: "ORD-STORE-A",
      total: 500,
    };
    const storeBTracking = {
      ...trackingPayload,
      orderNumber: "ORD-STORE-B",
      total: 1200,
    };

    // Store A persists an order
    persistPurchaseTracking(storeATracking, "company-A");
    // Store B persists an order
    persistPurchaseTracking(storeBTracking, "company-B");

    // Reading with company-A returns Store A's order, NOT Store B's
    expect(getStoredPurchaseTracking("ORD-STORE-A", "company-A")?.total).toBe(500);
    expect(getStoredPurchaseTracking(null, "company-A")?.orderNumber).toBe("ORD-STORE-A");

    // Reading with company-B returns Store B's order, NOT Store A's
    expect(getStoredPurchaseTracking("ORD-STORE-B", "company-B")?.total).toBe(1200);
    expect(getStoredPurchaseTracking(null, "company-B")?.orderNumber).toBe("ORD-STORE-B");

    // Cross-tenant probe: Trying to query Store A's order with Store B's companyId is rejected
    expect(getStoredPurchaseTracking("ORD-STORE-A", "company-B")).toBeNull();

    // Clearing Store A does not wipe Store B
    clearStoredPurchaseTracking("ORD-STORE-A", "company-A");
    expect(getStoredPurchaseTracking("ORD-STORE-A", "company-A")).toBeNull();
    expect(getStoredPurchaseTracking("ORD-STORE-B", "company-B")?.total).toBe(1200);
  });
});
