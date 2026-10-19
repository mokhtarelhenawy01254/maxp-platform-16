import {
  resolveOrderImageSrc,
  looksLikeSizeValue,
  normalizeVariantDisplayValues,
  isCancellationStatus,
  extractItemProductColor,
  extractItemProductSize,
  parseOrderDetailsResponse,
  buildInitialEditForm,
} from "./orderDetailsParser";

describe("orderDetailsParser", () => {
  describe("resolveOrderImageSrc", () => {
    it("returns empty string for falsy input", () => {
      expect(resolveOrderImageSrc(null)).toBe("");
      expect(resolveOrderImageSrc(undefined)).toBe("");
      expect(resolveOrderImageSrc("")).toBe("");
    });

    it("parses JSON strings and objects with url or src", () => {
      expect(resolveOrderImageSrc('{"url":"https://example.com/img.png"}')).toBe(
        "https://example.com/img.png",
      );
      expect(resolveOrderImageSrc({ src: "https://example.com/src.jpg" })).toBe(
        "https://example.com/src.jpg",
      );
      expect(resolveOrderImageSrc(["https://example.com/arr.png"])).toBe(
        "https://example.com/arr.png",
      );
    });

    it("returns plain string as-is", () => {
      expect(resolveOrderImageSrc("https://example.com/direct.png")).toBe(
        "https://example.com/direct.png",
      );
    });
  });

  describe("looksLikeSizeValue", () => {
    it("detects valid garment sizes and numbers", () => {
      expect(looksLikeSizeValue("XL")).toBe(true);
      expect(looksLikeSizeValue("2xl")).toBe(true);
      expect(looksLikeSizeValue("One Size")).toBe(true);
      expect(looksLikeSizeValue("42")).toBe(true);
      expect(looksLikeSizeValue("Blue")).toBe(false);
      expect(looksLikeSizeValue(null)).toBe(false);
    });
  });

  describe("normalizeVariantDisplayValues", () => {
    it("clears size when color and size are identical", () => {
      const res = normalizeVariantDisplayValues("Red", "Red");
      expect(res.color).toBe("Red");
      expect(res.size).toBe("");
    });

    it("keeps distinct color and valid size", () => {
      const res = normalizeVariantDisplayValues("Black", "XL");
      expect(res.color).toBe("Black");
      expect(res.size).toBe("XL");
    });
  });

  describe("isCancellationStatus", () => {
    it("identifies cancellation statuses", () => {
      expect(isCancellationStatus("CANCELLED")).toBe(true);
      expect(isCancellationStatus("canceled")).toBe(true);
      expect(isCancellationStatus("DELIVERED")).toBe(false);
    });
  });

  describe("parseOrderDetailsResponse & buildInitialEditForm", () => {
    it("parses simple order with numeric calculations and kashier payment", () => {
      const raw = {
        orderNumber: "ORD-12345",
        status: "confirmed",
        subtotal: "100",
        shipping: "20",
        tax: "5",
        discount: "10",
        finalTotal: "115",
        kashierPayment: { status: "SUCCESS" },
        items: [
          {
            id: "item-1",
            productId: "prod-1",
            name: "Classic Shirt",
            price: "50",
            quantity: "2",
            color: "White",
            size: "L",
          },
        ],
      };

      const parsed = parseOrderDetailsResponse(raw);
      expect(parsed.orderNumber).toBe("ORD-12345");
      expect(parsed.status).toBe("CONFIRMED");
      expect(parsed.paymentStatus).toBe("COMPLETED");
      expect(parsed.subtotal).toBe(100);
      expect(parsed.shipping).toBe(20);
      expect(parsed.total).toBe(115);
      expect(parsed.items[0].productColor).toBe("White");
      expect(parsed.items[0].productSize).toBe("L");

      const editForm = buildInitialEditForm(parsed);
      expect(editForm.customerName).toBe(parsed.customerName);
      expect(editForm.items.length).toBe(1);
      expect(editForm.shipping).toBe(20);
    });
  });
});
