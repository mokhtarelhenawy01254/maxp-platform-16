import { renderHook } from "@testing-library/react";
import { usePreparationStatusOperations } from "./usePreparationStatusOperations";

// Mock child hooks
jest.mock("./usePreparationSingleStatusOperations", () => ({
  usePreparationSingleStatusOperations: jest.fn(() => ({
    rowUpdatingId: null,
    performStatusUpdate: jest.fn(),
    handleSingleStatusUpdate: jest.fn(),
    handleRequestStatusChange: jest.fn(),
    handleConfirmStatusChange: jest.fn(),
  })),
}));

jest.mock("./usePreparationBulkStatusOperations", () => ({
  usePreparationBulkStatusOperations: jest.fn(() => ({
    bulkUpdating: false,
    setBulkUpdating: jest.fn(),
    bulkHoldDialog: null,
    setBulkHoldDialog: jest.fn(),
    executeBulkUpdateSelected: jest.fn(),
    handleBulkUpdate: jest.fn(),
    executeBulkUpdateAll: jest.fn(),
    handleBulkUpdateAll: jest.fn(),
  })),
}));

describe("usePreparationStatusOperations", () => {
  it("combines single and bulk status operations cleanly", () => {
    const { result } = renderHook(() =>
      usePreparationStatusOperations({
        getOrderByNumber: jest.fn(),
        validateTransition: jest.fn(),
        problemHoldDrafts: {},
        setProblemHoldDrafts: jest.fn(),
        setProblemHoldSavingOrderId: jest.fn(),
        updateLocalMetadata: jest.fn(),
        updateLocalStatuses: jest.fn(),
        statusLabelMap: {},
        preparationSettings: {} as any,
        user: {},
        fetchAll: jest.fn(),
        statusChangeDialog: null,
        setStatusChangeDialog: jest.fn(),
        getApiErrorMessage: jest.fn(),
        t: (k) => k,
        bulkStatus: "PREPARING",
        selectedOrders: [],
        enrichedOrders: [],
        clearBulkControls: jest.fn(),
        paginationTotal: 0,
        getFiltersPayload: jest.fn(),
      })
    );

    expect(result.current.rowUpdatingId).toBeNull();
    expect(result.current.bulkUpdating).toBe(false);
    expect(typeof result.current.handleSingleStatusUpdate).toBe("function");
    expect(typeof result.current.handleBulkUpdate).toBe("function");
  });
});
