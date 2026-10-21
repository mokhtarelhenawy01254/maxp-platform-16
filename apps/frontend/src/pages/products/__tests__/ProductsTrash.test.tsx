/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ProductsTrash } from "../ProductsTrash";

// Mock API and dependencies
vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "prod_del_01",
            name: "سماعة بلوتوث لاسلكية",
            sku: "AUDIO-BT-01",
            price: 750,
            cost: 350,
            deletedAt: new Date().toISOString(),
            images: [],
            variantsCount: 2,
          },
        ],
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (p: number) => `${p} ج.م`,
  }),
}));

vi.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => d,
  }),
}));

vi.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
});

describe("ProductsTrash Component", () => {
  it("renders header, back button, and product cards", async () => {
    render(
      <BrowserRouter>
        <ProductsTrash />
      </BrowserRouter>
    );

    expect(screen.getByText("سلة المحذوفات")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("سماعة بلوتوث لاسلكية")).toBeInTheDocument();
      expect(screen.getByText("1 منتج")).toBeInTheDocument();
    });
  });

  it("handles selection and shows bulk action buttons", async () => {
    render(
      <BrowserRouter>
        <ProductsTrash />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("سماعة بلوتوث لاسلكية")).toBeInTheDocument();
    });

    const selectAllCheckbox = screen.getByLabelText(/تحديد الكل/i);
    fireEvent.click(selectAllCheckbox);

    await waitFor(() => {
      expect(screen.getByText(/استعادة \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/حذف نهائي \(1\)/i)).toBeInTheDocument();
    });
  });
});
