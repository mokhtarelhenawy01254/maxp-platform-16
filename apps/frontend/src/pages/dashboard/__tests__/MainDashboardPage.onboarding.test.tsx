import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import MainDashboardPage from "../MainDashboardPage";

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opts?: { name?: string }) => {
      if (k === "companyDashboard.welcome" && opts?.name) {
        return `أهلًا ${opts.name}`;
      }
      return k;
    },
    i18n: { language: "ar" },
  }),
}));

let mockUser: { company?: { name?: string; activeApps?: string[] }; companyId?: string } = {
  company: {
    name: "Harmoney Dental Lab",
    activeApps: ["dental-lab-app"],
  },
  companyId: "dental-lab-123",
};

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({ user: mockUser }),
}));

let mockDashboardData: any = null;

jest.mock("../../../hooks/useDashboardData", () => ({
  useDashboardData: () => ({
    data: { data: mockDashboardData },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isFetching: false,
  }),
}));

jest.mock("../../../hooks/useDashboardLiveSync", () => ({
  useDashboardLiveSync: () => ({ activities: [], liveCount: 0 }),
}));

jest.mock("../../../hooks/useWidgetData", () => ({
  useWidgetData: () => ({ data: {} }),
}));

jest.mock("../../../components/dashboard/QuickActions", () => ({
  QuickActions: () => <div data-testid="quick-actions">Quick Actions</div>,
}));

jest.mock("..", () => ({
  DashboardSkeleton: () => <div data-testid="skeleton">Skeleton</div>,
  OnboardingChecklist: () => <div data-testid="onboarding-checklist">Onboarding Checklist</div>,
  DashboardExportMenu: () => <div data-testid="export-menu">Export</div>,
}));

jest.mock("../../../components/dashboard/SpecialtyDashboardHeader", () => ({
  SpecialtyDashboardHeader: ({ dashboard }: any) => (
    <div data-testid="specialty-header">
      لوحة إدارة معمل الأسنان والحالات - {dashboard?.company?.name}
    </div>
  ),
}));

jest.mock("../../../components/dashboard/InstalledAppsDashboard", () => ({
  InstalledAppsDashboard: () => <div data-testid="installed-apps">Installed Apps</div>,
}));

jest.mock("../../../components/dashboard/widgets", () => ({
  AppWidgetGrid: () => <div data-testid="app-widget-grid">Widget Grid</div>,
  getWidgetsForApps: () => [],
}));

jest.mock("../../../components/dashboard/DashboardActivityFeed", () => ({
  DashboardActivityFeed: () => <div data-testid="activity-feed">Activity Feed</div>,
}));

jest.mock("../../../components/dashboard/DashboardAlertsHub", () => ({
  DashboardAlertsHub: () => <div data-testid="alerts-hub">Alerts Hub</div>,
}));

jest.mock("../SetupProgressBanner", () => ({
  SetupProgressBanner: () => <div data-testid="setup-progress">Setup Progress</div>,
}));

jest.mock("../DateRangeToolbar", () => ({
  __esModule: true,
  default: () => <div data-testid="date-range-toolbar">Toolbar</div>,
}));

jest.mock("../../../components/dashboard/DashboardStatusBar", () => ({
  DashboardStatusBar: () => <div data-testid="dashboard-status-bar">Status Bar</div>,
}));

describe("MainDashboardPage Onboarding & Specialty Behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does NOT show store onboarding checklist for dental labs even when counts are 0, and renders the specialty dashboard", () => {
    mockUser = {
      company: {
        name: "Harmoney Dental Lab",
        activeApps: ["dental-lab-app"],
      },
      companyId: "dental-lab-123",
    };

    // Zero retail counts (isEmpty is true)
    mockDashboardData = {
      company: { id: "dental-lab-123", name: "Harmoney Dental Lab", slug: "harmoney-dental-lab" },
      businessSpecialty: { slug: "dental-lab", nameAr: "معمل أسنان" },
      installedApps: [{ slug: "dental-lab-app", name: "Dental Lab App" }],
      counts: { orders: 0, products: 0, customers: 0 },
      financials: { totalRevenue: 0 },
    };

    render(<MainDashboardPage />);

    // Welcome title should be rendered
    expect(screen.getByText("أهلًا Harmoney Dental Lab")).toBeInTheDocument();

    // The specialty header MUST be rendered
    expect(screen.getByTestId("specialty-header")).toBeInTheDocument();

    // Mode switcher buttons must be present
    expect(screen.getByText("لوحة التخصص والأعمال")).toBeInTheDocument();

    // The store onboarding checklist MUST NOT be displayed!
    expect(screen.queryByTestId("onboarding-checklist")).not.toBeInTheDocument();
  });

  it("shows store onboarding checklist embedded in the dashboard view when company has store app and counts are 0", () => {
    mockUser = {
      company: {
        name: "My Fashion Store",
        activeApps: ["store"],
      },
      companyId: "store-456",
    };

    mockDashboardData = {
      company: { id: "store-456", name: "My Fashion Store", slug: "my-fashion-store" },
      businessSpecialty: { slug: "fashion", nameAr: "أزياء وملابس" },
      installedApps: [{ slug: "store", name: "المتجر الإلكتروني" }],
      counts: { orders: 0, products: 0, customers: 0 },
      financials: { totalRevenue: 0 },
    };

    render(<MainDashboardPage />);

    // Welcome title & switcher must still exist (not blocked out of dashboard)
    expect(screen.getByText("أهلًا My Fashion Store")).toBeInTheDocument();
    expect(screen.getByText("لوحة التخصص والأعمال")).toBeInTheDocument();

    // Store onboarding checklist SHOULD be shown embedded
    expect(screen.getByTestId("onboarding-checklist")).toBeInTheDocument();
  });
});
