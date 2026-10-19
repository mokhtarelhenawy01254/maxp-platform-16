import { renderHook } from "@testing-library/react";
import { usePreparationFulfillmentOperations } from "./usePreparationFulfillmentOperations";

// Mock the child hooks
jest.mock("./usePreparationSlipPrint", () => ({
  usePreparationSlipPrint: jest.fn(() => ({
    printingOrderNumber: null,
    handlePrintPreparationSlip: jest.fn(),
  })),
}));

jest.mock("./usePreparationQuickTransfer", () => ({
  usePreparationQuickTransfer: jest.fn(() => ({
    transferingItemKey: null,
    handleQuickTransfer: jest.fn(),
  })),
}));

jest.mock("./usePreparationCarrierDispatch", () => ({
  usePreparationCarrierDispatch: jest.fn(() => ({
    activeCarriers: [{ id: "turbo", name: "Turbo", isDefault: true }],
    showDispatchModal: false,
    setShowDispatchModal: jest.fn(),
    sendingToTurbo: false,
    handleOpenDispatchModal: jest.fn(),
    handleDispatchToCarrier: jest.fn(),
  })),
}));

jest.mock("./usePreparationInvoicePrinting", () => ({
  usePreparationInvoicePrinting: jest.fn(() => ({
    printingInvoices: false,
    handlePrintInvoices: jest.fn(),
  })),
}));

describe("usePreparationFulfillmentOperations", () => {
  it("orchestrates slip printing, transfer, dispatch, and invoices correctly", () => {
    const { result } = renderHook(() =>
      usePreparationFulfillmentOperations({
        orders: [],
        user: { id: "u-1" },
        invoiceSettings: {},
        selectedWarehouseId: "wh-1",
        inventorySummaryByProduct: new Map(),
        fetchInventory: jest.fn(),
        selectedOrders: ["ord-1"],
        activeStage: "READY",
        getOrderByNumber: jest.fn(),
        fetchAll: jest.fn(),
        clearBulkControls: jest.fn(),
        navigate: jest.fn(),
        getApiErrorMessage: jest.fn(),
        t: (k) => k,
      })
    );

    expect(result.current.printingOrderNumber).toBeNull();
    expect(typeof result.current.handlePrintPreparationSlip).toBe("function");
    expect(result.current.activeCarriers).toHaveLength(1);
    expect(result.current.showDispatchModal).toBe(false);
    expect(result.current.sendingToTurbo).toBe(false);
    expect(result.current.printingInvoices).toBe(false);
  });
});
