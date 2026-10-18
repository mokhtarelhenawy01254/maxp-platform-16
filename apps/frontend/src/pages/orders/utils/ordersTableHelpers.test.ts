import {
  ORDER_TABLE_COLUMNS,
  normalizeOrderTableColumns,
  getOrderAmount,
  getOrdersLoadErrorMessage,
  getApiErrorMessage,
  formatMerchantPieces,
  getMerchantOperationsTotals,
} from "./ordersTableHelpers";
import type { Order } from "./orderTransformer";

jest.mock("../../../i18n", () => ({
  t: (k: string) => k,
}));

describe("ordersTableHelpers", () => {
  describe("normalizeOrderTableColumns", () => {
    it("returns default columns when input is not an array", () => {
      expect(normalizeOrderTableColumns(null)).toEqual(ORDER_TABLE_COLUMNS);
      expect(normalizeOrderTableColumns(undefined)).toEqual(ORDER_TABLE_COLUMNS);
      expect(normalizeOrderTableColumns("invalid")).toEqual(ORDER_TABLE_COLUMNS);
    });

    it("filters out unknown column names and ensures orderNumber is included", () => {
      const input = ["customer", "amount", "invalid_column"];
      const result = normalizeOrderTableColumns(input);
      expect(result).toEqual(["orderNumber", "customer", "amount"]);
    });

    it("keeps orderNumber at start if already present", () => {
      const input = ["orderNumber", "status", "date"];
      const result = normalizeOrderTableColumns(input);
      expect(result).toEqual(["orderNumber", "status", "date"]);
    });
  });

  describe("getOrderAmount", () => {
    it("returns total directly if total > 0", () => {
      const order = { total: 450 } as Order;
      expect(getOrderAmount(order)).toBe(450);
    });

    it("calculates amount from subtotal, shipping, tax, and discount", () => {
      const order = {
        total: 0,
        subtotal: 500,
        shipping: 50,
        tax: 20,
        discount: 70,
      } as Order;

      expect(getOrderAmount(order)).toBe(500); // 500 + 50 + 20 - 70 = 500
    });
  });

  describe("getOrdersLoadErrorMessage", () => {
    it("returns server error message for 500 status", () => {
      const err = { response: { status: 500 } };
      expect(getOrdersLoadErrorMessage(err)).toBe("orders.failedToLoadOrdersDesc");
    });

    it("returns network error message when message mentions Network", () => {
      const err = new Error("Network request failed");
      expect(getOrdersLoadErrorMessage(err)).toBe("orders.networkError");
    });

    it("returns api message if provided", () => {
      const err = { response: { data: { message: "Invalid tenant token" } } };
      expect(getOrdersLoadErrorMessage(err)).toBe("Invalid tenant token");
    });
  });

  describe("getApiErrorMessage", () => {
    it("extracts message from response data", () => {
      const err = { response: { data: { message: "Order not editable" } } };
      expect(getApiErrorMessage(err, "fallback")).toBe("Order not editable");
    });

    it("extracts error string from response data", () => {
      const err = { response: { data: { error: "Validation failure" } } };
      expect(getApiErrorMessage(err, "fallback")).toBe("Validation failure");
    });

    it("falls back when no error property found", () => {
      expect(getApiErrorMessage({}, "fallback")).toBe("fallback");
    });
  });

  describe("formatMerchantPieces", () => {
    it("formats integer correctly", () => {
      const res = formatMerchantPieces(1250);
      expect(res).toBeTruthy();
    });

    it("handles 0 or null", () => {
      expect(formatMerchantPieces(null)).toBeTruthy();
      expect(formatMerchantPieces(0)).toBeTruthy();
    });
  });

  describe("getMerchantOperationsTotals", () => {
    it("merges partial totals with defaults", () => {
      const summary = {
        summary: {
          assignedOrdersCount: 15,
          deliveredPieces: 30,
        },
      };

      const result = getMerchantOperationsTotals(summary);
      expect(result.assignedOrdersCount).toBe(15);
      expect(result.deliveredPieces).toBe(30);
      expect(result.inShippingOrdersCount).toBe(0);
    });
  });
});
