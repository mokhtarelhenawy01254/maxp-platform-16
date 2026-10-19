import { renderHook } from "@testing-library/react";
import i18n from "../../../i18n";
import { useOrdersEntityFormatters } from "./useOrdersEntityFormatters";
import type { Order } from "../../../types/orders";
import type { AffiliateFilterOption } from "../ordersFilterTypes";

describe("useOrdersEntityFormatters", () => {
  const mockT = jest.fn((key: string, params?: any) => {
    if (params?.count !== undefined) return `${key}:${params.count}`;
    return key;
  });
  const mockFormatDate = jest.fn((date: string | Date) => `formatted:${date}`);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = () => {
    return renderHook(() =>
      useOrdersEntityFormatters({
        t: mockT,
        formatDate: mockFormatDate,
      }),
    );
  };

  describe("getCustomerDisplayName", () => {
    it("returns customerName if valid and not a placeholder", () => {
      const { result } = setup();
      const order = { customerName: "Ahmed Ali" } as Order;
      expect(result.current.getCustomerDisplayName(order)).toBe("Ahmed Ali");
    });

    it("falls back to customer object firstName and lastName", () => {
      const { result } = setup();
      const order = {
        customerName: "New Customer",
        customer: { firstName: "Sara", lastName: "Ibrahim" },
      } as unknown as Order;
      expect(result.current.getCustomerDisplayName(order)).toBe("Sara Ibrahim");
    });

    it("formats facebook customer when name starts with digits", () => {
      const { result } = setup();
      const order = { customerName: "10029384758" } as Order;
      expect(result.current.getCustomerDisplayName(order)).toBe(
        "orders.facebookCustomer (10029384...)",
      );
    });

    it("formats customer phone when name is placeholder", () => {
      const { result } = setup();
      const order = { customerName: "غير محدد", customerPhone: "01012345678" } as Order;
      expect(result.current.getCustomerDisplayName(order)).toBe(
        "orders.customer (01012345678)",
      );
    });

    it("formats customer from conversationId when name & phone are missing", () => {
      const { result } = setup();
      const order = { conversationId: "conv_123456789" } as Order;
      expect(result.current.getCustomerDisplayName(order)).toBe(
        "orders.customerFromConversation (conv_123...)",
      );
    });

    it("falls back to notSpecifiedCustomer if no identifying info exists", () => {
      const { result } = setup();
      const order = {} as Order;
      expect(result.current.getCustomerDisplayName(order)).toBe("orders.notSpecifiedCustomer");
    });
  });

  describe("getConfidenceColor & getConfidenceIcon", () => {
    it("returns correct color classes across confidence thresholds", () => {
      const { result } = setup();
      expect(result.current.getConfidenceColor()).toBe("bg-slate-100 text-slate-800");
      expect(result.current.getConfidenceColor(0.95)).toBe("bg-green-100 text-green-800");
      expect(result.current.getConfidenceColor(0.7)).toBe("bg-yellow-100 text-yellow-800");
      expect(result.current.getConfidenceColor(0.4)).toBe("bg-red-100 text-red-800");
    });

    it("returns icon components without error", () => {
      const { result } = setup();
      expect(result.current.getConfidenceIcon()).toBeDefined();
      expect(result.current.getConfidenceIcon(0.9)).toBeDefined();
      expect(result.current.getConfidenceIcon(0.65)).toBeDefined();
      expect(result.current.getConfidenceIcon(0.3)).toBeDefined();
    });
  });

  describe("getRelativeTime", () => {
    it("returns justNow for events less than 60 seconds ago", () => {
      const { result } = setup();
      const now = new Date();
      const recent = new Date(now.getTime() - 30 * 1000).toISOString();
      expect(result.current.getRelativeTime(recent)).toBe("orders.justNow");
    });

    it("returns minutesAgo for events less than 1 hour ago", () => {
      const { result } = setup();
      const now = new Date();
      const recent = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
      expect(result.current.getRelativeTime(recent)).toBe("orders.minutesAgo:15");
    });

    it("returns hoursAgo for events less than 24 hours ago", () => {
      const { result } = setup();
      const now = new Date();
      const recent = new Date(now.getTime() - 5 * 3600 * 1000).toISOString();
      expect(result.current.getRelativeTime(recent)).toBe("orders.hoursAgo:5");
    });

    it("returns yesterday for events between 24 and 48 hours ago", () => {
      const { result } = setup();
      const now = new Date();
      const recent = new Date(now.getTime() - 36 * 3600 * 1000).toISOString();
      expect(result.current.getRelativeTime(recent)).toBe("orders.yesterday");
    });

    it("falls back to formatDate for older or malformed dates", () => {
      const { result } = setup();
      const oldDate = new Date(2025, 0, 1).toISOString();
      expect(result.current.getRelativeTime(oldDate)).toBe(`formatted:${oldDate}`);
    });
  });

  describe("getAffiliateDisplayName & getFulfillmentSourceText", () => {
    it("formats affiliate full name, code, email, or id", () => {
      const { result } = setup();
      expect(result.current.getAffiliateDisplayName()).toBe("");
      expect(
        result.current.getAffiliateDisplayName({
          id: "aff_1",
          user: { firstName: "Karim", lastName: "Mostafa" },
        } as AffiliateFilterOption),
      ).toBe("Karim Mostafa");

      expect(
        result.current.getAffiliateDisplayName({
          id: "aff_2",
          affiliateCode: "AFF-99",
        } as AffiliateFilterOption),
      ).toBe("AFF-99");
    });

    it("returns proper translation for fulfillment sources", () => {
      const { result } = setup();
      expect(result.current.getFulfillmentSourceText("COMPANY_WAREHOUSE")).toBe(
        i18n.t("orders.fromCompanyWarehouse"),
      );
      expect(result.current.getFulfillmentSourceText("MERCHANT")).toBe(
        i18n.t("orders.fromMerchant"),
      );
      expect(result.current.getFulfillmentSourceText("UNKNOWN")).toBe("");
    });
  });
});
