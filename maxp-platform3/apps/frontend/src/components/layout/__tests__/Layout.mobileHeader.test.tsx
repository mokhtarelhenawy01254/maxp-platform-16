import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "../Layout";

const mockUseAuth = jest.fn();
const mockUseVisualTheme = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

jest.mock("../../../config/sidebar", () => ({
  getSidebarConfig: () => [],
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
    get: jest.fn(),
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
});
