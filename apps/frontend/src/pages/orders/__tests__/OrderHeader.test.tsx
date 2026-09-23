import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OrderHeader from "../components/OrderHeader";
import { OrderDetailsType } from "../types";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (opts?.defaultValue) return opts.defaultValue;
      return key;
    },
  }),
}));

jest.mock("../../../hooks/useDateFormat", () => ({
  useDateFormat: () => ({
    formatDate: (d: any) => String(d),
    formatDateTime: (d: any) => "2026-09-23 11:50",
  }),
}));

describe("OrderHeader Component", () => {
  const mockOrder: OrderDetailsType = {
    id: "ord-1",
    orderNumber: "ORD-458715-426",
    companyId: "comp-1",
    status: "CONFIRMED",
    paymentStatus: "PENDING",
    paymentMethod: "COD",
    createdAt: "2026-09-23T11:50:00Z",
    updatedAt: "2026-09-23T11:50:00Z",
    items: [],
    currency: "EGP",
    totalAmount: 500,
  } as any;

  it("renders order title, number, and status badge", () => {
    render(
      <MemoryRouter>
        <OrderHeader
          order={mockOrder}
          isEditing={false}
          updating={false}
          onEdit={jest.fn()}
          onCancel={jest.fn()}
          onSave={jest.fn()}
          onPrint={jest.fn()}
          onPrintPreparationSlip={jest.fn()}
          onBack={jest.fn()}
          currentStatusConfig={{
            code: "CONFIRMED",
            name: "مؤكد",
            color: "#10B981",
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("#ORD-458715-426")).toBeInTheDocument();
    expect(screen.getByText("تفاصيل الطلب")).toBeInTheDocument();
    expect(screen.getByText("orders.confirmed")).toBeInTheDocument();
  });

  it("renders unified action buttons with no-wrap and triggers callbacks", () => {
    const onEdit = jest.fn();
    const onPrint = jest.fn();
    const onPrintPrep = jest.fn();
    const onPostpone = jest.fn();
    const onUpdatePayment = jest.fn();
    const onOpenTicket = jest.fn();

    render(
      <MemoryRouter>
        <OrderHeader
          order={mockOrder}
          isEditing={false}
          updating={false}
          onEdit={onEdit}
          onCancel={jest.fn()}
          onSave={jest.fn()}
          onPrint={onPrint}
          onPrintPreparationSlip={onPrintPrep}
          onBack={jest.fn()}
          onOpenTicket={onOpenTicket}
          canEditOrder={true}
          canPrintPreparationSlip={true}
          canPostponeOrder={true}
          onPostponeOrder={onPostpone}
          canUpdatePaymentStatus={true}
          onUpdatePayment={onUpdatePayment}
        />
      </MemoryRouter>
    );

    const editBtn = screen.getByText("orderDetails.editOrder");
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);

    const invoiceBtn = screen.getByText("الفاتورة");
    expect(invoiceBtn).toBeInTheDocument();
    fireEvent.click(invoiceBtn);
    expect(onPrint).toHaveBeenCalledTimes(1);

    const prepBtn = screen.getByText("ورقة التجهيز");
    expect(prepBtn).toBeInTheDocument();
    fireEvent.click(prepBtn);
    expect(onPrintPrep).toHaveBeenCalledTimes(1);

    const postponeBtn = screen.getByText("orderDetails.postponeOrder");
    expect(postponeBtn).toBeInTheDocument();
    fireEvent.click(postponeBtn);
    expect(onPostpone).toHaveBeenCalledTimes(1);

    const paymentBtn = screen.getByText("orderDetails.updatePayment");
    expect(paymentBtn).toBeInTheDocument();
    fireEvent.click(paymentBtn);
    expect(onUpdatePayment).toHaveBeenCalledTimes(1);

    const ticketBtn = screen.getByText("تذاكر الدعم");
    expect(ticketBtn).toBeInTheDocument();
    fireEvent.click(ticketBtn);
    expect(onOpenTicket).toHaveBeenCalledTimes(1);
  });

  it("renders save and cancel buttons when isEditing is true", () => {
    const onSave = jest.fn();
    const onCancel = jest.fn();

    render(
      <MemoryRouter>
        <OrderHeader
          order={mockOrder}
          isEditing={true}
          updating={false}
          onEdit={jest.fn()}
          onCancel={onCancel}
          onSave={onSave}
          onPrint={jest.fn()}
          onPrintPreparationSlip={jest.fn()}
          onBack={jest.fn()}
        />
      </MemoryRouter>
    );

    const saveBtn = screen.getByText("orderDetails.saveChanges");
    expect(saveBtn).toBeInTheDocument();
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);

    const cancelBtn = screen.getByText("orderDetails.cancel");
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
