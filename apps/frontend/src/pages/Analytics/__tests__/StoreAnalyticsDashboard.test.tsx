import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StoreAnalyticsDashboard from "../StoreAnalyticsDashboard";
import analyticsService from "../../../services/analyticsService";

jest.mock("recharts", () => {
  const MockResponsiveContainer = ({ children }: { children: React.ReactNode }) => <div data-testid="analytics-chart">{children}</div>;
  const MockAreaChart = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: MockResponsiveContainer,
    AreaChart: MockAreaChart,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

jest.mock("../../../services/analyticsService", () => ({
  __esModule: true,
  default: {
    getStoreAnalytics: jest.fn(),
    getTopProducts: jest.fn(),
    getDailyAnalytics: jest.fn(),
  },
}));

const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;

describe("StoreAnalyticsDashboard", () => {
  beforeEach(() => {
    mockedAnalyticsService.getStoreAnalytics.mockResolvedValue({
      data: {
        totalVisits: 12,
        uniqueVisitors: 9,
        totalProductViews: 20,
        addToCarts: 4,
        checkouts: 2,
        purchases: 1,
        totalRevenue: 1500,
        conversionRate: 8.3,
        avgOrderValue: 1500,
        addToCartRate: 20,
        checkoutRate: 10,
        purchaseRate: 5,
      },
    });
    mockedAnalyticsService.getTopProducts.mockResolvedValue({ data: [] });
    mockedAnalyticsService.getDailyAnalytics.mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("defaults to today on the first load", async () => {
    render(<StoreAnalyticsDashboard />);

    await screen.findByRole("heading", { name: "لوحة أداء المتجر" });

    await waitFor(() => {
      expect(mockedAnalyticsService.getStoreAnalytics).toHaveBeenCalledWith(
        "1",
        "",
        "",
        expect.any(AbortSignal),
      );
    });

    expect(screen.getByRole("combobox", { name: "الفترة" })).toHaveValue("1");
  });

  test("applies a custom range using the live input values", async () => {
    render(<StoreAnalyticsDashboard />);

    await screen.findByRole("heading", { name: "لوحة أداء المتجر" });

    const periodSelect = screen.getByRole("combobox", { name: "الفترة" });
    fireEvent.change(periodSelect, { target: { value: "custom" } });

    const startInput = await screen.findByLabelText("من");
    const endInput = await screen.findByLabelText("إلى");

    (startInput as HTMLInputElement).value = "2026-04-01";
    (endInput as HTMLInputElement).value = "2026-04-27";

    fireEvent.click(screen.getByRole("button", { name: "تطبيق الفترة" }));

    await waitFor(() => {
      expect(mockedAnalyticsService.getStoreAnalytics).toHaveBeenLastCalledWith(
        "custom",
        "2026-04-01",
        "2026-04-27",
        expect.any(AbortSignal),
      );
    });

    expect(
      screen.queryByText("اختر تاريخ البداية والنهاية قبل تطبيق الفترة المخصصة."),
    ).not.toBeInTheDocument();
  });
});
