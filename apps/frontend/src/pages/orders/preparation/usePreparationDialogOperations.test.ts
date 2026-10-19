import { renderHook, act } from "@testing-library/react";
import { usePreparationDialogOperations } from "./usePreparationDialogOperations";

describe("usePreparationDialogOperations", () => {
  it("bundles dialog state, callbacks, and flags into structured props", () => {
    const setStatusChangeDialog = jest.fn();
    const handleConfirmStatusChange = jest.fn();
    const setBulkHoldDialog = jest.fn();
    const executeBulkUpdateSelected = jest.fn();
    const executeBulkUpdateAll = jest.fn();
    const setEditReasonOrder = jest.fn();
    const handleConfirmEditReason = jest.fn();
    const setShowDispatchModal = jest.fn();
    const handleDispatchToCarrier = jest.fn();
    const setShowInternalCourierModal = jest.fn();
    const onInternalCourierSuccess = jest.fn();

    const statusLabelMap = new Map([["READY", "Ready"]]);

    const { result } = renderHook(() =>
      usePreparationDialogOperations({
        statusChangeDialog: { targetStatus: "READY", isHold: false },
        setStatusChangeDialog,
        dialogOrder: { orderNumber: "ORD-123" },
        statusLabelMap,
        dialogHoldReason: "Hold notes",
        rowUpdatingId: null,
        problemHoldSavingOrderId: null,
        handleConfirmStatusChange,

        bulkHoldDialog: null,
        setBulkHoldDialog,
        bulkUpdating: false,
        executeBulkUpdateSelected,
        executeBulkUpdateAll,

        editReasonOrder: null,
        setEditReasonOrder,
        editReasonOrderOrder: null,
        handleConfirmEditReason,

        showDispatchModal: true,
        setShowDispatchModal,
        selectedOrdersCount: 5,
        activeCarriers: [{ id: "turbo" }],
        handleDispatchToCarrier,
        sendingToTurbo: false,

        showInternalCourierModal: false,
        setShowInternalCourierModal,
        internalCourierOrderIds: ["ORD-123"],
        onInternalCourierSuccess,
      }),
    );

    expect(result.current.statusChangeDialog?.targetStatus).toBe("READY");
    expect(result.current.selectedOrdersCount).toBe(5);
    expect(result.current.showDispatchModal).toBe(true);
    expect(result.current.statusLabelMap.get("READY")).toBe("Ready");
    expect(result.current.internalCourierOrderIds).toEqual(["ORD-123"]);

    result.current.handleConfirmStatusChange({ action: "CONFIRM" });
    expect(handleConfirmStatusChange).toHaveBeenCalledWith({ action: "CONFIRM" });
  });

  it("correctly delegates bulk operations, edit reason, and carrier dispatch actions", () => {
    const executeBulkUpdateSelected = jest.fn();
    const executeBulkUpdateAll = jest.fn();
    const handleConfirmEditReason = jest.fn();
    const handleDispatchToCarrier = jest.fn();
    const onInternalCourierSuccess = jest.fn();

    const { result } = renderHook(() =>
      usePreparationDialogOperations({
        statusChangeDialog: null,
        setStatusChangeDialog: jest.fn(),
        dialogOrder: null,
        statusLabelMap: new Map(),
        dialogHoldReason: "",
        rowUpdatingId: null,
        problemHoldSavingOrderId: null,
        handleConfirmStatusChange: jest.fn(),

        bulkHoldDialog: { count: 3, mode: "selected", validOrders: [{ id: "1" }] },
        setBulkHoldDialog: jest.fn(),
        bulkUpdating: true,
        executeBulkUpdateSelected,
        executeBulkUpdateAll,

        editReasonOrder: { reason: "Delayed item" },
        setEditReasonOrder: jest.fn(),
        editReasonOrderOrder: { orderNumber: "ORD-55" },
        handleConfirmEditReason,

        showDispatchModal: false,
        setShowDispatchModal: jest.fn(),
        selectedOrdersCount: 0,
        activeCarriers: [],
        handleDispatchToCarrier,
        sendingToTurbo: true,

        showInternalCourierModal: true,
        setShowInternalCourierModal: jest.fn(),
        internalCourierOrderIds: ["ORD-55"],
        onInternalCourierSuccess,
      }),
    );

    act(() => {
      result.current.executeBulkUpdateSelected([{ id: "1" }], "Need check");
      result.current.executeBulkUpdateAll("Global hold");
      result.current.handleConfirmEditReason("Updated reason");
      result.current.handleDispatchToCarrier({ id: "qp_express" });
      result.current.onInternalCourierSuccess("run-10", "RUN-001");
    });

    expect(executeBulkUpdateSelected).toHaveBeenCalledWith([{ id: "1" }], "Need check");
    expect(executeBulkUpdateAll).toHaveBeenCalledWith("Global hold");
    expect(handleConfirmEditReason).toHaveBeenCalledWith("Updated reason");
    expect(handleDispatchToCarrier).toHaveBeenCalledWith({ id: "qp_express" });
    expect(onInternalCourierSuccess).toHaveBeenCalledWith("run-10", "RUN-001");
    expect(result.current.bulkUpdating).toBe(true);
    expect(result.current.sendingToTurbo).toBe(true);
  });
});
