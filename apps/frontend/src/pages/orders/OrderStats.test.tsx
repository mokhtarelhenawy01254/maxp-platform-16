import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { OrderStats } from "./OrderStats";

jest.mock("../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          totalOrders: 1250,
          totalRevenue: 375000,
          averageOrderValue: 300,
          statusCounts: {
            DELIVERED: 900,
            PENDING: 150,
          },
          recentOrders: [
            {
              orderNumber: "ORD-777",
              customerName: "سارة أحمد",
              total: 450,
              status: "DELIVERED",
              createdAt: "2026-10-18T08:00:00.000Z",
            },
          ],
        },
      },
    }),
  },
}));

jest.mock("../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} ج.م`,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opt?: any) => opt?.defaultValue || k,
  }),
}));

describe("OrderStats Suite", () => {
  it("renders order stats header, KPI values, and recent order ledger", async () => {
    render(
      <BrowserRouter>
        <OrderStats />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("orderStats.title")).toBeInTheDocument();
      expect(screen.getByText("1,250")).toBeInTheDocument();
      expect(screen.getByText("375000 ج.م")).toBeInTheDocument();
      expect(screen.getByText("300 ج.م")).toBeInTheDocument();
      expect(screen.getByText("ORD-777")).toBeInTheDocument();
      expect(screen.getByText("سارة أحمد")).toBeInTheDocument();
    });
  });
});
