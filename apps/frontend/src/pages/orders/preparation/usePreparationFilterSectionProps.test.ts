import { renderHook } from "@testing-library/react";
import { usePreparationFilterSectionProps } from "./usePreparationFilterSectionProps";

describe("usePreparationFilterSectionProps", () => {
  it("structures alert banners props and filters container props correctly", () => {
    const { result } = renderHook(() =>
      usePreparationFilterSectionProps({
        preparationSettingsEnabled: true,
        allOverdueShortageFollowUpCount: 3,
        allOverdueProblemFollowUpCount: 2,
        showFilters: true,
        uiState: { activeStage: "PENDING" },
        uiActions: { setFilter: jest.fn() },
        statusCounts: { PENDING: 5 },
        stageCounts: { PENDING: 5 },
        filterTabs: [{ key: "PENDING", label: "Pending" }],
        visibleOrdersCount: 5,
        warehouseOptions: [{ id: "wh1", name: "Main" }],
        shortageOwnerOptions: ["owner1"],
        productSuggestions: ["prod1"],
      }),
    );

    expect(result.current.alertBannersProps.preparationSettingsEnabled).toBe(true);
    expect(result.current.alertBannersProps.allOverdueShortageFollowUpCount).toBe(3);
    expect(result.current.alertBannersProps.allOverdueProblemFollowUpCount).toBe(2);

    expect(result.current.filtersContainerProps.showFilters).toBe(true);
    expect(result.current.filtersContainerProps.visibleOrdersCount).toBe(5);
    expect(result.current.filtersContainerProps.warehouseOptions).toEqual([
      { id: "wh1", name: "Main" },
    ]);
  });
});
