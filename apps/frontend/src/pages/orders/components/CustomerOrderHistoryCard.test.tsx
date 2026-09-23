import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CustomerOrderHistoryCard from "./CustomerOrderHistoryCard";
import { CustomerOrderHistoryData } from "../types";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => d.slice(0, 10),
  }),
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (p: number) => `${p} EGP`,
  }),
}));

const mockHistoryData: CustomerOrderHistoryData = {
  stats: {
    totalOrders: 3,
    deliveredCount: 2,
    cancelledCount: 1,
    returnedCount: 0,
    inProgressCount: 0,
    pendingCount: 0,
    deliverySuccessRate: 67,
    totalDeliveredSpent: 1500,
    totalAllOrdersValue: 2000,
    averageOrderValue: 666.67,
    firstOrderDate: "2026-01-01T10:00:00.000Z",
    lastOrderDate: "2026-03-01T10:00:00.000Z",
    isRepeatCustomer: true,
  },
  orders: [
    {
      id: "ord-1",
      orderNumber: "ORD-CURRENT",
      createdAt: "2026-03-01T10:00:00.000Z",
      status: "pending",
      category: "PENDING",
      total: 500,
      currency: "EGP",
      itemsCount: 1,
      items: [
        {
          id: "it-1",
          name: "قميص صيفي أبيض",
          quantity: 1,
          price: 500,
          total: 500,
          color: "أبيض",
          size: "L",
        },
      ],
      isCurrentOrder: true,
    },
    {
      id: "ord-2",
      orderNumber: "ORD-PAST-1",
      createdAt: "2026-02-01T10:00:00.000Z",
      status: "delivered",
      category: "DELIVERED",
      total: 1000,
      currency: "EGP",
      itemsCount: 2,
      items: [
        {
          id: "it-2",
          name: "حذاء رياضي",
          quantity: 2,
          price: 500,
          total: 1000,
        },
      ],
      isCurrentOrder: false,
    },
    {
      id: "ord-3",
      orderNumber: "ORD-PAST-2",
      createdAt: "2026-01-01T10:00:00.000Z",
      status: "cancelled",
      category: "CANCELLED",
      total: 500,
      currency: "EGP",
      itemsCount: 1,
      items: [],
      isCurrentOrder: false,
    },
  ],
  customerSummary: {
    matchedBy: ["phone"],
    customerName: "أحمد محمود",
    phone: "01012345678",
  },
};

describe("CustomerOrderHistoryCard Component", () => {
  it("renders order history stats and badges correctly", () => {
    render(
      <MemoryRouter>
        <CustomerOrderHistoryCard
          orderNumber="ORD-CURRENT"
          initialHistory={mockHistoryData}
          customerPhone="01012345678"
        />
      </MemoryRouter>
    );

    expect(screen.getByText("سجل وتاريخ طلبات العميل")).toBeInTheDocument();
    expect(screen.getByText(/3 طلبات/)).toBeInTheDocument();

    // Check KPI strip values
    expect(screen.getByText("3")).toBeInTheDocument(); // total orders
    expect(screen.getByText("2")).toBeInTheDocument(); // delivered
    expect(screen.getByText("1")).toBeInTheDocument(); // cancelled/returned
    expect(screen.getByText(/67%/)).toBeInTheDocument(); // success rate
  });

  it("displays past orders with link and highlights the current order", () => {
    render(
      <MemoryRouter>
        <CustomerOrderHistoryCard
          orderNumber="ORD-CURRENT"
          initialHistory={mockHistoryData}
          customerPhone="01012345678"
        />
      </MemoryRouter>
    );

    // Current order badge
    expect(screen.getByText("الطلب الحالي")).toBeInTheDocument();
    expect(screen.getByText("#ORD-CURRENT")).toBeInTheDocument();

    // Past orders links
    expect(screen.getByText("#ORD-PAST-1")).toBeInTheDocument();
    expect(screen.getByText("#ORD-PAST-2")).toBeInTheDocument();
  });

  it("allows filtering orders by status", () => {
    render(
      <MemoryRouter>
        <CustomerOrderHistoryCard
          orderNumber="ORD-CURRENT"
          initialHistory={mockHistoryData}
          customerPhone="01012345678"
        />
      </MemoryRouter>
    );

    // Click on Delivered filter
    const deliveredTab = screen.getByRole("button", { name: /المستلمة/ });
    fireEvent.click(deliveredTab);

    expect(screen.getByText("#ORD-PAST-1")).toBeInTheDocument();
    expect(screen.queryByText("#ORD-PAST-2")).not.toBeInTheDocument();
  });

  it("renders new customer state when there is only 1 order", () => {
    const singleOrderHistory: CustomerOrderHistoryData = {
      stats: {
        totalOrders: 1,
        deliveredCount: 0,
        cancelledCount: 0,
        returnedCount: 0,
        inProgressCount: 0,
        pendingCount: 1,
        deliverySuccessRate: null,
        totalDeliveredSpent: 0,
        totalAllOrdersValue: 500,
        averageOrderValue: 500,
        firstOrderDate: "2026-03-01T10:00:00.000Z",
        lastOrderDate: "2026-03-01T10:00:00.000Z",
        isRepeatCustomer: false,
      },
      orders: [mockHistoryData.orders[0]],
    };

    render(
      <MemoryRouter>
        <CustomerOrderHistoryCard
          orderNumber="ORD-CURRENT"
          initialHistory={singleOrderHistory}
          customerPhone="01012345678"
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/الطلب الأول لهذا العميل/)).toBeInTheDocument();
  });

  it("calls customer-history endpoint when clicking refresh", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockHistoryData,
      },
    });

    render(
      <MemoryRouter>
        <CustomerOrderHistoryCard
          orderNumber="ORD-CURRENT"
          initialHistory={null}
          customerPhone="01012345678"
        />
      </MemoryRouter>
    );

    const refreshBtn = screen.getByRole("button", {
      name: /تحديث سجل طلبات العميل/,
    });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        "/orders-new/simple/ORD-CURRENT/customer-history"
      );
    });
  });
});
