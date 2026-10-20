// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ConfirmationQueueDisabledState } from "../ConfirmationQueueDisabledState";
import { ConfirmationCancelModal } from "../ConfirmationCancelModal";
import { ConfirmationPagination } from "../ConfirmationPagination";
import { ConfirmationOrdersVirtualList } from "../ConfirmationOrdersVirtualList";
import type { ConfirmationOrder } from "../types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

afterEach(() => {
  cleanup();
});

describe("ConfirmationQueueDisabledState", () => {
  it("renders disabled state banner with settings link", () => {
    render(
      <MemoryRouter>
        <ConfirmationQueueDisabledState embedded={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText("المركز مقفول من الإعدادات")).toBeInTheDocument();
    expect(screen.getByText("فتح إعدادات مركز التأكيد")).toBeInTheDocument();
  });
});

describe("ConfirmationCancelModal", () => {
  const dummyOrder: ConfirmationOrder = {
    id: "ord-1",
    orderNumber: "ORD-1001",
    customerName: "محمد أحمد",
    total: 250,
    status: "pending",
    sourceType: "storefront",
    createdAt: "2026-10-20T10:00:00Z",
  };

  it("does not render when cancelTarget is null", () => {
    const { container } = render(
      <ConfirmationCancelModal
        cancelTarget={null}
        cancelReason=""
        cancellingId={null}
        onClose={vi.fn()}
        onReasonChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog and handles input change and submit", () => {
    const onReasonChange = vi.fn();
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    render(
      <ConfirmationCancelModal
        cancelTarget={dummyOrder}
        cancelReason="العميل غير جاد"
        cancellingId={null}
        onClose={onClose}
        onReasonChange={onReasonChange}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("اكتب سبب إلغاء هذا الطلب:")).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText("اكتب سبب الإلغاء...");
    fireEvent.change(textarea, { target: { value: "العميل مسافر" } });
    expect(onReasonChange).toHaveBeenCalledWith("العميل مسافر");

    const submitBtn = screen.getByText("تأكيد الإلغاء");
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByText("إغلاق");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ConfirmationPagination", () => {
  it("renders null when totalPages <= 1", () => {
    const { container } = render(
      <ConfirmationPagination
        page={1}
        totalPages={1}
        ordersCount={5}
        totalOrders={5}
        onPageChange={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders pagination controls when totalPages > 1 and handles page clicks", () => {
    const onPageChange = vi.fn();
    render(
      <ConfirmationPagination
        page={2}
        totalPages={5}
        ordersCount={10}
        totalOrders={50}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("السابق")).toBeInTheDocument();
    expect(screen.getByText("التالي")).toBeInTheDocument();

    fireEvent.click(screen.getByText("السابق"));
    expect(onPageChange).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("التالي"));
    expect(onPageChange).toHaveBeenCalledTimes(2);
  });
});

describe("ConfirmationOrdersVirtualList", () => {
  it("renders empty state when orders list is empty", () => {
    render(
      <ConfirmationOrdersVirtualList
        orders={[]}
        loading={false}
        settings={{ enabled: true }}
        assignSelections={{}}
        eligibleUsers={[]}
        assigningId={null}
        cancellingId={null}
        callingId={null}
        selectedOrderIds={[]}
        formatDate={() => "2026-10-20"}
        formatPrice={(p) => `${p} EGP`}
        strategyLabelMap={{}}
        onAssignChange={vi.fn()}
        onAssign={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        onLogCall={vi.fn()}
        onPostpone={vi.fn()}
        onToggleSelect={vi.fn()}
        onPrintSlip={vi.fn()}
        onPrintInvoice={vi.fn()}
      />,
    );

    expect(screen.getByText("كل شيء تحت السيطرة")).toBeInTheDocument();
    expect(screen.getByText("لا توجد طلبات تحتاج إلى تأكيد حالياً")).toBeInTheDocument();
  });
});
