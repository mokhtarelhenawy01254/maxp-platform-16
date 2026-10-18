import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TurboCaptainDetails } from "./TurboCaptainDetails";

jest.mock("../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: "ar" },
  }),
}));

jest.mock("../../services/api", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: {
        success: true,
        data: [
          {
            id: "turbo-1",
            orderNumber: "TRB-101",
            customerName: "محمود حسن",
            customerPhone: "01099887766",
            total: 320,
            shipping: 50,
            status: "delivered",
            turboShipmentId: "tb-99",
            turboTrackingNumber: "TRK-99",
            turboShipmentStatus: "delivered",
            turboDelayReason: null,
            turboReturnReason: null,
            turboExpectedBranch: "فرع الهرم",
            governorate: "الجيزة",
            city: "الهرم",
            createdAt: "2026-10-18T10:00:00.000Z",
          },
        ],
        stats: {
          total: 10,
          delivered: 8,
          returned: 1,
          active: 1,
          delayed: 0,
          remitted: 8,
          totalRevenue: 3200,
          totalShipping: 500,
          deliveryRate: 80,
          delayReasons: {},
          returnReasons: {},
        },
        captain: {
          name: "إبراهيم المندوب",
          phone: "01012345678",
          branch: "فرع الهرم",
          branchPhone: "0233445566",
        },
        pagination: { pages: 1, page: 1, limit: 50 },
      },
    }),
  },
}));

describe("TurboCaptainDetails Suite", () => {
  it("renders captain header, stats ribbon, and orders table", async () => {
    render(
      <MemoryRouter initialEntries={["/orders/turbo-captains/إبراهيم%20المندوب"]}>
        <Routes>
          <Route path="/orders/turbo-captains/:name" element={<TurboCaptainDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("إبراهيم المندوب")).toBeInTheDocument();
      expect(screen.getByText("TRB-101")).toBeInTheDocument();
      expect(screen.getByText("محمود حسن")).toBeInTheDocument();
    });
  });
});
