// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
const mockUser = { companyId: "test-comp-123", id: "user-1", role: "COMPANY_ADMIN" };
vi.mock("../../hooks/useAuthSimple", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal: string) => defaultVal,
  }),
}));

vi.mock("../../utils/tokenManager", () => ({
  default: {
    createAuthHeaders: (headers: any) => ({ ...headers, Authorization: "Bearer test" }),
  },
}));

vi.mock("../../config/environment", () => ({
  getApiUrl: () => "https://api.test",
}));

const mockExportToExcel = vi.fn();
vi.mock("../../utils/exportHelpers", () => ({
  exportToExcel: (...args: any[]) => mockExportToExcel(...args),
}));

// Mock Recharts to avoid DOM measuring errors in jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
}));

import EmployeeStatsReport from "../EmployeeStatsReport";

const mockApiStatistics = [
  {
    userId: "active-1",
    firstName: "محمد",
    lastName: "أحمد",
    email: "mohamed@test.com",
    role: "AGENT",
    conversationsCount: 15,
    messagesCount: 45,
    ordersCount: 3,
    piecesCount: 7,
    totalRevenue: 1500,
    conversionRate: 20.0,
  },
  {
    userId: "active-2",
    firstName: "سارة",
    lastName: "علي",
    email: "sara@test.com",
    role: "AGENT",
    conversationsCount: 8,
    messagesCount: 24,
    ordersCount: 2,
    piecesCount: 4,
    totalRevenue: 850,
    conversionRate: 25.0,
  },
  {
    userId: "inactive-1",
    firstName: "هاني",
    lastName: "عمار",
    email: "emp0+20260620102225844@gmail.com",
    role: "AGENT",
    conversationsCount: 0,
    messagesCount: 0,
    ordersCount: 0,
    totalRevenue: 0,
    conversionRate: 0,
  },
  {
    userId: "inactive-2",
    firstName: "خالد",
    lastName: "إبراهيم",
    email: "khaled@test.com",
    role: "AGENT",
    conversationsCount: 0,
    messagesCount: 0,
    ordersCount: 0,
    totalRevenue: 0,
    conversionRate: 0,
  },
];

describe("EmployeeStatsReport - Active Employee Filtering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("filters out employees with all zeroes and only displays active employees in the table", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          statistics: mockApiStatistics,
          totalUniqueConversations: 20,
        },
      }),
    });

    render(<EmployeeStatsReport />);

    await waitFor(() => {
      expect(screen.getAllByText("محمد أحمد").length).toBeGreaterThan(0);
      expect(screen.getAllByText("سارة علي").length).toBeGreaterThan(0);
    });

    // Inactive employees with zeroes MUST NOT be in the table
    expect(screen.queryByText("هاني عمار")).not.toBeInTheDocument();
    expect(screen.queryByText("emp0+20260620102225844@gmail.com")).not.toBeInTheDocument();
    expect(screen.queryByText("خالد إبراهيم")).not.toBeInTheDocument();
    expect(screen.queryByText("khaled@test.com")).not.toBeInTheDocument();
  });

  it("matches employee count card with exact number of active table rows", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          statistics: mockApiStatistics,
          totalUniqueConversations: 20,
        },
      }),
    });

    render(<EmployeeStatsReport />);

    await waitFor(() => {
      expect(screen.getAllByText("محمد أحمد").length).toBeGreaterThan(0);
    });

    // Total employees card should display 2 (only active ones), NOT 4 (which includes inactive)
    const activeElements = screen.getAllByText("2");
    expect(activeElements.length).toBeGreaterThan(0);
    // Table title should say (2)
    expect(screen.getByText(/إحصائيات الموظفين.*\(2\)/)).toBeInTheDocument();
  });

  it("exports only visible active rows to Excel", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          statistics: mockApiStatistics,
          totalUniqueConversations: 20,
        },
      }),
    });

    render(<EmployeeStatsReport />);

    await waitFor(() => {
      expect(screen.getAllByText("محمد أحمد").length).toBeGreaterThan(0);
    });

    const exportBtn = screen.getByRole("button", { name: /تصدير Excel/i });
    expect(exportBtn).not.toBeDisabled();
    fireEvent.click(exportBtn);

    expect(mockExportToExcel).toHaveBeenCalledTimes(1);
    const [exportedData] = mockExportToExcel.mock.calls[0];
    expect(exportedData).toHaveLength(2);
    expect(exportedData[0].employeeName).toBe("محمد أحمد");
    expect(exportedData[1].employeeName).toBe("سارة علي");
    // Ensure inactive employees are NOT in exported data
    const hasInactive = exportedData.some(
      (e: any) => e.email === "emp0+20260620102225844@gmail.com"
    );
    expect(hasInactive).toBe(false);
  });

  it("displays explicit empty state when all employees have zero activity in the period", async () => {
    const allZeroStats = [
      {
        userId: "inactive-1",
        firstName: "هاني",
        lastName: "عمار",
        email: "emp0@gmail.com",
        conversationsCount: 0,
        messagesCount: 0,
        ordersCount: 0,
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          statistics: allZeroStats,
          totalUniqueConversations: 0,
        },
      }),
    });

    render(<EmployeeStatsReport />);

    await waitFor(() => {
      expect(screen.getByText("مفيش موظفين عندهم نشاط في الفترة دي")).toBeInTheDocument();
    });

    expect(screen.queryByText("هاني عمار")).not.toBeInTheDocument();
  });

  it("filters search results strictly within active employees", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          statistics: mockApiStatistics,
          totalUniqueConversations: 20,
        },
      }),
    });

    render(<EmployeeStatsReport />);

    await waitFor(() => {
      expect(screen.getAllByText("محمد أحمد").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/ابحث بالاسم أو الإيميل/i);
    fireEvent.change(searchInput, { target: { value: "سارة" } });

    await waitFor(() => {
      expect(screen.getAllByText("سارة علي").length).toBeGreaterThan(0);
      expect(screen.queryByText("محمد أحمد")).not.toBeInTheDocument();
      expect(screen.queryByText("هاني عمار")).not.toBeInTheDocument();
    });
  });

  it("displays piecesCount column, Total Pieces card, and exports piecesCount column", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          statistics: mockApiStatistics,
          totalUniqueConversations: 20,
        },
      }),
    });

    render(<EmployeeStatsReport />);

    await waitFor(() => {
      expect(screen.getAllByText("محمد أحمد").length).toBeGreaterThan(0);
    });

    // 1. Column header "عدد القطع" must be present
    expect(screen.getByText("عدد القطع")).toBeInTheDocument();

    // 2. Total Pieces card: 7 + 4 = 11 pieces
    expect(screen.getByText("إجمالي القطع")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();

    // 3. Employee row pieces values: 7 for Mohamed, 4 for Sara
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    // 4. Export columns includes piecesCount
    const exportBtn = screen.getByRole("button", { name: /تصدير Excel/i });
    fireEvent.click(exportBtn);

    expect(mockExportToExcel).toHaveBeenCalledTimes(1);
    const [exportedData, exportColumns] = mockExportToExcel.mock.calls[0];

    const piecesCol = exportColumns.find((col: any) => col.key === "piecesCount");
    expect(piecesCol).toBeDefined();
    expect(piecesCol.label).toBe("عدد القطع");

    expect(exportedData[0].piecesCount).toBe(7);
    expect(exportedData[1].piecesCount).toBe(4);
  });
});
