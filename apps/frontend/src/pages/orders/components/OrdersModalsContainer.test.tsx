import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../../components/common/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

// Mock lazy child modals
jest.mock("../../../components/orders/EnhancedOrderModal", () => ({
  __esModule: true,
  default: ({ isOpen, order }: { isOpen: boolean; order: any }) =>
    isOpen ? <div data-testid="enhanced-order-modal">OrderModal: {order.orderNumber}</div> : null,
}));

jest.mock("../../../components/orders/InvoiceModal", () => ({
  __esModule: true,
  default: ({ invoice }: { invoice: any }) =>
    invoice ? <div data-testid="invoice-modal">InvoiceModal: {invoice.id}</div> : null,
}));

import { OrdersModalsContainer } from "./OrdersModalsContainer";

describe("OrdersModalsContainer", () => {
  const defaultProps = {
    selectedOrder: null,
    setSelectedOrder: jest.fn(),
    showOrderModal: false,
    setShowOrderModal: jest.fn(),
    isMerchant: false,
    orderStatuses: [],
    onOrderUpdate: jest.fn(),
    selectedInvoice: null,
    setSelectedInvoice: jest.fn(),
  };

  it("renders EnhancedOrderModal when selectedOrder is set and showOrderModal is true", async () => {
    render(
      <OrdersModalsContainer
        {...defaultProps}
        selectedOrder={{ orderNumber: "ORD-99182" } as any}
        showOrderModal={true}
      />
    );

    expect(await screen.findByTestId("enhanced-order-modal")).toBeInTheDocument();
    expect(screen.getByText("OrderModal: ORD-99182")).toBeInTheDocument();
  });

  it("renders InvoiceModal when selectedInvoice is set", async () => {
    render(
      <OrdersModalsContainer
        {...defaultProps}
        selectedInvoice={{ id: "INV-102" }}
      />
    );

    expect(await screen.findByTestId("invoice-modal")).toBeInTheDocument();
    expect(screen.getByText("InvoiceModal: INV-102")).toBeInTheDocument();
  });
});
