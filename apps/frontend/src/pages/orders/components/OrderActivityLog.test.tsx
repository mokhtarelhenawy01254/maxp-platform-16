import React from "react";
import { render, screen } from "@testing-library/react";
import OrderActivityLog from "./OrderActivityLog";
import { OrderDetailsType } from "../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === "orderDetails.statusChangeTo") {
        return `Status changed to ${params?.status}`;
      }
      if (key === "orderDetails.cancellationReasonLine") {
        return `Cancellation reason: ${params?.reason}`;
      }
      if (key === "orderDetails.statusReasonLine") {
        return `Reason: ${params?.reason}`;
      }
      if (key === "orderDetails.system") return "System";
      return key;
    },
  }),
}));

jest.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDateTime: (value: string) => value,
  }),
}));

const baseOrder: OrderDetailsType = {
  id: "order-1",
  orderNumber: "ORD-100",
  customerName: "Customer",
  status: "CANCELLED",
  paymentStatus: "PENDING",
  paymentMethod: "CASH",
  items: [],
  subtotal: 100,
  tax: 0,
  shipping: 0,
  total: 100,
  currency: "EGP",
  createdAt: "2026-05-03T10:00:00.000Z",
  updatedAt: "2026-05-03T10:00:00.000Z",
};

describe("OrderActivityLog", () => {
  it("shows the cancellation reason from status history", () => {
    render(
      <OrderActivityLog
        order={{
          ...baseOrder,
          statusHistory: [
            {
              status: "CANCELLED",
              reason: "Customer requested cancellation",
              createdAt: "2026-05-03T10:05:00.000Z",
              userName: "Support Agent",
            },
          ],
        }}
        onAddNote={jest.fn()}
        addingNote={false}
      />,
    );

    expect(
      screen.getByText(/Cancellation reason: Customer requested cancellation/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Support Agent/)).toBeInTheDocument();
  });
});
