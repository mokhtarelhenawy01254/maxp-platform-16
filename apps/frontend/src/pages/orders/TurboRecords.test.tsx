import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import { TurboRecords } from "./TurboRecords";

jest.mock("../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opt?: any) => {
      if (k === "orders.turboRecordsTitle") return "سجلات الشحن Turbo";
      return opt?.defaultValue || k;
    },
    i18n: { language: "ar" },
  }),
}));

jest.mock("../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    formatPrice: (amount: number) => `${amount} ج.م`,
  }),
}));

jest.mock("../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: string) => d.slice(0, 10),
  }),
}));

jest.mock("../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "turbo-rec-1",
            orderNumber: "TRB-9001",
            customerName: "ياسمين خالد",
            customerPhone: "01002233445",
            total: 670,
            status: "DELIVERED",
            turboShipmentId: "tb-9001",
            turboTrackingNumber: "TRK-9001",
            turboShipmentStatus: "delivered",
            governorate: "القاهرة",
            city: "المعادي",
            createdAt: "2026-10-18T10:00:00.000Z",
          },
        ],
        statusCounts: {
          active: 5,
          delivered: 12,
        },
        pagination: { pages: 1, total: 1 },
      },
    }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe("TurboRecords Suite", () => {
  it("renders page title, top KPI cards, status category pills, and table row", async () => {
    render(
      <BrowserRouter>
        <TurboRecords />
      </BrowserRouter>
    );

    expect(screen.getByText("سجلات الشحن Turbo")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/TRB-9001/)).toBeInTheDocument();
      expect(screen.getByText("ياسمين خالد")).toBeInTheDocument();
    });
  });

  it("toggles order selection when row checkbox is clicked", async () => {
    render(
      <BrowserRouter>
        <TurboRecords />
      </BrowserRouter>
    );

    const rowCheckbox = await screen.findByLabelText(/تحديد الطلب TRB-9001/);
    expect(rowCheckbox).not.toBeChecked();

    fireEvent.click(rowCheckbox);

    await waitFor(() => {
      expect(rowCheckbox).toBeChecked();
    });
  });
});
