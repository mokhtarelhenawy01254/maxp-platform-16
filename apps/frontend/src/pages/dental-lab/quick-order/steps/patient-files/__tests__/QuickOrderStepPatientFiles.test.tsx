// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React, { createRef } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import QuickOrderStepPatientFiles from "../../QuickOrderStepPatientFiles";
import type { DentalTechnician, DentalWorkType } from "../../../../shared";
import type { DentalDoctor } from "../../../types/quickOrderTypes";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockTechnicians: DentalTechnician[] = [
  {
    id: "tech-1",
    name: "مروان كمال",
    role: "CAD_DESIGNER",
    isActive: true,
    activeCasesCount: 2,
    completedCasesCount: 20,
    wagePerStage: 120,
    dailyCap: 8,
    workingDays: [],
    vacations: [],
  },
  {
    id: "tech-2",
    name: "سليم حسني",
    role: "CERAMIST",
    isActive: true,
    activeCasesCount: 1,
    completedCasesCount: 15,
    wagePerStage: 140,
    dailyCap: 6,
    workingDays: [],
    vacations: [],
  },
];

const mockDoctor: DentalDoctor = {
  id: "doc-1",
  name: "د. شريف عبد العظيم",
  phone: "01001122334",
  clinicName: "مركز الشريف للأسنان",
  balance: 0,
  casesCount: 10,
};

const mockWorkType: DentalWorkType = {
  id: "wt-1",
  name: "Crown Zirconia",
  price: 2500,
  category: "FIXED_PROSTHETICS",
  isActive: true,
};

