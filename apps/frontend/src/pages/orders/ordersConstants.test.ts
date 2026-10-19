import {
  normalizeStatusCode,
  isCancellationStatus,
  DEFAULT_ORDER_STATUSES,
  DEFAULT_PAYMENT_STATUSES,
  FILTERABLE_STATUS_CODES,
  BULK_UPDATABLE_STATUS_CODES,
} from "./ordersConstants";

describe("ordersConstants", () => {
  describe("normalizeStatusCode", () => {
    it("converts strings to trimmed uppercase", () => {
      expect(normalizeStatusCode("  pending  ")).toBe("PENDING");
      expect(normalizeStatusCode("delivered")).toBe("DELIVERED");
      expect(normalizeStatusCode("")).toBe("");
      expect(normalizeStatusCode(null)).toBe("");
      expect(normalizeStatusCode(undefined)).toBe("");
    });
  });

  describe("isCancellationStatus", () => {
    it("recognizes CANCELLED and CANCELED variations", () => {
      expect(isCancellationStatus("CANCELLED")).toBe(true);
      expect(isCancellationStatus("cancelled")).toBe(true);
      expect(isCancellationStatus("CANCELED")).toBe(true);
      expect(isCancellationStatus("canceled")).toBe(true);
      expect(isCancellationStatus("PENDING")).toBe(false);
      expect(isCancellationStatus("")).toBe(false);
      expect(isCancellationStatus(null)).toBe(false);
    });
  });

  describe("DEFAULT_ORDER_STATUSES & DEFAULT_PAYMENT_STATUSES", () => {
    it("defines default order statuses with codes and colors", () => {
      expect(DEFAULT_ORDER_STATUSES.length).toBeGreaterThan(15);
      const pending = DEFAULT_ORDER_STATUSES.find((s) => s.code === "PENDING");
      expect(pending).toBeDefined();
      expect(pending?.color).toBe("#F59E0B");
    });

    it("defines default payment statuses with codes and colors", () => {
      expect(DEFAULT_PAYMENT_STATUSES.length).toBeGreaterThan(5);
      const completed = DEFAULT_PAYMENT_STATUSES.find((s) => s.code === "COMPLETED");
      expect(completed).toBeDefined();
      expect(completed?.color).toBe("#10B981");
    });
  });

  describe("FILTERABLE_STATUS_CODES & BULK_UPDATABLE_STATUS_CODES", () => {
    it("contains expected status codes", () => {
      expect(FILTERABLE_STATUS_CODES).toContain("CONFIRMED");
      expect(FILTERABLE_STATUS_CODES).toContain("DELIVERED");
      expect(BULK_UPDATABLE_STATUS_CODES).toContain("PROCESSING");
      expect(BULK_UPDATABLE_STATUS_CODES).toContain("CANCELLED");
    });
  });
});
