import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrderStatusUpdateModal } from "./OrderStatusUpdateModal";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => (opts && opts.defaultValue ? opts.defaultValue : key),
  }),
}));

describe("OrderStatusUpdateModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    newStatus: "CONFIRMED",
    setNewStatus: jest.fn(),
    statusNotes: "",
    setStatusNotes: jest.fn(),
    isOverride: false,
    setIsOverride: jest.fn(),
    cancellationAdditionalNotes: "",
    setCancellationAdditionalNotes: jest.fn(),
    returnReason: "",
    setReturnReason: jest.fn(),
    returnAdditionalNotes: "",
    setReturnAdditionalNotes: jest.fn(),
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
    onUpdateStatus: jest.fn().mockResolvedValue(undefined),
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
