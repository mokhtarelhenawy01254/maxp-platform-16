// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SidebarLayoutFactory from "../SidebarLayoutFactory";
import HorizontalNav from "../HorizontalNav";
import type { SidebarSection } from "../../../../types/layout";

if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
  }
}

vi.mock("../../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      firstName: "Test",
      lastName: "User",
      company: { name: "Test Co" },
    },
    logout: vi.fn(),
  }),
}));

vi.mock("../../../../hooks/useRoutePrefetch", () => ({
  useRoutePrefetch: () => vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { dir: () => "ltr", language: "en" },
  }),
}));

vi.mock("../../ui/CompanyLogo", () => ({
  CompanyLogo: ({ children }: { children?: React.ReactNode }) => <div data-testid="company-logo">{children}</div>,
}));

vi.mock("../../../ui/CompanyLogo", () => ({
  CompanyLogo: ({ children }: { children?: React.ReactNode }) => <div data-testid="company-logo">{children}</div>,
}));

const mockSections: SidebarSection[] = [
  {
    id: "orders",
    title: "Orders",
    items: [
      { to: "/orders", label: "All Orders" },
      { to: "/orders/analytics", label: "Analytics" },
    ],
  },
  {
    id: "products",
    title: "Products",
    items: [
      { to: "/products", label: "All Products" },
    ],
  },
];

describe("NAV-1 Single Source Navigation (Sidebar Only)", () => {
  it("HorizontalNav component carries semantic nav with data-nav='horizontal' and .horizontal-nav", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/orders"]}>
        <HorizontalNav
          sections={mockSections}
          currentPath="/orders"
          t={(k) => k}
        />
      </MemoryRouter>
    );

    const horizontalNav = container.querySelector('nav.horizontal-nav, [data-nav="horizontal"]');
    expect(horizontalNav).not.toBeNull();
    expect(horizontalNav?.tagName.toLowerCase()).toBe("nav");
  });

  it("SidebarLayoutFactory intercepts layout='horizontal' on desktop and returns ClassicSidebar", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/orders"]}>
        <SidebarLayoutFactory
          layout="horizontal"
          isCollapsed={false}
          mobileMode={false}
          toggleSidebar={vi.fn()}
          sections={mockSections}
          collapsedSections={{}}
          toggleSection={vi.fn()}
          currentPath="/orders"
          t={(k) => k}
          searchQuery=""
          setSearchQuery={vi.fn()}
        />
      </MemoryRouter>
    );

    // Strict NAV-1: On desktop, zero HorizontalNav elements must be rendered
    const horizontalNavs = container.querySelectorAll('nav.horizontal-nav, [data-nav="horizontal"]');
    expect(horizontalNavs.length).toBe(0);

    // Must render vertical sidebar navigation
    const verticalNav = container.querySelector('nav');
    expect(verticalNav).not.toBeNull();
  });

  it("SidebarLayoutFactory returns ClassicSidebar with vertical nav for classic layout", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/orders"]}>
        <SidebarLayoutFactory
          layout="classic"
          isCollapsed={false}
          mobileMode={false}
          toggleSidebar={vi.fn()}
          sections={mockSections}
          collapsedSections={{}}
          toggleSection={vi.fn()}
          currentPath="/orders"
          t={(k) => k}
          searchQuery=""
          setSearchQuery={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(container.querySelectorAll('nav.horizontal-nav, [data-nav="horizontal"]').length).toBe(0);
    const nav = container.querySelector('nav');
    expect(nav).not.toBeNull();
  });

  it("SidebarLayoutFactory returns ThreeTierSidebar with vertical rail nav for three-tier layout", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/orders"]}>
        <SidebarLayoutFactory
          layout="three-tier"
          isCollapsed={false}
          mobileMode={false}
          toggleSidebar={vi.fn()}
          sections={mockSections}
          collapsedSections={{}}
          toggleSection={vi.fn()}
          currentPath="/orders"
          t={(k) => k}
          searchQuery=""
          setSearchQuery={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(container.querySelectorAll('nav.horizontal-nav, [data-nav="horizontal"]').length).toBe(0);
    const navs = container.querySelectorAll('nav');
    expect(navs.length).toBeGreaterThanOrEqual(1);
  });
});
