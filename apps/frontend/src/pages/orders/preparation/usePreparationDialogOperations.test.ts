import { renderHook } from "@testing-library/react";
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
});
