// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import UnifiedShippingCard from "./UnifiedShippingCard";

vi.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} ج.م`,
  }),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }),
    post: vi.fn().mockResolvedValue({ data: { success: true, message: "OK" } }),
  },
}));

vi.mock("../../../utils/tokenManager", () => ({
  getAccessToken: () => "mock-token",
}));

afterEach(() => {
  cleanup();
});

describe("UnifiedShippingCard", () => {
  it("renders shipping management header", () => {
    const mockOrder = {
      id: "ord-1",
      orderNumber: "ORD-001",
      total: 500,
    };

    render(<UnifiedShippingCard order={mockOrder} />);

    expect(screen.getByText("إدارة الشحن والتوصيل")).toBeInTheDocument();
    expect(
      screen.getByText("ربط ومتابعة شحنة الطلب مع أي شركة شحن أو مندوب")
    ).toBeInTheDocument();
  });

  it("renders active tracking information when order has existing tracking", () => {
    const mockOrder = {
      id: "ord-1",
      orderNumber: "ORD-001",
      total: 750,
      trackingNumber: "TRK-998822",
      carrierType: "TURBO",
    };

    render(<UnifiedShippingCard order={mockOrder} />);

    expect(screen.getByText("TRK-998822")).toBeInTheDocument();
    expect(screen.getByText("رقم التتبع (AWB)")).toBeInTheDocument();
    expect(screen.getByText("قيمة التحصيل (COD)")).toBeInTheDocument();
    expect(screen.getByText("750 ج.م")).toBeInTheDocument();
  });

  it("renders return reason banner when turboReturnReason is provided", () => {
    const mockOrder = {
      id: "ord-2",
      orderNumber: "ORD-002",
      total: 300,
      trackingNumber: "TRK-112233",
      turboReturnReason: "العميل رفض الاستلام لعدم توفر المبلغ",
    };

    render(<UnifiedShippingCard order={mockOrder} />);

    expect(screen.getByText("سبب المرتجع:")).toBeInTheDocument();
    expect(
      screen.getByText("العميل رفض الاستلام لعدم توفر المبلغ")
    ).toBeInTheDocument();
  });

  it("opens cancel confirmation modal when cancel button is clicked", () => {
    const mockOrder = {
      id: "ord-3",
      orderNumber: "ORD-003",
      total: 450,
      trackingNumber: "TRK-445566",
    };

    render(<UnifiedShippingCard order={mockOrder} />);

    const cancelBtn = screen.getByRole("button", { name: /إلغاء الشحنة/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByText("تأكيد إلغاء الشحنة")).toBeInTheDocument();
    expect(screen.getByText("تأكيد الإلغاء")).toBeInTheDocument();
  });
});
