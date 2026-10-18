import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrdersFilterDrawer, type OrdersFilterDrawerProps } from "./OrdersFilterDrawer";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key }),
}));

const makeDrawerProps = (overrides: Partial<OrdersFilterDrawerProps> = {}): OrdersFilterDrawerProps => ({
  isOpen: true,
  onClose: jest.fn(),
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
  advancedFilterCount: 0,
  fieldClassName: "theme-native-control",
  statusOptions: [
    { code: "confirmed", name: "مؤكد", color: "#3b82f6" },
    { code: "ready", name: "جاهز", color: "#10b981" },
  ],
  paymentStatusOptions: [
    { code: "paid", name: "مدفوع", color: "#10b981" },
    { code: "pending", name: "معلق", color: "#f59e0b" },
  ],
  sourceOptions: [
    { code: "storefront", name: "المتجر" },
    { code: "manual", name: "يدوي" },
  ],
  merchantOptionsList: [],
  affiliateOptionsList: [],
  fulfillmentOptions: [],
  operationOptions: [],
  settlementOptions: [],
  showOrderSourceFilter: true,
  showUnifiedOperationFilters: false,
  showMerchantOperationFilters: false,
  showAffiliateOperationFilter: false,
  hasCustomDateFilters: false,
  onFilterChange: jest.fn(),
  onSetQuickDate: jest.fn(),
  onClearAdvancedFilters: jest.fn(),
  ...overrides,
});

describe("OrdersFilterDrawer", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(<OrdersFilterDrawer {...makeDrawerProps({ isOpen: false })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders drawer title, date range, and statuses when open", () => {
    render(<OrdersFilterDrawer {...makeDrawerProps()} />);
    expect(screen.getByText("فلاتر الطلبات المتقدمة")).toBeInTheDocument();
    expect(screen.getByText("النطاق الزمني والتاريخ")).toBeInTheDocument();
    expect(screen.getByText("حالة الطلب")).toBeInTheDocument();
    expect(screen.getByText("حالة الدفع")).toBeInTheDocument();
  });

  it("triggers onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(<OrdersFilterDrawer {...makeDrawerProps({ onClose })} />);
    const closeBtn = screen.getByLabelText("إغلاق");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape key press", () => {
    const onClose = jest.fn();
    render(<OrdersFilterDrawer {...makeDrawerProps({ onClose })} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("triggers onSetQuickDate when a quick chip is clicked", () => {
    const onSetQuickDate = jest.fn();
    render(<OrdersFilterDrawer {...makeDrawerProps({ onSetQuickDate })} />);
    const todayChip = screen.getByRole("button", { name: "اليوم" });
    fireEvent.click(todayChip);
    expect(onSetQuickDate).toHaveBeenCalledWith("today");
  });

  it("triggers onFilterChange when unseen toggle is clicked", () => {
    const onFilterChange = jest.fn();
    render(<OrdersFilterDrawer {...makeDrawerProps({ onFilterChange })} />);
    const switchBtn = screen.getByRole("switch");
    fireEvent.click(switchBtn);
    expect(onFilterChange).toHaveBeenCalledWith("onlyUnseen", true);
  });

  it("calls onClearAdvancedFilters when clear button is clicked", () => {
    const onClearAdvancedFilters = jest.fn();
    render(<OrdersFilterDrawer {...makeDrawerProps({ advancedFilterCount: 2, onClearAdvancedFilters })} />);
    const clearBtn = screen.getByText("مسح الكل");
    fireEvent.click(clearBtn);
    expect(onClearAdvancedFilters).toHaveBeenCalled();
  });
});
