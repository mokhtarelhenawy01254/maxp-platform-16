import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TicketModalHeader } from "./TicketModalHeader";

describe("TicketModalHeader", () => {
  it("renders title, order number and calls onClose when close button clicked", () => {
    const onClose = jest.fn();
    render(<TicketModalHeader effectiveOrderNumber="ORD-1234" onClose={onClose} />);

    expect(screen.getByText("تذاكر الدعم والمتابعة")).toBeInTheDocument();
    expect(screen.getByText("طلب #ORD-1234")).toBeInTheDocument();

    const closeBtn = screen.getByLabelText("إغلاق النافذة");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
