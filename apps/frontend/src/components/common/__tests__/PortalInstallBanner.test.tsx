// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../../../config/environment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../config/environment")>();
  return {
    ...actual,
    isCapacitorNative: () => false,
    envConfig: {
      ...actual.envConfig,
      backendUrl: "https://api.maxp.online",
      apiUrl: "https://api.maxp.online/api/v1",
    },
    getApiUrl: () => "https://api.maxp.online/api/v1",
    getBackendUrl: () => "https://api.maxp.online",
  };
});

import { PortalInstallBanner } from "../PortalInstallBanner";

describe("PortalInstallBanner", () => {
  const originalUserAgent = navigator.userAgent;
  const originalMatchMedia = window.matchMedia;
  const originalStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;

  const setUserAgent = (ua: string) => {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: ua,
    });
  };

  const setMatchMediaStandalone = (matches: boolean) => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("standalone") ? matches : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  };

  beforeEach(() => {
    localStorage.clear();
    setMatchMediaStandalone(false);
    setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/125.0");
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: originalStandalone,
    });
  });

  it("hides completely when running in standalone mode", () => {
    setMatchMediaStandalone(true);
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15");

    const { container } = render(
      <PortalInstallBanner
        portal="parent"
        companyId="comp_1"
        companyName="مدرسة الأمل"
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders Chromium beforeinstallprompt CTA, calls prompt(), and hides once accepted", async () => {
    render(
      <PortalInstallBanner
        portal="parent"
        companyId="comp_1"
        companyName="مركز النور"
        companyLogo="/uploads/logo.png"
        accentColor="#0d9488"
      />,
    );

    expect(screen.queryByText("تثبيت التطبيق")).not.toBeInTheDocument();

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const installEvent = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    installEvent.prompt = promptMock;
    installEvent.userChoice = Promise.resolve({ outcome: "accepted" });

    act(() => {
      window.dispatchEvent(installEvent);
    });

    const installBtn = await screen.findByRole("button", { name: "تثبيت التطبيق" });
    expect(screen.getByText("تثبيت تطبيق مركز النور")).toBeInTheDocument();
    expect(installBtn).toHaveStyle({ backgroundColor: "#0d9488" });

    fireEvent.click(installBtn);

    await waitFor(() => expect(promptMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByText("تثبيت تطبيق مركز النور")).not.toBeInTheDocument(),
    );
  });

  it("renders iOS Add-to-Home-Screen guidance with company logo and persists dismissal per tenant and portal", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1");

    const { rerender } = render(
      <PortalInstallBanner
        portal="dental"
        companyId="lab_42"
        companyName="معمل الابتسامة"
        companyLogo="/uploads/dental.png"
      />,
    );

    expect(screen.getByText("تثبيت تطبيق معمل الابتسامة")).toBeInTheDocument();
    expect(
      screen.getByText("اضغط على مشاركة ثم اختيار إضافة إلى الشاشة الرئيسية"),
    ).toBeInTheDocument();

    const logo = screen.getByAltText("معمل الابتسامة") as HTMLImageElement;
    expect(logo.src).toBe("https://api.maxp.online/uploads/dental.png");

    fireEvent.click(screen.getByRole("button", { name: "إخفاء" }));

    expect(localStorage.getItem("maxp_portal_install_dismissed:lab_42:dental")).toBe("1");
    expect(screen.queryByText("تثبيت تطبيق معمل الابتسامة")).not.toBeInTheDocument();

    // Unrelated portal remains visible
    rerender(
      <PortalInstallBanner
        portal="doctor"
        companyId="lab_42"
        companyName="معمل الابتسامة"
      />,
    );
    expect(screen.getByText("تثبيت تطبيق معمل الابتسامة")).toBeInTheDocument();
  });
});
