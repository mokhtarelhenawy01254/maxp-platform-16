import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { OrderDetailsSidebar } from "./OrderDetailsSidebar";
import type { OrderDetailsType } from "../types";

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: "EGP",
    formatPrice: (amount: number | null | undefined) => `${amount ?? 0} EGP`,
  }),
}));

jest.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: any) => String(d).slice(0, 10),
    formatDateTime: (d: any) => String(d),
  }),
}));

jest.mock("./CustomerInfoCard", () => ({
  __esModule: true,
  default: () => <div data-testid="customer-info-card">Customer Info Card</div>,
}));

jest.mock("./CustomerOrderHistoryCard", () => ({
  __esModule: true,
  default: () => <div data-testid="customer-order-history-card">Customer Order History</div>,
}));

jest.mock("./OrderPaymentCard", () => ({
  __esModule: true,
  default: () => <div data-testid="order-payment-card">Order Payment Card</div>,
}));

jest.mock("./OrderSessionDetailsCard", () => ({
  __esModule: true,
  default: () => <div data-testid="order-session-details-card">Order Session Details</div>,
}));

jest.mock("./OrderSourceCard", () => ({
  __esModule: true,
  default: () => <div data-testid="order-source-card">Order Source Card</div>,
}));

jest.mock("./OrderAttributionCard", () => ({
  __esModule: true,
  default: () => <div data-testid="order-attribution-card">Order Attribution Card</div>,
}));

jest.mock("./OrderReturnCollectionFeeCard", () => ({
  __esModule: true,
  default: () => <div data-testid="order-return-fee-card">Return Fee Card</div>,
}));

jest.mock("./WalletPaymentProofCard", () => ({
  __esModule: true,
  default: () => <div data-testid="wallet-payment-proof-card">Wallet Payment Proof</div>,
}));

jest.mock("./OrderCancellationReturnBanner", () => ({
  __esModule: true,
  default: () => <div data-testid="cancellation-return-banner">Cancellation Return Banner</div>,
}));

jest.mock("./OrderConfirmationDistributionCard", () => ({
  __esModule: true,
  default: () => <div data-testid="confirmation-distribution-card">Confirmation Distribution</div>,
}));

jest.mock("./OrderActivityLog", () => ({
  __esModule: true,
  default: () => <div data-testid="order-activity-log">Order Activity Log</div>,
}));

jest.mock("./OrderScheduledDeliveryCard", () => ({
  __esModule: true,
  default: () => <div data-testid="order-scheduled-card">Scheduled Delivery Card</div>,
}));

const mockOrder: OrderDetailsType = {
  id: "ord-101",
  orderNumber: "ORD-101",
  customerName: "Ahmed Ali",
  customerEmail: "ahmed@example.com",
  customerPhone: "01001234567",
  status: "CONFIRMED",
  total: 600,
  subtotal: 550,
  shipping: 50,
  items: [],
  createdAt: "2026-10-18T10:00:00Z",
  currency: "EGP",
  isScheduled: true,
  scheduledDeliveryDate: "2026-10-25",
} as any;

describe("OrderDetailsSidebar Component", () => {
  const defaultProps = {
    order: mockOrder,
    canEditOrderDetails: true,
    isEditing: false,
    editForm: {},
    setEditForm: jest.fn(),
    governments: [],
    areas: [],
    loadingGovernments: false,
    loadingAreas: false,
    selectedGovernmentId: "",
    setSelectedGovernmentId: jest.fn(),
    handleGovernmentChange: jest.fn(),
    invoiceSettings: {},
    fetchOrderDetails: jest.fn().mockResolvedValue(undefined),
    setOrder: jest.fn(),
    canUpdatePaymentStatus: true,
    setShowPaymentModal: jest.fn(),
    showOrderSourceCard: true,
    showOrderAttributionCard: true,
    verifyWalletProof: jest.fn().mockResolvedValue(undefined),
    effectiveStatus: "CONFIRMED",
    latestCancellationReason: "",
    returnDetails: null,
    showConfirmationDistributionCard: true,
    formatOptionalDate: (val?: string | null) => val || "—",
    orderNotes: [],
    addNote: jest.fn().mockResolvedValue(true),
    updateNote: jest.fn().mockResolvedValue(true),
    deleteNote: jest.fn().mockResolvedValue(true),
    updatingNote: false,
    deletingNote: false,
    isMerchant: false,
    currentUserId: "user-1",
    statusNameMap: {},
    isCancellationStatus: () => false,
  };

  it("renders core sidebar cards (customer info, payment, history, session details, activity log)", () => {
    render(
      <BrowserRouter>
        <OrderDetailsSidebar {...defaultProps} />
      </BrowserRouter>,
    );

    expect(screen.getByTestId("customer-info-card")).toBeInTheDocument();
    expect(screen.getByTestId("customer-order-history-card")).toBeInTheDocument();
    expect(screen.getByTestId("order-payment-card")).toBeInTheDocument();
    expect(screen.getByTestId("order-session-details-card")).toBeInTheDocument();
    expect(screen.getByTestId("order-activity-log")).toBeInTheDocument();
    expect(screen.getByTestId("order-source-card")).toBeInTheDocument();
    expect(screen.getByTestId("order-attribution-card")).toBeInTheDocument();
    expect(screen.getByTestId("confirmation-distribution-card")).toBeInTheDocument();
    expect(screen.getByTestId("order-scheduled-card")).toBeInTheDocument();
  });

  it("hides source and attribution cards when flags are false", () => {
    render(
      <BrowserRouter>
        <OrderDetailsSidebar
          {...defaultProps}
          showOrderSourceCard={false}
          showOrderAttributionCard={false}
          showConfirmationDistributionCard={false}
          order={{ ...mockOrder, isScheduled: false }}
        />
      </BrowserRouter>,
    );

    expect(screen.queryByTestId("order-source-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("order-attribution-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirmation-distribution-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("order-scheduled-card")).not.toBeInTheDocument();
  });
});
