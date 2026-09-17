// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppDownloadsPage } from "../AppDownloadsPage";

vi.mock("@/hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: {
      id: "usr-12345",
      name: "Ahmed Hassan",
      companyId: "comp-9876543210-enterprise",
      company: {
        id: "comp-9876543210-enterprise",
        name: "شركة النماء للحلول",
      },
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AppDownloadsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders unified header with title, badge and action buttons", () => {
    render(
      <MemoryRouter>
        <AppDownloadsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "تطبيقات الأجهزة والموبايل" })).toBeDefined();
    expect(screen.getByText("5 حزم رسمية")).toBeDefined();
    expect(screen.getByText("متجر التطبيقات")).toBeDefined();
    expect(screen.getByText("تطبيقاتي المفعلة")).toBeDefined();
  });

  it("renders 4-card telemetry bar with device, desktop, mobile, and company token", () => {
    render(
      <MemoryRouter>
        <AppDownloadsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("جهازك المكتشف حالياً")).toBeDefined();
    expect(screen.getByText("برامج سطح المكتب")).toBeDefined();
    expect(screen.getByText("تطبيقات الموبايل والميدان")).toBeDefined();
    expect(screen.getByText("معرّف المنشأة لربط الأجهزة")).toBeDefined();
  });

  it("provides direct working download links for Windows and Android", () => {
    const { container } = render(
      <MemoryRouter>
        <AppDownloadsPage />
      </MemoryRouter>
    );

    const winSetupLink = container.querySelector('a[href="https://maxp.online/downloads/MaxP-Monitor-Setup.exe"]');
    expect(winSetupLink).not.toBeNull();

    const winPortableLink = container.querySelector('a[href="https://maxp.online/downloads/MaxP-Monitor-Portable.zip"]');
    expect(winPortableLink).not.toBeNull();

    const androidApkLink = container.querySelector('a[href="https://maxp.online/downloads/maxp.apk"]');
    expect(androidApkLink).not.toBeNull();
  });

  it("filters apps when clicking on segmented platform tabs", () => {
    render(
      <MemoryRouter>
        <AppDownloadsPage />
      </MemoryRouter>
    );

    // Filter to POS
    const posTab = screen.getByText("الكاشير والطباعة (1)");
    fireEvent.click(posTab);

    expect(screen.getByText(/استوديو الكاشير والطباعة الفورية/)).toBeDefined();
    expect(screen.queryByText(/برنامج مراقبة وإنتاجية فريق العمل/)).toBeNull();

    // Switch back to All
    const allTab = screen.getByText("جميع المنصات (5)");
    fireEvent.click(allTab);

    expect(screen.getByText(/برنامج مراقبة وإنتاجية فريق العمل/)).toBeDefined();
    expect(screen.getByText(/استوديو الكاشير والطباعة الفورية/)).toBeDefined();
  });

  it("renders technical architecture and enterprise specifications banner", () => {
    render(
      <MemoryRouter>
        <AppDownloadsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("تحديثات صامتة وتلقائية")).toBeDefined();
    expect(screen.getByText("تطبيق ويب تقدمي (PWA)")).toBeDefined();
    expect(screen.getByText("أمان وتشفير معزول")).toBeDefined();
    expect(screen.getByText("مزامنة سحابية لحظية")).toBeDefined();
  });
});