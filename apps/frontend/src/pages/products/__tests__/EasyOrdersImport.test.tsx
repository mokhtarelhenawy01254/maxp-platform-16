/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import EasyOrdersImport from "../EasyOrdersImport";

vi.mock("../../../utils/tokenManager", () => ({
  default: {
    createAuthHeaders: vi.fn((headers) => headers || {}),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("EasyOrdersImport Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/v1/easy-orders/settings")) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: { hasApiKey: false } }),
        });
      }
      if (url.includes("/api/v1/easy-orders/sync-logs")) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders navigation tabs and initial fetch form", () => {
    render(<EasyOrdersImport />);

    // Tab buttons
    expect(screen.getByRole("button", { name: /استيراد المنتجات/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /مزامنة الطلبات والإعدادات/ })).toBeInTheDocument();

    // Default products tab content
    expect(screen.getByText("استيراد المنتجات من Easy Orders")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("أدخل مفتاح الـ API هنا...")).toBeInTheDocument();

    const fetchBtn = screen.getByRole("button", { name: /جلب المنتجات/ });
    expect(fetchBtn).toBeInTheDocument();
    expect(fetchBtn).toBeDisabled();
  });

  it("switches to settings & sync tab when clicked", () => {
    render(<EasyOrdersImport />);

    const settingsTabBtn = screen.getByRole("button", { name: /مزامنة الطلبات والإعدادات/ });
    fireEvent.click(settingsTabBtn);

    expect(screen.getByText("إعدادات الربط")).toBeInTheDocument();
    expect(screen.getByText("حالة المزامنة التلقائية")).toBeInTheDocument();
    expect(screen.getByText("سجلات المزامنة")).toBeInTheDocument();
  });
});
