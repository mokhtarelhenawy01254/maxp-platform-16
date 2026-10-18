import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { OrderDetailsHeaderWrapper } from "./OrderDetailsHeaderWrapper";
import type { OrderDetailsType } from "../types";

jest.mock("./OrderHeader", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="mock-order-header">
      <button onClick={props.onEdit}>Edit Order</button>
      <button onClick={props.onCancel}>Cancel Edit</button>
      <button onClick={props.onCancelRequest}>Request Cancellation</button>
    </div>
  ),
}));

describe("OrderDetailsHeaderWrapper", () => {
  const mockOrder = {
    id: 1,
    orderNumber: "ORD-1",
    status: "PROCESSING",
    items: [{ id: 1, name: "Item 1", price: 100 }],
    shipping: 50,
    tax: 10,
    discount: 5,
    discountReason: "Coupon",
  } as unknown as OrderDetailsType;

  const defaultProps = {
    order: mockOrder,
    canEditOrderDetails: true,
    isEditing: false,
    setIsEditing: jest.fn(),
    updating: false,
    editForm: { items: [], shipping: 0, tax: 0, discount: 0, discountReason: "" },
    setEditForm: jest.fn(),
    saveChanges: jest.fn(),
    handlePrintInvoice: jest.fn(),
    handlePrintPreparationSlip: jest.fn(),
    setShowTicketModal: jest.fn(),
    isMerchant: false,
    canUpdateOrderStatus: true,
    currentStatusConfig: { code: "PROCESSING", name: "Processing", color: "#blue" },
    filteredStatusOptions: [],
    handleQuickStatusSelect: jest.fn(),
    whatsappChatUrl: null,
    canUpdatePaymentStatus: true,
    setShowPaymentModal: jest.fn(),
    setShowPostponeModal: jest.fn(),
    setShowPartialDeliveryModal: jest.fn(),
    showLateCancellationButton: false,
    updateStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders OrderHeader and triggers onEdit", () => {
    render(
      <BrowserRouter>
        <OrderDetailsHeaderWrapper {...defaultProps} />
      </BrowserRouter>,
    );

    expect(screen.getByTestId("mock-order-header")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Edit Order"));
    expect(defaultProps.setIsEditing).toHaveBeenCalledWith(true);
  });

  it("resets editForm and exits editing on onCancel", () => {
    render(
      <BrowserRouter>
        <OrderDetailsHeaderWrapper {...defaultProps} isEditing={true} />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByText("Cancel Edit"));
    expect(defaultProps.setIsEditing).toHaveBeenCalledWith(false);
    expect(defaultProps.setEditForm).toHaveBeenCalledWith(
      expect.objectContaining({
        shipping: 50,
        tax: 10,
        discount: 5,
        discountReason: "Coupon",
      }),
    );
  });

  it("triggers cancellation when confirmed", () => {
    window.confirm = jest.fn(() => true);

    render(
      <BrowserRouter>
        <OrderDetailsHeaderWrapper {...defaultProps} />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByText("Request Cancellation"));
    expect(defaultProps.updateStatus).toHaveBeenCalledWith(
      "PENDING_CANCELLATION",
      expect.any(String),
      false,
    );
  });
});
