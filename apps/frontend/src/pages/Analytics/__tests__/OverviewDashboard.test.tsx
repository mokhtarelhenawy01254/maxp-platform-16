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

jest.mock("recharts", () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="recharts-container">{children}</div>
  );
  return {
    ResponsiveContainer: MockResponsiveContainer,
    AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Area: () => null,
    XAxis: () => null,
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
      },
    } as any);

    mockedAnalyticsService.getDailyAnalytics.mockResolvedValue({
      success: true,
      data: [
        { date: "2026-09-01", orders: 50, revenue: 12000 },
      ],
    } as any);
  });

  it("renders multi-piece orders card with count, percentage, and explanatory copy", async () => {
    render(
      <MemoryRouter>
        <OverviewDashboard />
      </MemoryRouter>
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText("الطلبات اللي فيها أكتر من قطعة")).toBeInTheDocument();
    });

    // Verify multi-piece order count and percentage badge
    expect(screen.getByText("227 طلب")).toBeInTheDocument();
    expect(screen.getByText("10.6% من الطلبات")).toBeInTheDocument();

    // Verify explanatory micro-copy
    expect(
      screen.getByText("الطلبات التي تحتوي على قطعتين أو أكثر ونسبتها من إجمالي الطلبات")
    ).toBeInTheDocument();
  });

  it("renders average order value card (orange) directly next to total revenue", async () => {
    render(
      <MemoryRouter>
        <OverviewDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("متوسط قيمة الطلب")).toBeInTheDocument();
    });

    // Verify AOV value and explanation
    expect(screen.getByText("252.57 ج.م")).toBeInTheDocument();
    expect(
      screen.getByText("متوسط قيمة الشراء للطلب الواحد خلال هذه الفترة")
    ).toBeInTheDocument();

    // Verify total revenue card and explanation
    expect(screen.getByText("إجمالي الإيرادات")).toBeInTheDocument();
    expect(screen.getByText("540000 ج.م")).toBeInTheDocument();
    expect(
      screen.getByText("مجموع قيمة المبيعات للطلبات المؤكدة والناجحة خلال الفترة")
    ).toBeInTheDocument();
  });

  it("provides an export button for orders report with piece counts", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: new ArrayBuffer(8),
    });

    render(
      <MemoryRouter>
        <OverviewDashboard />
      </MemoryRouter>
    );

    const exportBtn = await screen.findByRole("button", { name: /تصدير الطلبات/i });
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