describe("QuickOrderStepPatientFiles", () => {
  const onPatientNameChange = vi.fn();
  const onPatientPhoneChange = vi.fn();
  const onReceivedDateChange = vi.fn();
  const onDueDateChange = vi.fn();
  const onPriorityChange = vi.fn();
  const onSelectedTechnicianIdChange = vi.fn();
  const onSelectedTechnicianRoleChange = vi.fn();
  const onNotesChange = vi.fn();
  const onFilesChange = vi.fn();
  const onDragOverChange = vi.fn();
  const fileInputRef = createRef<HTMLInputElement>();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all sections: patient fields, dates, technician assign, files, and summary card", () => {
    render(
      <QuickOrderStepPatientFiles
        patientName="مصطفى كامل"
        onPatientNameChange={onPatientNameChange}
        patientPhone="01234567890"
        onPatientPhoneChange={onPatientPhoneChange}
        receivedDate="2026-10-20"
        onReceivedDateChange={onReceivedDateChange}
        dueDate="2026-10-25"
        onDueDateChange={onDueDateChange}
        dueDateReason="متوسط وقت إنجاز الشغل: 5 أيام"
        priority="NORMAL"
        onPriorityChange={onPriorityChange}
        technicians={mockTechnicians}
        selectedTechnicianId="tech-1"
        onSelectedTechnicianIdChange={onSelectedTechnicianIdChange}
        selectedTechnicianRole="CAD_DESIGNER"
        onSelectedTechnicianRoleChange={onSelectedTechnicianRoleChange}
        notes="برجاء العناية بالإطباق الخلفي"
        onNotesChange={onNotesChange}
        files={[]}
        onFilesChange={onFilesChange}
        fileInputRef={fileInputRef}
        dragOver={false}
        onDragOverChange={onDragOverChange}
        upStatus={{}}
        selectedDoctor={mockDoctor}
        primaryWorkType={mockWorkType}
        selectedTeeth={["11", "12"]}
        unitsCount={2}
        shade="A2"
        customShade=""
        priceSnapshot={5000}
        discount={500}
      />
    );

    // Patient Fields
    expect(screen.getByPlaceholderText("اسم المريض ثلاثي")).toHaveValue("مصطفى كامل");
    expect(screen.getByPlaceholderText("01xxxxxxxxx")).toHaveValue("01234567890");

    // Due Date Reason
    expect(screen.getByText("الموعد المقترح بناءً على: متوسط وقت إنجاز الشغل: 5 أيام")).toBeInTheDocument();

    // Notes
    expect(screen.getByPlaceholderText("تعليمات الطبيب، تفاصيل الإطباق، تشريح الحواف...")).toHaveValue("برجاء العناية بالإطباق الخلفي");

    // Technician Assign
    expect(screen.getByText("إسناد أمر الشغل لفني المعمل (اختياري)")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/مروان كمال/)).toBeInTheDocument();

    // Summary Card
    expect(screen.getByText("ملخص أمر الشغل النهائي")).toBeInTheDocument();
    expect(screen.getByText(/د. شريف عبد العظيم/)).toBeInTheDocument();
    expect(screen.getByText(/Crown Zirconia/)).toBeInTheDocument();
    expect(screen.getByText("11, 12")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("A2")).toBeInTheDocument();
  });

  it("handles changes to patient name, phone, and notes", () => {
    render(
      <QuickOrderStepPatientFiles
        patientName=""
        onPatientNameChange={onPatientNameChange}
        patientPhone=""
        onPatientPhoneChange={onPatientPhoneChange}
        receivedDate="2026-10-20"
        onReceivedDateChange={onReceivedDateChange}
        dueDate="2026-10-25"
        onDueDateChange={onDueDateChange}
        priority="NORMAL"
        onPriorityChange={onPriorityChange}
        technicians={mockTechnicians}
        selectedTechnicianId=""
        onSelectedTechnicianIdChange={onSelectedTechnicianIdChange}
        selectedTechnicianRole="GENERAL_TECHNICIAN"
        onSelectedTechnicianRoleChange={onSelectedTechnicianRoleChange}
        notes=""
        onNotesChange={onNotesChange}
        files={[]}
        onFilesChange={onFilesChange}
        fileInputRef={fileInputRef}
        dragOver={false}
        onDragOverChange={onDragOverChange}
        upStatus={{}}
        selectedDoctor={mockDoctor}
        primaryWorkType={mockWorkType}
        selectedTeeth={[]}
        unitsCount={1}
        shade=""
        customShade=""
        priceSnapshot={2500}
        discount={0}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("اسم المريض ثلاثي"), {
      target: { value: "هدى محمد" },
    });
    expect(onPatientNameChange).toHaveBeenCalledWith("هدى محمد");

    fireEvent.change(screen.getByPlaceholderText("01xxxxxxxxx"), {
      target: { value: "01099887766" },
    });
    expect(onPatientPhoneChange).toHaveBeenCalledWith("01099887766");

    fireEvent.change(screen.getByPlaceholderText("تعليمات الطبيب، تفاصيل الإطباق، تشريح الحواف..."), {
      target: { value: "ملاحظات جديدة" },
    });
    expect(onNotesChange).toHaveBeenCalledWith("ملاحظات جديدة");
  });

  it("selects a technician and changes role", () => {
    render(
      <QuickOrderStepPatientFiles
        patientName="مصطفى كامل"
        onPatientNameChange={onPatientNameChange}
        patientPhone=""
        onPatientPhoneChange={onPatientPhoneChange}
        receivedDate="2026-10-20"
        onReceivedDateChange={onReceivedDateChange}
        dueDate="2026-10-25"
        onDueDateChange={onDueDateChange}
        priority="NORMAL"
        onPriorityChange={onPriorityChange}
        technicians={mockTechnicians}
        selectedTechnicianId=""
        onSelectedTechnicianIdChange={onSelectedTechnicianIdChange}
        selectedTechnicianRole="GENERAL_TECHNICIAN"
        onSelectedTechnicianRoleChange={onSelectedTechnicianRoleChange}
        notes=""
        onNotesChange={onNotesChange}
        files={[]}
        onFilesChange={onFilesChange}
        fileInputRef={fileInputRef}
        dragOver={false}
        onDragOverChange={onDragOverChange}
        upStatus={{}}
        selectedDoctor={mockDoctor}
        primaryWorkType={mockWorkType}
        selectedTeeth={[]}
        unitsCount={1}
        shade=""
        customShade=""
        priceSnapshot={2500}
        discount={0}
      />
    );

    // Pick technician
    const techSelect = screen.getByLabelText("الفني المسؤول");
    fireEvent.change(techSelect, { target: { value: "tech-1" } });
    expect(onSelectedTechnicianIdChange).toHaveBeenCalledWith("tech-1");
    expect(onSelectedTechnicianRoleChange).toHaveBeenCalledWith("CAD_DESIGNER");
  });

  it("renders files and handles removing an item", () => {
    const dummyFile = new File(["dummy content"], "upper_jaw_scan.stl", { type: "model/stl" });

    render(
      <QuickOrderStepPatientFiles
        patientName="مصطفى كامل"
        onPatientNameChange={onPatientNameChange}
        patientPhone=""
        onPatientPhoneChange={onPatientPhoneChange}
        receivedDate="2026-10-20"
        onReceivedDateChange={onReceivedDateChange}
        dueDate="2026-10-25"
        onDueDateChange={onDueDateChange}
        priority="NORMAL"
        onPriorityChange={onPriorityChange}
        technicians={mockTechnicians}
        selectedTechnicianId="tech-1"
        onSelectedTechnicianIdChange={onSelectedTechnicianIdChange}
        selectedTechnicianRole="CAD_DESIGNER"
        onSelectedTechnicianRoleChange={onSelectedTechnicianRoleChange}
        notes=""
        onNotesChange={onNotesChange}
        files={[dummyFile]}
        onFilesChange={onFilesChange}
        fileInputRef={fileInputRef}
        dragOver={false}
        onDragOverChange={onDragOverChange}
        upStatus={{ "upper_jaw_scan.stl": "done" }}
        selectedDoctor={mockDoctor}
        primaryWorkType={mockWorkType}
        selectedTeeth={[]}
        unitsCount={1}
        shade=""
        customShade=""
        priceSnapshot={2500}
        discount={0}
      />
    );

    expect(screen.getByText("upper_jaw_scan.stl")).toBeInTheDocument();

    const deleteBtn = screen.getByLabelText("حذف الملف");
    fireEvent.click(deleteBtn);
    expect(onFilesChange).toHaveBeenCalledWith([]);
  });
});
