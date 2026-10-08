import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OverviewDashboard from "../orders/OverviewDashboard";
import analyticsService from "../../../services/analyticsService";
import { apiClient } from "../../../services/apiClient";

jest.mock("../../../utils/storage", () => ({
  createStorageKey: (...args: string[]) => args.join(":"),
  getWithExpiry: () => null,
  setWithExpiry: () => {},
}));

jest.mock("../../../components/ui/DeferredResponsiveContainer", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="deferred-responsive-container">{children}</div>
  ),
}));

jest.mock("recharts", () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-container">{children}</div>
  );
  return {
    ResponsiveContainer: MockResponsiveContainer,
    AreaChart: ({
      children,
      data,
    }: {
      children: React.ReactNode;
      data?: Array<Record<string, unknown>>;
    }) => (
      <div
        data-testid="area-chart"
        data-chart-items={JSON.stringify(data || [])}
      >
        {children}
      </div>
    ),
    Area: ({ dataKey }: { dataKey?: string }) => (
      <div data-testid={`area-series-${dataKey || "unknown"}`} />
    ),
    XAxis: ({ dataKey }: { dataKey?: string }) => (
      <div data-testid={`xaxis-${dataKey || "unknown"}`} />
    ),
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Pie: () => null,
    Cell: () => null,
  };
});

jest.mock("../../../services/analyticsService", () => ({
  __esModule: true,
  default: {
    getStoreAnalytics: jest.fn(),
    getDailyAnalytics: jest.fn(),
    getCODPerformanceAnalytics: jest.fn(),
    getTodayOps: jest.fn(),
  },
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "u-1", companyId: "comp-1" },
  }),
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val} ج.م`,
  }),
}));

const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

describe("OverviewDashboard Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAnalyticsService.getStoreAnalytics.mockResolvedValue({
      success: true,
      data: {
        totalOrders: 2138,
        completedOrders: 1850,
        cancelledOrders: 120,
        returnedOrders: 80,
        pendingOrders: 88,
        totalRevenue: 540000,
        averageOrderValue: 252.57,
        conversionRate: 3.2,
        multiPieceOrders: 227,
        multiPiecePercentage: 10.6,
        totalPieces: 610,
      },
    } as any);

    mockedAnalyticsService.getDailyAnalytics.mockResolvedValue({
      success: true,
      data: [
        {
          date: "2026-09-17T21:00:00.000Z",
          totalPurchases: 50,
          totalRevenue: 12000,
        },
      ],
    } as any);

    mockedAnalyticsService.getCODPerformanceAnalytics.mockResolvedValue({
      success: true,
      data: {},
    } as any);

    mockedAnalyticsService.getTodayOps.mockResolvedValue({
      success: true,
      data: {},
    } as any);
  });

  it("renders multi-piece orders card with count and percentage", async () => {
    render(
      <MemoryRouter>
        <OverviewDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("الطلبات متعددة القطع")).toBeInTheDocument();
    });

    expect(screen.getByText("227")).toBeInTheDocument();
    expect(screen.getByText("10.6%")).toBeInTheDocument();
    expect(screen.getByText("610 قطعة مباعة")).toBeInTheDocument();
  });

  it("renders average order value card next to total revenue", async () => {
    render(
      <MemoryRouter>
        <OverviewDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("متوسط قيمة الطلب")).toBeInTheDocument();
    });

    expect(screen.getByText("252.57 ج.م")).toBeInTheDocument();
    expect(screen.getByText("معدل سلة الشراء (AOV)")).toBeInTheDocument();
    expect(screen.getByText("إجمالي الإيرادات")).toBeInTheDocument();
    expect(screen.getByText("540000 ج.م")).toBeInTheDocument();
  });

  it("maps backend totalPurchases/totalRevenue to orders/revenue and formats ISO dates cleanly in OverviewDualTrendChart", async () => {
    render(
      <MemoryRouter>
        <OverviewDashboard />
      </MemoryRouter>
    );

    const chart = await screen.findByTestId("area-chart");
    const parsedItems = JSON.parse(chart.getAttribute("data-chart-items") || "[]");

    expect(parsedItems).toHaveLength(1);
    expect(parsedItems[0].orders).toBe(50);
    expect(parsedItems[0].revenue).toBe(12000);
    expect(parsedItems[0].shortDate).toMatch(/^\d{2}-\d{2}$/);
    expect(parsedItems[0].shortDate).not.toContain("T");

    expect(screen.getByTestId("area-series-orders")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "الإيرادات المالية" }));
    expect(screen.getByTestId("area-series-revenue")).toBeInTheDocument();
  });

  it("provides an export button for orders report", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: new ArrayBuffer(8),
    });

    render(
      <MemoryRouter>
        <OverviewDashboard />
      </MemoryRouter>
    );

    const exportBtn = await screen.findByRole("button", { name: /تصدير \(Excel\)/i });
    expect(exportBtn).toBeInTheDocument();

    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        "/orders/export",
        expect.objectContaining({
          responseType: "blob",
        })
      );
    });
  });
});
