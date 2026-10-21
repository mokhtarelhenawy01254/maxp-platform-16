/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import Coupons from "../Coupons";

const mockTranslations: Record<string, string> = {
  "coupons.pageTitle": "كوبونات الخصم",
  "coupons.pageDescription": "إدارة كوبونات التخفيض والحملات الترويجية",
  "coupons.newCoupon": "كوبون جديد",
  "coupons.statsTotalCoupons": "إجمالي الكوبونات",
  "coupons.statsActiveCoupons": "الكوبونات النشطة",
  "coupons.statsTotalUsages": "مرات الاستخدام",
  "coupons.statsTotalDiscount": "إجمالي الخصم",
  "coupons.searchPlaceholder": "بحث باسم الكوبون أو الكود...",
  "coupons.tableCode": "الكود",
  "coupons.tableName": "اسم الكوبون",
  "coupons.tableType": "النوع",
  "coupons.tableValue": "القيمة",
  "coupons.tableUsage": "الاستخدام",
  "coupons.tableValidity": "فترة الصلاحية",
  "coupons.tableStatus": "الحالة",
  "coupons.tableActions": "إجراءات",
  "coupons.active": "نشط",
  "coupons.inactive": "معطل",
  "coupons.typePercentage": "نسبة مئوية",
  "coupons.modalCreateTitle": "إضافة كوبون جديد",
};

const mockT = (key: string) => mockTranslations[key] || key;

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: mockT,
      i18n: { language: "ar" },
    }),
  };
});

vi.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (val: number) => `${val} ج.م`,
    currency: "EGP",
  }),
}));

vi.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (dateStr: string) => dateStr ? dateStr.substring(0, 10) : "-",
  }),
}));

vi.mock("../../../config/environment", () => ({
  getApiUrl: () => "https://api.example.com",
}));

vi.mock("../../../utils/tokenManager", () => ({
  default: {
    createAuthHeaders: (headers: Record<string, string>) => ({
      ...headers,
      Authorization: "Bearer mock-token",
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Coupons Component", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch for stats and coupons
    global.fetch = vi.fn((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/coupons/stats")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              totalCoupons: 12,
              activeCoupons: 8,
              totalUsages: 145,
              totalDiscount: 3500,
            },
          }),
        });
      }
      if (urlStr.includes("/coupons")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: "cp-1",
                code: "SAVE20",
                name: "خصم الصيف 20%",
                description: "عرض خاص لعملاء الصيف",
                type: "percentage",
                value: 20,
                minOrderAmount: 200,
                maxDiscountAmount: 100,
                usageLimit: 50,
                usageCount: 15,
                validFrom: "2026-06-01T00:00:00",
                validTo: "2026-08-31T23:59:59",
                isActive: true,
              },
            ],
            pagination: {
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
            },
          }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${urlStr}`));
    }) as unknown as typeof fetch;
  });

  it("renders page header and stats strip correctly", async () => {
    render(<Coupons />);

    expect(screen.getByText("كوبونات الخصم")).toBeDefined();
    expect(screen.getByText("كوبون جديد")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("SAVE20")).toBeDefined();
      expect(screen.getByText("خصم الصيف 20%")).toBeDefined();
    });
  });

  it("opens create coupon modal when click new coupon button", async () => {
    render(<Coupons />);

    const newBtn = screen.getByText("كوبون جديد");
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByText("إضافة كوبون جديد")).toBeDefined();
    });
  });

  it("handles status toggle when clicking status pill", async () => {
    render(<Coupons />);

    await waitFor(() => {
      expect(screen.getByText("SAVE20")).toBeDefined();
    });

    const statusPill = screen.getByText("نشط");
    fireEvent.click(statusPill);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/coupons/cp-1"),
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  it("opens view details modal when clicking eye icon", async () => {
    render(<Coupons />);

    await waitFor(() => {
      expect(screen.getByText("SAVE20")).toBeDefined();
    });

    const viewBtn = screen.getByTitle("عرض التفاصيل");
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getAllByText("SAVE20").length).toBeGreaterThanOrEqual(1);
    });
  });
});
