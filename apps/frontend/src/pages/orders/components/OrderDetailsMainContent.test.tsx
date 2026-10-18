import React from "react";
import { render, screen } from "@testing-library/react";
import { OrderDetailsMainContent } from "./OrderDetailsMainContent";
import type { OrderDetailsType } from "../types";

jest.mock("./OrderDiscountApprovalBanner", () => ({
  __esModule: true,
  default: ({ onApprove }: any) => (
    <div data-testid="discount-banner">
      <button onClick={onApprove}>Approve Discount</button>
    </div>
  ),
}));

jest.mock("./OrderItemsCard", () => ({
  __esModule: true,
  default: ({ onAddItem }: any) => (
    <div data-testid="items-card">
      <button onClick={onAddItem}>Add Item</button>
    </div>
  ),
}));

jest.mock("../../../components/orders/OrderPartnerOperationsCard", () => ({
  __esModule: true,
  default: () => <div data-testid="partner-card">Partner Card</div>,
}));

jest.mock("./UnifiedShippingCard", () => ({
  __esModule: true,
  default: ({ onOpenTicket }: any) => (
    <div data-testid="shipping-card">
      <button onClick={onOpenTicket}>Open Ticket</button>
    </div>
  ),
}));

const mockOrder: OrderDetailsType = {
  id: "ord-1",
  orderNumber: "ORD-999",
  status: "CONFIRMED",
  total: 1000,
  currency: "EGP",
  items: [],
  createdAt: "2026-10-18T10:00:00Z",
  updatedAt: "2026-10-18T10:00:00Z",
  customer: {
    id: "cust-1",
    name: "Mohamed Ali",
    phone: "01012345678",
  },
} as any;

describe("OrderDetailsMainContent", () => {
  const defaultProps = {
    order: mockOrder,
    canEditOrderDetails: true,
    isEditing: false,
    editForm: { items: [], discount: 0, discountReason: "", shipping: 0, tax: 0 },
    setEditForm: jest.fn(),
    calculatedTotals: { subtotal: 900, total: 1000 },
    updating: false,
    handleDiscountApproval: jest.fn(),
    handleItemChange: jest.fn(),
    handleRemoveItem: jest.fn(),
    setShowAddProductModal: jest.fn(),
    showPartnerOperationsCard: false,
    merchantOrderScope: null,
    fetchOrderDetails: jest.fn(),
    canManageTurboShipping: true,
    setShowTicketModal: jest.fn(),
  };

  it("renders discount banner, items card, and shipping card", () => {
    render(<OrderDetailsMainContent {...defaultProps} />);

    expect(screen.getByTestId("discount-banner")).toBeInTheDocument();
    expect(screen.getByTestId("items-card")).toBeInTheDocument();
    expect(screen.getByTestId("shipping-card")).toBeInTheDocument();
    expect(screen.queryByTestId("partner-card")).not.toBeInTheDocument();
  });

  it("renders partner operations card when showPartnerOperationsCard is true", () => {
    render(
      <OrderDetailsMainContent
        {...defaultProps}
        showPartnerOperationsCard={true}
      />,
    );

    expect(screen.getByTestId("partner-card")).toBeInTheDocument();
  });

  it("triggers actions correctly from child triggers", () => {
    render(<OrderDetailsMainContent {...defaultProps} />);

    screen.getByText("Approve Discount").click();
    expect(defaultProps.handleDiscountApproval).toHaveBeenCalledWith("APPROVE");

    screen.getByText("Add Item").click();
    expect(defaultProps.setShowAddProductModal).toHaveBeenCalledWith(true);

    screen.getByText("Open Ticket").click();
    expect(defaultProps.setShowTicketModal).toHaveBeenCalledWith(true);
  });
});
