import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OrdersTable, OrdersTableHelpers } from "./OrdersTable";
import type { Order } from "../Orders";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const helpers: OrdersTableHelpers = {
  getCustomerDisplayName: (order) => order.customerName || "Unknown",
  formatPrice: (amount) => `${amount ?? 0} EGP`,
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
  getConfidenceColor: () => "bg-green-100",
  getConfidenceIcon: () => null,
  getOrderSourceText: () => "المتجر",
};

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
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
  orders: [
    makeOrder({}),
    makeOrder({ id: "o2", orderNumber: "ORD-200", customerName: "Ahmed Hassan" }),
  ],
  loading: false,
  ordersLoadError: null,
  selectedOrders: [] as string[],
  canSelectOrders: false,
  isMerchant: false,
  activeFilterCount: 0,
  search: "",
  columns: ["orderNumber", "customer", "amount", "status", "payment", "date", "actions"],
  columnCount: 7,
  density: "comfortable" as const,
  page: 1,
  totalPages: 1,
  totalOrders: 2,
  limit: 20,
  helpers,
  onOpenOrder: jest.fn(),
  onToggleSelection: jest.fn(),
  onToggleAllSelection: jest.fn(),
  onMarkAsViewed: jest.fn(),
  onClearFilters: jest.fn(),
  onPageChange: jest.fn(),
  onLimitChange: jest.fn(),
  onDensityChange: jest.fn(),
};

describe("OrdersTable", () => {
  it("renders order rows with customer names", () => {
    render(
      <MemoryRouter>
        <OrdersTable {...baseProps} />
      </MemoryRouter>,
    );

    expect(screen.getByText("#ORD-100")).toBeInTheDocument();
    expect(screen.getByText("Sara Ali")).toBeInTheDocument();
    expect(screen.getByText("#ORD-200")).toBeInTheDocument();
    expect(screen.getByText("Ahmed Hassan")).toBeInTheDocument();
  });

  it("renders the empty state when there are no orders", () => {
    render(
      <MemoryRouter>
        <OrdersTable {...baseProps} orders={[]} totalOrders={0} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("orders.noOrders").length).toBeGreaterThan(0);
  });

  it("renders skeleton rows while loading", () => {
    render(
      <MemoryRouter>
        <OrdersTable {...baseProps} loading />
      </MemoryRouter>,
    );

    expect(document.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
  });

  it("renders discount and discount reason badge when an order has a discount", () => {
    const discountedOrder = makeOrder({
      id: "o3",
      orderNumber: "ORD-300",
      customerName: "Mona Zaki",
      subtotal: 200,
      discount: 30,
      discountReason: "كوبون: EID30",
      total: 170,
    });

    render(
      <MemoryRouter>
        <OrdersTable {...baseProps} orders={[discountedOrder]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("كوبون: EID30")).toBeInTheDocument();
    expect(screen.getByText("-30 EGP")).toBeInTheDocument();
  });

  it("renders automated customer rating badge in order row without interactive buttons", () => {
    const orderWithRating = makeOrder({
      id: "o4",
      orderNumber: "ORD-400",
      customerName: "Omar Sherif",
      customerRating: "EXCELLENT",
      customerDeliveryRate: 95,
      customerId: "cust-400",
    });

    render(
      <MemoryRouter>
        <OrdersTable
          {...baseProps}
          orders={[orderWithRating]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("ممتاز")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /تقييم العميل/i })).not.toBeInTheDocument();
  });
});
