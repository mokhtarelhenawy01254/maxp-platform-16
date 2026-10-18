import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { OrdersOverviewStats } from "./OrdersOverviewStats";
import analyticsService from "../../../services/analyticsService";

jest.mock("../../../services/analyticsService", () => ({
  __esModule: true,
  default: {
    getDailyAnalytics: jest.fn(),
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (key === "orders.overviewTotalOrders") return "إجمالي الطلبات";
      if (key === "orders.overviewTotalRevenue") return "إجمالي الإيرادات";
      if (key === "orders.overviewAvgOrderValue") return "متوسط قيمة الطلب";
      return opts?.defaultValue || key;
    },
  }),
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val} ج.م`,
  }),
}));

describe("OrdersOverviewStats Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders shimmer skeleton initially while loading", () => {
    (analyticsService.getDailyAnalytics as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { container } = render(<OrdersOverviewStats />);
    expect(container.querySelector(".skeleton-shimmer")).toBeInTheDocument();
  });

  it("renders KPIs and period selectors when analytics data resolves", async () => {
    const mockData = [
      {
        date: "2026-10-01",
        totalPurchases: 10,
        totalRevenue: 5000,
        validPurchases: 8,
      },
      {
        date: "2026-10-02",
        totalPurchases: 15,
        totalRevenue: 7500,
        validPurchases: 12,
      },
    ];

    (analyticsService.getDailyAnalytics as jest.Mock).mockResolvedValue({
      success: true,
      data: mockData,
    });

    render(<OrdersOverviewStats />);

    await waitFor(() => {
      expect(screen.getByText("إجمالي الطلبات")).toBeInTheDocument();
      expect(screen.getByText("إجمالي الإيرادات")).toBeInTheDocument();
      expect(screen.getByText("متوسط قيمة الطلب")).toBeInTheDocument();
    });
  });
});
