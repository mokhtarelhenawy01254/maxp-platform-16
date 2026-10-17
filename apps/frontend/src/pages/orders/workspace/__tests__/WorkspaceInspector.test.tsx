jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { WorkspaceInspector } from "../WorkspaceInspector";
import { WorkspaceOrder } from "../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "ar" },
  }),
}));

jest.mock("../../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} ج.م`,
  }),
}));

// Mock telephony call button to avoid external websocket/telephony dependencies
jest.mock("../../../../components/telephony/OrderCallButton", () => ({
  OrderCallButton: () => <button type="button">MockCallButton</button>,
}));

// Mock customer editor
jest.mock("../WorkspaceCustomerEditor", () => ({
  WorkspaceCustomerEditor: () => <div data-testid="mock-customer-editor">Customer Editor</div>,
  parseCleanAddress: (addr?: string) => addr || "",
}));

// Mock call history
jest.mock("../WorkspaceCallHistory", () => ({
  WorkspaceCallHistory: () => <div data-testid="mock-call-history">Call History</div>,
}));

// Mock whatsapp drawer
jest.mock("../WorkspaceWhatsAppDrawer", () => ({
  WorkspaceWhatsAppDrawer: () => null,
}));

const mockOrder: WorkspaceOrder = {
  id: "ord-101",
  orderNumber: "ORD-9901",
  customerName: "كريم يوسف",
  customerPhone: "01098765432",
  governorate: "الإسكندرية",
  city: "سموحة",
  total: 620,
  subtotal: 550,
  shipping: 70,
  status: "PENDING",
  createdAt: new Date().toISOString(),
  callAttempts: 0,
  items: [
    {
      id: "it-1",
      productName: "جاكيت جلد أسود",
      productColor: "أسود",
      productSize: "L",
      quantity: 1,
      price: 550,
      total: 550,
    },
  ],
};

describe("WorkspaceInspector", () => {
  it("renders empty state when order is null", () => {
    render(
      <BrowserRouter>
        <WorkspaceInspector
          order={null}
          busyAction={undefined}
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
          onLogCall={jest.fn()}
          onOpenFollowUp={jest.fn()}
          onOpenDetailsModal={jest.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText("orders.noOrderSelected")).toBeInTheDocument();
  });

  it("renders confirmation disabled warning banner when order is null and confirmationDisabled is true", () => {
    render(
      <BrowserRouter>
        <WorkspaceInspector
          order={null}
          busyAction={undefined}
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
          onLogCall={jest.fn()}
          onOpenFollowUp={jest.fn()}
          onOpenDetailsModal={jest.fn()}
          confirmationDisabled={true}
        />
      </BrowserRouter>
    );

    expect(screen.getByText("مركز التأكيد مقفول من الإعدادات")).toBeInTheDocument();
  });

  it("renders order items, totals, and customer editor when order is provided", () => {
    render(
      <BrowserRouter>
        <WorkspaceInspector
          order={mockOrder}
          busyAction={undefined}
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
          onLogCall={jest.fn()}
          onOpenFollowUp={jest.fn()}
          onOpenDetailsModal={jest.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText("№ ORD-9901")).toBeInTheDocument();
    expect(screen.getByText("جاكيت جلد أسود")).toBeInTheDocument();
    expect(screen.getByText("620 ج.م")).toBeInTheDocument();
    expect(screen.getByTestId("mock-customer-editor")).toBeInTheDocument();
  });

  it("triggers onConfirm when confirm order button is clicked", () => {
    const handleConfirm = jest.fn();
    render(
      <BrowserRouter>
        <WorkspaceInspector
          order={mockOrder}
          busyAction={undefined}
          onConfirm={handleConfirm}
          onCancel={jest.fn()}
          onLogCall={jest.fn()}
          onOpenFollowUp={jest.fn()}
          onOpenDetailsModal={jest.fn()}
        />
      </BrowserRouter>
    );

    const confirmBtn = screen.getByRole("button", { name: /orders.confirmOrder/i });
    fireEvent.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledWith(mockOrder);
  });

  it("triggers onLogCall when a call disposition chip is clicked", () => {
    const handleLogCall = jest.fn();
    render(
      <BrowserRouter>
        <WorkspaceInspector
          order={mockOrder}
          busyAction={undefined}
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
          onLogCall={handleLogCall}
          onOpenFollowUp={jest.fn()}
          onOpenDetailsModal={jest.fn()}
        />
      </BrowserRouter>
    );

    const answeredBtn = screen.getByRole("button", { name: /تم الرد/i });
    fireEvent.click(answeredBtn);
    expect(handleLogCall).toHaveBeenCalledWith(mockOrder, "reached");
  });
});
