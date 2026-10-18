import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { OrderActivityLogPage } from "./OrderActivityLogPage";

jest.mock("../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opt?: any) => opt?.defaultValue || k,
    i18n: { language: "ar" },
  }),
}));

jest.mock("../../services/orderWorkflowService", () => ({
  __esModule: true,
  default: {
    getAuditActors: jest.fn().mockResolvedValue({
      success: true,
      data: [{ id: "usr-1", name: "أحمد حسني", email: "ahmed@example.com" }],
    }),
    getGlobalAuditLogs: jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: "log-1",
          changeType: "normal",
          createdAt: "2026-10-18T10:00:00.000Z",
          user: {
            id: "usr-1",
            firstName: "أحمد",
            lastName: "حسني",
          },
          fromStatus: { code: "PENDING", name: "قيد الانتظار" },
          toStatus: { code: "CONFIRMED", name: "مؤكد" },
          order: {
            orderNumber: "ORD-101",
            customerName: "عميل تجريبي",
            total: 250,
          },
        },
      ],
      total: 1,
      stats: { total: 1, todayCount: 1 },
      nextCursor: null,
    }),
  },
}));

describe("OrderActivityLogPage Suite", () => {
  it("renders activity log header, stats, and log item", async () => {
    render(
      <BrowserRouter>
        <OrderActivityLogPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("ORD-101")).toBeInTheDocument();
      expect(screen.getByText("أحمد حسني")).toBeInTheDocument();
    });
  });
});
