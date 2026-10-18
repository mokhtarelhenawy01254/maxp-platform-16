import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BulkOrders } from "./BulkOrders";

jest.mock("../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
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
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    delete: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

jest.mock("../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: {
      role: "SUPER_ADMIN",
      permissions: ["bulkOrders.create", "bulkOrders.delete"],
    },
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opt?: any) => opt?.defaultValue || k,
    i18n: { language: "ar" },
  }),
}));

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
