/** @vitest-environment jsdom */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { ProductConsolidatorPage } from "../ProductConsolidatorPage";

// Mock API
vi.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            name: "ساعة ذكية",
            count: 2,
            items: [
              {
                id: "item_01",
                name: "ساعة ذكية أسود",
                sku: "WATCH-BLK",
                price: 250,
                comparePrice: null,
                images: [],
                mainImage: null,
                status: "ACTIVE",
                isActive: true,
                isHidden: false,
              },
              {
                id: "item_02",
                name: "ساعة ذكية فضي",
                sku: "WATCH-SLV",
                price: 260,
                comparePrice: null,
                images: [],
                mainImage: null,
                status: "ACTIVE",
                isActive: true,
                isHidden: false,
              },
            ],
          },
        ],
      },
    }),
    post: vi.fn().mockResolvedValue({
      data: {
        success: true,
        message: "تم الدمج بنجاح",
        data: { product: { id: "new_prod_01" } },
      },
    }),
  },
}));

afterEach(() => {
  cleanup();
});

describe("ProductConsolidatorPage Component", () => {
  it("renders page header and group selection", async () => {
    render(<ProductConsolidatorPage />);

    expect(screen.getByText("دمج المنتجات المكررة")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("ساعة ذكية (2 منتجات)")).toBeInTheDocument();
      expect(screen.getByText("ساعة ذكية أسود")).toBeInTheDocument();
      expect(screen.getByText("ساعة ذكية فضي")).toBeInTheDocument();
    });
  });

  it("selects all items and enables execution when new name is entered", async () => {
    render(<ProductConsolidatorPage />);

    await waitFor(() => {
      expect(screen.getByText("ساعة ذكية أسود")).toBeInTheDocument();
    });

    const selectAllBtn = screen.getByText("تحديد الكل");
    fireEvent.click(selectAllBtn);

    const nameInput = screen.getByPlaceholderText("مثال: حذاء سوان الرياضي");
    fireEvent.change(nameInput, { target: { value: "ساعة سوان الذكية الموحدة" } });

    const submitBtn = screen.getByRole("button", { name: "تنفيذ الدمج" });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("تم الدمج بنجاح")).toBeInTheDocument();
    });
  });
});
