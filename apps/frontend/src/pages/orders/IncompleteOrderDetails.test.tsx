import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { IncompleteOrderDetails } from "./IncompleteOrderDetails";

jest.mock("../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opt?: any) => {
      if (k === "orders.incompleteConfirmTitle") return "تحويل السلة لطلب";
      return opt?.defaultValue || k;
    },
    i18n: { language: "ar" },
  }),
}));

jest.mock("../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          cartId: "cart-xyz-789",
          status: "lost",
          itemsCount: 3,
          total: 890,
          checkoutStartedAt: "2026-10-18T08:00:00.000Z",
          checkoutUpdatedAt: "2026-10-18T08:30:00.000Z",
          items: [
            {
              id: "item-1",
              name: "حذاء رياضي أنيق",
              quantity: 1,
              price: 890,
            },
          ],
          checkoutData: {
            customerName: "كريم يوسف",
            customerPhone: "01234567890",
            governorate: "الجيزة",
            city: "الدقي",
          },
          abandonReason: {
            code: "PAYMENT_FAILED",
            evidence: ["Failed 3DS authentication"],
          },
        },
      },
    }),
    post: jest.fn().mockResolvedValue({
      data: { success: true },
    }),
  },
}));

jest.mock("../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { role: "COMPANY_ADMIN", permissions: ["orders.manage"] },
  }),
}));

jest.mock("../../contexts/CompanyContext", () => ({
  useCompany: () => ({
    company: { id: "comp-1", activeApps: ["order-attribution"] },
  }),
}));

describe("IncompleteOrderDetails Suite", () => {
  it("renders cart details, customer information, and reason card", async () => {
    render(
      <MemoryRouter initialEntries={["/orders/incomplete/cart-xyz-789"]}>
        <Routes>
          <Route path="/orders/incomplete/:cartId" element={<IncompleteOrderDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("كريم يوسف")).toBeInTheDocument();
      expect(screen.getByText("حذاء رياضي أنيق")).toBeInTheDocument();
    });
  });
});
