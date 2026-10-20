// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DentalLabDashboardTab from "../../DentalLabDashboardTab";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Hoisted mock data
const { mockDashboardData } = vi.hoisted(() => {
  const mockDashboardData = {
    todayReceived: 12,
    todayDue: 8,
    activeCasesCount: 45,
    readyCount: 14,
    overdueCount: 3,
    revenue: 125000,
    outstanding: 38000,
    byStatus: {
      RECEIVED: 10,
      DESIGN: 15,
      MANUFACTURING: 12,
      QC: 8,
      READY: 14,
      DELIVERED: 40,
      CLOSED: 25,
    },
    topDoctors: [
      {
        doctorId: "doc-1",
        doctorName: "شريف الألفي",
        count: 28,
        revenue: 42000,
      },
      {
        doctorId: "doc-2",
        doctorName: "حازم العطار",
        count: 19,
        revenue: 29500,
      },
    ],
    topDebtors: [
      {
        doctorId: "doc-3",
        doctorName: "أحمد كمال",
        outstanding: 18500,
      },
      {
        doctorId: "doc-4",
        doctorName: "ممدوح فوزي",
        outstanding: 12000,
      },
    ],
  };

  return { mockDashboardData };
});

// Mock shared API methods
vi.mock("../../shared", () => ({
  fetchDashboard: vi.fn(async () => JSON.parse(JSON.stringify(mockDashboardData))),
  CASE_STATUSES: [
    { id: "RECEIVED", label: "مستلم", barColor: "#3b82f6", dotColor: "bg-blue-500" },
    { id: "DESIGN", label: "تصميم CAD", barColor: "#6366f1", dotColor: "bg-indigo-500" },
    { id: "MANUFACTURING", label: "تصنيع CAM", barColor: "#8b5cf6", dotColor: "bg-purple-500" },
    { id: "QC", label: "مراقبة الجودة", barColor: "#ec4899", dotColor: "bg-pink-500" },
    { id: "READY", label: "جاهز للتسليم", barColor: "#10b981", dotColor: "bg-emerald-500" },
    { id: "DELIVERED", label: "تم التسليم", barColor: "#64748b", dotColor: "bg-slate-500" },
    { id: "CLOSED", label: "مغلق ومسدد", barColor: "#0ea5e9", dotColor: "bg-sky-500" },
  ],
  fmtMoney: (v: number) => `${Number(v).toLocaleString("en-US")}`,
}));

describe("DentalLabDashboardTab (Batch 345 Modular Deconstruction)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderTab = () => {
    return render(
      <MemoryRouter>
        <DentalLabDashboardTab />
      </MemoryRouter>
    );
  };

  it("1. renders dashboard header, title, and refresh button", async () => {
    renderTab();

    expect(screen.getByText("dentalLab.tabs.dashboard")).toBeInTheDocument();
    expect(screen.getByText("dentalLab.dashboard.subtitle")).toBeInTheDocument();
    expect(screen.getByText("dentalLab.common.refresh")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("وارد اليوم (مستلم)")).toBeInTheDocument();
    });
  });

  it("2. loads and renders all 7 drill-down KPI cards with correct metrics", async () => {
    renderTab();

    await waitFor(() => {
      expect(screen.getByText("وارد اليوم (مستلم)")).toBeInTheDocument();
      expect(screen.getByText("خارج اليوم (تسليمات اليوم)")).toBeInTheDocument();
      expect(screen.getByText("الحالات الجارية (نشطة)")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.dashboard.readyCount")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.dashboard.overdueCount")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.dashboard.collected")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.dashboard.outstanding")).toBeInTheDocument();
    });

    // Check values
    expect(screen.getAllByText("12").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("8").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getAllByText("14").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/125,000/)).toBeInTheDocument();
    expect(screen.getByText(/38,000/)).toBeInTheDocument();
  });

  it("3. renders status breakdown section with stages and total count", async () => {
    renderTab();

    await waitFor(() => {
      expect(screen.getByText("dentalLab.dashboard.byStatus")).toBeInTheDocument();
      expect(screen.getByText(/124/)).toBeInTheDocument(); // total = 10+15+12+8+14+40+25 = 124
      expect(screen.getByText("مستلم")).toBeInTheDocument();
      expect(screen.getByText("تصميم CAD")).toBeInTheDocument();
      expect(screen.getByText("تصنيع CAM")).toBeInTheDocument();
      expect(screen.getByText("جاهز للتسليم")).toBeInTheDocument();
    });
  });

  it("4. renders top doctors leaderboard with cases and revenue", async () => {
    renderTab();

    await waitFor(() => {
      expect(screen.getByText("dentalLab.dashboard.topDoctors")).toBeInTheDocument();
      expect(screen.getByText("شريف الألفي")).toBeInTheDocument();
      expect(screen.getByText("حازم العطار")).toBeInTheDocument();
      expect(screen.getByText("28")).toBeInTheDocument();
      expect(screen.getByText(/42,000/)).toBeInTheDocument();
    });
  });

  it("5. renders top debtors list with outstanding balances", async () => {
    renderTab();

    await waitFor(() => {
      expect(screen.getByText("dentalLab.dashboard.topDebtors")).toBeInTheDocument();
      expect(screen.getByText("أحمد كمال")).toBeInTheDocument();
      expect(screen.getByText("ممدوح فوزي")).toBeInTheDocument();
      expect(screen.getByText(/18,500/)).toBeInTheDocument();
      expect(screen.getByText(/12,000/)).toBeInTheDocument();
    });
  });

  it("6. renders quick actions panel with all 4 operational shortcuts", async () => {
    renderTab();

    await waitFor(() => {
      expect(screen.getByText("إجراءات سريعة")).toBeInTheDocument();
      expect(screen.getByText("إنشاء أمر شغل جديد")).toBeInTheDocument();
      expect(screen.getByText("متابعة الحالات المتأخرة")).toBeInTheDocument();
      expect(screen.getByText("محطة مسح الباركود Kiosk")).toBeInTheDocument();
      expect(screen.getByText("إصدار وتحصيل الفواتير")).toBeInTheDocument();
    });
  });

  it("7. clicking refresh triggers fetchDashboard again", async () => {
    const { fetchDashboard } = await import("../../shared");

    renderTab();

    await waitFor(() => {
      expect(fetchDashboard).toHaveBeenCalledTimes(1);
    });

    const refreshBtn = screen.getByText("dentalLab.common.refresh");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetchDashboard).toHaveBeenCalledTimes(2);
    });
  });
});
