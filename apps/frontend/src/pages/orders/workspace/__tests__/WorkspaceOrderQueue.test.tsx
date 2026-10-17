jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { WorkspaceOrderQueue } from "../WorkspaceOrderQueue";
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

const mockOrders: WorkspaceOrder[] = [
  {
    id: "ord-1",
    orderNumber: "1001",
    customerName: "محمد أحمد",
    customerPhone: "01012345678",
    governorate: "القاهرة",
    city: "مدينة نصر",
    total: 350,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    callAttempts: 1,
    items: [],
  },
  {
    id: "ord-2",
    orderNumber: "1002",
    customerName: "سارة محمود",
    customerPhone: "01123456789",
    governorate: "الجيزة",
    city: "الدقي",
    total: 750,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    callAttempts: 0,
    riskData: { level: "high", score: 85, reasons: [{ label: "رقم مكرر" }] },
    items: [],
  },
];

const mockPagination = {
  total: 2,
  pages: 1,
  limit: 20,
};

describe("WorkspaceOrderQueue", () => {
  it("renders orders list with customer names and order numbers", () => {
    const handleSelect = jest.fn();
    render(
      <BrowserRouter>
        <WorkspaceOrderQueue
          orders={mockOrders}
          selectedOrderId={null}
          onSelectOrder={handleSelect}
          loading={false}
          loadingMore={false}
          onLoadMore={jest.fn()}
          pagination={mockPagination}
          page={1}
          fetchError={null}
          onRetry={jest.fn()}
          activeTab="pending"
        />
      </BrowserRouter>
    );

    expect(screen.getByText("#1001")).toBeInTheDocument();
    expect(screen.getByText("محمد أحمد")).toBeInTheDocument();
    expect(screen.getByText("#1002")).toBeInTheDocument();
    expect(screen.getByText("سارة محمود")).toBeInTheDocument();
  });

  it("calls onSelectOrder when an order row is clicked", () => {
    const handleSelect = jest.fn();
    render(
      <BrowserRouter>
        <WorkspaceOrderQueue
          orders={mockOrders}
          selectedOrderId={null}
          onSelectOrder={handleSelect}
          loading={false}
          loadingMore={false}
          onLoadMore={jest.fn()}
          pagination={mockPagination}
          page={1}
          fetchError={null}
          onRetry={jest.fn()}
          activeTab="pending"
        />
      </BrowserRouter>
    );

    const firstOrder = screen.getByText("محمد أحمد");
    fireEvent.click(firstOrder);
    expect(handleSelect).toHaveBeenCalledWith("ord-1");
  });

  it("filters to high risk orders when risk filter button is toggled", () => {
    render(
      <BrowserRouter>
        <WorkspaceOrderQueue
          orders={mockOrders}
          selectedOrderId={null}
          onSelectOrder={jest.fn()}
          loading={false}
          loadingMore={false}
          onLoadMore={jest.fn()}
          pagination={mockPagination}
          page={1}
          fetchError={null}
          onRetry={jest.fn()}
          activeTab="pending"
        />
      </BrowserRouter>
    );

    const riskBtn = screen.getByTestId ? screen.getByRole("button", { name: /خطر عالي/i }) : screen.getByText(/خطر عالي/i);
    fireEvent.click(riskBtn);

    // Only ord-2 should be visible
    expect(screen.queryByText("#1001")).not.toBeInTheDocument();
    expect(screen.getByText("#1002")).toBeInTheDocument();
  });

  it("renders empty state when orders array is empty", () => {
    render(
      <BrowserRouter>
        <WorkspaceOrderQueue
          orders={[]}
          selectedOrderId={null}
          onSelectOrder={jest.fn()}
          loading={false}
          loadingMore={false}
          onLoadMore={jest.fn()}
          pagination={{ total: 0, pages: 1, limit: 20 }}
          page={1}
          fetchError={null}
          onRetry={jest.fn()}
          activeTab="pending"
        />
      </BrowserRouter>
    );

    expect(screen.getByText("لا توجد طلبات قيد الانتظار")).toBeInTheDocument();
  });

  it("renders confirmation disabled warning banner when confirmation is disabled", () => {
    render(
      <BrowserRouter>
        <WorkspaceOrderQueue
          orders={[]}
          selectedOrderId={null}
          onSelectOrder={jest.fn()}
          loading={false}
          loadingMore={false}
          onLoadMore={jest.fn()}
          pagination={{ total: 0, pages: 1, limit: 20 }}
          page={1}
          fetchError={null}
          onRetry={jest.fn()}
          activeTab="pending"
          confirmationDisabled={true}
        />
      </BrowserRouter>
    );

    expect(screen.getByText("المركز مقفول من الإعدادات")).toBeInTheDocument();
  });
});
