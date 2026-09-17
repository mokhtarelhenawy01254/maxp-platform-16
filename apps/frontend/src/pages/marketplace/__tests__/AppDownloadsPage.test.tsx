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

  it("renders unified ecosystem navigation with tabs and action button", () => {
    render(
      <MemoryRouter>
        <AppDownloadsPage />
      </MemoryRouter>
    );

    expect(screen.getByText("متجر التطبيقات")).toBeDefined();
    expect(screen.getByText("تطبيقاتي المفعلة")).toBeDefined();
    expect(screen.getByText("تطبيقات الأجهزة والموبايل")).toBeDefined();
    expect(screen.getByText(/نسخ دليل الروابط/)).toBeDefined();
  });

  it("renders unified single-surface telemetry strip with 4 metrics", () => {
    render(
      <MemoryRouter>
        <AppDownloadsPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText("جهازك المكتشف حالياً")).toBeDefined();
    expect(screen.getByLabelText("برامج سطح المكتب ويندوز")).toBeDefined();
    expect(screen.getByLabelText("تطبيقات الموبايل والميدان")).toBeDefined();
    expect(screen.getByLabelText("معرف المنشأة لربط الأجهزة")).toBeDefined();
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
    const posTab = screen.getByRole("button", { name: /^الكاشير/ });
    fireEvent.click(posTab);

    expect(screen.getByText(/استوديو الكاشير والطباعة الفورية/)).toBeDefined();
    expect(screen.queryByText(/برنامج مراقبة وإنتاجية فريق العمل/)).toBeNull();

    // Switch back to All
    const allTab = screen.getByRole("button", { name: /الكل/ });
    fireEvent.click(allTab);

    expect(screen.getByText(/برنامج مراقبة وإنتاجية فريق العمل/)).toBeDefined();
    expect(screen.getByText(/استوديو الكاشير والطباعة الفورية/)).toBeDefined();
  });

  it("opens technical details drawer when clicking on details button", () => {
    render(
      <MemoryRouter>
        <AppDownloadsPage />
      </MemoryRouter>
    );

    const detailButtons = screen.getAllByRole("button", { name: /التفاصيل/ });
    fireEvent.click(detailButtons[0]);

    expect(screen.getByText("المواصفات والإمكانات التقنية")).toBeDefined();
    expect(screen.getByText("متطلبات التشغيل")).toBeDefined();
  });
});