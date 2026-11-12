import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Make expect available globally for @testing-library/jest-dom
(globalThis as unknown as { expect: typeof expect }).expect = expect;

// Polyfill DOM prototypes for jsdom
Element.prototype.scrollIntoView = vi.fn();

if (typeof window !== "undefined") {
  window.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  window.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

// Polyfill localStorage on globalThis & window for Node 22+ / jsdom environments
const createStorageMock = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

const storageMock = createStorageMock();
Object.defineProperty(globalThis, "localStorage", {
  value: storageMock,
  writable: true,
  configurable: true,
});
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: storageMock,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Hoisted stubs for heavy providers & external services
const { mockUseAuth, mockUseVisualTheme, mockSocketObj } = vi.hoisted(() => {
  const socket = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    getSocket: vi.fn(() => null),
  };
  return {
    mockUseAuth: vi.fn(),
    mockUseVisualTheme: vi.fn(),
    mockSocketObj: socket,
  };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const dictionary: Record<string, string> = {
        "appDashboard.backToApps": "الرجوع للتطبيقات",
        "appDashboard.openAppMenu": "فتح قائمة التطبيق",
        "appDashboard.closeAppMenu": "إغلاق قائمة التطبيق",
        "sidebar.backToCompanies": "الرجوع للتطبيقات",
        "superAdmin.sidebar.companies": "إدارة الشركات",
        "superAdmin.sidebar.dashboard": "لوحة التحكم المركزية",
        "superAdmin.controlPanel": "التحكم الذكي",
      };
      return dictionary[key] ?? fallback ?? key;
    },
    i18n: {
      language: "ar",
      dir: () => "rtl",
    },
  }),
}));

vi.mock("@/i18n", () => ({
  __esModule: true,
  default: {
    isInitialized: true,
    language: "ar",
    dir: () => "rtl",
    t: (key: string, fallback?: string) => {
      const dictionary: Record<string, string> = {
        "appDashboard.backToApps": "الرجوع للتطبيقات",
        "superAdmin.sidebar.companies": "إدارة الشركات",
        "superAdmin.sidebar.dashboard": "لوحة التحكم المركزية",
      };
      return dictionary[key] ?? fallback ?? key;
    },
  },
}));

vi.mock("../../../i18n", () => ({
  __esModule: true,
  default: {
    isInitialized: true,
    language: "ar",
    dir: () => "rtl",
    t: (key: string, fallback?: string) => {
      const dictionary: Record<string, string> = {
        "appDashboard.backToApps": "الرجوع للتطبيقات",
        "superAdmin.sidebar.companies": "إدارة الشركات",
        "superAdmin.sidebar.dashboard": "لوحة التحكم المركزية",
      };
      return dictionary[key] ?? fallback ?? key;
    },
  },
}));

vi.mock("@/hooks/useAuthSimple", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/contexts/VisualThemeContext", () => ({
  useVisualTheme: () => mockUseVisualTheme(),
}));

