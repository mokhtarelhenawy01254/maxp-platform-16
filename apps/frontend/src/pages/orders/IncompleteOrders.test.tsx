import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { IncompleteOrders } from "./IncompleteOrders";

jest.mock("../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            cartId: "cart-abc-123456",
            itemsCount: 2,
            total: 250,
            status: "active",
            createdAt: "2026-10-18T10:00:00.000Z",
            checkoutData: {
              name: "محمد علي",
              phone: "01000000000",
              governorate: "الإسكندرية",
            },
          },
        ],
        stats: {
          active: 5,
          lost: 2,
          converted: 10,
          potentialRevenue: 1500,
        },
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

jest.mock("../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: {
      role: "COMPANY_ADMIN",
      permissions: ["orders.manage"],
    },
  }),
}));

jest.mock("../../contexts/CompanyContext", () => ({
  useCompany: () => ({
    company: { id: "comp-1", activeApps: ["order-attribution"] },
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opt?: any) => opt?.defaultValue || k,
    i18n: { language: "ar" },
  }),
}));

describe("IncompleteOrders Suite", () => {
  it("renders incomplete orders header, statistics bar, and table", async () => {
    render(
      <BrowserRouter>
        <IncompleteOrders />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("محمد علي")).toBeInTheDocument();
      expect(screen.getByText(/cart-abc-123/)).toBeInTheDocument();
    });
  });
});
