import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "../Layout";

const mockUseAuth = jest.fn();
const mockUseVisualTheme = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "ar",
      dir: () => "rtl",
    },
  }),
}));

jest.mock("../../../i18n", () => ({
  __esModule: true,
  default: {
    isInitialized: true,
    language: "ar",
    dir: () => "rtl",
  },
}));

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../../contexts/VisualThemeContext", () => ({
  useVisualTheme: () => mockUseVisualTheme(),
}));

jest.mock("../../../config/environment", () => ({
  envConfig: {
    apiUrl: "http://localhost:3000",
    wsUrl: "ws://localhost:3000",
    appUrl: "http://localhost:5173",
    backendUrl: "http://localhost:3000",
  },
}));

jest.mock("@/config/environment", () => ({
  envConfig: {
    apiUrl: "http://localhost:3000",
    wsUrl: "ws://localhost:3000",
    appUrl: "http://localhost:5173",
    backendUrl: "http://localhost:3000",
  },
}));

jest.mock("../../../config/sidebar", () => ({
  getSidebarConfig: () => [],
}));

jest.mock("../../../utils/storeUrl", () => ({
  buildStoreUrl: jest.fn(() => "https://example.com/shop"),
}));

jest.mock("../../../services/socketService", () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
  socketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
}));

jest.mock("../../common/PageExplanations", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../sidebar/SidebarLayoutFactory", () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar-layout-factory" />,
}));

jest.mock("../SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}));

jest.mock("../../common/CompanySwitcher", () => ({
  __esModule: true,
  default: ({ collapsed = false }: { collapsed?: boolean }) => (
    <button data-collapsed={collapsed ? "true" : "false"} type="button">
      Company Switcher
    </button>
  ),
}));

jest.mock("../../common/LanguageSwitcher", () => ({
  __esModule: true,
  default: ({ className = "" }: { className?: string }) => (
    <button className={className} type="button">
      Language
    </button>
  ),
}));

jest.mock("../../notifications/NotificationDropdown", () => ({
  __esModule: true,
  default: ({ className = "" }: { className?: string }) => (
    <button className={className} type="button">
      Notifications
    </button>
  ),
}));

jest.mock("../../ui/theme-toggle", () => ({
  __esModule: true,
  default: () => <button type="button">Theme</button>,
}));

jest.mock("../../ActiveUsersMonitor", () => ({
  __esModule: true,
  default: () => <div data-testid="active-users-monitor" />,
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(() => Promise.resolve({ status: 200, data: { success: true, data: {} } })),
  },
}));

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
};

