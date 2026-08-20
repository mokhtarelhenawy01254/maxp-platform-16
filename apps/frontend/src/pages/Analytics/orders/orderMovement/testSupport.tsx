import React from "react";

export const buildSharedMock = () => ({
  fetchMovement: jest.fn(),
  getStatusLabel: (code: string) => `st:${String(code || "")}`,
  getStatusColorClass: () => "bg-gray-100",
  statusChartColor: (_code: string, index = 0) => `#${(index + 1).toString(16).padStart(6, "0")}`,
  formatNumber: (value: number | null | undefined) => String(Number(value || 0)),
  formatCurrency: (value: number | null | undefined) => `${String(Number(value || 0))} ╪¼.┘à`,
  formatPercent: (value: number | null | undefined, digits = 1) => `${Number(value || 0).toFixed(digits)}%`,
  formatDuration: (hours: number | null | undefined) => `${Math.round(Number(hours || 0))}╪│`,
  formatDate: (value: string | null | undefined) => (value ? "date" : "-"),
  formatDateTime: (value: string | null | undefined) => (value ? "datetime" : "-"),
  CHART_TOOLTIP_STYLE: { borderRadius: "8px" } as const,
  CHART_PALETTE: ["#000000"],
  KpiCard: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div data-testid="kpi">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
  MovementCard: ({ title, children }: { title?: string; children?: React.ReactNode }) => (
    <div>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  ),
  StatusPill: ({ code }: { code: string }) => <span data-testid="status-pill">{code}</span>,
  AutoBadge: ({ auto }: { auto: boolean }) => <span>{auto ? "╪¬┘ä┘é╪º╪ª┘è" : "┘è╪»┘ê┘è"}</span>,
  LoadingState: () => <div data-testid="loading">loading</div>,
  ErrorState: ({ message }: { message: string }) => <div data-testid="error">{message}</div>,
  EmptyState: () => <div data-testid="empty">empty</div>,
  TruncatedNotice: () => null,
  ModeToggle: () => <div data-testid="mode-toggle" />,
});

const ChartStub = ({ children }: { children?: React.ReactNode }) => (
  <div data-testid="chart-stub">{children}</div>
);

export const buildRechartsMock = () => ({
  ResponsiveContainer: ChartStub,
  PieChart: ChartStub,
  Pie: ChartStub,
  Cell: () => null,
  Tooltip: () => null,
  Legend: () => null,
  BarChart: ChartStub,
  Bar: ChartStub,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Sankey: ChartStub,
  SankeyNode: () => null,
  SankeyLink: () => null,
});
