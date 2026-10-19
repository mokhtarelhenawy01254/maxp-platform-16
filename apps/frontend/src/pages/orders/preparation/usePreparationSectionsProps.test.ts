import { renderHook } from "@testing-library/react";
import { usePreparationSectionsProps } from "./usePreparationSectionsProps";

// Mock child hooks
jest.mock("./usePreparationFilterSectionProps", () => ({
  usePreparationFilterSectionProps: jest.fn(() => ({
    alertBannersProps: { mockAlert: true },
    filtersContainerProps: { mockFilters: true },
  })),
}));

jest.mock("./usePreparationTableSectionProps", () => ({
  usePreparationTableSectionProps: jest.fn(() => ({
    selectionBarProps: { mockBar: true },
    ordersContainerProps: { mockContainer: true },
  })),
}));

jest.mock("./usePreparationDialogOperations", () => ({
  usePreparationDialogOperations: jest.fn(() => ({
    mockDialogs: true,
  })),
}));

describe("usePreparationSectionsProps", () => {
  it("orchestrates filter, table, and dialogs props correctly", () => {
    const { result } = renderHook(() =>
      usePreparationSectionsProps({
        preparationSettings: {} as any,
        uiState: { selectedOrders: ["101"], bulkStatus: "NEW" } as any,
        uiActions: {} as any,
        preferences: {
          showFilters: true,
          setShowFilters: jest.fn(),
          columnSettingsOpen: false,
          setColumnSettingsOpen: jest.fn(),
          visibleColumns: [],
          toggleColumn: jest.fn(),
          visibleFilterSections: [],
          toggleFilterSection: jest.fn(),
        } as any,
        formatPrice: (p: any) => String(p),
        formatDate: (d: any) => String(d),
        allOverdueShortageFollowUpCount: 0,
        allOverdueProblemFollowUpCount: 0,
        statusCounts: {},
        stageCounts: {},
        filterTabs: [],
        visibleOrdersCount: 1,
        warehouseOptions: [],
        shortageOwnerOptions: [],
        productSuggestions: [],
        allVisibleSelected: false,
        toggleSelectAllVisible: jest.fn(),
        inventoryLoading: false,
        loading: false,
        statusOptions: [],
        statusLabelMap: {},
        isInternalCourierActive: false,
        setShowInternalCourierModal: jest.fn(),
        showInternalCourierModal: false,
        enrichedOrders: [],
        pagination: { total: 1, pages: 1 },
        totalPages: 1,
        currentPageCount: 1,
        statusSelections: {},
        selectedSet: new Set(),
        selectedWarehouseId: "wh-1",
        enabledQcChecks: [],
        qcChecklistState: {},
        toggleOrderSelection: jest.fn(),
        handleQcCheckToggle: jest.fn(),
        statusChangeDialog: null,
        setStatusChangeDialog: jest.fn(),
        dialogOrder: null,
        dialogHoldReason: "",
        internalCourierOrderIds: [],
        onInternalCourierSuccess: jest.fn(),
        statusOps: {} as any,
        holdOps: {} as any,
        fulfillmentOps: {} as any,
      })
    );

    expect(result.current.alertBannersProps).toEqual({ mockAlert: true });
    expect(result.current.filtersContainerProps).toEqual({ mockFilters: true });
    expect(result.current.selectionBarProps).toEqual({ mockBar: true });
    expect(result.current.ordersContainerProps).toEqual({ mockContainer: true });
    expect(result.current.dialogsProps).toEqual({ mockDialogs: true });
  });
});
