import { renderHook, act, waitFor } from "@testing-library/react";
import { useOrdersLookupData } from "./useOrdersLookupData";
import { apiClient } from "../../../services/apiClient";
import { queryClient } from "../../../config/queryClient";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("../../../i18n", () => ({
  __esModule: true,
  default: {
    t: (key: string) => key,
  },
}));

const mockDefaultOrderStatuses = [
  { code: "PENDING", name: "قيد الانتظار", color: "#F59E0B" },
  { code: "CONFIRMED", name: "مؤكد", color: "#3B82F6" },
];

const mockDefaultPaymentStatuses = [
  { code: "PENDING", name: "معلق الدفع", color: "#F59E0B" },
  { code: "COMPLETED", name: "مدفوع", color: "#10B981" },
];

const normalizeStatusCode = (val: string | null | undefined) =>
  String(val || "").trim().toUpperCase();

const getApiErrorMessage = (_err: unknown, fallback: string) => fallback;

describe("useOrdersLookupData hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it("initializes with provided default statuses and empty lists", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() =>
      useOrdersLookupData({
        companyId: "comp-1",
        isAdmin: false,
        isMerchant: true,
        canSelectOrders: false,
        merchantFilterLength: 0,
        defaultOrderStatuses: mockDefaultOrderStatuses,
        defaultPaymentStatuses: mockDefaultPaymentStatuses,
        normalizeStatusCode,
        getApiErrorMessage,
      }),
    );

    expect(result.current.orderStatuses).toHaveLength(2);
    expect(result.current.paymentStatuses).toHaveLength(2);
    expect(result.current.merchantOptions).toEqual([]);
    expect(result.current.affiliateOptions).toEqual([]);
    expect(result.current.activeCarriers).toEqual([]);
    expect(result.current.hasActiveTurbo).toBe(false);
    expect(result.current.hasActiveQpExpress).toBe(false);
    expect(result.current.hasActiveBosta).toBe(false);
  });

  it("fetches and partitions order and payment statuses from API", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/order-status") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              { code: "PENDING", name: "قيد الانتظار", statusType: "order" },
              { code: "PROCESSING", name: "قيد التجهيز", statusType: "order" },
              { code: "PAID", name: "مدفوع", statusType: "payment" },
            ],
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    const { result } = renderHook(() =>
      useOrdersLookupData({
        companyId: "comp-1",
        isAdmin: false,
        isMerchant: true,
        canSelectOrders: false,
        merchantFilterLength: 0,
        defaultOrderStatuses: mockDefaultOrderStatuses,
        defaultPaymentStatuses: mockDefaultPaymentStatuses,
        normalizeStatusCode,
        getApiErrorMessage,
      }),
    );

    await waitFor(() => {
      expect(result.current.orderStatuses.some((s) => s.code === "PROCESSING")).toBe(true);
      expect(result.current.paymentStatuses.some((s) => s.code === "PAID")).toBe(true);
    });

    expect(result.current.orderStatusMap.get("PROCESSING")?.name).toBe("قيد التجهيز");
    expect(result.current.paymentStatusMap.get("PAID")?.name).toBe("مدفوع");
  });

  it("fetches merchants and affiliates when user is admin and not merchant", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/merchants") {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: "m-1", name: "Merchant Alpha" }],
          },
        });
      }
      if (url === "/affiliates/list") {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: "aff-1", name: "Affiliate Beta" }],
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    const { result } = renderHook(() =>
      useOrdersLookupData({
        companyId: "comp-1",
        isAdmin: true,
        isMerchant: false,
        canSelectOrders: true,
        merchantFilterLength: 0,
        defaultOrderStatuses: mockDefaultOrderStatuses,
        defaultPaymentStatuses: mockDefaultPaymentStatuses,
        normalizeStatusCode,
        getApiErrorMessage,
      }),
    );

    await waitFor(() => {
      expect(result.current.merchantOptions).toHaveLength(1);
      expect(result.current.merchantOptions[0].name).toBe("Merchant Alpha");
      expect(result.current.affiliateOptions).toHaveLength(1);
      expect(result.current.affiliateOptions[0].name).toBe("Affiliate Beta");
    });
  });

  it("fetches active carriers and accurately calculates active carrier flags", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === "/shipping-companies/active-carriers") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              { id: "car-1", name: "Turbo Express", slug: "turbo", providerKey: "TURBO", isActive: true },
              { id: "car-2", name: "Bosta Logistics", slug: "bosta", providerKey: "BOSTA", isActive: true },
              { id: "car-3", name: "QP Express", slug: "qp-express", providerKey: "QP_EXPRESS", isActive: false },
            ],
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    const { result } = renderHook(() =>
      useOrdersLookupData({
        companyId: "comp-1",
        isAdmin: true,
        isMerchant: false,
        canSelectOrders: true,
        merchantFilterLength: 0,
        defaultOrderStatuses: mockDefaultOrderStatuses,
        defaultPaymentStatuses: mockDefaultPaymentStatuses,
        normalizeStatusCode,
        getApiErrorMessage,
      }),
    );

    await waitFor(() => {
      expect(result.current.activeCarriers).toHaveLength(3);
    });

    expect(result.current.hasActiveTurbo).toBe(true);
    expect(result.current.hasActiveBosta).toBe(true);
    // QP_EXPRESS has isActive = false
    expect(result.current.hasActiveQpExpress).toBe(false);
  });

  it("fetches merchant settlement summary when single merchant is selected", async () => {
    (apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/merchants/m-123/settlement-summary")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              merchant: { id: "m-123", name: "Specific Merchant" },
              payoutSummary: {
                balances: { availableAmount: 5400 },
              },
            },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    const { result } = renderHook(() =>
      useOrdersLookupData({
        companyId: "comp-1",
        isAdmin: true,
        isMerchant: false,
        canSelectOrders: true,
        merchantFilterId: "m-123",
        merchantFilterLength: 1,
        defaultOrderStatuses: mockDefaultOrderStatuses,
        defaultPaymentStatuses: mockDefaultPaymentStatuses,
        normalizeStatusCode,
        getApiErrorMessage,
      }),
    );

    await waitFor(() => {
      expect(result.current.merchantSettlementSummary).not.toBeNull();
    });

    expect(result.current.merchantSettlementSummary?.merchant?.name).toBe("Specific Merchant");
    expect(result.current.merchantSettlementError).toBe("");
  });
});
