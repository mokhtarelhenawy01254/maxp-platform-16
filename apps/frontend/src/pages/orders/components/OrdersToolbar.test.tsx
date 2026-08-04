import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrdersToolbar } from "./OrdersToolbar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type ToolbarProps = React.ComponentProps<typeof OrdersToolbar>;

const makeProps = (overrides: Partial<ToolbarProps> = {}): ToolbarProps => ({
  filters: {
    status: "",
    paymentStatus: "",
    sourceType: "",
    merchantId: "",
    affiliateId: "",
    fulfillmentSource: "",
    merchantOperationStatus: "",
    merchantSettlementStatus: "",
    search: "",
    startDate: "",
    endDate: "",
    extractionMethod: "",
    minConfidence: "",
    onlyUnseen: false,
    timeRange: "",
  },
  loading: false,
  totalOrders: 10,
  activeFilterCount: 0,
  advancedFilterCount: 0,
  isMerchant: false,
  hasAgentWorkspace: false,
  ordersCount: 5,
  page: 1,
  limit: 20,
  ordersLoadError: null,
  showAdvancedFilters: false,
  fieldClassName: "theme-native-control",
  filterableOrderStatuses: [],
  filterablePaymentStatuses: [],
  merchantOptions: [],
  affiliateOptions: [],
  showOrderSourceFilter: false,
  showUnifiedOperationFilters: false,
  showMerchantOperationFilters: false,
  showAffiliateOperationFilter: false,
  hasCustomDateFilters: false,
  getAffiliateDisplayName: () => "",
  onFilterChange: jest.fn(),
  onClearAdvancedFilters: jest.fn(),
  onToggleAdvancedFilters: jest.fn(),
  onSetQuickDate: jest.fn(),
  onOpenWorkspace: jest.fn(),
  onRetry: jest.fn(),
  ...overrides,
});

describe("OrdersToolbar", () => {
  it("renders the search input and filter toggle", () => {
    render(<OrdersToolbar {...makeProps()} />);

    expect(
      screen.getByPlaceholderText("orders.searchPlaceholder"),
    ).toBeInTheDocument();
    expect(screen.getByText("orders.filters")).toBeInTheDocument();
  });

  it("triggers the advanced-filters toggle", () => {
    const onToggleAdvancedFilters = jest.fn();
    render(
      <OrdersToolbar
        {...makeProps({ onToggleAdvancedFilters })}
      />,
    );

    fireEvent.click(screen.getByText("orders.filters"));
    expect(onToggleAdvancedFilters).toHaveBeenCalledTimes(1);
  });

  it("renders the advanced status filter when open", () => {
    render(<OrdersToolbar {...makeProps({ showAdvancedFilters: true })} />);

    expect(screen.getByLabelText("orders.allStatuses")).toBeInTheDocument();
    expect(screen.getByLabelText("orders.allPaymentStatuses")).toBeInTheDocument();
  });
});
