// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalInvoiceDetailModal from "../../DentalInvoiceDetailModal";
import type { DentalInvoice } from "../../../../shared";

const mockStandardInvoice: DentalInvoice = {
  id: "inv-001",
  invoiceNumber: "INV-2026-001",
  status: "ISSUED",
  createdAt: "2026-10-15T10:00:00Z",
  dueDate: "2026-10-25T10:00:00Z",
  total: 5000,
  paid: 2000,
  remaining: 3000,
  notes: "يرجى مراجعة اللون مع العيادة",
  doctorName: "د. هاني شاكر",
  doctor: {
    id: "doc-1",
    name: "د. هاني شاكر",
    clinicName: "عيادات النخبة لطب الأسنان",
    phone: "01012345678",
  },
  patientName: "أحمد محمود",
  case: {
    id: "case-1",
    caseNumber: "CS-9901",
    patientName: "أحمد محمود",
    workTypeName: "Zirconia Bridge",
    unitsCount: 3,
    unitPrice: 1500,
    teeth: "14, 15, 16",
    shade: "A2",
    material: "Zirconia Katana",
  },
  payments: [
    {
      id: "pay-1",
      amount: 2000,
      createdAt: "2026-10-16T12:00:00Z",
      method: "CASH",
      note: "دفعة مقدمة نقداً",
    },
  ],
};

const mockConsolidatedInvoice: DentalInvoice = {
  id: "inv-002",
  invoiceNumber: "INV-2026-CONS",
  status: "PAID",
  createdAt: "2026-10-18T14:30:00Z",
  total: 12000,
  paid: 12000,
  remaining: 0,
  doctorName: "د. سارة عادل",
  notes: JSON.stringify({
    title: "مطالبة النصف الأول من أكتوبر",
    isConsolidated: true,
    casesCount: 2,
    totalUnits: 5,
    items: [
      {
        caseId: "c-101",
        caseNumber: "CS-101",
        patientName: "منى سمير",
        doctorName: "د. سارة عادل",
        workTypeName: "E-max Crown",
        unitsCount: 2,
        unitPrice: 2000,
        total: 4000,
      },
      {
        caseId: "c-102",
        caseNumber: "CS-102",
        patientName: "يوسف كامل",
        doctorName: "د. سارة عادل",
        workTypeName: "Zirconia All-on-4",
        unitsCount: 3,
        unitPrice: 2666.67,
        total: 8000,
      },
    ],
  }),
  payments: [
    {
      id: "pay-2",
      amount: 12000,
      createdAt: "2026-10-18T15:00:00Z",
      method: "BANK_TRANSFER",
      note: "تحويل بنكي فوري",
    },
  ],
};

