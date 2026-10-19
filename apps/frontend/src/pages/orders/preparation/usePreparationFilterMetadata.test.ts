import { renderHook } from "@testing-library/react";
import { usePreparationFilterMetadata } from "./usePreparationFilterMetadata";

// Mock child hooks
jest.mock("./usePreparationStatusOptions", () => ({
  usePreparationStatusOptions: jest.fn(() => ({
    statusLabelMap: { NEW: "New" },
    statusOptions: [{ code: "NEW", fallbackName: "New" }],
    filterTabs: [{ key: "ALL", label: "All" }],
    enabledQcChecks: ["quantity"],
  })),
}));

jest.mock("./usePreparationEnrichedOrders", () => ({
  usePreparationEnrichedOrders: jest.fn(() => ({
    inventorySummaryByProduct: new Map(),
    preparationOrders: [{ id: "ord-1", orderNumber: "1001" }],
  })),
}));

jest.mock("./usePreparationFilterDerived", () => ({
  usePreparationFilterDerived: jest.fn(() => ({
    shortageOwnerOptions: ["owner-1"],
    productSuggestions: ["prod-1"],
  })),
}));

describe("usePreparationFilterMetadata", () => {
  it("combines status options, enriched orders, and derived filter options cleanly", () => {
    const { result } = renderHook(() =>
      usePreparationFilterMetadata({
        statusConfigs: [],
        preparationStatuses: [],
        preparationSettings: {} as any,
        orders: [],
        inventory: [],
        selectedWarehouseId: "wh-1",
        serverShortageOwnerOptions: [],
        shortageHoldDrafts: {},
        uiState: {
          activeStage: "ALL",
          selectedWarehouseId: "wh-1",
          stockFilter: "all",
          shortageReasonFilter: "all",
          shortageFollowUpFilter: "all",
          shortageOwnerFilter: "all",
          notPrintedFilter: "all",
          noShippingCodeFilter: "all",
          sortBy: "createdAt",
          sortOrder: "desc",
        } as any,
        deferredSearch: "",
        currentCompanyId: "comp-1",
        clearBulkControls: jest.fn(),
        t: (k) => k,
      })
    );

    expect(result.current.statusLabelMap).toEqual({ NEW: "New" });
    expect(result.current.preparationOrders).toHaveLength(1);
    expect(result.current.shortageOwnerOptions).toEqual(["owner-1"]);
    expect(result.current.productSuggestions).toEqual(["prod-1"]);
  });
});