vi.mock("../../../contexts/VisualThemeContext", () => ({
  useVisualTheme: () => mockUseVisualTheme(),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("../../../hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("@/components/ui/theme-toggle", () => ({
  __esModule: true,
  default: () => <button type="button">Theme</button>,
}));

vi.mock("../ui/theme-toggle", () => ({
  __esModule: true,
  default: () => <button type="button">Theme</button>,
}));

vi.mock("@/components/common/CompanySwitcher", () => ({
  __esModule: true,
  default: () => <button type="button">Company Switcher</button>,
}));

vi.mock("../../common/CompanySwitcher", () => ({
  __esModule: true,
  default: () => <button type="button">Company Switcher</button>,
}));

vi.mock("@/components/common/LanguageSwitcher", () => ({
  __esModule: true,
  default: () => <button type="button">Language</button>,
}));

vi.mock("../../common/LanguageSwitcher", () => ({
  __esModule: true,
  default: () => <button type="button">Language</button>,
}));

vi.mock("@/components/notifications/NotificationDropdown", () => ({
  __esModule: true,
  default: () => <button type="button">Notifications</button>,
}));

vi.mock("../../notifications/NotificationDropdown", () => ({
  __esModule: true,
  default: () => <button type="button">Notifications</button>,
}));

vi.mock("@/components/common/AppUpdateIndicator", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../common/AppUpdateIndicator", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/config/environment", () => ({
  envConfig: {
    apiUrl: "http://localhost:3000",
    wsUrl: "ws://localhost:3000",
    appUrl: "http://localhost:5173",
    backendUrl: "http://localhost:3000",
  },
  isCapacitorNative: vi.fn(() => false),
}));

vi.mock("../../../config/environment", () => ({
  envConfig: {
    apiUrl: "http://localhost:3000",
    wsUrl: "ws://localhost:3000",
    appUrl: "http://localhost:5173",
    backendUrl: "http://localhost:3000",
  },
  isCapacitorNative: vi.fn(() => false),
}));

vi.mock("@/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ status: 200, data: { success: true, data: {} } })),
    post: vi.fn(() => Promise.resolve({ status: 200, data: { success: true } })),
    put: vi.fn(() => Promise.resolve({ status: 200, data: { success: true } })),
    delete: vi.fn(() => Promise.resolve({ status: 200, data: { success: true } })),
  },
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(() => Promise.resolve({ status: 200, data: { success: true, data: {} } })),
    post: vi.fn(() => Promise.resolve({ status: 200, data: { success: true } })),
    put: vi.fn(() => Promise.resolve({ status: 200, data: { success: true } })),
    delete: vi.fn(() => Promise.resolve({ status: 200, data: { success: true } })),
  },
}));

vi.mock("@/services/companyAwareApi", () => ({
  companyAwareApi: {
    get: vi.fn(() => Promise.resolve({ status: 200, data: { success: true, count: 0 } })),
    post: vi.fn(() => Promise.resolve({ status: 200, data: { success: true } })),
  },
}));

vi.mock("../../../services/companyAwareApi", () => ({
  companyAwareApi: {
    get: vi.fn(() => Promise.resolve({ status: 200, data: { success: true, count: 0 } })),
    post: vi.fn(() => Promise.resolve({ status: 200, data: { success: true } })),
  },
}));

vi.mock("@/services/socketService", () => ({
  __esModule: true,
  default: mockSocketObj,
  socketService: mockSocketObj,
}));

vi.mock("../../../services/socketService", () => ({
  __esModule: true,
  default: mockSocketObj,
  socketService: mockSocketObj,
}));

vi.mock("@/components/common/RouteErrorBoundary", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../common/RouteErrorBoundary", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/common/PageExplanations", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../common/PageExplanations", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/ActiveUsersMonitor", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("../../ActiveUsersMonitor", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/components/merchant-copilot", () => ({
  __esModule: true,
  MerchantCopilot: () => null,
  MerchantCopilotDrawer: () => null,
  MerchantCopilotHost: () => null,
  toggleMerchantCopilot: () => {},
}));

vi.mock("../../merchant-copilot", () => ({
  __esModule: true,
  MerchantCopilot: () => null,
  MerchantCopilotDrawer: () => null,
  MerchantCopilotHost: () => null,
  toggleMerchantCopilot: () => {},
}));

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import "@testing-library/jest-dom/vitest";

// Import real Layout (NOT mocked)
import Layout from "../Layout";

const SuperAdminCompanyDetailsRedirect: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  return <Navigate to={`/super-admin/companies-v2/${companyId || ""}`} replace />;
};

