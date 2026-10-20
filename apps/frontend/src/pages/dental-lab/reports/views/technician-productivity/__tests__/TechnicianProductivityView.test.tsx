// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TechnicianProductivityView } from "../../TechnicianProductivityView";

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "dentalLab.reports.from": "من",
        "dentalLab.reports.to": "إلى",
        "dentalLab.common.refresh": "تحديث",
        "dentalLab.common.noData": "لا توجد بيانات متاحة",
      };
      return map[key] || key;
    },
  }),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Hoisted mock data and mock function
const { mockData, mockFetchProductivity } = vi.hoisted(() => {
  const mockData = [
    {
      technicianId: "tech-1",
      name: "كريم أحمد",
      role: "CERAMIST",
      assignedCases: 15,
      completedStages: 20,
      completedUnits: 25,
      avgHoursPerStage: 3.5,
      avgDaysPerStage: 0.5,
      wagePerStage: 100,
      earnedWages: 2000,
      remakesCount: 0,
    },
    {
      technicianId: "tech-2",
      name: "سامح إبراهيم",
      role: "CAD_CAM",
      assignedCases: 8,
      completedStages: 10,
      completedUnits: 12,
      avgHoursPerStage: 4,
      avgDaysPerStage: 0.6,
      wagePerStage: 120,
      earnedWages: 1200,
      remakesCount: 2,
    },
  ];

  const mockFetchProductivity = vi.fn();
  return { mockData, mockFetchProductivity };
});

vi.mock("../../../../shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../shared")>();
  return {
    ...actual,
    fetchTechnicianProductivity: mockFetchProductivity,
    fmtMoney: (n: number) => n.toLocaleString("en-US"),
  };
});

describe("TechnicianProductivityView (Batch 367)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchProductivity.mockResolvedValue(mockData);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders filters and calculates KPI cards accurately", async () => {
    render(<TechnicianProductivityView />);

    expect(screen.getByText("من")).toBeInTheDocument();
    expect(screen.getByText("إلى")).toBeInTheDocument();

    await waitFor(() => {
      // Total stages: 20 + 10 = 30
      expect(screen.getByText("30")).toBeInTheDocument();
      // Total units: 25 + 12 = 37
      expect(screen.getByText("37")).toBeInTheDocument();
      // Total wages: 2000 + 1200 = 3,200
      expect(screen.getByText("3,200")).toBeInTheDocument();
      // Total remakes: 0 + 2 = 2
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("renders chart and table with technician records", async () => {
    render(<TechnicianProductivityView />);

    await waitFor(() => {
      expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
      expect(screen.getByText("كريم أحمد")).toBeInTheDocument();
      expect(screen.getByText("سامح إبراهيم")).toBeInTheDocument();
      expect(screen.getByText("ممتاز (0)")).toBeInTheDocument();
      expect(screen.getByText("2 إعادات")).toBeInTheDocument();
    });
  });

  it("triggers reload when refresh button is clicked", async () => {
    render(<TechnicianProductivityView />);

    await waitFor(() => {
      expect(mockFetchProductivity).toHaveBeenCalledTimes(1);
    });

    const refreshBtn = screen.getByRole("button", { name: "تحديث" });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockFetchProductivity).toHaveBeenCalledTimes(2);
    });
  });

  it("renders EmptyState when no data is returned", async () => {
    mockFetchProductivity.mockResolvedValue([]);
    render(<TechnicianProductivityView />);

    await waitFor(() => {
      expect(screen.getByText("لا توجد بيانات متاحة")).toBeInTheDocument();
      expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
    });
  });
});
