import React from "react";
import { render, screen } from "@testing-library/react";
import { OrderDetailsModalsHost } from "./OrderDetailsModalsHost";
import type { OrderDetailsType } from "../types";

jest.mock("./OrderActionModalsContainer", () => ({
  OrderActionModalsContainer: (props: any) => (
    <div data-testid="mock-action-modals-container">
      {props.showStatusModal && <div>Status Modal Open</div>}
      {props.showPaymentModal && <div>Payment Modal Open</div>}
      {props.showPostponeModal && <div>Postpone Modal Open</div>}
    </div>
  ),
}));

jest.mock("./OrderShipmentModals", () => ({
  OrderShipmentModals: (props: any) => (
    <div data-testid="mock-shipment-modals">
      {props.showCancelShipmentModal && <div>Cancel Shipment Modal Open</div>}
    </div>
  ),
}));

describe("OrderDetailsModalsHost", () => {
  const mockOrder = {
    id: 123,
    orderNumber: "ORD-123",
    status: "PROCESSING",
    items: [],
  } as unknown as OrderDetailsType;

  const defaultProps = {
    order: mockOrder,
    canEditOrderDetails: true,
    canUpdateOrderStatus: true,
    canUpdatePaymentStatus: true,
    showAddProductModal: false,
    setShowAddProductModal: jest.fn(),
    handleProductSelect: jest.fn(),
    statusOperations: {
      showStatusModal: false,
      setShowStatusModal: jest.fn(),
      newStatus: "PROCESSING",
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
      cancellationReasonOptions: [],
      cancellationReasonOptionsLoading: false,
      isModalCancellationStatus: false,
      isModalReturnStatus: false,
      updating: false,
      onUpdateStatus: jest.fn(),
    },
    paymentOperations: {
      newPaymentStatus: "PAID",
      setNewPaymentStatus: jest.fn(),
      paymentNotes: "",
      setPaymentNotes: jest.fn(),
      onUpdatePaymentStatus: jest.fn(),
    },
    fulfillmentActions: {
      showPostponeModal: false,
      setShowPostponeModal: jest.fn(),
      handlePostponeOrder: jest.fn(),
      postponing: false,
      showPartialDeliveryModal: false,
      setShowPartialDeliveryModal: jest.fn(),
      handlePartialDelivery: jest.fn(),
      partialDeliveryLoading: false,
    },
    shippingActions: {
      showCancelShipmentModal: false,
      setShowCancelShipmentModal: jest.fn(),
      showUnlinkShipmentModal: false,
      setShowUnlinkShipmentModal: jest.fn(),
      showRecreateShipmentModal: false,
      setShowRecreateShipmentModal: jest.fn(),
      handleRecreateShipment: jest.fn(),
    },
    filteredStatusOptions: [],
    workflowStatusDefs: [],
    hasWorkflowRestrictions: false,
    paymentStatuses: [],
    showPaymentModal: false,
    setShowPaymentModal: jest.fn(),
    showTicketModal: false,
    setShowTicketModal: jest.fn(),
    fetchOrderDetails: jest.fn(),
    cancelShipment: jest.fn(),
    unlinkShipment: jest.fn(),
    turboLoading: false,
  };

  it("renders both action and shipment modal hosts without throwing", () => {
    render(<OrderDetailsModalsHost {...defaultProps} />);

    expect(screen.getByTestId("mock-action-modals-container")).toBeInTheDocument();
    expect(screen.getByTestId("mock-shipment-modals")).toBeInTheDocument();
  });

  it("forwards modal visibility flags to child containers", () => {
    const props = {
      ...defaultProps,
      showPaymentModal: true,
      statusOperations: {
        ...defaultProps.statusOperations,
        showStatusModal: true,
      },
      shippingActions: {
        ...defaultProps.shippingActions,
        showCancelShipmentModal: true,
      },
    };

    render(<OrderDetailsModalsHost {...props} />);

    expect(screen.getByText("Status Modal Open")).toBeInTheDocument();
    expect(screen.getByText("Payment Modal Open")).toBeInTheDocument();
    expect(screen.getByText("Cancel Shipment Modal Open")).toBeInTheDocument();
  });
});
