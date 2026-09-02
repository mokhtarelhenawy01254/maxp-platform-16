import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
      if (key === "orderDetails.modificationDetail") {
        return `Modification details: ${params?.reason}`;
      }
      if (key === "orderDetails.allActivities") return "All Activities";
      if (key === "orderDetails.statusChanges") return "Status Changes";
      if (key === "orderDetails.productChanges") return "Product Changes";
      if (key === "orderDetails.customerChanges") return "Customer & Shipping";
      if (key === "orderDetails.notes") return "Notes";
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
              id: "sh-1",
              status: "CANCELLED",
              reason: "Customer requested cancellation",
              createdAt: "2026-05-03T10:05:00.000Z",
              userName: "Support Agent",
            },
          ],
        }}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        addingNote={false}
        updatingNote={false}
        deletingNote={false}
      />,
    );

    expect(
      screen.getByText(/Cancellation reason: Customer requested cancellation/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Support Agent/)).toBeInTheDocument();
  });

  it("categorizes product modifications and filters by product tab", () => {
    render(
      <OrderActivityLog
        order={{
          ...baseOrder,
          status: "CONFIRMED",
          statusHistory: [
            {
              id: "sh-1",
              status: "CONFIRMED",
              oldStatus: "CONFIRMED",
              reason: "تعديل منتجات الطلب:\n• إضافة منتج: قميص أبيض (الكمية: 2)",
              createdAt: "2026-05-03T10:05:00.000Z",
              userName: "Admin User",
            },
          ],
        }}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        addingNote={false}
        updatingNote={false}
        deletingNote={false}
      />,
    );

    expect(screen.getByText(/إضافة منتج: قميص أبيض/)).toBeInTheDocument();

    // Click Product Changes Tab
    const productTab = screen.getByRole("button", { name: /Product Changes/i });
    fireEvent.click(productTab);

    expect(screen.getByText(/إضافة منتج: قميص أبيض/)).toBeInTheDocument();
  });

  it("categorizes customer modifications and filters by customer tab", () => {
    render(
      <OrderActivityLog
        order={{
          ...baseOrder,
          status: "CONFIRMED",
          statusHistory: [
            {
              id: "sh-2",
              status: "CONFIRMED",
              oldStatus: "CONFIRMED",
              reason: "تعديل بيانات العميل والشحن:\n• تعديل رقم الهاتف: من 01011111111 إلى 01022222222",
              createdAt: "2026-05-03T10:06:00.000Z",
              userName: "Sales Agent",
            },
          ],
        }}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        addingNote={false}
        updatingNote={false}
        deletingNote={false}
      />,
    );

    expect(screen.getByText(/تعديل رقم الهاتف/)).toBeInTheDocument();

    // Click Customer & Shipping Tab
    const customerTab = screen.getByRole("button", { name: /Customer & Shipping/i });
    fireEvent.click(customerTab);

    expect(screen.getByText(/تعديل رقم الهاتف/)).toBeInTheDocument();
  });
});

