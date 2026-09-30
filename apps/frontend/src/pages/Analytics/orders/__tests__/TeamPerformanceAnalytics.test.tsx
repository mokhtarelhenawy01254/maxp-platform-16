import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TeamPerformanceAnalytics from "../TeamPerformanceAnalytics";
import analyticsService from "../../../../services/analyticsService";

// Mock analyticsService
jest.mock("../../../../services/analyticsService", () => ({
  __esModule: true,
  default: {
    getTeamPerformanceAnalytics: jest.fn(),
  },
}));

// Mock i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        "teamPerformance.title": "تحليلات أداء الفريق",
        "teamPerformance.subtitle": "تقييم الموظفين والإنتاجية",
        "teamPerformance.totalMembers": "عدد أعضاء الفريق",
        "teamPerformance.totalOrders": "إجمالي الطلبات",
        "teamPerformance.totalRevenue": "إجمالي الإيرادات",
        "teamPerformance.ordersProcessed": "الطلبات المعالجة",
        "teamPerformance.ordersCreated": "الطلبات المنشأة",
        "teamPerformance.performanceDetails": "تفاصيل الأداء",
        "teamPerformance.employee": "الموظف",
        "teamPerformance.role": "الدور",
        "teamPerformance.ordersConfirmed": "طلبات مؤكدة",
        "teamPerformance.successRate": "معدل النجاح",
        "teamPerformance.avgOrderValue": "متوسط قيمة الطلب",
        "teamPerformance.currency": "جنيه",
        "periodSelector.today": "اليوم",
        "periodSelector.yesterday": "أمس",
        "periodSelector.last7Days": "آخر 7 أيام",
        "periodSelector.last30Days": "آخر 30 يوم",
        "periodSelector.last90Days": "آخر 90 يوم",
        "periodSelector.last6Months": "آخر 6 شهور",
        "periodSelector.lastYear": "آخر سنة",
        "periodSelector.custom": "فترة مخصصة",
        "periodSelector.from": "من",
        "periodSelector.to": "إلى",
        "periodSelector.appliedPeriod": "الفترة المطبقة",
        "periodSelector.selectBothDatesPrompt": "يرجى تحديد تاريخ البداية وتاريخ النهاية",
        "periodSelector.selectBothDatesWarning": "يرجى اختيار التاريخين معاً لتطبيق الفلتر",
        "periodSelector.startDateAfterEndDate": "تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية",
      };
      return translations[key] || fallback || key;
    },
  }),
}));

const mockData = {
  success: true,
  data: {
    totalTeamMembers: 3,
    totalOrdersProcessed: 42,
    totalTeamRevenue: 15600,
    teamMembers: [
      {
        userId: "user-1",
        userName: "أحمد علي",
        email: "ahmed@example.com",
        role: "SALES",
        ordersCreated: 25,
        ordersConfirmed: 20,
        totalRevenue: 9500,
        deliveredOrders: 18,
        cancelledOrders: 2,
        successRate: 90,
        avgOrderValue: 475,
      },
    ],
  },
};

describe("TeamPerformanceAnalytics", () => {
  let storageStore: Record<string, string> = {};

  beforeEach(() => {
    storageStore = {};
    jest.clearAllMocks();

    (localStorage.getItem as jest.Mock).mockImplementation(
      (key: string) => storageStore[key] || null,
    );
    (localStorage.setItem as jest.Mock).mockImplementation(
      (key: string, value: string) => {
        storageStore[key] = String(value);
      },
    );
    (localStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
      delete storageStore[key];
    });
    (localStorage.clear as jest.Mock).mockImplementation(() => {
      storageStore = {};
    });

    (analyticsService.getTeamPerformanceAnalytics as jest.Mock).mockResolvedValue(
      mockData,
    );
  });

  it("defaults to 'today' on first visit with empty URL and localStorage", async () => {
    render(
      <MemoryRouter initialEntries={["/analytics/orders/team-performance"]}>
        <Routes>
          <Route
            path="/analytics/orders/team-performance"
            element={<TeamPerformanceAnalytics />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Initial API call should use period='today'
    await waitFor(() => {
      expect(analyticsService.getTeamPerformanceAnalytics).toHaveBeenCalledWith(
        "today",
        expect.any(String),
        expect.any(String),
      );
    });

    // Check header and applied period badge
    expect(screen.getByText("تحليلات أداء الفريق")).toBeInTheDocument();
    expect(screen.getByText("الفترة المطبقة:")).toBeInTheDocument();
    expect(screen.getAllByText("اليوم").length).toBeGreaterThanOrEqual(1);

    // Check highlighted button
    const todayBtn = screen.getByRole("button", { name: "اليوم" });
    expect(todayBtn.className).toContain("bg-blue-600");

    // Check that numbers are rendered
    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("أحمد علي")).toBeInTheDocument();
    });

    // Verify localStorage was set
    const saved = JSON.parse(
      storageStore["maxp_analytics_team_performance_period"] || "{}",
    );
    expect(saved.period).toBe("today");
  });

  it("restores selection from URL search params (e.g. ?period=7)", async () => {
    render(
      <MemoryRouter initialEntries={["/analytics/orders/team-performance?period=7"]}>
        <Routes>
          <Route
            path="/analytics/orders/team-performance"
            element={<TeamPerformanceAnalytics />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(analyticsService.getTeamPerformanceAnalytics).toHaveBeenCalledWith(
        "7",
        expect.any(String),
        expect.any(String),
      );
    });

    const sevenDaysBtn = screen.getByRole("button", { name: "آخر 7 أيام" });
    expect(sevenDaysBtn.className).toContain("bg-blue-600");
  });

  it("restores selection from localStorage when URL has no params", async () => {
    storageStore["maxp_analytics_team_performance_period"] = JSON.stringify({
      period: "30",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });

    render(
      <MemoryRouter initialEntries={["/analytics/orders/team-performance"]}>
        <Routes>
          <Route
            path="/analytics/orders/team-performance"
            element={<TeamPerformanceAnalytics />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(analyticsService.getTeamPerformanceAnalytics).toHaveBeenCalledWith(
        "30",
        expect.any(String),
        expect.any(String),
      );
    });

    const thirtyDaysBtn = screen.getByRole("button", { name: "آخر 30 يوم" });
    expect(thirtyDaysBtn.className).toContain("bg-blue-600");
  });

  it("updates URL and localStorage when switching periods", async () => {
    render(
      <MemoryRouter initialEntries={["/analytics/orders/team-performance"]}>
        <Routes>
          <Route
            path="/analytics/orders/team-performance"
            element={<TeamPerformanceAnalytics />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(analyticsService.getTeamPerformanceAnalytics).toHaveBeenCalled();
    });

    // Click 'آخر 7 أيام'
    const sevenDaysBtn = screen.getByRole("button", { name: "آخر 7 أيام" });
    fireEvent.click(sevenDaysBtn);

    await waitFor(() => {
      expect(analyticsService.getTeamPerformanceAnalytics).toHaveBeenLastCalledWith(
        "7",
        expect.any(String),
        expect.any(String),
      );
    });

    await waitFor(() => {
      const saved = JSON.parse(
        storageStore["maxp_analytics_team_performance_period"] || "{}",
      );
      expect(saved.period).toBe("7");
    });
  });
});
