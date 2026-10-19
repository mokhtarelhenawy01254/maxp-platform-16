import { renderHook } from "@testing-library/react";
import { usePreparationFilterDerived } from "./usePreparationFilterDerived";
import type { PreparationOrder } from "./types";

describe("usePreparationFilterDerived", () => {
  const clearBulkControls = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleOrders: PreparationOrder[] = [
    {
      orderNumber: "ORD-1",
      shortageHoldDetails: { owner: "Ahmed" },
      itemInsights: [
        { displayName: "T-Shirt", color: "Red", size: "L" },
        { displayName: "Jeans", color: "Blue", size: "32" },
      ],
    } as unknown as PreparationOrder,
    {
      orderNumber: "ORD-2",
      shortageHoldDetails: { owner: "Mohamed" },
      itemInsights: [
        { displayName: "T-Shirt", color: "Red", size: "L" }, // duplicate key
        { displayName: "Shoes", color: "Black", size: "42" },
      ],
    } as unknown as PreparationOrder,
  ];

  it("deduplicates and sorts shortage owners from both server and order drafts", () => {
    const { result } = renderHook(() =>
      usePreparationFilterDerived({
        serverShortageOwnerOptions: ["Sayed", "Ahmed"],
        preparationOrders: sampleOrders,
        shortageHoldDrafts: {
          "ORD-1": { owner: "Mahmoud" }, // overrides Ahmed
        },
        activeStage: "ALL",
        selectedWarehouseId: "wh_1",
        stockFilter: "ALL",
        shortageReasonFilter: "ALL",
        shortageFollowUpFilter: "ALL",
        shortageOwnerFilter: "",
        deferredSearch: "",
        notPrintedFilter: "ALL",
        noShippingCodeFilter: "ALL",
        sortBy: "date",
        sortOrder: "desc",
        currentCompanyId: "comp_1",
        clearBulkControls,
      }),
    );

    expect(result.current.shortageOwnerOptions).toContain("Sayed");
    expect(result.current.shortageOwnerOptions).toContain("Ahmed");
    expect(result.current.shortageOwnerOptions).toContain("Mahmoud");
    expect(result.current.shortageOwnerOptions).toContain("Mohamed");
  });

  it("extracts unique product suggestions without duplicate keys", () => {
    const { result } = renderHook(() =>
      usePreparationFilterDerived({
        serverShortageOwnerOptions: [],
        preparationOrders: sampleOrders,
        shortageHoldDrafts: {},
        activeStage: "ALL",
        selectedWarehouseId: "wh_1",
        stockFilter: "ALL",
        shortageReasonFilter: "ALL",
        shortageFollowUpFilter: "ALL",
        shortageOwnerFilter: "",
        deferredSearch: "",
        notPrintedFilter: "ALL",
        noShippingCodeFilter: "ALL",
        sortBy: "date",
        sortOrder: "desc",
        currentCompanyId: "comp_1",
        clearBulkControls,
      }),
    );

    expect(result.current.productSuggestions).toHaveLength(3);
    expect(result.current.productSuggestions).toEqual([
      { displayName: "T-Shirt", color: "Red", size: "L" },
      { displayName: "Jeans", color: "Blue", size: "32" },
      { displayName: "Shoes", color: "Black", size: "42" },
    ]);
  });

  it("triggers clearBulkControls when filter criteria change after initial mount", () => {
    let stage = "ALL";
    const { rerender } = renderHook(
      ({ activeStage }) =>
        usePreparationFilterDerived({
          serverShortageOwnerOptions: [],
          preparationOrders: sampleOrders,
          shortageHoldDrafts: {},
          activeStage,
          selectedWarehouseId: "wh_1",
          stockFilter: "ALL",
          shortageReasonFilter: "ALL",
          shortageFollowUpFilter: "ALL",
          shortageOwnerFilter: "",
          deferredSearch: "",
          notPrintedFilter: "ALL",
          noShippingCodeFilter: "ALL",
          sortBy: "date",
          sortOrder: "desc",
          currentCompanyId: "comp_1",
          clearBulkControls,
        }),
      { initialProps: { activeStage: stage } },
    );

    // Initial mount clears due to company change effect
    expect(clearBulkControls).toHaveBeenCalledTimes(1);

    // Change stage filter
    stage = "SHORTAGE";
    rerender({ activeStage: stage });
    expect(clearBulkControls).toHaveBeenCalledTimes(2);
  });
});
