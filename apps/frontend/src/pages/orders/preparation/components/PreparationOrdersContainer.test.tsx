// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { PreparationOrdersContainer } from "./PreparationOrdersContainer";

afterEach(() => {
  cleanup();
});

vi.mock("../../../../i18n", () => ({
  __esModule: true,
  default: { language: "ar", t: (k: string) => k },
  getDirection: () => "rtl",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("./PreparationOrderCard", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ order }: any) => (
    <div data-testid={`order-card-${order.orderNumber}`}>{order.customerName}</div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PreparationOrderCard: ({ order }: any) => (
    <div data-testid={`order-card-${order.orderNumber}`}>{order.customerName}</div>
  ),
}));

vi.mock("./PreparationOrdersTable", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ orders }: any) => (
    <div data-testid="orders-table">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {orders.map((o: any) => (
        <span key={o.orderNumber}>{o.orderNumber}</span>
      ))}
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PreparationOrdersTable: ({ orders }: any) => (
    <div data-testid="orders-table">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {orders.map((o: any) => (
        <span key={o.orderNumber}>{o.orderNumber}</span>
      ))}
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MemoizedPreparationOrdersTable: ({ orders }: any) => (
    <div data-testid="orders-table">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {orders.map((o: any) => (
        <span key={o.orderNumber}>{o.orderNumber}</span>
      ))}
    </div>
  ),
}));

vi.mock("./PreparationPaginationBar", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ page, totalPages }: any) => (
    <div data-testid="pagination-bar" data-page={page} data-total-pages={totalPages} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PreparationPaginationBar: ({ page, totalPages }: any) => (
    <div data-testid="pagination-bar" data-page={page} data-total-pages={totalPages} />
  ),
}));

describe("PreparationOrdersContainer", () => {
  const defaultProps = {
    loading: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    toggleOrderSelection: vi.fn(),
    handleQuickTransfer: vi.fn(),
    handleShortageFieldChange: vi.fn(),
    saveShortageHoldDetails: vi.fn(),
    handleQcCheckToggle: vi.fn(),
    onStatusSelectionChange: vi.fn(),
    handleRequestStatusChange: vi.fn(),
    handleMarkAsShortageHold: vi.fn(),
    handleReleaseShortageHold: vi.fn(),
    handleMarkAsShortageFailed: vi.fn(),
    handleHoldAsProblem: vi.fn(),
    handleReleaseProblemHold: vi.fn(),
    handleEditProblemReason: vi.fn(),
    handlePrintPreparationSlip: vi.fn(),
    onPageSizeChange: vi.fn(),
    onPreviousPage: vi.fn(),
    onNextPage: vi.fn(),
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        enrichedOrders={[sampleOrder as any]}
      />
    );

    expect(getByTestId("order-card-ORD-999")).toBeInTheDocument();
    expect(getByTestId("orders-table")).toBeInTheDocument();
    expect(getByTestId("pagination-bar")).toBeInTheDocument();
  });
});
