import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrderPaymentStatusModal } from "./OrderPaymentStatusModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("OrderPaymentStatusModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    newPaymentStatus: "PAID",
    setNewPaymentStatus: jest.fn(),
    paymentNotes: "",
    setPaymentNotes: jest.fn(),
    paymentStatuses: [
      { code: "PENDING", name: "قيد الانتظار" },
      { code: "PAID", name: "مدفوع بالكامل" },
      { code: "FAILED", name: "فشل الدفع" },
    ],
    updating: false,
    onUpdatePaymentStatus: jest.fn().mockResolvedValue(undefined),
  };

  it("renders payment status modal and triggers submit", () => {
    render(<OrderPaymentStatusModal {...defaultProps} />);

    expect(screen.getByText("تحديث حالة الدفع")).toBeInTheDocument();
    expect(screen.getByText("مدفوع بالكامل")).toBeInTheDocument();

    const submitBtn = screen.getByText("حفظ وتحديث الدفع");
    fireEvent.click(submitBtn);

    expect(defaultProps.onUpdatePaymentStatus).toHaveBeenCalled();
  });
});
