// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AppDetails from "../AppDetails";

const { mockApiGet, mockApiPost } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}));

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "u-1", company: { id: "c-1" } },
    refreshUser: vi.fn(),
  }),
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

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockAppData = {
  id: "app-upsell",
  slug: "upsell-booster",
  name: "معزز المبيعات الذكي",
  description: "أداة لزيادة متوسط قيمة الطلب عبر العروض الإضافية في السلة وصفحة الشكر.",
  category: "sales",
  icon: "Zap",
  pricingModel: "SUBSCRIPTION",
  monthlyPrice: 250,
  yearlyPrice: 2400,
  unitPrice: 2,
  unitName: "طلب",
  rating: 4.8,
  reviewCount: 36,
  isFeatured: true,
  trialDays: 7,
  isInstalled: false,
  screenshots: ["https://example.com/screenshot1.png"],
  faq: [
    { question: "كيف يعمل التطبيق؟", answer: "يقترح منتجات ذات صلة مباشرة أثناء الدفع." },
  ],
  reviews: [
    {
      id: "rev-1",
      rating: 5,
      title: "ممتاز جداً",
      comment: "زاد من مبيعاتنا بشكل ملحوظ.",
      isVerified: true,
      createdAt: "2026-08-01T12:00:00Z",
      user: { name: "أحمد متولي" },
    },
  ],
  changelog: [
    {
      version: "v2.1.0",
      date: "2026-09-01",
      changes: ["تحسين خوارزمية التوصية بالمنتجات"],
    },
  ],
};

describe("AppDetails Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes("/marketplace/apps/upsell-booster")) {
        return Promise.resolve({
          data: {
            success: true,
            data: mockAppData,
          },
        });
      }
      if (url.includes("/app-explanations/by-route")) {
        return Promise.resolve({
          data: {
            success: true,
            explanations: [],
          },
        });
      }
      return Promise.reject(new Error("Unknown route"));
    });

    mockApiPost.mockResolvedValue({
      data: { success: true },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders app details, features and pricing options once loaded", async () => {
    render(
      <MemoryRouter initialEntries={["/marketplace/apps/upsell-booster"]}>
        <Routes>
          <Route path="/marketplace/apps/:slug" element={<AppDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("معزز المبيعات الذكي")).toBeInTheDocument();
    });

    expect(screen.getByText("مميز")).toBeInTheDocument();
    expect(screen.getByText(/تجربة 7 يوم/i)).toBeInTheDocument();
    expect(screen.getByText("أداة لزيادة متوسط قيمة الطلب عبر العروض الإضافية في السلة وصفحة الشكر.")).toBeInTheDocument();

    // Check pricing options rendered in sidebar
    expect(screen.getAllByText("حسب الاستخدام").length).toBeGreaterThan(0);
    expect(screen.getAllByText("اشتراك شهري").length).toBeGreaterThan(0);
    expect(screen.getAllByText("اشتراك سنوي").length).toBeGreaterThan(0);
  });

  it("allows switching plans and installing app", async () => {
    render(
      <MemoryRouter initialEntries={["/marketplace/apps/upsell-booster"]}>
        <Routes>
          <Route path="/marketplace/apps/:slug" element={<AppDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("معزز المبيعات الذكي")).toBeInTheDocument();
    });

    // Switch to Yearly
    const yearlyOption = screen.getAllByText("اشتراك سنوي")[0];
    fireEvent.click(yearlyOption);

    // Find the install button
    const installButtons = screen.getAllByRole("button", { name: /تفعيل/i });
    expect(installButtons.length).toBeGreaterThan(0);
    fireEvent.click(installButtons[0]);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        "/marketplace/apps/upsell-booster/install",
        expect.objectContaining({
          pricingModel: "SUBSCRIPTION",
          billingCycle: "yearly",
        })
      );
    });
  });

  it("renders tabs like FAQ and Reviews correctly", async () => {
    render(
      <MemoryRouter initialEntries={["/marketplace/apps/upsell-booster"]}>
        <Routes>
          <Route path="/marketplace/apps/:slug" element={<AppDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("معزز المبيعات الذكي")).toBeInTheDocument();
    });

    // Click on FAQ tab
    const faqTab = screen.getByRole("tab", { name: /الأسئلة الشائعة/i });
    fireEvent.click(faqTab);

    expect(screen.getByText("كيف يعمل التطبيق؟")).toBeInTheDocument();
  });
});
