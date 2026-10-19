import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OrdersStatsBar } from "./OrdersStatsBar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("../utils/ordersTableHelpers", () => ({
  __esModule: true,
  getMerchantOperationsTotals: (summary: { summary?: Record<string, number> } | null | undefined) => ({
    inShippingAmount: 0,
    inShippingPieces: 0,
    deliveredOrdersCount: 0,
    deliveredPieces: 0,
    payablePieces: 0,
    notDeliveredOrdersCount: 0,
    notDeliveredPieces: 0,
    notDeliveredAmount: 0,
    ...(summary?.summary || {}),
  }),
  formatMerchantPieces: (value: number | string | null | undefined) =>
    String(Number(value || 0)),
  payoutStatusLabels: {},
}));

const baseProps = {
  isAdmin: true,
  isMerchant: false,
  merchantId: "merchant-1",
  merchantSettlementSummary: {
    merchant: { id: "merchant-1", name: "Sara Store" },
    inventorySummary: {},
    operationsSummary: { summary: { inShippingAmount: 500 } },
    payoutSummary: {
      balances: { availableAmount: 1000, paidAmount: 200 },
      payouts: [],
    },
  },
  merchantSettlementLoading: false,
  merchantSettlementError: null,
  merchantOptions: [{ id: "merchant-1", name: "Sara Store" }],
  formatPrice: (amount: number | null | undefined) => `${amount ?? 0} EGP`,
  getFulfillmentSourceText: () => "MERCHANT",
  onClearMerchantFilters: jest.fn(),
  onShowDueOrders: jest.fn(),
};

describe("OrdersStatsBar", () => {
  it("renders the merchant settlement metrics", () => {
    render(
      <MemoryRouter>
        <OrdersStatsBar {...baseProps} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sara Store")).toBeInTheDocument();
    expect(
      screen.getAllByText("orders.availableForWithdrawal").length,
    ).toBeGreaterThan(0);
  });

  it("returns null when no merchant filter is selected", () => {
    render(
      <MemoryRouter>
        <OrdersStatsBar {...baseProps} merchantId="" />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Sara Store")).not.toBeInTheDocument();
  });

  it("renders the loading skeleton while fetching the summary", () => {
    render(
      <MemoryRouter>
        <OrdersStatsBar {...baseProps} merchantSettlementLoading />
      </MemoryRouter>,
    );

    expect(document.querySelector(".skeleton-shimmer")).not.toBeNull();
  });
});
