// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { OrderStatusUpdateModal } from "./OrderStatusUpdateModal";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts && opts.defaultValue ? opts.defaultValue : key,
  }),
}));

afterEach(() => {
  cleanup();
});

describe("OrderStatusUpdateModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    newStatus: "CONFIRMED",
    setNewStatus: vi.fn(),
    statusNotes: "",
    setStatusNotes: vi.fn(),
    isOverride: false,
    setIsOverride: vi.fn(),
    cancellationAdditionalNotes: "",
    setCancellationAdditionalNotes: vi.fn(),
    returnReason: "",
    setReturnReason: vi.fn(),
    returnAdditionalNotes: "",
    setReturnAdditionalNotes: vi.fn(),
    filteredStatusOptions: [
      { code: "PENDING", name: "قيد الانتظار" },
      { code: "CONFIRMED", name: "مؤكد" },
      { code: "CANCELLED", name: "ملغي" },
    ],
    workflowStatusDefs: [],
    hasWorkflowRestrictions: false,
    isModalCancellationStatus: false,
    isModalReturnStatus: false,
    cancellationReasonOptions: [],
    cancellationReasonOptionsLoading: false,
    commonReturnReasons: ["العميل غير راغب بالاستلام", "منتج غير مطابق"],
    updating: false,
    onUpdateStatus: vi.fn().mockResolvedValue(undefined),
  };

  it("renders status modal title and select options", () => {
    render(<OrderStatusUpdateModal {...defaultProps} />);

    expect(screen.getByText("تحديث حالة الطلب")).toBeInTheDocument();
    expect(screen.getByText("مؤكد")).toBeInTheDocument();
    expect(screen.getByText("حفظ وتحديث الحالة")).toBeInTheDocument();
  });

  it("triggers onUpdateStatus when clicking submit", () => {
    render(<OrderStatusUpdateModal {...defaultProps} />);

    const submitBtn = screen.getByText("حفظ وتحديث الحالة");
    fireEvent.click(submitBtn);

    expect(defaultProps.onUpdateStatus).toHaveBeenCalled();
  });
});