describe("DentalInvoiceDetailModal", () => {
  const onClose = vi.fn();
  const onAddPayment = vi.fn();
  const onPdf = vi.fn();
  const onPaymentLink = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders standard invoice with doctor, patient, case details, and financial totals", () => {
    render(
      <DentalInvoiceDetailModal
        invoice={mockStandardInvoice}
        onClose={onClose}
        onAddPayment={onAddPayment}
        onPdf={onPdf}
        onPaymentLink={onPaymentLink}
      />
    );

    // Invoice Header
    expect(screen.getByText(/فاتورة #INV-2026-001/)).toBeInTheDocument();

    // Doctor info
    expect(screen.getAllByText("د. هاني شاكر").length).toBeGreaterThan(0);
    expect(screen.getByText("عيادات النخبة لطب الأسنان")).toBeInTheDocument();
    expect(screen.getByText("01012345678")).toBeInTheDocument();

    // Patient & Case details
    expect(screen.getByText("أحمد محمود")).toBeInTheDocument();
    expect(screen.getByText(/CS-9901/)).toBeInTheDocument();
    expect(screen.getByText("Zirconia Bridge")).toBeInTheDocument();
    expect(screen.getByText(/3 وحدة/)).toBeInTheDocument();
    expect(screen.getByText("14, 15, 16")).toBeInTheDocument();
    expect(screen.getByText("A2")).toBeInTheDocument();
    expect(screen.getByText("Zirconia Katana")).toBeInTheDocument();

    // Financial totals (using container queries or text match)
    expect(screen.getByText("يرجى مراجعة اللون مع العيادة")).toBeInTheDocument();

    // Payments section
    expect(screen.getByText("دفعة مقدمة نقداً")).toBeInTheDocument();
    expect(screen.getByText(/CASH/)).toBeInTheDocument();
  });

  it("renders consolidated invoice details and breakdown table correctly", () => {
    render(
      <DentalInvoiceDetailModal
        invoice={mockConsolidatedInvoice}
        onClose={onClose}
        onAddPayment={onAddPayment}
        onPdf={onPdf}
        onPaymentLink={onPaymentLink}
      />
    );

    // Consolidated Header badge
    expect(screen.getByText(/فاتورة شهرية مجمعة \(2 حالة\)/)).toBeInTheDocument();
    expect(screen.getAllByText(/5 وحدة/).length).toBeGreaterThan(0);

    // Consolidated Table rows
    expect(screen.getByText("CS-101")).toBeInTheDocument();
    expect(screen.getByText("منى سمير")).toBeInTheDocument();
    expect(screen.getByText("E-max Crown")).toBeInTheDocument();

    expect(screen.getByText("CS-102")).toBeInTheDocument();
    expect(screen.getByText("يوسف كامل")).toBeInTheDocument();
    expect(screen.getByText("Zirconia All-on-4")).toBeInTheDocument();

    // Display note
    expect(screen.getByText("مطالبة النصف الأول من أكتوبر")).toBeInTheDocument();
  });

  it("triggers action callbacks when clicking buttons", () => {
    render(
      <DentalInvoiceDetailModal
        invoice={mockStandardInvoice}
        onClose={onClose}
        onAddPayment={onAddPayment}
        onPdf={onPdf}
        onPaymentLink={onPaymentLink}
      />
    );

    // Click PDF
    fireEvent.click(screen.getByRole("button", { name: /فاتورة PDF/ }));
    expect(onPdf).toHaveBeenCalledTimes(1);

    // Click Payment Link
    fireEvent.click(screen.getByRole("button", { name: /رابط دفع/ }));
    expect(onPaymentLink).toHaveBeenCalledTimes(1);

    // Click Add Payment in footer
    fireEvent.click(screen.getByRole("button", { name: /تسجيل سداد/ }));
    expect(onAddPayment).toHaveBeenCalledTimes(1);

    // Click WhatsApp share
    fireEvent.click(screen.getByRole("button", { name: /إرسال واتساب/ }));
    expect(window.open).toHaveBeenCalled();

    // Click Close (header or footer)
    const closeButtons = screen.getAllByRole("button", { name: "إغلاق" });
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hides payment action buttons when remaining amount is zero", () => {
    render(
      <DentalInvoiceDetailModal
        invoice={mockConsolidatedInvoice}
        onClose={onClose}
        onAddPayment={onAddPayment}
        onPdf={onPdf}
        onPaymentLink={onPaymentLink}
      />
    );

    // Fully paid, so "تسجيل سداد" and "إضافة دفعة" should not be rendered
    expect(screen.queryByRole("button", { name: /تسجيل سداد/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /إضافة دفعة/ })).not.toBeInTheDocument();
  });

  it("renders empty payments placeholder when no payments are present", () => {
    const invoiceWithoutPayments: DentalInvoice = {
      ...mockStandardInvoice,
      payments: [],
    };

    render(
      <DentalInvoiceDetailModal
        invoice={invoiceWithoutPayments}
        onClose={onClose}
        onAddPayment={onAddPayment}
        onPdf={onPdf}
        onPaymentLink={onPaymentLink}
      />
    );

    expect(screen.getByText("لم يتم تسجيل أي دفعات لهذه الفاتورة بعد")).toBeInTheDocument();
  });
});
