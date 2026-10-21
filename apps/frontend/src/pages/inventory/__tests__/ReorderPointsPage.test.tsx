/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ReorderPointsPage } from "../ReorderPointsPage";

// Mock API and translation
vi.mock("../../../services/companyAwareApi", () => ({
  companyAwareApi: {
    get: vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [
            {
              productId: "prod_01",
              inventoryId: "inv_01",
              name: "حذاء رياضي الترا",
              sku: "SHOE-001",
              categoryName: "أحذية",
              image: null,
              trackInventory: true,
              isPreOrder: false,
              preOrderDate: null,
              preOrderMessage: null,
              status: "low",
              available: 3,
              reserved: 1,
              quantity: 4,
              reorderPoint: 10,
              minStock: 5,
              dailyAvgSales: 2,
              daysUntilStockout: 2,
              suggestedReorder: 20,
            },
          ],
          pagination: { total: 1, page: 1, limit: 25, pages: 1 },
          summary: {
            totalProducts: 1,
            lowStockCount: 1,
            outOfStockCount: 0,
            preOrderCount: 0,
            untrackedCount: 0,
            safeCount: 0,
            atRiskValue: 4500,
          },
        },
      },
    }),
    put: vi.fn().mockResolvedValue({ data: { success: true } }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} ج.م`,
  }),
}));

afterEach(() => {
  cleanup();
});

describe("ReorderPointsPage Component", () => {
  it("renders page header, title, and metric cards", async () => {
    render(<ReorderPointsPage />);

    expect(screen.getByText("إدارة نقاط عجز المخزون")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("حذاء رياضي الترا")).toBeInTheDocument();
      expect(screen.getAllByText("مخزون منخفض").length).toBeGreaterThan(0);
      expect(screen.getByText("4500 ج.م")).toBeInTheDocument();
    });
  });

  it("renders view mode tabs and filters", async () => {
    render(<ReorderPointsPage />);

    await waitFor(() => {
      expect(screen.getByText("بالكل (مجمع)")).toBeInTheDocument();
      expect(screen.getByText("بالمخزن")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "الطلب المسبق" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("بحث بالاسم أو SKU...")).toBeInTheDocument();
    });
  });

  it("displays stock quantities and allows editing reorder point", async () => {
    render(<ReorderPointsPage />);

    await waitFor(() => {
      expect(screen.getByText("حذاء رياضي الترا")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle("تعديل النقطة");
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    });
  });
});
