import React from "react";
import { render } from "@testing-library/react";
import { PreparationOrdersContainer } from "./PreparationOrdersContainer";

jest.mock("../../../../i18n", () => ({
  __esModule: true,
  default: { language: "ar", t: (k: string) => k },
  getDirection: () => "rtl",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("./PreparationOrderCard", () => ({
  PreparationOrderCard: ({ order }: any) => (
    <div data-testid={`order-card-${order.orderNumber}`}>{order.customerName}</div>
  ),
}));

jest.mock("./PreparationOrdersTable", () => ({
  PreparationOrdersTable: ({ orders }: any) => (
    <div data-testid="orders-table">
      {orders.map((o: any) => (
        <span key={o.orderNumber}>{o.orderNumber}</span>
      ))}
    </div>
  ),
}));

jest.mock("./PreparationPaginationBar", () => ({
  PreparationPaginationBar: ({ page, totalPages }: any) => (
    <div data-testid="pagination-bar" data-page={page} data-total-pages={totalPages} />
  ),
}));

describe("PreparationOrdersContainer", () => {
  const defaultProps = {
    loading: false,
    enrichedOrders: [] as any[],
    pagination: { page: 1, limit: 20, total: 0 },
    totalPages: 1,
    currentPageCount: 0,
    pageSize: 20,
    statusSelections: {},
    statusOptions: [],
    statusLabelMap: {},
    selectedSet: new Set<string>(),
    rowUpdatingId: null,
    shortageSavingOrderId: null,
    problemHoldSavingOrderId: null,
    selectedWarehouseId: "",
    enabledQcChecks: [],
    qcChecklistState: {},
    shortageHoldDrafts: {},
    problemHoldDrafts: {},
    transferingItemKey: null,
    printingOrderNumber: null,
    preparationSettings: {
      enabled: true,
      startingStatus: "CONFIRMED",
      handoffStatus: "SHIPPED",
      enableBulkStatusUpdate: true,
      enableQualityCheck: true,
      enableStockCheck: true,
    } as any,
    visibleColumns: {},
    formatPrice: (amt: number) => `${amt} EGP`,
    formatDate: (dt: string) => dt,
    toggleOrderSelection: jest.fn(),
    handleQuickTransfer: jest.fn(),
    handleShortageFieldChange: jest.fn(),
    saveShortageHoldDetails: jest.fn(),
    handleQcCheckToggle: jest.fn(),
    onStatusSelectionChange: jest.fn(),
    handleRequestStatusChange: jest.fn(),
    handleMarkAsShortageHold: jest.fn(),
    handleReleaseShortageHold: jest.fn(),
    handleMarkAsShortageFailed: jest.fn(),
    handleHoldAsProblem: jest.fn(),
    handleReleaseProblemHold: jest.fn(),
    handleEditProblemReason: jest.fn(),
    handlePrintPreparationSlip: jest.fn(),
    onPageSizeChange: jest.fn(),
    onPreviousPage: jest.fn(),
    onNextPage: jest.fn(),
  };

  it("renders loading skeleton when loading is true", () => {
    const { container } = render(
      <PreparationOrdersContainer {...defaultProps} loading={true} />
    );

    expect(container.querySelectorAll(".animate-pulse").length).toBe(5);
  });

  it("renders empty state when orders list is empty", () => {
    const { getByText } = render(
      <PreparationOrdersContainer {...defaultProps} loading={false} enrichedOrders={[]} />
    );

    expect(getByText("preparation.emptyState.title")).toBeInTheDocument();
  });

  it("renders orders card and table when orders are present", () => {
    const sampleOrder = {
      orderNumber: "ORD-999",
      customerName: "Mohamed Ali",
      stage: "WAITING",
      metadata: {},
      missingItemsCount: 0,
    };

    const { getByTestId } = render(
      <PreparationOrdersContainer
        {...defaultProps}
        loading={false}
        enrichedOrders={[sampleOrder as any]}
      />
    );

    expect(getByTestId("order-card-ORD-999")).toBeInTheDocument();
    expect(getByTestId("orders-table")).toBeInTheDocument();
    expect(getByTestId("pagination-bar")).toBeInTheDocument();
  });
});
