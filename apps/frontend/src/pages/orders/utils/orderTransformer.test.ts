import {
  isRecord,
  normalizeOrderStatus,
  normalizePaymentStatus,
  transformOrder,
  type RawOrder,
} from "./orderTransformer";

describe("orderTransformer utilities", () => {
  describe("isRecord", () => {
    it("identifies valid record objects", () => {
      expect(isRecord({ a: 1 })).toBe(true);
      expect(isRecord({})).toBe(true);
    });

    it("rejects null, undefined, and primitives", () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord("string")).toBe(false);
      expect(isRecord(123)).toBe(false);
    });
  });

  describe("normalizeOrderStatus", () => {
    it("defaults to pending when empty or undefined", () => {
      expect(normalizeOrderStatus(null)).toBe("pending");
      expect(normalizeOrderStatus(undefined)).toBe("pending");
      expect(normalizeOrderStatus("")).toBe("pending");
    });

    it("normalizes to trimmed lowercase", () => {
      expect(normalizeOrderStatus("  CONFIRMED  ")).toBe("confirmed");
      expect(normalizeOrderStatus("DELIVERED")).toBe("delivered");
    });
  });

  describe("normalizePaymentStatus", () => {
    it("handles standard statuses", () => {
      expect(normalizePaymentStatus("PAID", false)).toBe("completed");
      expect(normalizePaymentStatus("COMPLETED", false)).toBe("completed");
      expect(normalizePaymentStatus("FAILED", false)).toBe("failed");
      expect(normalizePaymentStatus("REFUNDED", false)).toBe("refunded");
    });

    it("handles guest orders fallback to unavailable", () => {
      expect(normalizePaymentStatus(null, true)).toBe("unavailable");
      expect(normalizePaymentStatus("UNKNOWN", true)).toBe("unavailable");
      expect(normalizePaymentStatus(null, false)).toBe("pending");
    });

    it("recognizes valid wallet proof as completed", () => {
      const order: RawOrder = {
        paymentMethod: "wallet",
        metadata: {
          walletPaymentProof: {
            imageUrl: "https://example.com/receipt.jpg",
            status: "PENDING",
          },
        },
      };

      expect(normalizePaymentStatus("PENDING", false, order)).toBe("completed");
    });

    it("rejects wallet proof when status is REJECTED", () => {
      const order: RawOrder = {
        paymentMethod: "wallet",
        metadata: {
          walletPaymentProof: {
            imageUrl: "https://example.com/receipt.jpg",
            status: "REJECTED",
          },
        },
      };

      expect(normalizePaymentStatus("PENDING", false, order)).toBe("pending");
    });
  });

  describe("transformOrder", () => {
    it("transforms raw order with calculated total and defaults", () => {
      const raw: RawOrder = {
        id: "ord-1",
        orderNumber: "ORD-12345",
        customerName: "Ahmad Sami",
        status: "CONFIRMED",
        subtotal: "500",
        shipping: "50",
        discount: "20",
        tax: "0",
        items: [
          {
            id: "it-1",
            productId: "p-1",
            name: "Brake Pads",
            price: "250",
            quantity: 2,
            total: "500",
          },
        ],
        shippingAddress: {
          city: "Nasr City",
          governorate: "Cairo",
          country: "Egypt",
        },
      };

      const transformed = transformOrder(raw);

      expect(transformed.id).toBe("ord-1");
      expect(transformed.orderNumber).toBe("ORD-12345");
      expect(transformed.customerName).toBe("Ahmad Sami");
      expect(transformed.status).toBe("confirmed");
      expect(transformed.subtotal).toBe(500);
      expect(transformed.shipping).toBe(50);
      expect(transformed.discount).toBe(20);
      expect(transformed.total).toBe(530);
      expect(transformed.items).toHaveLength(1);
      expect(transformed.items[0].price).toBe(250);
      expect(transformed.items[0].quantity).toBe(2);
      expect(transformed.items[0].total).toBe(500);
      expect(transformed.shippingAddress.city).toBe("Nasr City");
      expect(transformed.shippingAddress.governorate).toBe("Cairo");
    });

    it("handles missing shippingAddress object gracefully", () => {
      const raw: RawOrder = {
        orderNumber: "ORD-EMPTY",
        city: "Giza",
        governorate: "Giza",
      };

      const transformed = transformOrder(raw);
      expect(transformed.customerName).toBe("Not Specified");
      expect(transformed.shippingAddress.city).toBe("Giza");
      expect(transformed.shippingAddress.governorate).toBe("Giza");
      expect(transformed.status).toBe("pending");
    });
  });
});
