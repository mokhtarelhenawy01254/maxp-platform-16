import { renderHook, act } from "@testing-library/react";
import { usePreparationOrderSelection } from "./usePreparationOrderSelection";

describe("usePreparationOrderSelection", () => {
  const mockUiActions = {
    toggleOrderSelection: jest.fn(),
    clearVisibleSelection: jest.fn(),
    selectVisibleOrders: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calculates selectedSet and allVisibleSelected correctly", () => {
    const enrichedOrders = [
      { orderNumber: "ORD-001" },
      { orderNumber: "ORD-002" },
    ];

    const { result, rerender } = renderHook(
      (props) => usePreparationOrderSelection(props),
      {
        initialProps: {
          selectedOrders: ["ORD-001"],
          enrichedOrders,
          uiActions: mockUiActions,
        },
      },
    );

    expect(result.current.selectedSet.has("ORD-001")).toBe(true);
    expect(result.current.selectedSet.has("ORD-002")).toBe(false);
    expect(result.current.allVisibleSelected).toBe(false);

    // Now select all
    rerender({
      selectedOrders: ["ORD-001", "ORD-002"],
      enrichedOrders,
      uiActions: mockUiActions,
    });

    expect(result.current.allVisibleSelected).toBe(true);
  });

  it("returns false for allVisibleSelected when enrichedOrders is empty", () => {
    const { result } = renderHook(() =>
      usePreparationOrderSelection({
        selectedOrders: ["ORD-001"],
        enrichedOrders: [],
        uiActions: mockUiActions,
      }),
    );

    expect(result.current.allVisibleSelected).toBe(false);
  });

  it("calls uiActions.toggleOrderSelection when toggleOrderSelection is called", () => {
    const { result } = renderHook(() =>
      usePreparationOrderSelection({
        selectedOrders: [],
        enrichedOrders: [{ orderNumber: "ORD-001" }],
        uiActions: mockUiActions,
      }),
    );

    act(() => {
      result.current.toggleOrderSelection("ORD-001");
    });

    expect(mockUiActions.toggleOrderSelection).toHaveBeenCalledWith("ORD-001");
  });

  it("selects all visible orders when toggleSelectAllVisible is called and not all are selected", () => {
    const enrichedOrders = [
      { orderNumber: "ORD-001" },
      { orderNumber: "ORD-002" },
    ];

    const { result } = renderHook(() =>
      usePreparationOrderSelection({
        selectedOrders: ["ORD-001"],
        enrichedOrders,
        uiActions: mockUiActions,
      }),
    );

    act(() => {
      result.current.toggleSelectAllVisible();
    });

    expect(mockUiActions.selectVisibleOrders).toHaveBeenCalledWith([
      "ORD-001",
      "ORD-002",
    ]);
  });

  it("clears visible selection when toggleSelectAllVisible is called and all are selected", () => {
    const enrichedOrders = [
      { orderNumber: "ORD-001" },
      { orderNumber: "ORD-002" },
    ];

    const { result } = renderHook(() =>
      usePreparationOrderSelection({
        selectedOrders: ["ORD-001", "ORD-002"],
        enrichedOrders,
        uiActions: mockUiActions,
      }),
    );

    act(() => {
      result.current.toggleSelectAllVisible();
    });

    expect(mockUiActions.clearVisibleSelection).toHaveBeenCalledWith([
      "ORD-001",
      "ORD-002",
    ]);
  });
});
