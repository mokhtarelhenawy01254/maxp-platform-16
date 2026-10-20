// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConfirmationOrderRow } from "../ConfirmationOrderRow";
import type { ConfirmationOrder } from "../types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts && opts.defaultValue ? opts.defaultValue : key,
  }),
}));

vi.mock("../../../components/telephony/OrderCallButton", () => ({
  OrderCallButton: () => <button data-testid="order-call-btn">Call</button>,
}));

afterEach(() => {
  cleanup();
});

describe("ConfirmationOrderRow", () => {
  const mockOrder: ConfirmationOrder = {
    id: "ord-123",
    orderNumber: "ORD-9999",
    customerName: "Ahmed Ali",
    customerPhone: "01012345678",
    governorate: "Cairo",
    total: 500,
    shipping: 50,
    codDepositAmount: 100,
    status: "PENDING_CONFIRMATION",
    createdAt: "2026-10-20T10:00:00Z",
    sourceType: "Storefront",
    isGuestOrder: true,
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    callAttempts: 2,
    items: [
      {
        id: "item-1",
        name: "Classic T-Shirt",
        productName: "Classic T-Shirt",
        quantity: 2,
        price: 250,
        color: "Black",
        size: "L",
        sku: "TSH-BLK-L",
      },
    ],
  };

  const defaultProps = {
    order: mockOrder,
    assignValue: "",
    eligibleUsers: [],
    assigningId: null,
    cancellingId: null,
    callingId: null,
    maxCallsNoAnswer: 5,
    intervalMinutes: 10,
    settingsEnabled: false,
    selectionEnabled: true,
    isSelected: false,
    formatDate: (val: string) => "20/10/2026",
    formatPrice: (val: number) => `${val} EGP`,
    strategyLabelMap: {},
    onAssignChange: vi.fn(),
    onAssign: vi.fn(),
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    onLogCall: vi.fn(),
    onPostpone: vi.fn(),
    onToggleSelect: vi.fn(),
    onPrintSlip: vi.fn(),
    onPrintInvoice: vi.fn(),
  };

  it("renders order details, customer info, items, and status badge", () => {
    render(
      <MemoryRouter>
        <ConfirmationOrderRow {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.getByText("ORD-9999")).toBeInTheDocument();
    expect(screen.getByText("Ahmed Ali")).toBeInTheDocument();
    expect(screen.getByText("01012345678")).toBeInTheDocument();
    expect(screen.getByText("Cairo", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Classic T-Shirt")).toBeInTheDocument();
    expect(screen.getByText("PENDING_CONFIRMATION")).toBeInTheDocument();
    expect(screen.getByText("المستحق: 450 EGP")).toBeInTheDocument();
  });

  it("triggers onToggleSelect when selection checkbox is clicked", () => {
    render(
      <MemoryRouter>
        <ConfirmationOrderRow {...defaultProps} />
      </MemoryRouter>
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(defaultProps.onToggleSelect).toHaveBeenCalledWith("ord-123");
  });

  it("triggers onConfirm when confirm button is clicked", () => {
    render(
      <MemoryRouter>
        <ConfirmationOrderRow {...defaultProps} />
      </MemoryRouter>
    );

    const confirmBtn = screen.getByText("تأكيد");
    fireEvent.click(confirmBtn);
    expect(defaultProps.onConfirm).toHaveBeenCalledWith("ord-123");
  });

  it("triggers onCancel when cancel button is clicked", () => {
    render(
      <MemoryRouter>
        <ConfirmationOrderRow {...defaultProps} />
      </MemoryRouter>
    );

    const cancelBtn = screen.getByText("إلغاء");
    fireEvent.click(cancelBtn);
    expect(defaultProps.onCancel).toHaveBeenCalledWith(mockOrder);
  });
});