const superAdminUser = {
  id: "superadmin-user-1",
  firstName: "Super",
  lastName: "Admin",
  email: "superadmin@maxp.local",
  role: "SUPER_ADMIN",
  companyId: "cmopgxu3a07i4jujj6f1oh32h",
  hasMultipleCompanies: true,
  company: {
    id: "cmopgxu3a07i4jujj6f1oh32h",
    name: "MAX-P Control",
    sidebarLayout: "app-dashboard",
    activeApps: ["ecommerce-basic"],
  },
  companies: [
    {
      id: "cmopgxu3a07i4jujj6f1oh32h",
      name: "MAX-P Control",
      role: "SUPER_ADMIN",
      isCurrent: true,
      sidebarLayout: "app-dashboard",
      activeApps: ["ecommerce-basic"],
    },
  ],
};

describe("Super Admin Company Details Shell Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.clear();

    mockUseVisualTheme.mockReturnValue({
      currentTheme: { id: "business-os-enterprise" },
    });

    mockUseAuth.mockReturnValue({
      user: superAdminUser,
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      switchCompany: vi.fn(),
    });
  });

  it("renders the company details route inside the shell with sidebar, header, and companies menu item", async () => {
    const testCompanyId = "cmuuxrfpz08cdju0waqwzfrf0";

    const { container } = render(
      <MemoryRouter initialEntries={[`/super-admin/companies-v2/${testCompanyId}`]}>
        <Layout>
          <div data-testid="company-details-body">محتوى تفاصيل الشركة</div>
        </Layout>
      </MemoryRouter>,
    );

    // 1. Mandatory assertion: Shell renders the sidebar aside element(s)
    await waitFor(
      () => {
        const asides = container.querySelectorAll("aside");
        expect(asides.length).toBeGreaterThanOrEqual(1);
      },
      { timeout: 3000 },
    );

    // 2. Mandatory assertion: Header/shell renders "الرجوع للتطبيقات" (or header element)
    const backToAppsMatches = screen.getAllByText(/الرجوع للتطبيقات/);
    expect(backToAppsMatches.length).toBeGreaterThanOrEqual(1);

    // Also assert header element is present in the rendered shell tree
    const headerElement = container.querySelector("header");
    expect(headerElement).toBeInTheDocument();

    // 3. Mandatory assertion: Sidebar navigation item "إدارة الشركات" exists and links to /super-admin/companies-v2
    const companiesNavItems = screen.getAllByText(/إدارة الشركات/);
    expect(companiesNavItems.length).toBeGreaterThanOrEqual(1);

    const companiesLink = container.querySelector('a[href="/super-admin/companies-v2"]');
    expect(companiesLink).toBeInTheDocument();

    // Verify child content is properly rendered inside the layout shell
    expect(screen.getByTestId("company-details-body")).toBeInTheDocument();
  });

  it("handles legacy route /super-admin/companies/:companyId redirect into /super-admin/companies-v2/:companyId inside the shell", async () => {
    const testCompanyId = "cmuuxrfpz08cdju0waqwzfrf0";

    const { container } = render(
      <MemoryRouter initialEntries={[`/super-admin/companies/${testCompanyId}`]}>
        <Routes>
          <Route
            path="/super-admin/companies/:companyId"
            element={<SuperAdminCompanyDetailsRedirect />}
          />
          <Route
            path="/super-admin/companies-v2/:companyId"
            element={
              <Layout>
                <div data-testid="company-details-redirected">تم التحويل لتفاصيل الشركة v2</div>
              </Layout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    // Verify redirected page renders inside the shell
    await waitFor(
      () => {
        expect(screen.getByTestId("company-details-redirected")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );

    const asides = container.querySelectorAll("aside");
    expect(asides.length).toBeGreaterThanOrEqual(1);

    const backToAppsMatches = screen.getAllByText(/الرجوع للتطبيقات/);
    expect(backToAppsMatches.length).toBeGreaterThanOrEqual(1);

    const companiesLink = container.querySelector('a[href="/super-admin/companies-v2"]');
    expect(companiesLink).toBeInTheDocument();
  });
});
