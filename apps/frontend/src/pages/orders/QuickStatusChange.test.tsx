import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { QuickStatusChange } from "./QuickStatusChange";

jest.mock("../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opt?: any) => {
      if (k === "quickStatus.title") return "تغيير سريع لحالة الطلب";
      if (k === "quickStatus.description") return "ابحث عن الطلب بالباركود أو الكود";
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
          id: "ord-999",
          orderNumber: "ORD-999",
          status: "PENDING",
          customerName: "سارة محمود",
          customerPhone: "01123456789",
          total: 450,
          currency: "EGP",
        },
      },
    }),
    post: jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: { status: "DELIVERED" },
      },
    }),
  },
}));

jest.mock("../../services/orderWorkflowService", () => ({
  __esModule: true,
  default: {
    getStatuses: jest.fn().mockResolvedValue({
      data: [
        { id: "PENDING", name: "قيد الانتظار", code: "PENDING" },
        { id: "DELIVERED", name: "تم التوصيل", code: "DELIVERED" },
      ],
    }),
    getConfig: jest.fn().mockResolvedValue({
      data: { enabled: true },
    }),
  },
}));

describe("QuickStatusChange Suite", () => {
  it("renders page header and control box input", () => {
    render(
      <BrowserRouter>
        <QuickStatusChange />
      </BrowserRouter>
    );

    expect(screen.getByText("تغيير سريع لحالة الطلب")).toBeInTheDocument();
    expect(screen.getByText("ابحث عن الطلب بالباركود أو الكود")).toBeInTheDocument();
  });

  it("handles order search and displays current order card", async () => {
    render(
      <BrowserRouter>
        <QuickStatusChange />
      </BrowserRouter>
    );

    const input = screen.getByPlaceholderText(/quickStatus/i) || screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "ORD-999" } });

    // Submit search via Enter or button
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("سارة محمود")).toBeInTheDocument();
    });
  });
});
