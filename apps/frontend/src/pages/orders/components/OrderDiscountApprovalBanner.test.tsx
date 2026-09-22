import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OrderDiscountApprovalBanner from "./OrderDiscountApprovalBanner";
import { OrderDetailsType } from "../types";

describe("OrderDiscountApprovalBanner", () => {
  const baseOrder: OrderDetailsType = {
    id: "ord-123",
    orderNumber: "ORD-1001",
    customerName: "محمد أحمد",
    items: [],
    subtotal: 500,
    discount: 50,
    discountReason: "كوبون: EID50",
    tax: 0,
    shipping: 40,
    total: 490,
    currency: "EGP",
    status: "PENDING",
    paymentStatus: "PENDING",
    paymentMethod: "cash_on_delivery",
    createdAt: "2026-09-22T10:00:00.000Z",
    updatedAt: "2026-09-22T10:00:00.000Z",
    needsDiscountApproval: true,
    discountApprovalStatus: "PENDING_APPROVAL",
  };

  it("renders pending approval banner with discount details and action buttons", () => {
    const handleApprove = jest.fn();
    const handleReject = jest.fn();

    render(
      <OrderDiscountApprovalBanner
        order={baseOrder}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    );

    expect(screen.getByText("خصم بانتظار اعتماد الإدارة")).toBeInTheDocument();
    expect(screen.getByText("اعتماد الخصم")).toBeInTheDocument();
    expect(screen.getByText("رفض وإلغاء الخصم")).toBeInTheDocument();
    expect(screen.getByText("كوبون: EID50")).toBeInTheDocument();
  });

  it("calls onApprove when clicking approve button", async () => {
    const handleApprove = jest.fn().mockResolvedValue(undefined);
    const handleReject = jest.fn();

    render(
      <OrderDiscountApprovalBanner
        order={baseOrder}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    );

    const approveBtn = screen.getByRole("button", { name: /اعتماد الخصم/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(handleApprove).toHaveBeenCalledTimes(1);
    });
  });

  it("opens reject modal and confirms rejection", async () => {
    const handleApprove = jest.fn();
    const handleReject = jest.fn().mockResolvedValue(undefined);

    render(
      <OrderDiscountApprovalBanner
        order={baseOrder}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    );

    const rejectBtn = screen.getByRole("button", { name: /رفض وإلغاء الخصم/i });
    fireEvent.click(rejectBtn);

    expect(screen.getByText("تأكيد رفض وإلغاء الخصم")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: /تأكيد الرفض والإلغاء/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleReject).toHaveBeenCalledTimes(1);
    });
  });

  it("renders approved banner when status is APPROVED", () => {
    const approvedOrder: OrderDetailsType = {
      ...baseOrder,
      needsDiscountApproval: false,
      discountApprovalStatus: "APPROVED",
      discountApprovedBy: "أحمد المدير",
    };

    render(
      <OrderDiscountApprovalBanner
        order={approvedOrder}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />
    );

    expect(screen.getByText(/تم اعتماد هذا الخصم/i)).toBeInTheDocument();
    expect(screen.getByText("أحمد المدير")).toBeInTheDocument();
  });

  it("renders rejected banner when status is REJECTED", () => {
    const rejectedOrder: OrderDetailsType = {
      ...baseOrder,
      needsDiscountApproval: false,
      discountApprovalStatus: "REJECTED",
      discountRejectedBy: "سارة المشرفة",
      discountRejectionReason: "كوبون منتهي الصلاحية",
    };

    render(
      <OrderDiscountApprovalBanner
        order={rejectedOrder}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />
    );

    expect(screen.getByText(/تم رفض الخصم وإلغاؤه من هذا الطلب/i)).toBeInTheDocument();
    expect(screen.getByText("سارة المشرفة")).toBeInTheDocument();
    expect(screen.getByText(/كوبون منتهي الصلاحية/i)).toBeInTheDocument();
  });

  it("returns null when no approval needed and no status", () => {
    const normalOrder: OrderDetailsType = {
      ...baseOrder,
      needsDiscountApproval: false,
      discountApprovalStatus: null,
    };

    const { container } = render(
      <OrderDiscountApprovalBanner
        order={normalOrder}
        onApprove={jest.fn()}
        onReject={jest.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
