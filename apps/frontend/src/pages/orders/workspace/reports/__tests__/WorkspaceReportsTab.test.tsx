jest.mock("../../../../../i18n", () => ({
  __esModule: true,
  default: { t: (key: string) => key },
}));

jest.mock("../useWorkspaceReports", () => ({
  useWorkspaceReports: jest.fn(),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkspaceReportsTab } from "../../WorkspaceReportsTab";
import { useWorkspaceReports } from "../useWorkspaceReports";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "ar" },
  }),
}));

// Mock trend chart
jest.mock("../ReportsTrendChart", () => ({
  ReportsTrendChart: () => <div data-testid="mock-trend-chart">Trend Chart</div>,
}));

const mockData: useWorkspaceReportsHook.WorkspaceReportsData = {
  kpis: {
    contactedOrders: { value: 120, deltaPercent: 5, prevValue: 114, source: "call_attempt_logs" },
    confirmedOrders: { value: 95, deltaPercent: 8, prevValue: 88, source: "orders.CONFIRMED" },
    confirmationRate: { value: 79.2, deltaPercent: 2, prevValue: 77.2, source: "calculated" },
    followUpOrders: { value: 15, deltaPercent: -3, prevValue: 18, source: "callback" },
    cancelledOrders: { value: 10, deltaPercent: 0, prevValue: 10, source: "orders.CANCELLED" },
    openOrders: { value: 25, deltaPercent: 0, prevValue: 25, source: "order_assignments" },
    totalCalls: { value: 180, deltaPercent: 4, prevValue: 173, source: "call_attempt_logs" },
    totalDurationSeconds: { value: 7200, deltaPercent: 6, prevValue: 6800, source: "call_attempt_logs" },
    avgAttemptsPerOrder: { value: 1.5, deltaPercent: 0, prevValue: 1.5, source: "calculated" },
    avgHandlingTimeMinutes: { value: 24, deltaPercent: -5, prevValue: 25.3, source: "calculated" },
  },
  dailyTrend: [],
  agentBreakdown: [
    {
      agentId: "ag-1",
      agentName: "سارة محمود",
      role: "AGENT",
      contactedOrders: 60,
      confirmedOrders: 50,
      confirmationRate: 83.3,
      followUpOrders: 6,
      cancelledOrders: 4,
      openOrders: 10,
      totalCalls: 90,
      totalDurationSeconds: 3600,
      avgAttemptsPerOrder: 1.5,
      avgHandlingTimeMinutes: 20,
    },
    {
      agentId: "ag-2",
      agentName: "أحمد علي",
      role: "AGENT",
      contactedOrders: 60,
      confirmedOrders: 45,
      confirmationRate: 75.0,
      followUpOrders: 9,
      cancelledOrders: 6,
      openOrders: 15,
      totalCalls: 90,
      totalDurationSeconds: 3600,
      avgAttemptsPerOrder: 1.5,
      avgHandlingTimeMinutes: 28,
    },
  ],
  agents: [
    { id: "ag-1", name: "سارة محمود" },
    { id: "ag-2", name: "أحمد علي" },
  ],
};

describe("WorkspaceReportsTab", () => {
  it("renders 8 primary KPI cards and breakdown table", () => {
    (useWorkspaceReports as unknown as jest.Mock).mockReturnValue({
      range: "today",
      startDate: "2026-10-17",
      endDate: "2026-10-17",
      selectedAgentId: "all",
      data: mockData,
      loading: false,
      refreshing: false,
      error: null,
      handleRangeChange: jest.fn(),
      handleCustomDatesChange: jest.fn(),
      handleAgentChange: jest.fn(),
      refresh: jest.fn(),
      exportCsv: jest.fn(),
    });

    render(<WorkspaceReportsTab isManager={true} />);

    expect(screen.getByText("أوردرات تم التواصل بها")).toBeInTheDocument();
    expect(screen.getAllByText("120").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("طلبات مؤكدة")).toBeInTheDocument();
    expect(screen.getAllByText("95").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("سارة محمود").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("أحمد علي").length).toBeGreaterThanOrEqual(1);
  });

  it("handles date range change when clicked", () => {
    const handleRangeChange = jest.fn();
    (useWorkspaceReports as unknown as jest.Mock).mockReturnValue({
      range: "today",
      startDate: "2026-10-17",
      endDate: "2026-10-17",
      selectedAgentId: "all",
      data: mockData,
      loading: false,
      refreshing: false,
      error: null,
      handleRangeChange,
      handleCustomDatesChange: jest.fn(),
      handleAgentChange: jest.fn(),
      refresh: jest.fn(),
      exportCsv: jest.fn(),
    });

    render(<WorkspaceReportsTab isManager={true} />);

    const yesterdayBtn = screen.getByRole("button", { name: "أمس" });
    fireEvent.click(yesterdayBtn);
    expect(handleRangeChange).toHaveBeenCalledWith("yesterday");
  });

  it("calls exportCsv when export CSV button is clicked", () => {
    const exportCsv = jest.fn();
    (useWorkspaceReports as unknown as jest.Mock).mockReturnValue({
      range: "today",
      startDate: "2026-10-17",
      endDate: "2026-10-17",
      selectedAgentId: "all",
      data: mockData,
      loading: false,
      refreshing: false,
      error: null,
      handleRangeChange: jest.fn(),
      handleCustomDatesChange: jest.fn(),
      handleAgentChange: jest.fn(),
      refresh: jest.fn(),
      exportCsv,
    });

    render(<WorkspaceReportsTab isManager={true} />);

    const exportBtn = screen.getByRole("button", { name: /تصدير CSV/i });
    fireEvent.click(exportBtn);
    expect(exportCsv).toHaveBeenCalled();
  });
});
