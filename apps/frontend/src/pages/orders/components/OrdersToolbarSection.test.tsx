import React from "react";
import { render, screen } from "@testing-library/react";
import { OrdersToolbarSection } from "./OrdersToolbarSection";

jest.mock("./HeldOrdersBanner", () => ({
  HeldOrdersBanner: () => <div data-testid="held-orders-banner" />,
}));

jest.mock("./OrdersToolbar", () => ({
  OrdersToolbar: () => <div data-testid="orders-toolbar" />,
}));

jest.mock("./OrdersStatsBar", () => ({
  OrdersStatsBar: () => <div data-testid="orders-stats-bar" />,
}));

describe("OrdersToolbarSection", () => {
  const defaultProps = {
    filters: { search: "", status: [] } as any,
    advancedFilterCount: 0,
    ordersLoadError: null,
    showAdvancedFilters: false,
    fieldClassName: "field",
    filterableOrderStatuses: [],
    filterablePaymentStatuses: [],
    merchantOptions: [],
    affiliateOptions: [],
    showOrderSourceFilter: false,
    showUnifiedOperationFilters: false,
    showMerchantOperationFilters: false,
    showAffiliateOperationFilter: false,
    hasCustomDateFilters: false,
    getAffiliateDisplayName: jest.fn(() => "Affiliate"),
    onFilterChange: jest.fn(),
    onApplyFilters: jest.fn(),
    onClearAdvancedFilters: jest.fn(),
    onToggleAdvancedFilters: jest.fn(),
    onSetQuickDate: jest.fn(),
    onRetry: jest.fn(),
    onRefresh: jest.fn(),

    isAdmin: true,
    isMerchant: false,
    merchantSettlementSummary: null,
    merchantSettlementLoading: false,
    merchantSettlementError: null,
    formatPrice: jest.fn((p) => String(p)),
    getFulfillmentSourceText: jest.fn(() => "Source"),
    onClearMerchantFilters: jest.fn(),
    onShowDueOrders: jest.fn(),
  };

  it("renders HeldOrdersBanner, OrdersToolbar, and OrdersStatsBar", () => {
    render(<OrdersToolbarSection {...defaultProps} />);
    expect(screen.getByTestId("held-orders-banner")).toBeInTheDocument();
    expect(screen.getByTestId("orders-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("orders-stats-bar")).toBeInTheDocument();
  });
});
