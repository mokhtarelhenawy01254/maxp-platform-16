// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalInvoiceDoctorStatementModal from "../../DentalInvoiceDoctorStatementModal";
import * as shared from "../../../../shared";
import * as invoicesTypes from "../../../types/dentalInvoicesTypes";
import * as exportHelpers from "@/utils/exportHelpers";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock exportToExcel
vi.mock("@/utils/exportHelpers", () => ({
  exportToExcel: vi.fn(),
}));

// Mock shareStatementWhatsApp
vi.mock("../../../types/dentalInvoicesTypes", async (importOriginal) => {
  const actual = await importOriginal<typeof invoicesTypes>();
  return {
    ...actual,
    shareStatementWhatsApp: vi.fn(),
  };
});

const mockDoctor = {
  id: "doc-123",
  name: "د. طارق الحكيم",
  clinicName: "عيادة سمايل لطب الأسنان",
  phone: "01012345678",
} as any;

const mockStatement = {
  totals: {
    totalCards: 5,
    totalUnits: 12,
    invoiced: 24000,
    paid: 14000,
    remaining: 10000,
    invoicesCount: 5,
  },
  invoices: [
    {
      id: "inv-001",
      invoiceNumber: "INV-2026-001",
      caseNumber: "CASE-901",
      patientName: "أحمد كمال",
      workTypeName: "Zirconia Crown",
      unitsCount: 3,
      createdAt: "2026-10-15T10:00:00.000Z",
      total: 6000,
      paid: 4000,
      remaining: 2000,
      status: "PARTIAL",
    },
    {
      id: "inv-002",
      invoiceNumber: "INV-2026-002",
      caseNumber: "CASE-902",
      patientName: "سارة محمود",
      workTypeName: "E-max Veneer",
      unitsCount: 4,
      createdAt: "2026-10-16T12:00:00.000Z",
      total: 8000,
      paid: 8000,
      remaining: 0,
      status: "PAID",
    },
  ],
  cases: [
    {
      caseNumber: "CASE-901",
      patientName: "أحمد كمال",
      workTypeName: "Zirconia Crown",
      status: "DELIVERED",
      total: 6000,
      paid: 4000,
      remaining: 2000,
    },
  ],
} as any;

describe("DentalInvoiceDoctorStatementModal (Batch 348 Modular Deconstruction)", () => {
  const onCloseMock = vi.fn();
  const onBulkPaymentMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(shared, "fetchDoctorStatement").mockResolvedValue(mockStatement);
    vi.spyOn(shared, "fetchDoctorStatementPdf").mockResolvedValue(
      new Blob(["dummy pdf"], { type: "application/pdf" })
    );
    window.print = vi.fn();
    // Mock URL.createObjectURL and revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/test-blob");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = () => {
    return render(
      <DentalInvoiceDoctorStatementModal
        doctor={mockDoctor}
        onClose={onCloseMock}
        onBulkPayment={onBulkPaymentMock}
      />
    );
  };

  it("1. renders header, doctor name, and fetches doctor statement", async () => {
    renderModal();

    expect(screen.getByText(/كشف حساب الطبيب: د. طارق الحكيم/)).toBeInTheDocument();
    expect(screen.getAllByText(/عيادة سمايل لطب الأسنان/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/01012345678/).length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect(shared.fetchDoctorStatement).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: "doc-123" })
      );
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
      expect(screen.getByText("INV-2026-002")).toBeInTheDocument();
    });
  });

  it("2. displays totals summary cards accurately", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    });

    expect(screen.getByText("عدد الحالات والوحدات")).toBeInTheDocument();
    expect(screen.getByText("إجمالي المفوتر")).toBeInTheDocument();
    expect(screen.getByText("إجمالي المسدد")).toBeInTheDocument();
    expect(screen.getByText("الرصيد المتبقي المستحق")).toBeInTheDocument();
  });

  it("3. switches tabs between Invoices and Cases", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    });

    const casesTabBtn = screen.getByText(/سجل الحالات/);
    fireEvent.click(casesTabBtn);

    expect(screen.getByText("CASE-901")).toBeInTheDocument();
    expect(screen.getByText("DELIVERED")).toBeInTheDocument();

    const invoicesTabBtn = screen.getByText(/سجل الفواتير/);
    fireEvent.click(invoicesTabBtn);
    expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
  });

  it("4. filters by date range and reloads statement", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    });

    const fromInput = screen.getByLabelText("تاريخ البداية");
    fireEvent.change(fromInput, { target: { value: "2026-10-01" } });

    await waitFor(() => {
      expect(shared.fetchDoctorStatement).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: "doc-123",
          from: new Date("2026-10-01").toISOString(),
        })
      );
    });
  });

  it("5. calls exportToExcel when clicking Excel button", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    });

    const excelBtn = screen.getByTitle("تصدير كشف الحساب كملف Excel (.xlsx)");
    fireEvent.click(excelBtn);

    expect(exportHelpers.exportToExcel).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      expect.stringContaining("كشف_حساب_د._طارق_الحكيم"),
      "كشف الحساب"
    );
  });

  it("6. calls WhatsApp share function on click", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    });

    const waBtn = screen.getByTitle("إرسال كشف الحساب عبر الواتساب");
    fireEvent.click(waBtn);

    expect(invoicesTypes.shareStatementWhatsApp).toHaveBeenCalledWith(
      "د. طارق الحكيم",
      "01012345678",
      mockStatement.totals
    );
  });

  it("7. downloads PDF statement when clicking PDF button", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    });

    const pdfBtn = screen.getByTitle("تنزيل كشف الحساب كملف PDF رسمي عالي الدقة");
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(shared.fetchDoctorStatementPdf).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: "doc-123" })
      );
    });
  });

  it("8. triggers window.print on print click and triggers callbacks for bulk payment and close", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("INV-2026-001")).toBeInTheDocument();
    });

    const printBtn = screen.getByTitle("طباعة ورقية نظيفة");
    fireEvent.click(printBtn);
    expect(window.print).toHaveBeenCalled();

    const bulkPayBtn = screen.getByText("تحصيل دفعة");
    fireEvent.click(bulkPayBtn);
    expect(onBulkPaymentMock).toHaveBeenCalled();

    const closeBtn = screen.getByLabelText("إغلاق");
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalled();
  });
});
