import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import '@testing-library/jest-dom/vitest';

const { mockAuth, mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockAuth: {
    current: {
      isAuthenticated: true,
      user: {
        id: "user-1",
        role: "ADMIN",
        activeApps: ["whatsapp-business"],
        company: {
          id: "company-1",
          activeApps: ["whatsapp-business"],
        },
      } as any,
    },
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/whatsapp" }),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate-redirect" data-to={to} />,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockAuth.current,
}));

vi.mock("@/hooks/useAuthSimple", () => ({
  useAuth: () => mockAuth.current,
}));

import { AppAccessRoute } from "../AppAccessRoute";

describe("AppAccessRoute with overlay-blur mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders children directly and cleanly when subscription is active", () => {
    mockAuth.current = {
      isAuthenticated: true,
      user: {
        id: "user-1",
        role: "ADMIN",
        activeApps: ["whatsapp-business"],
        company: {
          id: "company-1",
          activeApps: ["whatsapp-business"],
        },
      },
    };

    render(
      <AppAccessRoute requiredAppSlugs={["whatsapp-business", "whatsapp-cloud-api"]} redirectMode="overlay-blur">
        <div data-testid="whatsapp-live-content">WhatsApp Chat Interface</div>
      </AppAccessRoute>
    );

    // Active subscription: content is visible without blur wrapper or alert dialog
    expect(screen.getByTestId("whatsapp-live-content")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders locked blurred container and renewal modal when subscription is expired/missing", () => {
    mockAuth.current = {
      isAuthenticated: true,
      user: {
        id: "user-1",
        role: "ADMIN",
        activeApps: [], // No active whatsapp app
        company: {
          id: "company-1",
          activeApps: [],
        },
      },
    };

    render(
      <AppAccessRoute requiredAppSlugs={["whatsapp-business", "whatsapp-cloud-api"]} redirectMode="overlay-blur">
        <div data-testid="whatsapp-live-content">WhatsApp Chat Interface</div>
      </AppAccessRoute>
    );

    // Locked blurred underlying app is present
    expect(screen.getByTestId("whatsapp-live-content")).toBeInTheDocument();

    // Alert dialog renewal pop-up is shown
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("انتهى الاشتراك الشهري")).toBeInTheDocument();
    expect(screen.getByText(/اشتراك «واتساب للأعمال» منتهي/)).toBeInTheDocument();
    expect(screen.getByText(/تطبيقك وبيانات الربط والمحادثات محفوظة ومثبتة بالكامل/)).toBeInTheDocument();

    // Action buttons
    const renewBtn = screen.getByText("تجديد الاشتراك الآن");
    expect(renewBtn).toBeInTheDocument();
    fireEvent.click(renewBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/marketplace/whatsapp-business");

    const dashboardBtn = screen.getByText("العودة إلى لوحة التحكم");
    expect(dashboardBtn).toBeInTheDocument();
    fireEvent.click(dashboardBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
  });

  it("SUPER_ADMIN always bypasses without blur or modal", () => {
    mockAuth.current = {
      isAuthenticated: true,
      user: {
        id: "super-1",
        role: "SUPER_ADMIN",
        activeApps: [],
        company: null,
      },
    };

    render(
      <AppAccessRoute requiredAppSlugs={["whatsapp-business", "whatsapp-cloud-api"]} redirectMode="overlay-blur">
        <div data-testid="whatsapp-live-content">Super Admin View</div>
      </AppAccessRoute>
    );

    expect(screen.getByTestId("whatsapp-live-content")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("defaults to overlay-blur mode and shows reassuring dental lab copy for expired dental lab app", () => {
    mockAuth.current = {
      isAuthenticated: true,
      user: {
        id: "user-dental-1",
        role: "OWNER",
        activeApps: [], // Expired
        company: {
          id: "company-dental-1",
          activeApps: [],
        },
      },
    };

    render(
      <AppAccessRoute requiredAppSlugs={["dental-lab-app", "dental-lab"]}>
        <div data-testid="dental-cases-bench">Dental Lab Active Cases Bench</div>
      </AppAccessRoute>
    );

    // Underlying app is preserved and rendered in blurred state (not redirected to /marketplace!)
    expect(screen.getByTestId("dental-cases-bench")).toBeInTheDocument();

    // Alert dialog overlay is present
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("انتهى الاشتراك الشهري")).toBeInTheDocument();
    expect(screen.getByText(/اشتراك «معمل الأسنان» منتهي/)).toBeInTheDocument();
    expect(screen.getByText(/جميع بياناتك، سجلات الحالات، أطباء الأسنان، الفواتير، وفريق العمل محفوظة بالكامل/)).toBeInTheDocument();

    const renewBtn = screen.getByText("تجديد الاشتراك الآن");
    expect(renewBtn).toBeInTheDocument();
    fireEvent.click(renewBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/marketplace/dental-lab-app");
  });
});
