// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppSettings from "../AppSettings";

const { mockApiGet, mockApiPut } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPut: vi.fn(),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    put: (...args: unknown[]) => mockApiPut(...args),
  },
}));

vi.mock("../../../services/courierService", () => ({
  default: {
    getTreasuryAccounts: vi.fn().mockResolvedValue({ accounts: [] }),
  },
}));

const mockT = (key: string, fallback?: unknown) => {
  if (typeof fallback === "string") return fallback;
  if (typeof fallback === "object" && fallback !== null && "defaultValue" in fallback) {
    return (fallback as { defaultValue: string }).defaultValue;
  }
  return key;
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

vi.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderAppSettings(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/marketplace/apps/${slug}/settings`]}>
      <Routes>
        <Route path="/marketplace/apps/:slug/settings" element={<AppSettings />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders unsupported or not installed app message correctly", async () => {
    mockApiGet.mockResolvedValueOnce({
      data: {
        data: [],
      },
    });

    renderAppSettings("unsupported-slug");

    await waitFor(() => {
      expect(screen.getByText(/التطبيق غير مفعّل/i)).toBeInTheDocument();
      expect(screen.getByText(/فتح صفحة التطبيق/i)).toBeInTheDocument();
    });
  });

  it("renders conversion suite settings correctly", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === "/my-apps") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "inst-conversion",
                app: {
                  id: "app-conv",
                  slug: "conversion-suite",
                  name: "Conversion Suite",
                },
                settings: {},
              },
            ],
          },
        });
      }
      if (url.includes("/usage-insights")) {
        return Promise.resolve({
          data: {
            data: {
              summary: { totalActions: 120, totalFeatures: 5, activeDays: 14 },
              byFeature: [],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    renderAppSettings("conversion-suite");

    await waitFor(() => {
      expect(screen.getByText("حفظ الإعدادات")).toBeInTheDocument();
      expect(screen.getByText("Conversion Suite")).toBeInTheDocument();
    });

    expect(screen.getByText(/العودة إلى أدواتي/i)).toBeInTheDocument();
  });

  it("renders internal courier fleet settings correctly", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === "/my-apps") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "inst-fleet",
                app: {
                  id: "app-fleet",
                  slug: "internal-courier-fleet",
                  name: "Internal Courier Fleet",
                },
                settings: {},
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    renderAppSettings("internal-courier-fleet");

    await waitFor(() => {
      expect(screen.getByText("حفظ الإعدادات")).toBeInTheDocument();
      expect(screen.getByText("أسطول المناديب والتوصيل الداخلي")).toBeInTheDocument();
    });
  });

  it("renders ugc reviews pro settings correctly", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url === "/my-apps") {
        return Promise.resolve({
          data: {
            data: [
              {
                id: "inst-ugc",
                app: {
                  id: "app-ugc",
                  slug: "ugc-reviews-pro",
                  name: "UGC Reviews Pro",
                },
                settings: {},
              },
            ],
          },
        });
      }
      if (url.includes("/reviews")) {
        return Promise.resolve({
          data: {
            data: {
              pagination: { total: 10 },
              reviews: [],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    renderAppSettings("ugc-reviews-pro");

    await waitFor(() => {
      expect(screen.getByText("حفظ الإعدادات")).toBeInTheDocument();
      expect(screen.getByText("UGC Reviews Pro")).toBeInTheDocument();
    });
  });
});
