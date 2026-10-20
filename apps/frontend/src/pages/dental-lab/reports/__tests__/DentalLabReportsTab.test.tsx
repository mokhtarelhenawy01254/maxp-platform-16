// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalLabReportsTab from "../../DentalLabReportsTab";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock Recharts for jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div data-testid="bar" />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
}));

// Hoisted mock data
const {
  mockDashboard,
  mockDoctors,
  mockStatement,
  mockProductivity,
  mockWorkTypeRevenue,
  mockOverdue,
  mockAging,
  mockRemakes,
} = vi.hoisted(() => {
  const mockDashboard = {
    todayReceived: 8,
    overdueCount: 3,
    revenue: 45000,
    outstanding: 12000,
  };

  const mockDoctors = [
    { id: "doc-1", name: "د. شريف حامد", isActive: true },
    { id: "doc-2", name: "د. ريم مصطفى", isActive: true },
  ];

  const mockStatement = {
    doctor: { id: "doc-1", name: "د. شريف حامد" },
    totals: {
      cases: 15,
      invoicesCount: 6,
      paid: 18000,
      remaining: 4500,
    },
    cases: [
      {
        caseNumber: "CASE-101",
        patientName: "أحمد عبد الله",
        workTypeName: "Zirconia Crown",
        dueDate: "2026-10-25",
        total: 2500,
        paid: 2000,
        remaining: 500,
      },
    ],
    invoices: [
      {
        id: "inv-001",
        invoiceNumber: "INV-2026-01",
        patientName: "أحمد عبد الله",
        total: 2500,
        paid: 2000,
        remaining: 500,
      },
    ],
  };

  const mockProductivity = [
    {
      technicianId: "tech-1",
      name: "أحمد المهدي",
      role: "CERAMIST",
      assignedCases: 14,
      completedStages: 22,
      completedUnits: 30,
      avgHoursPerStage: 4.5,
      avgDaysPerStage: 0.8,
      wagePerStage: 120,
      earnedWages: 2640,
      remakesCount: 0,
    },
  ];

  const mockWorkTypeRevenue = [
    {
      workType: "Zirconia Multi-Layer",
      cases: 25,
      total: 35000,
      paid: 28000,
      remaining: 7000,
    },
  ];

  const mockOverdue = [
    {
      caseNumber: "CASE-088",
      doctorName: "د. شريف حامد",
      patientName: "عمر فاروق",
      workTypeName: "Emax Inlay",
      dueDate: "2026-10-12",
      daysOverdue: 8,
      remaining: 1200,
    },
  ];

  const mockAging = {
    totalOutstanding: 12000,
    buckets: [
      { label: "0-30", invoices: 5, total: 8000 },
      { label: "31-60", invoices: 2, total: 4000 },
    ],
  };

  const mockRemakes = {
    summary: {
      totalRemakes: 4,
      freeRemakes: 3,
      billableRemakes: 1,
    },
    categories: [
      { category: "LAB_FIT_MARGIN", count: 3 },
      { category: "DOCTOR_IMPRESSION", count: 1 },
    ],
    topDoctors: [{ doctorId: "doc-1", doctorName: "د. شريف حامد", count: 3 }],
    topWorkTypes: [{ workTypeName: "Zirconia Multi-Layer", count: 3 }],
    list: [
      {
        id: "remake-1",
        caseId: "case-088",
        case: {
          caseNumber: "CASE-088",
          doctor: { name: "د. شريف حامد" },
          patientName: "عمر فاروق",
          workTypeName: "Emax Inlay",
        },
        rootCauseCategory: "LAB_FIT_MARGIN",
        reason: "الحواف غير مطابقة للمقاس المطلوب",
        isBillable: false,
        createdAt: "2026-10-18T10:00:00Z",
      },
    ],
  };

  return {
    mockDashboard,
    mockDoctors,
    mockStatement,
    mockProductivity,
    mockWorkTypeRevenue,
    mockOverdue,
    mockAging,
    mockRemakes,
  };
});

// Mock shared API methods
vi.mock("../../shared", () => ({
  fetchDashboard: vi.fn(async () => mockDashboard),
  fetchDoctors: vi.fn(async () => mockDoctors),
  fetchDoctorStatement: vi.fn(async () => mockStatement),
  fetchTechnicianProductivity: vi.fn(async () => mockProductivity),
  fetchWorkTypeRevenue: vi.fn(async () => mockWorkTypeRevenue),
  fetchOverdueReport: vi.fn(async () => mockOverdue),
  fetchAgingReport: vi.fn(async () => mockAging),
  fetchRemakesAnalysis: vi.fn(async () => mockRemakes),
  ROLE_CONFIG: {
    CERAMIST: { label: "فني خزف", color: "bg-purple-100 text-purple-700" },
  },
  fmtMoney: (v: number) => `${Number(v).toLocaleString("en-US")} ج.م`,
  fmtDate: (d?: string) => (d ? String(d).slice(0, 10) : "—"),
  tKey: (_t: any, k: string) => k,
}));

