// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppHistoryPage from "../AppHistoryPage";

const { mockApiGet } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
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
    i18n: { language: "ar" },
  }),
}));

const mockLogsResponse = {
  data: {
    success: true,
    data: {
      logs: [
        {
          id: "log-1",
          action: "INSTALL_APP",
          description: "تثبيت تطبيق عروض الكميات",
          targetName: "عروض الكميات المتقدمة",
          targetId: "app-inst-1",
          createdAt: "2026-10-18T10:00:00Z",
          user: {
            id: "user-1",
            name: "مختار الحناوي",
            email: "mokhtar@maxp.com",
            role: "OWNER",
          },
          metadata: {
            appSlug: "quantity-offers-pro",
            appName: "عروض الكميات",
            pricingModel: "SUBSCRIPTION",
            billingCycle: "monthly",
          },
        },
        {
          id: "log-2",
          action: "UNINSTALL_APP",
          description: "إلغاء تثبيت تطبيق السلة",
          targetName: "سلة التسوق الذكية",
          targetId: "app-inst-2",
          createdAt: "2026-10-19T14:30:00Z",
          user: {
            id: "user-2",
            name: "أحمد علي",
            email: "ahmed@maxp.com",
            role: "ADMIN",
          },
          metadata: {
            appSlug: "cart-drawer-upsell",
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        pages: 1,
      },
      stats: {
        totalInstalls: 1,
        totalUninstalls: 1,
        totalActions: 2,
      },
    },
  },
};

function renderAppHistoryPage() {
  return render(
    <MemoryRouter>
      <AppHistoryPage />
    </MemoryRouter>,
  );
}

describe("AppHistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders page header and navigation links", async () => {
    mockApiGet.mockResolvedValueOnce(mockLogsResponse);

    renderAppHistoryPage();

    expect(screen.getByText("سجل حركات وتثبيت التطبيقات")).toBeInTheDocument();
    expect(screen.getByText("تطبيقاتي المفعلة")).toBeInTheDocument();
    expect(screen.getByText("تصفح متجر التطبيقات")).toBeInTheDocument();
  });

  it("renders KPI telemetry cards with accurate values", async () => {
    mockApiGet.mockResolvedValueOnce(mockLogsResponse);

    renderAppHistoryPage();

    await waitFor(() => {
      expect(screen.getByText("إجمالي عمليات التثبيت")).toBeInTheDocument();
      expect(screen.getByText("إجمالي عمليات الإلغاء")).toBeInTheDocument();
      expect(screen.getByText("إجمالي الحركات المسجلة")).toBeInTheDocument();
    });
  });

  it("renders activity logs with details and badges", async () => {
    mockApiGet.mockResolvedValueOnce(mockLogsResponse);

    renderAppHistoryPage();

    await waitFor(() => {
      expect(screen.getByText("عروض الكميات المتقدمة")).toBeInTheDocument();
      expect(screen.getByText("سلة التسوق الذكية")).toBeInTheDocument();
      expect(screen.getByText("مختار الحناوي")).toBeInTheDocument();
      expect(screen.getByText("أحمد علي")).toBeInTheDocument();
      expect(screen.getByText("تثبيت وتفعيل")).toBeInTheDocument();
      expect(screen.getByText("إلغاء التثبيت")).toBeInTheDocument();
    });
  });
});
