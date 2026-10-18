import React from "react";
import { render, screen } from "@testing-library/react";
import { PreparationQueueDialogsContainer } from "./PreparationQueueDialogsContainer";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

// Mock child dialogs
jest.mock("./PreparationStatusChangeDialog", () => ({
  PreparationStatusChangeDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="status-dialog">StatusDialog</div> : null,
}));

jest.mock("./ProblemHoldReasonDialog", () => ({
  ProblemHoldReasonDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="problem-dialog">ProblemDialog</div> : null,
}));

jest.mock("./DispatchCarrierModal", () => ({
  DispatchCarrierModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="dispatch-carrier-modal">DispatchCarrierModal</div> : null,
}));

jest.mock("./DispatchInternalCourierModal", () => ({
  DispatchInternalCourierModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="dispatch-courier-modal">DispatchCourierModal</div> : null,
}));

describe("PreparationQueueDialogsContainer", () => {
  const defaultProps = {
    statusChangeDialog: null,
    setStatusChangeDialog: jest.fn(),
    dialogOrder: null,
    statusLabelMap: new Map(),
    dialogHoldReason: "",
    rowUpdatingId: null,
    problemHoldSavingOrderId: null,
    handleConfirmStatusChange: jest.fn(),

    bulkHoldDialog: null,
    setBulkHoldDialog: jest.fn(),
    bulkUpdating: false,
    executeBulkUpdateSelected: jest.fn(),
    executeBulkUpdateAll: jest.fn(),

    editReasonOrder: null,
    setEditReasonOrder: jest.fn(),
    editReasonOrderOrder: null,
    handleConfirmEditReason: jest.fn(),

    showDispatchModal: false,
    setShowDispatchModal: jest.fn(),
    selectedOrdersCount: 0,
    activeCarriers: [],
    handleDispatchToCarrier: jest.fn(),
    sendingToTurbo: false,

    showInternalCourierModal: false,
    setShowInternalCourierModal: jest.fn(),
    internalCourierOrderIds: [],
    onInternalCourierSuccess: jest.fn(),
  };

  it("renders status change dialog when statusChangeDialog is present", () => {
    render(
      <PreparationQueueDialogsContainer
        {...defaultProps}
        statusChangeDialog={{ targetStatus: "READY" }}
      />
    );

    expect(screen.getByTestId("status-dialog")).toBeInTheDocument();
  });

  it("renders dispatch modal when showDispatchModal is true", () => {
    render(
      <PreparationQueueDialogsContainer
        {...defaultProps}
        showDispatchModal={true}
      />
    );

    expect(screen.getByTestId("dispatch-carrier-modal")).toBeInTheDocument();
  });

  it("renders internal courier modal when showInternalCourierModal is true", () => {
    render(
      <PreparationQueueDialogsContainer
        {...defaultProps}
        showInternalCourierModal={true}
      />
    );

    expect(screen.getByTestId("dispatch-courier-modal")).toBeInTheDocument();
  });
});
