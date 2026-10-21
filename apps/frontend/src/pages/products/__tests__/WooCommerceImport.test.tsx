/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WooCommerceImport from "../WooCommerceImport";

vi.mock("../../../utils/tokenManager", () => ({
  default: {
    createAuthHeaders: vi.fn((headers) => headers || {}),
  },
}));

vi.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../../../i18n", () => ({
  default: {
    t: (key: string) => key,
  },
}));

describe("WooCommerceImport Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header, navigation, and connection form when no products are loaded", () => {
    render(
      <MemoryRouter>
        <WooCommerceImport />
      </MemoryRouter>
    );

    // Header
    expect(screen.getByText("استيراد المنتجات من WooCommerce")).toBeInTheDocument();
    expect(screen.getByText("العودة لكتالوج المنتجات")).toBeInTheDocument();

    // Form
    expect(screen.getByText("بيانات الربط مع WooCommerce REST API")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("https://yourstore.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")).toBeInTheDocument();

    // Fetch button
    const fetchBtn = screen.getByRole("button", { name: /الاتصال وجلب المنتجات/ });
    expect(fetchBtn).toBeInTheDocument();
    expect(fetchBtn).toBeDisabled();
  });
});