describe("Layout mobile account visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setViewportWidth(400);

    mockUseVisualTheme.mockReturnValue({
      currentTheme: { id: "business-os-enterprise" },
    });

    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        firstName: "H2m",
        lastName: "Owner",
        email: "owner@example.com",
        role: "OWNER",
        companyId: "company-1",
        hasMultipleCompanies: true,
        company: {
          id: "company-1",
          name: "Swan",
          sidebarLayout: "three-tier",
          activeApps: ["crm-basic", "ecommerce-basic", "hr-basic"],
        },
        companies: [
          {
            id: "company-1",
            name: "Swan",
            role: "OWNER",
            isCurrent: true,
            sidebarLayout: "three-tier",
            activeApps: ["crm-basic", "ecommerce-basic", "hr-basic"],
          },
          {
            id: "company-2",
            name: "HO",
            role: "OWNER",
            isCurrent: false,
            sidebarLayout: "three-tier",
            activeApps: ["crm-basic", "ecommerce-basic", "hr-basic"],
          },
        ],
      },
      logout: jest.fn(),
    });
  });

  it("keeps the account control visible in the mobile header and collapses the company switcher", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/company-dashboard"]}>
        <Layout>
          <div>Dashboard body</div>
        </Layout>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        container.querySelector(".business-shell-mobile-profile-slot"),
      ).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    const compactProfileButton = container.querySelector(
      ".business-shell-mobile-profile-slot .business-shell-profile-button--compact",
    );
    expect(compactProfileButton).toBeInTheDocument();
    expect(
      container.querySelector(".business-shell-profile-row"),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Company Switcher")).toHaveAttribute(
      "data-collapsed",
      "true",
    );
  });

  it("renders the super admin impersonation banner at the top without cluttering the primary header", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const fakeToken = `header.${btoa(JSON.stringify({ exp: futureExp }))}.signature`;
    const storageStore: Record<string, string> = {
      superAuth: fakeToken,
      superUser: JSON.stringify({ id: "super-1", role: "SUPER_ADMIN" }),
    };
    jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation((key: string) => storageStore[key] ?? null);
    (localStorage.getItem as jest.Mock).mockImplementation(
      (key: string) => storageStore[key] ?? null,
    );

    const { container } = render(
      <MemoryRouter initialEntries={["/apps"]}>
        <Layout>
          <div>Apps dashboard</div>
        </Layout>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        container.querySelector(".impersonation-top-banner"),
      ).toBeInTheDocument();
    });

    // Verify the impersonation banner is at top and contains return button
    expect(screen.getByText("sidebar.backToCompanies")).toBeInTheDocument();
    expect(screen.getByText("sidebar.superAdminLogin")).toBeInTheDocument();

    // Verify the header primary does NOT contain a cramped chip
    expect(
      container.querySelector(".business-shell-header-primary .business-shell-chip"),
    ).not.toBeInTheDocument();

    localStorage.removeItem("superAuth");
    localStorage.removeItem("superUser");
  });

  it("opens profile dropdown with left-0 in RTL mode to prevent overflowing off-screen", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/company-dashboard"]}>
        <Layout>
          <div>Dashboard body</div>
        </Layout>
      </MemoryRouter>,
    );

    const profileButton = container.querySelector(".business-shell-profile-button");
    expect(profileButton).toBeInTheDocument();

    fireEvent.click(profileButton!);

    const menu = container.querySelector(".business-shell-menu");
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveClass("left-0");
    expect(menu).not.toHaveClass("right-0");
  });

  it("renders company logo with resolved backend url and company name on mobile header", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        firstName: "Test",
        lastName: "Owner",
        email: "test@example.com",
        role: "OWNER",
        companyId: "company-1",
        company: {
          id: "company-1",
          name: "Acme Store",
          logo: "/uploads/companies/acme.png",
          sidebarLayout: "three-tier",
          activeApps: ["ecommerce-basic"],
        },
        companies: [
          {
            id: "company-1",
            name: "Acme Store",
            logo: "/uploads/companies/acme.png",
            role: "OWNER",
            isCurrent: true,
            sidebarLayout: "three-tier",
            activeApps: ["ecommerce-basic"],
          },
        ],
      },
      logout: jest.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/apps"]}>
        <Layout>
          <div>Apps content</div>
        </Layout>
      </MemoryRouter>,
    );

    const logoImg = screen.getByRole("img", { name: "Acme Store" });
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute("src", "http://localhost:3000/uploads/companies/acme.png");
    expect(screen.getByText("Acme Store")).toBeInTheDocument();
  });

  it("renders company monogram letter fallback when company has no custom logo", async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "user-1",
        firstName: "Test",
        lastName: "Owner",
        email: "test@example.com",
        role: "OWNER",
        companyId: "company-1",
        company: {
          id: "company-1",
          name: "NoLogo Store",
          logo: null,
          sidebarLayout: "three-tier",
          activeApps: ["ecommerce-basic"],
        },
        companies: [
          {
            id: "company-1",
            name: "NoLogo Store",
            logo: null,
            role: "OWNER",
            isCurrent: true,
            sidebarLayout: "three-tier",
            activeApps: ["ecommerce-basic"],
          },
        ],
      },
      logout: jest.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/apps"]}>
        <Layout>
          <div>Apps content</div>
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("img", { name: "NoLogo Store" })).not.toBeInTheDocument();
    expect(screen.getByText("N")).toBeInTheDocument();
    expect(screen.getByText("NoLogo Store")).toBeInTheDocument();
  });
});
