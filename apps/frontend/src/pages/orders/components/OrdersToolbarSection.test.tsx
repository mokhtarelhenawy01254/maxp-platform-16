import React from "react";
import { render, screen } from "@testing-library/react";
import { OrdersToolbarSection } from "./OrdersToolbarSection";

let capturedToolbarProps: any = null;
let capturedStatsBarProps: any = null;

jest.mock("./HeldOrdersBanner", () => ({
  HeldOrdersBanner: () => <div data-testid="held-orders-banner" />,
}));

jest.mock("./OrdersToolbar", () => ({
  OrdersToolbar: (props: any) => {
    capturedToolbarProps = props;
    return <div data-testid="orders-toolbar" />;
  },
}));

jest.mock("./OrdersStatsBar", () => ({
  OrdersStatsBar: (props: any) => {
    capturedStatsBarProps = props;
    return <div data-testid="orders-stats-bar" />;
  },
}));

describe("OrdersToolbarSection", () => {
  beforeEach(() => {
    capturedToolbarProps = null;
    capturedStatsBarProps = null;
  });

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

  it("passes advanced filter states and load error down to OrdersToolbar", () => {
    render(
      <OrdersToolbarSection
        {...defaultProps}
        showAdvancedFilters={true}
        advancedFilterCount={3}
        ordersLoadError="Server is unavailable"
      />,
    );
    expect(capturedToolbarProps.showAdvancedFilters).toBe(true);
    expect(capturedToolbarProps.advancedFilterCount).toBe(3);
    expect(capturedToolbarProps.ordersLoadError).toBe("Server is unavailable");
  });

  it("passes merchant settlement data and callbacks down to OrdersStatsBar", () => {
    const summary = {
      merchant: { id: "merchant-9", name: "M9 Store" },
      inventorySummary: {},
      operationsSummary: {},
      payoutSummary: {},
    };

    render(
      <OrdersToolbarSection
        {...defaultProps}
        isAdmin={false}
        isMerchant={true}
        merchantSettlementSummary={summary as any}
        merchantSettlementLoading={false}
      />,
    );

    expect(capturedStatsBarProps.isAdmin).toBe(false);
    expect(capturedStatsBarProps.isMerchant).toBe(true);
    expect(capturedStatsBarProps.merchantSettlementSummary).toBe(summary);
  });
});
