/* @vitest-environment jsdom */

import React from "react";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import ConversionToolsIndexPage from "../ConversionToolsIndexPage";

const mockApiGet = vi.fn();
const mockApiPut = vi.fn();

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    isLoading: false,
    isAuthenticated: true,
    user: {
      id: "user-1",
      companyId: "company-1",
      companySlug: "mystore",
    },
  }),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
  },
}));

vi.mock("../../../services/storefrontSettingsService", () => ({
  storefrontSettingsService: {
    getSettings: () => Promise.resolve({ data: { themeId: "default" } }),
  },
}));

describe("ConversionToolsIndexPage Redesigned Studio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockResolvedValue({
      data: {
        data: [
          {
            id: "app-1",
            status: "ACTIVE",
            app: { slug: "conversion-suite", name: "Conversion Suite" },
            settings: {
              general: { enabled: true },
              modules: {
                saleCountdown: true,
                lowStockNotice: false,
              },
            },
          },
        ],
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders hero title, badges, and tabs properly", async () => {
    render(
      <MemoryRouter>
        <ConversionToolsIndexPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("أدوات رفع التحويل")).toBeTruthy();
    });

    expect(screen.getByText("استوديو أدوات التحويل للمتجر")).toBeTruthy();
    expect(screen.getByText("عروض الـ Upsell & Cross-sell")).toBeTruthy();
    expect(screen.getAllByText("الكل").length).toBeGreaterThanOrEqual(1);
  });

  it("filters tools via the search bar", async () => {
    render(
      <MemoryRouter>
        <ConversionToolsIndexPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("البحث في الأدوات بالاسم أو الفائدة..."),
      ).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText(
      "البحث في الأدوات بالاسم أو الفائدة...",
    );
    fireEvent.change(searchInput, { target: { value: "مؤقّت العروض" } });

    expect(screen.getByText("مؤقّت العروض")).toBeTruthy();
  });

  it("filters tools by status tabs", async () => {
    render(
      <MemoryRouter>
        <ConversionToolsIndexPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("النشطة")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("النشطة"));
    expect(screen.getByText("مؤقّت العروض")).toBeTruthy();
  });
});
