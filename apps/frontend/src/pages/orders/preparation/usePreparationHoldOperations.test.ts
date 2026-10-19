import { renderHook } from "@testing-library/react";
import { usePreparationHoldOperations } from "./usePreparationHoldOperations";

jest.mock("./usePreparationShortageOperations", () => ({
  usePreparationShortageOperations: jest.fn(() => ({
    shortageHoldDrafts: {},
    setShortageHoldDrafts: jest.fn(),
    shortageSavingOrderId: null,
    handleShortageFieldChange: jest.fn(),
    saveShortageHoldDetails: jest.fn(),
    handleMarkAsShortageHold: jest.fn(),
    handleReleaseShortageHold: jest.fn(),
    handleMarkAsShortageFailed: jest.fn(),
  })),
}));

jest.mock("./usePreparationProblemOperations", () => ({
  usePreparationProblemOperations: jest.fn(() => ({
    problemHoldDrafts: {},
    setProblemHoldDrafts: jest.fn(),
    problemHoldSavingOrderId: null,
    setProblemHoldSavingOrderId: jest.fn(),
    editReasonOrder: null,
    setEditReasonOrder: jest.fn(),
    editReasonOrderOrder: null,
    saveProblemHoldDetails: jest.fn(),
    handleHoldAsProblem: jest.fn(),
    handleEditProblemReason: jest.fn(),
    handleConfirmEditReason: jest.fn(),
    handleReleaseProblemHold: jest.fn(),
  })),
}));

describe("usePreparationHoldOperations", () => {
  it("orchestrates shortage and problem hold operations cleanly", () => {
    const { result } = renderHook(() =>
      usePreparationHoldOperations({
        orders: [],
        user: { role: "ADMIN" },
        startingStatus: "CONFIRMED",
        updateLocalMetadata: jest.fn(),
        updateLocalStatuses: jest.fn(),
        getOrderByNumber: jest.fn(),
        fetchAll: jest.fn(),
        handleSingleStatusUpdate: jest.fn(),
        setStatusChangeDialog: jest.fn(),
        getApiErrorMessage: (_: any, f: string) => f,
        t: (k: string) => k,
      }),
    );

    expect(result.current.shortageHoldDrafts).toBeDefined();
    expect(result.current.problemHoldDrafts).toBeDefined();
    expect(typeof result.current.handleMarkAsShortageHold).toBe("function");
    expect(typeof result.current.handleHoldAsProblem).toBe("function");
    expect(typeof result.current.handleConfirmEditReason).toBe("function");
  });
});
