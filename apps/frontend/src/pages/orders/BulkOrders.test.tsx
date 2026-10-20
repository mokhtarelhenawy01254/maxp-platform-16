// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { BulkOrders } from "./BulkOrders";

vi.mock("../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "bulk-1",
            operationNumber: "BLK-001",
            name: "دفعة طلبات القاهرة",
            totalOrders: 50,
            status: "COMPLETED",
            progress: 100,
            createdByName: "مختار",
            createdAt: "2026-10-18T00:00:00.000Z",
            updatedAt: "2026-10-18T01:00:00.000Z",
            itemsCount: 50,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

vi.mock("../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: {
      role: "SUPER_ADMIN",
      permissions: ["bulkOrders.create", "bulkOrders.delete"],
    },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (k: string, opt?: any) => opt?.defaultValue || k,
    i18n: { language: "ar" },
  }),
}));

afterEach(() => {
  cleanup();
});

describe("BulkOrders Suite", () => {
  it("renders page header and bulk orders table with fetched data", async () => {
    render(<BulkOrders />);

    expect(screen.getByText("orders.bulkOrders")).toBeInTheDocument();
    expect(screen.getByText("orders.bulkCreateNew")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("BLK-001")).toBeInTheDocument();
      expect(screen.getByText("دفعة طلبات القاهرة")).toBeInTheDocument();
    });
  });
});