describe("DentalLabReportsTab (Batch 339 Deconstruction)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders page header and dashboard KPI cards correctly", async () => {
    render(<DentalLabReportsTab />);

    expect(screen.getByText("dentalLab.reports.title")).toBeInTheDocument();
    expect(screen.getByText("dentalLab.reports.subtitle")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("dentalLab.dashboard.collected")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.dashboard.outstanding")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.dashboard.todayReceived")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.dashboard.overdueCount")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("renders statement view by default and allows running statement report", async () => {
    render(<DentalLabReportsTab />);

    await waitFor(() => {
      expect(screen.getByText("dentalLab.reports.doctor")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    // Select doctor
    fireEvent.change(select, { target: { value: "doc-1" } });

    // Click run button
    const runBtn = screen.getByText("dentalLab.reports.run");
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText("CASE-101")).toBeInTheDocument();
      expect(screen.getByText("INV-2026-01")).toBeInTheDocument();
      expect(screen.getAllByText("أحمد عبد الله").length).toBeGreaterThan(0);
    });
  });

  it("switches to technician productivity view", async () => {
    render(<DentalLabReportsTab />);

    const prodTab = screen.getByText("dentalLab.reports.productivityTab");
    fireEvent.click(prodTab);

    await waitFor(() => {
      expect(screen.getByText("مقارنة إنتاجية مراحل ووحدات فريق العمل")).toBeInTheDocument();
      expect(screen.getByText("أحمد المهدي")).toBeInTheDocument();
      expect(screen.getByText("فني خزف")).toBeInTheDocument();
      expect(screen.getAllByText("22").length).toBeGreaterThan(0);
      expect(screen.getAllByText("30").length).toBeGreaterThan(0);
    });
  });

  it("switches to aging debt report view", async () => {
    render(<DentalLabReportsTab />);

    const agingTab = screen.getByText("dentalLab.reports.aging.title");
    fireEvent.click(agingTab);

    await waitFor(() => {
      expect(screen.getByText("dentalLab.reports.aging.totalOutstanding")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.reports.aging.0-30")).toBeInTheDocument();
      expect(screen.getByText("dentalLab.reports.aging.31-60")).toBeInTheDocument();
    });
  });

  it("switches to overdue cases view", async () => {
    render(<DentalLabReportsTab />);

    const overdueTab = screen.getByText("dentalLab.reports.overdueTab");
    fireEvent.click(overdueTab);

    await waitFor(() => {
      expect(screen.getByText("dentalLab.reports.overdueHint")).toBeInTheDocument();
      expect(screen.getByText("CASE-088")).toBeInTheDocument();
      expect(screen.getByText("عمر فاروق")).toBeInTheDocument();
    });
  });

  it("switches to revenue by work type view", async () => {
    render(<DentalLabReportsTab />);

    const revTab = screen.getByText("dentalLab.reports.revenueTab");
    fireEvent.click(revTab);

    await waitFor(() => {
      expect(screen.getByText("dentalLab.reports.revenueByTypeChart")).toBeInTheDocument();
      expect(screen.getByText("Zirconia Multi-Layer")).toBeInTheDocument();
    });
  });

  it("switches to remakes analysis view", async () => {
    render(<DentalLabReportsTab />);

    const remakesTab = screen.getByText("تحليل الإعادات والأسباب (Remakes)");
    fireEvent.click(remakesTab);

    await waitFor(() => {
      expect(screen.getByText("توزيع الأسباب الجذرية للإعادة (Root Causes)")).toBeInTheDocument();
      expect(screen.getByText("أكثر الأطباء تسجيلاً للإعادات")).toBeInTheDocument();
      expect(screen.getByText("أكثر التركيبات والأعمال تعرضاً للإعادة")).toBeInTheDocument();
      expect(screen.getByText("سجل طلبات الإعادة التفصيلي (1)")).toBeInTheDocument();
      expect(screen.getByText("الحواف غير مطابقة للمقاس المطلوب")).toBeInTheDocument();
    });
  });
});
