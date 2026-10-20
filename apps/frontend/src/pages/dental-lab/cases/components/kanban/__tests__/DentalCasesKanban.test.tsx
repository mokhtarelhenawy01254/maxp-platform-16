// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DentalCasesKanban } from "../../DentalCasesKanban";
import type { DentalLabCase } from "../../../../shared";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockCases: DentalLabCase[] = [
  {
    id: "case-k1",
    caseNumber: "KB-001",
    patientName: "ياسر إبراهيم",
    doctorName: "شريف فتحي",
    doctorId: "doc-1",
    workTypeName: "Zirconia Bridge",
    workTypeId: "wt-1",
    priority: "HIGH",
    status: "DESIGN",
    receivedDate: "2026-10-15T00:00:00Z",
    dueDate: "2026-10-22T00:00:00Z",
    teeth: "21-23",
    assignments: [
      {
        id: "as-1",
        caseId: "case-k1",
        stageId: "stg-1",
        technicianId: "tech-1",
        technician: { id: "tech-1", name: "محمود" },
      },
    ],
  } as unknown as DentalLabCase,
  {
    id: "case-k2",
    caseNumber: "KB-002",
    patientName: "نادية محمود",
    doctorName: "هبة كمال",
    doctorId: "doc-2",
    workTypeName: "E-Max Inlay",
    priority: "NORMAL",
    status: "RECEIVED",
    receivedDate: "2026-10-10T00:00:00Z",
    dueDate: "2026-10-12T00:00:00Z",
    assignments: [],
  } as unknown as DentalLabCase,
];

describe("DentalCasesKanban", () => {
  it("renders kanban columns and case cards", () => {
    const applyFilter = vi.fn();

    render(
      <MemoryRouter>
        <DentalCasesKanban
          cases={mockCases}
          selectedCaseIds={new Set(["case-k1"])}
          toggleSelect={vi.fn()}
          isCaseOverdue={(c) => c.id === "case-k2"}
          getDaysOverdue={() => 3}
          applyFilter={applyFilter}
          onAdvanceCase={vi.fn()}
          onAssignCase={vi.fn()}
          onPrintPanLabel={vi.fn()}
          onEditCase={vi.fn()}
        />
      </MemoryRouter>
    );

    // Check pipeline summary text
    expect(
      screen.getByText(/عرض خط الإنتاج \(Kanban Pipeline\) — إجمالي 2 حالة/)
    ).toBeInTheDocument();

    // Check case card details
    expect(screen.getByText("KB-001")).toBeInTheDocument();
    expect(screen.getByText("ياسر إبراهيم")).toBeInTheDocument();
    expect(screen.getByText("د. شريف فتحي")).toBeInTheDocument();
    expect(screen.getByText("Zirconia Bridge")).toBeInTheDocument();
    expect(screen.getByText("21-23")).toBeInTheDocument();
    expect(screen.getByText("محمود")).toBeInTheDocument();

    // Check overdue case card
    expect(screen.getByText("KB-002")).toBeInTheDocument();
    expect(screen.getByText("نادية محمود")).toBeInTheDocument();
    expect(screen.getByText(/متأخر 3 يوم/)).toBeInTheDocument();

    // Click column header filter
    const designStageHeader = screen.getByTitle('عرض كل حالات مرحلة "تصميم" فقط');
    fireEvent.click(designStageHeader);
    expect(applyFilter).toHaveBeenCalledWith("status", "DESIGN", true);
  });

  it("handles card actions and checkbox toggling", () => {
    const toggleSelect = vi.fn();
    const onAdvanceCase = vi.fn();
    const onPrintPanLabel = vi.fn();
    const onEditCase = vi.fn();
    const onAssignCase = vi.fn();

    render(
      <MemoryRouter>
        <DentalCasesKanban
          cases={mockCases}
          selectedCaseIds={new Set()}
          toggleSelect={toggleSelect}
          isCaseOverdue={() => false}
          getDaysOverdue={() => 0}
          applyFilter={vi.fn()}
          onAdvanceCase={onAdvanceCase}
          onAssignCase={onAssignCase}
          onPrintPanLabel={onPrintPanLabel}
          onEditCase={onEditCase}
        />
      </MemoryRouter>
    );

    // Checkbox toggle
    const checkbox = screen.getByLabelText("تحديد حالة KB-001");
    fireEvent.click(checkbox);
    expect(toggleSelect).toHaveBeenCalledWith("case-k1");

    // Advance button (first card in RECEIVED column -> mockCases[1])
    const advanceBtns = screen.getAllByRole("button", { name: /ترقية للمرحلة التالية/ });
    fireEvent.click(advanceBtns[0]);
    expect(onAdvanceCase).toHaveBeenCalledWith(mockCases[1]);

    // Print button
    const printBtns = screen.getAllByLabelText("طباعة تيكت الصينية");
    fireEvent.click(printBtns[0]);
    expect(onPrintPanLabel).toHaveBeenCalledWith(mockCases[1]);

    // Edit button
    const editBtns = screen.getAllByLabelText("تعديل سريع");
    fireEvent.click(editBtns[0]);
    expect(onEditCase).toHaveBeenCalledWith(mockCases[1]);

    // Assign technician button
    const assignBtns = screen.getAllByLabelText("إسناد فني");
    fireEvent.click(assignBtns[0]);
    expect(onAssignCase).toHaveBeenCalledWith(mockCases[0]);
  });
});
