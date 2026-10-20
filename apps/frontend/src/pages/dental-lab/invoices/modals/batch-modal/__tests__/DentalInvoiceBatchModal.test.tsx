// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { DentalInvoiceBatchModal } from "../../DentalInvoiceBatchModal";
import * as shared from "../../../../shared";
import type { UninvoicedSummaryResult } from "../../../../shared";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSummary: UninvoicedSummaryResult = {
  totalCases: 5,
  totalDoctors: 2,
  totalAmount: 12000,
  doctors: [
    {
      doctorId: "doc-1",
      doctorName: "د. طارق كامل",
      clinicName: "عيادة الشروق",
      casesCount: 3,
      totalAmount: 8000,
    },
    {
      doctorId: "doc-2",
      doctorName: "د. نجوى فؤاد",
      clinicName: "عيادة النور",
      casesCount: 2,
      totalAmount: 4000,
    },
  ],
};

describe("DentalInvoiceBatchModal", () => {
  it("renders modal header, doctor rows, and initial statistics", () => {
    const onClose = vi.fn();

    render(
      <DentalInvoiceBatchModal
        summary={mockSummary}
        onClose={onClose}
        onSaved={vi.fn()}
      />
    );

    expect(screen.getByText("إصدار الفواتير الشهرية المجمعة")).toBeInTheDocument();
    expect(screen.getByText("د. طارق كامل")).toBeInTheDocument();
    expect(screen.getByText("د. نجوى فؤاد")).toBeInTheDocument();
    expect(screen.getByText("2 طبيب")).toBeInTheDocument();
    expect(screen.getByText(/5 حالة/)).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "إلغاء" });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles toggling select all and individual doctor selection", () => {
    render(
      <DentalInvoiceBatchModal
        summary={mockSummary}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    // Initial state: all selected (2 doctors, 5 cases)
    expect(screen.getByText("إلغاء تحديد الكل")).toBeInTheDocument();

    // Click to deselect all
    fireEvent.click(screen.getByText("إلغاء تحديد الكل"));
    expect(screen.getByText("تحديد جميع الأطباء")).toBeInTheDocument();
    expect(screen.getByText("0 طبيب")).toBeInTheDocument();
    expect(screen.getByText(/0 حالة/)).toBeInTheDocument();

    // Toggle individual doctor row
    fireEvent.click(screen.getByText("د. طارق كامل"));
    expect(screen.getByText("1 طبيب")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /إصدار \(3\) فاتورة/ })).toBeInTheDocument();
  });

  it("handles includeAllStatuses toggle and refetches summary", async () => {
    const updatedSummary: UninvoicedSummaryResult = {
      totalCases: 8,
      totalDoctors: 2,
      totalAmount: 18000,
      doctors: [
        {
          doctorId: "doc-1",
          doctorName: "د. طارق كامل",
          clinicName: "عيادة الشروق",
          casesCount: 5,
          totalAmount: 12000,
        },
        {
          doctorId: "doc-2",
          doctorName: "د. نجوى فؤاد",
          clinicName: "عيادة النور",
          casesCount: 3,
          totalAmount: 6000,
        },
      ],
    };

    const fetchSpy = vi.spyOn(shared, "fetchUninvoicedSummary").mockResolvedValue(updatedSummary);

    render(
      <DentalInvoiceBatchModal
        summary={mockSummary}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    const checkbox = screen.getByRole("checkbox", {
      name: /تضمين كافة الحالات المسجلة/i,
    });

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(true);
      expect(screen.getByText(/8 حالة/)).toBeInTheDocument();
    });
  });

  it("changes mode and executes batch invoice successfully", async () => {
    const onSaved = vi.fn();
    const batchSpy = vi.spyOn(shared, "batchCreateMonthlyInvoices").mockResolvedValue({
      createdCount: 2,
      invoicedCasesCount: 5,
      totalAmount: 12000,
    });

    render(
      <DentalInvoiceBatchModal
        summary={mockSummary}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    );

    // Switch mode to CONSOLIDATED
    const modeSelect = screen.getByLabelText("نمط إصدار الفواتير");
    fireEvent.change(modeSelect, { target: { value: "CONSOLIDATED" } });

    // Set notes
    const notesInput = screen.getByPlaceholderText("مثال: مطالبات دورية لشهر ...");
    fireEvent.change(notesInput, { target: { value: "فواتير شهر أكتوبر" } });

    // Click run batch button
    const submitBtn = screen.getByRole("button", {
      name: /إصدار فواتير مجمعة لـ/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(batchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorIds: ["doc-1", "doc-2"],
          mode: "CONSOLIDATED",
          notes: "فواتير شهر أكتوبر",
          includeAllStatuses: false,
        })
      );
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });
});
