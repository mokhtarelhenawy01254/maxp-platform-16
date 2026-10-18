import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { OrdersAnalytics } from "./OrdersAnalytics";
import { OrdersAnalyticsCommandBar } from "./analytics/OrdersAnalyticsCommandBar";
import { OrdersAnalyticsErrorBar } from "./analytics/OrdersAnalyticsErrorBar";

jest.mock("../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opt?: any) => opt?.defaultValue || k,
    i18n: { language: "ar" },
  }),
}));

const mockLoadData = jest.fn();
const mockApplyPeriod = jest.fn();
const mockHandleCustomDateChange = jest.fn();

jest.mock("./analytics/useOrdersAnalyticsData", () => ({
  useOrdersAnalyticsData: () => ({
    period: "7",
    dateRange: { start: "2026-10-11", end: "2026-10-18" },
    loading: false,
    error: null,
    stats: {
      dailyTrend: [],
      duplicateStats: { totalDuplicates: 0, avoidedRevenue: 0 },
    },
    products: [],
    lastRefreshedAt: new Date("2026-10-18T10:00:00Z"),
    trendMetric: "orders",
    setTrendMetric: jest.fn(),
    applyPeriod: mockApplyPeriod,
    handleCustomDateChange: mockHandleCustomDateChange,
    loadData: mockLoadData,
    totalOrders: 120,
    totalRevenue: 45000,
    deliveredOrders: 95,
    deliveredPct: 79,
    inTransitOrders: 15,
    inTransitPct: 12.5,
    warehouseOrders: 5,
    warehousePct: 4,
    unprocessedOrders: 2,
    unprocessedPct: 1.5,
    cancelledOrders: 2,
    cancelledPct: 1.5,
    returnedOrders: 1,
    returnedPct: 0.8,
    daysCount: 7,
    avgOrdersPerDay: 17,
    avgDeliveredPerDay: 13,
    avgCancelledPerDay: 0.3,
    avgReturnedPerDay: 0.1,
    netRevenue: 38000,
    pendingRevenue: 5000,
    lostRevenue: 2000,
    netRealizationPct: 84.4,
    codOrdersCount: 90,
    prepaidOrdersCount: 30,
    codCollectionRate: 85,
    prepaidDeliveryRate: 92,
    shippingList: [],
    branchList: [],
    governorateList: [],
    statusDist: {},
    statusPieces: {},
    totalPieces: 250,
    avgPiecesPerOrder: 2.1,
    avgPiecesPerDay: 35,
    avgDeliveredPiecesPerDay: 28,
    avgCancelledPiecesPerDay: 1,
    avgReturnedPiecesPerDay: 0.5,
    deliveredPieces: 200,
    inTransitPieces: 30,
    warehousePieces: 10,
    unprocessedPieces: 4,
    cancelledPieces: 4,
    returnedPieces: 2,
    paymentStats: {},
    isDateRangeInvalid: false,
    translate: (k: string) => k,
  }),
}));

describe("OrdersAnalytics Suite", () => {
  it("renders main analytics command bar and metrics strips", () => {
    render(
      <BrowserRouter>
        <OrdersAnalytics />
      </BrowserRouter>
    );

    expect(screen.getByText("تحليلات العمليات والطلبات")).toBeInTheDocument();
    expect(screen.getByText("SaaS Cockpit")).toBeInTheDocument();
  });

  it("renders OrdersAnalyticsCommandBar with dropdown change handler", () => {
    render(
      <BrowserRouter>
        <OrdersAnalyticsCommandBar
          period="7"
          dateRange={{ start: "2026-10-11", end: "2026-10-18" }}
          daysCount={7}
          isDateRangeInvalid={false}
          loading={false}
          lastRefreshedAt={new Date("2026-10-18T10:00:00Z")}
          onPeriodChange={mockApplyPeriod}
          onCustomDateChange={mockHandleCustomDateChange}
          onRefresh={mockLoadData}
          translate={(k) => k}
        />
      </BrowserRouter>
    );

    const select = screen.getByLabelText("الفترة الزمنية");
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "30" } });
    expect(mockApplyPeriod).toHaveBeenCalledWith("30");
  });

  it("renders OrdersAnalyticsErrorBar and triggers retry callback", () => {
    const onRetryMock = jest.fn();
    render(<OrdersAnalyticsErrorBar error="فشل جلب البيانات" onRetry={onRetryMock} />);

    expect(screen.getByText("فشل جلب البيانات")).toBeInTheDocument();
    const retryBtn = screen.getByText("إعادة المحاولة");
    fireEvent.click(retryBtn);
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });
});
