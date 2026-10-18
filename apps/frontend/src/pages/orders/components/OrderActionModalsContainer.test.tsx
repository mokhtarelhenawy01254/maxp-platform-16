import React from "react";
import { render, screen } from "@testing-library/react";
import { OrderActionModalsContainer } from "./OrderActionModalsContainer";
import type { OrderDetailsType } from "../types";

jest.mock("./SimplifiedProductSelectionModal", () => ({
  __esModule: true,
  default: ({ isOpen }: any) => (isOpen ? <div data-testid="product-modal">Product Modal</div> : null),
}));

jest.mock("./OrderStatusUpdateModal", () => ({
  __esModule: true,
  default: ({ isOpen }: any) => (isOpen ? <div data-testid="status-modal">Status Modal</div> : null),
}));

jest.mock("./OrderPaymentStatusModal", () => ({
  __esModule: true,
  default: ({ isOpen }: any) => (isOpen ? <div data-testid="payment-modal">Payment Modal</div> : null),
}));

jest.mock("./PostponeOrderModal", () => ({
  __esModule: true,
  default: ({ isOpen }: any) => (isOpen ? <div data-testid="postpone-modal">Postpone Modal</div> : null),
}));

jest.mock("./PartialDeliveryModal", () => ({
  __esModule: true,
  default: ({ isOpen }: any) => (isOpen ? <div data-testid="partial-modal">Partial Modal</div> : null),
}));

jest.mock("../shipments/CreateTicketModal", () => ({
  CreateTicketModal: ({ isOpen }: any) => (isOpen ? <div data-testid="ticket-modal">Ticket Modal</div> : null),
}));

describe("OrderActionModalsContainer", () => {
  const mockOrder = {
    id: "ord-1",
    orderNumber: "ORD-1234",
    status: "PENDING",
  } as unknown as OrderDetailsType;

  const defaultProps = {
    order: mockOrder,
    canEditOrderDetails: true,
    canUpdateOrderStatus: true,
    canUpdatePaymentStatus: true,
    showAddProductModal: false,
    setShowAddProductModal: jest.fn(),
    handleProductSelect: jest.fn(),
    showStatusModal: false,
    setShowStatusModal: jest.fn(),
    newStatus: "",
    setNewStatus: jest.fn(),
    statusNotes: "",
    setStatusNotes: jest.fn(),
    isOverride: false,
    setIsOverride: jest.fn(),
    cancellationAdditionalNotes: "",
    setCancellationAdditionalNotes: jest.fn(),
    returnReason: "",
    setReturnReason: jest.fn(),
    returnAdditionalNotes: "",
    setReturnAdditionalNotes: jest.fn(),
    filteredStatusOptions: [],
    workflowStatusDefs: [],
    hasWorkflowRestrictions: false,
    isModalCancellationStatus: false,
    isModalReturnStatus: false,
    cancellationReasonOptions: [],
    cancellationReasonOptionsLoading: false,
    commonReturnReasons: [],
    updating: false,
    onUpdateStatus: jest.fn(),
    showPaymentModal: false,
    setShowPaymentModal: jest.fn(),
    newPaymentStatus: "",
    setNewPaymentStatus: jest.fn(),
    paymentNotes: "",
    setPaymentNotes: jest.fn(),
    paymentStatuses: [],
    onUpdatePaymentStatus: jest.fn(),
    showPostponeModal: false,
    setShowPostponeModal: jest.fn(),
    handlePostponeOrder: jest.fn(),
    postponing: false,
    showPartialDeliveryModal: false,
    setShowPartialDeliveryModal: jest.fn(),
    handlePartialDelivery: jest.fn(),
    partialDeliveryLoading: false,
    showTicketModal: false,
    setShowTicketModal: jest.fn(),
    fetchOrderDetails: jest.fn(),
  };

  it("renders closed state when all modal flags are false", () => {
    render(<OrderActionModalsContainer {...defaultProps} />);

    expect(screen.queryByTestId("product-modal")).toBeNull();
    expect(screen.queryByTestId("status-modal")).toBeNull();
    expect(screen.queryByTestId("payment-modal")).toBeNull();
    expect(screen.queryByTestId("postpone-modal")).toBeNull();
    expect(screen.queryByTestId("partial-modal")).toBeNull();
    expect(screen.queryByTestId("ticket-modal")).toBeNull();
  });

  it("renders status modal when showStatusModal is true", () => {
    render(<OrderActionModalsContainer {...defaultProps} showStatusModal={true} />);

    expect(screen.getByTestId("status-modal")).toBeInTheDocument();
  });

  it("renders ticket modal when showTicketModal is true", () => {
    render(<OrderActionModalsContainer {...defaultProps} showTicketModal={true} />);

    expect(screen.getByTestId("ticket-modal")).toBeInTheDocument();
  });
});
