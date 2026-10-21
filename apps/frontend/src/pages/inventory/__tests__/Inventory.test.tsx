/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { Inventory } from "../Inventory";

// Mock API and auth
vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { id: "user_01", companyId: "comp_01", role: "ADMIN" },
  }),
}));

vi.mock("../../../services/companyAwareApi", () => ({
  companyAwareApi: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === "/warehouses") {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: "wh_01", name: "المستودع الرئيسي" }],
          },
        });
      }
      if (url === "/inventory/alerts") {
        return Promise.resolve({
          data: {
            success: true,
            data: { lowStock: [], outOfStock: [] },
          },
        });
      }
      // /inventory
      return Promise.resolve({
        data: {
          success: true,
          data: [
            {
              id: "inv_item_01",
              productId: "prod_101",
              warehouseId: "wh_01",
              quantity: 50,
              available: 45,
              reserved: 5,
              cost: 120,
              reorderPoint: 10,
              batchNumber: "BATCH-2026",
              expiryDate: null,
              updatedAt: new Date().toISOString(),
              products: {
                name: "ساعة ذكية برو",
                sku: "WATCH-PRO-01",
                price: 499,
                cost: 120,
              },
              warehouses: {
                name: "المستودع الرئيسي",
              },
              canEditStock: true,
            },
          ],
        },
      });
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => d,
  }),
}));

vi.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (p: number) => `${p} ج.م`,
  }),
}));

vi.mock("../components/CreateInventoryProductDialog", () => ({
  default: () => <div data-testid="create-product-dialog" />,
}));

afterEach(() => {
  cleanup();
});

describe("Inventory Page Component", () => {
  it("renders page header, title, and telemetry stats", async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText("إدارة المخزون")).toBeInTheDocument();
      expect(screen.getByText("إجمالي المنتجات")).toBeInTheDocument();
      expect(screen.getByText("إجمالي قيمة المخزون")).toBeInTheDocument();
    });
  });

  it("renders inventory items and stock badges", async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getAllByText("ساعة ذكية برو").length).toBeGreaterThan(0);
      expect(screen.getAllByText("المستودع الرئيسي").length).toBeGreaterThan(0);
      expect(screen.getAllByText("متوفر").length).toBeGreaterThan(0);
    });
  });

  it("opens item details modal when view button is clicked", async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getAllByText("ساعة ذكية برو").length).toBeGreaterThan(0);
    });

    const viewButtons = screen.getAllByTitle("عرض التفاصيل");
    expect(viewButtons.length).toBeGreaterThan(0);
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("تفاصيل المخزون - ساعة ذكية برو")).toBeInTheDocument();
      expect(screen.getByText("معلومات المنتج")).toBeInTheDocument();
      expect(screen.getByText("حالة المخزون")).toBeInTheDocument();
    });
  });
});
