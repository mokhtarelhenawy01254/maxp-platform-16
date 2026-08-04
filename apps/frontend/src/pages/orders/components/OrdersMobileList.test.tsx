import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OrdersMobileList, OrdersMobileListHelpers } from "./OrdersMobileList";
import type { Order } from "../Orders";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("@tanstack/react-virtual", () => ({
  useWindowVirtualizer: () => ({
    getTotalSize: () => 480,
    getVirtualItems: () => [
      { key: 0, index: 0, start: 0 },
      { key: 1, index: 1, start: 240 },
    ],
    measureElement: jest.fn(),
    options: { scrollMargin: 0 },
  }),
}));

const helpers: OrdersMobileListHelpers = {
  getCustomerDisplayName: (order) => order.customerName || "Unknown",
  formatPrice: (amount) => `${amount ?? 0} EGP`,
  getOrderAmount: () => 100,
  getOrderSourceText: () => "manual",
  getRelativeTime: () => "just now",
  formatDate: (date) => String(date).slice(0, 10),
  getPaymentStatusBadgeStyle: () => undefined,
  getPaymentStatusColor: () => "bg-slate-100",
  getPaymentStatusText: () => "Pending",
  getUnifiedStatusDisplay: () => ({
    text: "Processing",
    labelKey: "processing",
    className: "badge",
    style: undefined,
  }),
};

const makeOrder = (overrides: Partial<Order>): Order => ({
  id: "o1",
  orderNumber: "ORD-100",
  customerName: "Sara Ali",
  customerEmail: "sara@example.com",
  customerPhone: "01000000000",
  status: "PENDING",
  items: [],
  subtotal: 100,
  tax: 0,
  shipping: 20,
  total: 120,
  paymentMethod: "cash_on_delivery",
  paymentStatus: "pending",
  shippingAddress: { city: "Cairo", governorate: "Cairo", country: "EG" },
  notes: "",
  createdAt: "2026-05-04T09:00:00.000Z",
  updatedAt: "2026-05-04T09:00:00.000Z",
  ...overrides,
});

const baseProps = {
  orders: [makeOrder({}), makeOrder({ id: "o2", orderNumber: "ORD-200", customerName: "Ahmed Hassan" })],
  loading: false,
  ordersLoadError: null,
  selectedOrders: [] as string[],
  canSelectOrders: false,
  isMerchant: false,
  activeFilterCount: 0,
  search: "",
  helpers,
  onOpenOrder: jest.fn(),
  onToggleSelection: jest.fn(),
  onMarkAsViewed: jest.fn(),
  onClearFilters: jest.fn(),
};

describe("OrdersMobileList", () => {
  it("renders order cards from the virtualized list", () => {
    render(
      <MemoryRouter>
        <OrdersMobileList {...baseProps} />
      </MemoryRouter>,
    );

    expect(screen.getByText("#ORD-100")).toBeInTheDocument();
    expect(screen.getByText("Sara Ali")).toBeInTheDocument();
    expect(screen.getByText("#ORD-200")).toBeInTheDocument();
    expect(screen.getByText("Ahmed Hassan")).toBeInTheDocument();
    expect(screen.getAllByText("orders.viewDetails").length).toBeGreaterThan(0);
  });

  it("renders the mobile empty state when there are no orders", () => {
    render(
      <MemoryRouter>
        <OrdersMobileList {...baseProps} orders={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("orders.noOrders")).toBeInTheDocument();
  });

  it("renders skeletons while loading", () => {
    render(
      <MemoryRouter>
        <OrdersMobileList {...baseProps} loading />
      </MemoryRouter>,
    );

    expect(document.querySelector(".skeleton-shimmer")).not.toBeNull();
  });
});
