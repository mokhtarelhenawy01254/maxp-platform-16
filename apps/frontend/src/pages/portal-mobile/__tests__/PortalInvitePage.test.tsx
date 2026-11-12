// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { apiClient } from "../../../services/apiClient";
import { savePortalSession } from "../../../utils/portalSessionManager";
import PortalInvitePage, { LAST_PORTAL_COMPANY_STORAGE_KEY } from "../PortalInvitePage";

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="nav-location">{`${location.pathname}${location.search}`}</div>;
}

function renderInviteRoute(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/i/:slug" element={<PortalInvitePage />} />
        <Route path="/i" element={<PortalInvitePage />} />
        <Route path="/portal-connect" element={<PortalInvitePage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PortalInvitePage", () => {
  const originalLocation = window.location;
  const originalCapacitor = (window as unknown as Record<string, unknown>)["Capacitor"];

  const mockHostname = (hostname: string) => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { ...originalLocation, hostname, assign },
    });
    return { assign };
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete (window as unknown as Record<string, unknown>)["Capacitor"];
    mockHostname("localhost");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    if (originalCapacitor === undefined) {
      delete (window as unknown as Record<string, unknown>)["Capacitor"];
    } else {
      Object.defineProperty(window, "Capacitor", {
        configurable: true,
        writable: true,
        value: originalCapacitor,
      });
    }
  });

  it("loads branding for /i/:slug?portal=teacher, persists selection to localStorage & Capacitor Preferences, and opens login", async () => {
    const prefSetMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, "Capacitor", {
      configurable: true,
      writable: true,
      value: { isNativePlatform: () => true, Plugins: { Preferences: { set: prefSetMock } } },
    });

    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          companyId: "cmp_swan",
          name: "أكاديمية سوان",
          slug: "swan",
          publicCode: "SWAN-01",
          primaryColor: "#0d9488",
        },
      },
    } as never);

    renderInviteRoute("/i/swan?portal=teacher");

    expect(await screen.findByRole("heading", { name: "أكاديمية سوان" })).toBeInTheDocument();
    expect(screen.getByText("SWAN-01")).toBeInTheDocument();
    expect(screen.getByText("بوابة المدرس")).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledWith(
      "/public/portal/branding?slug=swan",
      expect.objectContaining({ _skipAuthHeader: true, _skipErrorToast: true }),
    );

    const openBtn = screen.getByRole("button", { name: /فتح البوابة الآن/ });
    fireEvent.click(openBtn);

    expect(await screen.findByTestId("nav-location")).toHaveTextContent("/teacher/login");

    const saved = JSON.parse(window.localStorage.getItem(LAST_PORTAL_COMPANY_STORAGE_KEY) || "{}");
    expect(saved).toEqual({
      companyId: "cmp_swan",
      slug: "swan",
      name: "أكاديمية سوان",
      portal: "teacher",
    });
    expect(prefSetMock).toHaveBeenCalledWith({
      key: LAST_PORTAL_COMPANY_STORAGE_KEY,
      value: JSON.stringify(saved),
    });
  });

  it("routes directly to dashboard when active session exists for the invited company and redirects subdomain on apex", async () => {
    const { assign } = mockHostname("maxp.online");
    savePortalSession({
      role: "parent",
      companyId: "cmp_swan",
      token: "parent_tok_active",
      companySlug: "swan",
      companyName: "أكاديمية سوان",
    });

    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          companyId: "cmp_swan",
          name: "أكاديمية سوان",
          slug: "swan",
          publicCode: "SWAN-01",
        },
      },
    } as never);

    renderInviteRoute("/i/swan?portal=parent");

    await screen.findByRole("heading", { name: "أكاديمية سوان" });
    expect(screen.getByText("جلسة نشطة")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /فتح البوابة الآن/ }));
    expect(assign).toHaveBeenCalledWith("https://swan.maxp.online/parent/dashboard");
  });

  it("uses customDomain on apex when configured and supports 1.2s auto-open on /i/:slug", async () => {
    const { assign } = mockHostname("mokhtarelhenawy.online");

    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          companyId: "cmp_custom",
          name: "مدرسة النور",
          slug: "noor",
          customDomain: "portal.alnoor.edu",
        },
      },
    } as never);

    renderInviteRoute("/i/noor?portal=student");
    await screen.findByRole("heading", { name: "مدرسة النور" });

    await waitFor(
      () => {
        expect(assign).toHaveBeenCalledWith("https://portal.alnoor.edu/portal/login");
      },
      { timeout: 2500 },
    );
  });

  it("searches by publicCode or center name via /public/portal/lookup on /portal-connect and renders saved centers", async () => {
    savePortalSession({
      role: "parent",
      companyId: "cmp_saved",
      token: "saved_tok_1",
      companySlug: "saved-center",
      companyName: "مركز محفوظ",
    });

    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: {
        success: true,
        data: [
          {
            companyId: "cmp_alpha",
            name: "سنتر ألفا التعليمي",
            slug: "alpha",
            publicCode: "ALP-99",
          },
        ],
      },
    } as never);

    renderInviteRoute("/portal-connect?portal=parent");

    expect(screen.getByText("مركز محفوظ")).toBeInTheDocument();
    const searchInput = screen.getByPlaceholderText(/ابحث بكود المؤسسة أو اسم المركز/);
    fireEvent.change(searchInput, { target: { value: "ALP-99" } });
    fireEvent.submit(searchInput.closest("form")!);

    expect(await screen.findByText("سنتر ألفا التعليمي")).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledWith(
      "/public/portal/lookup?q=ALP-99",
      expect.objectContaining({ _skipAuthHeader: true, _skipErrorToast: true }),
    );

    fireEvent.click(screen.getByRole("button", { name: "فتح" }));
    expect(await screen.findByTestId("nav-location")).toHaveTextContent("/parent/login");
  });
});
