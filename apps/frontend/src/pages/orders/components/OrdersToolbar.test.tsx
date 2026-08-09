import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OrdersToolbar } from "./OrdersToolbar";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type ToolbarProps = React.ComponentProps<typeof OrdersToolbar>;

const makeProps = (overrides: Partial<ToolbarProps> = {}): ToolbarProps => ({
  filters: {
    status: [],
    paymentStatus: [],
    sourceType: [],
    merchantId: [],
    affiliateId: [],
    fulfillmentSource: [],
    merchantOperationStatus: [],
    merchantSettlementStatus: [],
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
  lastUpdatedAt: null,
  isConnected: true,
  getAffiliateDisplayName: () => "",
  onFilterChange: jest.fn(),
  onClearAdvancedFilters: jest.fn(),
  onToggleAdvancedFilters: jest.fn(),
  onSetQuickDate: jest.fn(),
  onOpenWorkspace: jest.fn(),
  onRetry: jest.fn(),
  onRefresh: jest.fn(),
  ...overrides,
});

describe("OrdersToolbar", () => {
  it("renders the search input and filter toggle", () => {
    render(
      <MemoryRouter>
        <OrdersToolbar {...makeProps()} />
      </MemoryRouter>,
    );

    expect(
      screen.getByPlaceholderText("orders.searchPlaceholder"),
    ).toBeInTheDocument();
    expect(screen.getByText("orders.filters")).toBeInTheDocument();
  });

  it("triggers the advanced-filters toggle", () => {
    const onToggleAdvancedFilters = jest.fn();
    render(
      <MemoryRouter>
        <OrdersToolbar
          {...makeProps({ onToggleAdvancedFilters })}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("orders.filters"));
    expect(onToggleAdvancedFilters).toHaveBeenCalledTimes(1);
  });

  it("renders the advanced status filter when open", () => {
    render(
      <MemoryRouter>
        <OrdersToolbar {...makeProps({ showAdvancedFilters: true })} />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("orders.allStatuses")).toBeInTheDocument();
    expect(screen.getByLabelText("orders.allPaymentStatuses")).toBeInTheDocument();
  });

  it("selects multiple statuses through the multi-select dropdown", () => {
    const onFilterChange = jest.fn();
    render(
      <MemoryRouter>
        <OrdersToolbar
          {...makeProps({
            showAdvancedFilters: true,
            onFilterChange,
            filterableOrderStatuses: [
              { code: "PENDING", name: "قيد الانتظار" },
              { code: "SHIPPED", name: "تم الشحن" },
            ],
          })}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("orders.allStatuses"));
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    expect(onFilterChange).toHaveBeenCalledWith("status", ["pending"]);
  });

  it("keeps previously selected statuses when adding another one", () => {
    const onFilterChange = jest.fn();
    render(
      <MemoryRouter>
        <OrdersToolbar
          {...makeProps({
            showAdvancedFilters: true,
            onFilterChange,
            filters: { ...makeProps().filters, status: ["pending"] },
            filterableOrderStatuses: [
              { code: "PENDING", name: "قيد الانتظار" },
              { code: "SHIPPED", name: "تم الشحن" },
            ],
          })}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("orders.allStatuses"));
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    expect(onFilterChange).toHaveBeenCalledWith("status", ["pending", "shipped"]);
  });

  it("clears all statuses from the All Orders button", () => {
    const onFilterChange = jest.fn();
    render(
      <MemoryRouter>
        <OrdersToolbar
          {...makeProps({
            onFilterChange,
            filters: { ...makeProps().filters, status: ["pending", "shipped"] },
          })}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText("orders.allOrders"));
    expect(onFilterChange).toHaveBeenCalledWith("status", []);
  });

  it("triggers a manual refresh from the toolbar button", () => {
    const onRefresh = jest.fn();
    render(
      <MemoryRouter>
        <OrdersToolbar {...makeProps({ onRefresh })} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByLabelText("orders.refreshOrders"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
