import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { OrderConfirmationQueue } from "./OrderConfirmationQueue";

jest.mock("../../components/telephony/OrderCallButton", () => ({
  OrderCallButton: () => null,
}));

jest.mock("../../services/orderConfirmationService", () => ({
  __esModule: true,
  default: {
    getSettings: jest.fn().mockResolvedValue({
      data: { enabled: true, maxCallsNoAnswer: 3, intervalMinutes: 30 },
    }),
    getEligibleUsers: jest.fn().mockResolvedValue({
      data: [{ id: "u-1", firstName: "أحمد", lastName: "علي", email: "ahmed@example.com" }],
    }),
    getQueue: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: "ord-1",
          orderNumber: "ORD-CONF-101",
          customerName: "سارة محمد",
          customerPhone: "01012345678",
          total: 850,
          status: "pending",
          sourceType: "storefront",
          createdAt: "2026-10-18T10:00:00Z",
          items: [{ id: "it-1", name: "قميص صيفي", quantity: 2, price: 425 }],
        },
      ],
      pagination: { total: 1, pages: 1 },
    }),
    getStats: jest.fn().mockResolvedValue({
      data: {
        range: { startDate: "2026-10-01", endDate: "2026-10-18" },
        totals: {
          confirmedRegular: 15,
          confirmedGuest: 5,
          totalConfirmed: 20,
          totalAssigned: 25,
        },
        assignmentsByUser: [
          { userId: "u-1", name: "أحمد علي", email: "ahmed@example.com", count: 25 },
        ],
      },
    }),
    confirmOrder: jest.fn(),
    confirmOrders: jest.fn(),
    assignOrder: jest.fn(),
    assignOrders: jest.fn(),
    cancelOrder: jest.fn(),
    logCall: jest.fn(),
  },
}));

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

jest.mock("../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val} EGP`,
  }),
}));

jest.mock("../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (val: string) => val,
  }),
}));

jest.mock("../../hooks/useInvoiceSettings", () => ({
  useInvoiceSettings: () => ({
    settings: {},
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: any) => ({
    getTotalSize: () => count * 150,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        start: index * 150,
        size: 150,
        key: String(index),
      })),
    measureElement: () => {},
  }),
}));

describe("OrderConfirmationQueue", () => {
  it("renders queue header, filter bar, and orders list correctly", async () => {
    render(<OrderConfirmationQueue />);

    expect(screen.getByText("طلبات تحتاج إلى تأكيد")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("ORD-CONF-101")).toBeInTheDocument();
      expect(screen.getByText("سارة محمد")).toBeInTheDocument();
      expect(screen.getByText(/تقرير فريق التأكيد/i)).toBeInTheDocument();
    });
  });
});
