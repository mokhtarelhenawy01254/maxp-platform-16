// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DentalCaseInspector from "../../DentalCaseInspector";
import { type DentalLabCase } from "../../shared";

// Mock sample case data
const mockCaseData: DentalLabCase = {
  id: "case-uuid-12345678",
  caseNumber: "CASE-2026-0042",
  patientName: "أحمد عبد الله",
  patientPhone: "+201099887766",
  doctorId: "doc-1",
  doctorName: "شريف الألفي",
  doctor: {
    id: "doc-1",
    name: "شريف الألفي",
    clinicName: "عيادات النور التخصصية",
  },
  workTypeName: "تاج زيركون متعدد الطبقات",
  unitsCount: 3,
  teeth: "11, 12, 13",
  shade: "A2",
  material: "Zirconia Multilayer",
  materialBrand: "Aidite 3D Pro",
  warrantyYears: 5,
  status: "DESIGN",
  priority: "URGENT",
  dueDate: "2026-10-25T12:00:00Z",
  total: 4500,
  paid: 2000,
  remaining: 2500,
  notes: "يرجى مراعاة ملاءمة حواف التاج مع اللثة بدقة متناهية.",
  assignments: [
    {
      id: "asg-1",
      caseId: "case-uuid-12345678",
      technicianId: "tech-1",
      role: "CERAMIST",
      technician: {
        id: "tech-1",
        name: "محمد إبراهيم",
      },
    },
  ],
};

describe("DentalCaseInspector (Batch 343 Modular Deconstruction)", () => {
  const onClose = vi.fn();
  const onAdvance = vi.fn();
  const onAssign = vi.fn();
  const onEdit = vi.fn();
  const onInvoice = vi.fn();
  const onUpload = vi.fn();
  const onPrintPanLabel = vi.fn();
  const onPrintWorkOrder = vi.fn();
  const onTrash = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderInspector = (caseData: DentalLabCase = mockCaseData) => {
    return render(
      <MemoryRouter>
        <DentalCaseInspector
          caseData={caseData}
          onClose={onClose}
          onAdvance={onAdvance}
          onAssign={onAssign}
          onEdit={onEdit}
          onInvoice={onInvoice}
          onUpload={onUpload}
          onPrintPanLabel={onPrintPanLabel}
          onPrintWorkOrder={onPrintWorkOrder}
          onTrash={onTrash}
          isBusy={false}
          uploadingId={null}
        />
      </MemoryRouter>
    );
  };

  it("1. renders header with case number, priority badge, and patient/doctor info", () => {
    renderInspector();

    expect(screen.getByText("CASE-2026-0042")).toBeInTheDocument();
    expect(screen.getByText("مستعجل")).toBeInTheDocument();
    expect(screen.getAllByText(/أحمد عبد الله/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/د. شريف الألفي/).length).toBeGreaterThanOrEqual(1);
  });

  it("2. calls action bar handlers on button clicks", () => {
    renderInspector();

    // Advance button
    const advanceBtn = screen.getByRole("button", { name: /نقل إلى:/i });
    fireEvent.click(advanceBtn);
    expect(onAdvance).toHaveBeenCalledWith(mockCaseData);

    // Pan ticket print button
    const panTicketBtn = screen.getByTitle("طباعة تيكت صينية المعمل (Pan Label)");
    fireEvent.click(panTicketBtn);
    expect(onPrintPanLabel).toHaveBeenCalledWith(mockCaseData);

    // Work order print button
    const workOrderBtn = screen.getByTitle("طباعة أمر الشغل (Work Order PDF)");
    fireEvent.click(workOrderBtn);
    expect(onPrintWorkOrder).toHaveBeenCalledWith(mockCaseData);

    // Invoice button
    const invoiceBtn = screen.getByTitle("إصدار فاتورة أو تسجيل دفعة");
    fireEvent.click(invoiceBtn);
    expect(onInvoice).toHaveBeenCalledWith(mockCaseData);

    // Edit button
    const editBtn = screen.getByTitle("تعديل سريع للحالة");
    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(mockCaseData);

    // Trash button
    const trashBtn = screen.getByTitle("نقل لسلة المهملات");
    fireEvent.click(trashBtn);
    expect(onTrash).toHaveBeenCalledWith(mockCaseData);
  });

  it("3. renders doctor and patient micro-cards with details and phone link", () => {
    renderInspector();

    expect(screen.getByText("الطبيب والعيادة")).toBeInTheDocument();
    expect(screen.getByText("عيادة: عيادات النور التخصصية")).toBeInTheDocument();
    expect(screen.getByText("كشف حساب الطبيب")).toBeInTheDocument();

    expect(screen.getByText("المريض")).toBeInTheDocument();
    expect(screen.getByText("+201099887766")).toBeInTheDocument();
  });

  it("4. renders technical specs bento card with work type, shade, and warranty", () => {
    renderInspector();

    expect(screen.getByText("تاج زيركون متعدد الطبقات")).toBeInTheDocument();
    expect(screen.getByText("الأسنان: 11, 12, 13")).toBeInTheDocument();
    expect(screen.getByText("A2")).toBeInTheDocument();
    expect(screen.getByText(/Zirconia Multilayer/)).toBeInTheDocument();
    expect(screen.getByText("5 سنوات")).toBeInTheDocument();
  });

  it("5. renders assigned technician and adds technician via button", () => {
    renderInspector();

    expect(screen.getByText("الفنيون المسندون")).toBeInTheDocument();
    expect(screen.getByText("محمد إبراهيم")).toBeInTheDocument();

    const addTechBtn = screen.getByText("+ إضافة فني");
    fireEvent.click(addTechBtn);
    expect(onAssign).toHaveBeenCalledWith(mockCaseData);
  });

  it("6. renders financial overview with tabular numerals and payment status", async () => {
    const { fmtMoney } = await import("../../shared");
    renderInspector();

    expect(screen.getByText("الحساب والمستحقات")).toBeInTheDocument();
    expect(screen.getByText("مسدد جزئياً")).toBeInTheDocument();
    expect(screen.getByText(fmtMoney(4500))).toBeInTheDocument();
    expect(screen.getByText(fmtMoney(2000))).toBeInTheDocument();
    expect(screen.getByText(fmtMoney(2500))).toBeInTheDocument();
  });

  it("7. renders doctor notes and instructions", () => {
    renderInspector();

    expect(screen.getByText("ملاحظات وتعليمات الطبيب:")).toBeInTheDocument();
    expect(
      screen.getByText("يرجى مراعاة ملاءمة حواف التاج مع اللثة بدقة متناهية.")
    ).toBeInTheDocument();
  });
});
