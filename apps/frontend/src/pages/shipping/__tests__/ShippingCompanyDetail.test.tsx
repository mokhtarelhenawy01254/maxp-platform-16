// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ShippingCompanyDetail from "../ShippingCompanyDetail";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => {
        const map: Record<string, string> = {
          "shipping.k_1": "يدوي",
          "shipping.k_2": "تجريبي",
          "shipping.k_3": "مباشر",
          "shipping.k_8": "هل أنت متأكد من حذف شركة الشحن هذه؟",
          "shipping.k_9": "حدث خطأ أثناء حذف شركة الشحن",
          "shipping.k_17": "جاري التحميل",
          "shipping.k_22": "تعديل",
          "shipping.k_23": "حذف",
          "shipping.k_29": "رقم الهاتف",
          "shipping.k_35": "شركة الشحن غير موجودة",
          "shipping.k_37": "نشط",
          "shipping.k_38": "غير نشط",
          "shipping.k_39": "بيانات الاتصال",
          "shipping.k_40": "البريد الإلكتروني",
          "shipping.k_41": "الموقع الإلكتروني",
          "shipping.k_42": "بيانات الربط والـ API",
          "shipping.k_43": "لم يتم إدخال مفتاح API",
          "shipping.k_60": "العودة إلى قائمة شركات الشحن",
          "shipping.k_61": "رجوع",
        };
        return map[key] || key;
      },
    }),
  };
});

vi.mock("../../../config/environment", () => ({
  envConfig: {
    backendUrl: "https://api.test.maxp.online",
  },
}));

const mockCompanyData = {
  id: "sc-turbo-1",
  name: "توربو إكسبريس Turbo",
  phone: "01099887766",
  email: "support@turbo.eg",
  website: "https://turbo.eg",
  apiKey: "tb_live_secret_key_1234567890abcdef",
  apiUrl: "https://api.turbo.eg/v1/dispatch",
  providerKey: "TURBO",
  integrationMode: "LIVE",
  isActive: true,
  createdAt: "2026-01-10T10:00:00Z",
  updatedAt: "2026-10-15T15:30:00Z",
};

describe("ShippingCompanyDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        success: true,
        data: mockCompanyData,
      }),
    } as unknown as Response);
  });

  afterEach(() => {
    cleanup();
  });

  it("fetches and renders company dossier, header, and telemetry ribbon", async () => {
    render(
      <MemoryRouter initialEntries={["/shipping-companies/sc-turbo-1"]}>
        <Routes>
          <Route path="/shipping-companies/:id" element={<ShippingCompanyDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/جاري التحميل/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("توربو إكسبريس Turbo")).toBeInTheDocument();
      expect(screen.getByText("نشط")).toBeInTheDocument();
      expect(screen.getByText("Turbo")).toBeInTheDocument();
      expect(screen.getByText("مباشر")).toBeInTheDocument();
    });
  });

  it("renders contact channels and API credentials correctly", async () => {
    render(
      <MemoryRouter initialEntries={["/shipping-companies/sc-turbo-1"]}>
        <Routes>
          <Route path="/shipping-companies/:id" element={<ShippingCompanyDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("01099887766")).toBeInTheDocument();
      expect(screen.getByText("support@turbo.eg")).toBeInTheDocument();
      expect(screen.getByText("https://turbo.eg")).toBeInTheDocument();
      expect(screen.getByText(/tb_live_secret_key_/)).toBeInTheDocument();
      expect(screen.getByText("https://api.turbo.eg/v1/dispatch")).toBeInTheDocument();
    });
  });

  it("handles delete trigger on button click", async () => {
    window.confirm = vi.fn(() => true);

    render(
      <MemoryRouter initialEntries={["/shipping-companies/sc-turbo-1"]}>
        <Routes>
          <Route path="/shipping-companies/:id" element={<ShippingCompanyDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("توربو إكسبريس Turbo")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /حذف/i });
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith("هل أنت متأكد من حذف شركة الشحن هذه؟");
  });
});
