// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DentalCasesTable } from "../../DentalCasesTable";
import type { DentalLabCase } from "../../../../shared";

afterEach(() => {
  cleanup();
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "dentalLab.common.prev": "السابق",
        "dentalLab.common.next": "التالي",
      };
      return translations[key] || key;
    },
  }),
}));

const mockCases: DentalLabCase[] = [
  {
    id: "case-1",
    caseNumber: "CASE-101",
    patientName: "محمود حسن",
    patientPhone: "01000000001",
    doctorName: "أحمد سامي",
    workTypeName: "Zirconia Crown",
    priority: "HIGH",
    status: "DESIGN",
    receivedDate: "2026-10-15T10:00:00Z",
    dueDate: "2026-10-22T10:00:00Z",
    total: 1500,
    remaining: 500,
    assignments: [
      {
        id: "as-1",
        caseId: "case-1",
        stageId: "stg-1",
        technicianId: "tech-1",
        technician: { id: "tech-1", name: "إبراهيم" },
      },
    ],
  } as unknown as DentalLabCase,
  {
    id: "case-2",
    caseNumber: "CASE-102",
    patientName: "سارة علي",
    patientPhone: "01000000002",
    doctorName: "منى فريد",
    workTypeName: "E-Max Veneer",
    priority: "NORMAL",
    status: "DELIVERED",
    receivedDate: "2026-10-10T10:00:00Z",
    dueDate: "2026-10-18T10:00:00Z",
    total: 2000,
    remaining: 0,
    assignments: [],
  } as unknown as DentalLabCase,
];

describe("DentalCasesTable", () => {
  it("renders table columns, headers, and case rows", () => {
    const onInspectCase = vi.fn();
    const toggleSelect = vi.fn();

    render(
      <MemoryRouter>
        <DentalCasesTable
          cases={mockCases}
          viewMode="ACTIVE"
          selectedCaseIds={new Set(["case-1"])}
          toggleSelect={toggleSelect}
          toggleSelectAllPage={vi.fn()}
          actionBusyId={null}
          isCaseOverdue={() => false}
          getDaysOverdue={() => 0}
          onInspectCase={onInspectCase}
          onAdvanceCase={vi.fn()}
          onEditCase={vi.fn()}
          onPrintPanLabel={vi.fn()}
          onTrashCase={vi.fn()}
          onRestoreCase={vi.fn()}
          onPermanentDelete={vi.fn()}
          page={1}
          totalPages={3}
          setPage={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("رقم الحالة")).toBeInTheDocument();
    expect(screen.getByText("المريض")).toBeInTheDocument();
    expect(screen.getByText("الطبيب / العيادة")).toBeInTheDocument();
    expect(screen.getByText("محمود حسن")).toBeInTheDocument();
    expect(screen.getByText("CASE-101")).toBeInTheDocument();
    expect(screen.getByText("سارة علي")).toBeInTheDocument();
    expect(screen.getByText("CASE-102")).toBeInTheDocument();

    // Check financial display
    expect(screen.getByText("خالص")).toBeInTheDocument();

    // Inspect click on row
    fireEvent.click(screen.getByText("محمود حسن"));
    expect(onInspectCase).toHaveBeenCalledWith(mockCases[0]);
  });

  it("handles case selection and select all page", () => {
    const toggleSelect = vi.fn();
    const toggleSelectAllPage = vi.fn();

    render(
      <MemoryRouter>
        <DentalCasesTable
          cases={mockCases}
          viewMode="ACTIVE"
          selectedCaseIds={new Set()}
          toggleSelect={toggleSelect}
          toggleSelectAllPage={toggleSelectAllPage}
          actionBusyId={null}
          isCaseOverdue={() => false}
          getDaysOverdue={() => 0}
          onInspectCase={vi.fn()}
          onAdvanceCase={vi.fn()}
          onEditCase={vi.fn()}
          onPrintPanLabel={vi.fn()}
          onTrashCase={vi.fn()}
          onRestoreCase={vi.fn()}
          onPermanentDelete={vi.fn()}
          page={1}
          totalPages={1}
          setPage={vi.fn()}
        />
      </MemoryRouter>
    );

    const selectAllCheckbox = screen.getByLabelText("تحديد كل الحالات");
    fireEvent.click(selectAllCheckbox);
    expect(toggleSelectAllPage).toHaveBeenCalledTimes(1);

    const rowCheckbox = screen.getByLabelText("تحديد حالة CASE-101");
    fireEvent.click(rowCheckbox);
    expect(toggleSelect).toHaveBeenCalledWith("case-1");
  });

  it("triggers row action buttons in ACTIVE view mode", () => {
    const onInspectCase = vi.fn();
    const onAdvanceCase = vi.fn();
    const onEditCase = vi.fn();
    const onPrintPanLabel = vi.fn();
    const onTrashCase = vi.fn();

    render(
      <MemoryRouter>
        <DentalCasesTable
          cases={[mockCases[0]]}
          viewMode="ACTIVE"
          selectedCaseIds={new Set()}
          toggleSelect={vi.fn()}
          toggleSelectAllPage={vi.fn()}
          actionBusyId={null}
          isCaseOverdue={() => false}
          getDaysOverdue={() => 0}
          onInspectCase={onInspectCase}
          onAdvanceCase={onAdvanceCase}
          onEditCase={onEditCase}
          onPrintPanLabel={onPrintPanLabel}
          onTrashCase={onTrashCase}
          onRestoreCase={vi.fn()}
          onPermanentDelete={vi.fn()}
          page={1}
          totalPages={1}
          setPage={vi.fn()}
        />
      </MemoryRouter>
    );

    const inspectBtn = screen.getByLabelText("معاينة فحص");
    fireEvent.click(inspectBtn);
    expect(onInspectCase).toHaveBeenCalledWith(mockCases[0]);

    const advanceBtn = screen.getByLabelText("ترقية المرحلة");
    fireEvent.click(advanceBtn);
    expect(onAdvanceCase).toHaveBeenCalledWith(mockCases[0]);

    const editBtn = screen.getByLabelText("تعديل سريع");
    fireEvent.click(editBtn);
    expect(onEditCase).toHaveBeenCalledWith(mockCases[0]);

    const printBtn = screen.getByLabelText("طباعة تيكت صينية");
    fireEvent.click(printBtn);
    expect(onPrintPanLabel).toHaveBeenCalledWith(mockCases[0]);

    const trashBtn = screen.getByLabelText("نقل للمهملات");
    fireEvent.click(trashBtn);
    expect(onTrashCase).toHaveBeenCalledWith(mockCases[0]);
  });

  it("renders restore and permanent delete actions in TRASH view mode", () => {
    const onRestoreCase = vi.fn();
    const onPermanentDelete = vi.fn();

    render(
      <MemoryRouter>
        <DentalCasesTable
          cases={[mockCases[0]]}
          viewMode="TRASH"
          selectedCaseIds={new Set()}
          toggleSelect={vi.fn()}
          toggleSelectAllPage={vi.fn()}
          actionBusyId={null}
          isCaseOverdue={() => false}
          getDaysOverdue={() => 0}
          onInspectCase={vi.fn()}
          onAdvanceCase={vi.fn()}
          onEditCase={vi.fn()}
          onPrintPanLabel={vi.fn()}
          onTrashCase={vi.fn()}
          onRestoreCase={onRestoreCase}
          onPermanentDelete={onPermanentDelete}
          page={1}
          totalPages={1}
          setPage={vi.fn()}
        />
      </MemoryRouter>
    );

    const restoreBtn = screen.getByLabelText("استعادة");
    fireEvent.click(restoreBtn);
    expect(onRestoreCase).toHaveBeenCalledWith(mockCases[0]);

    const deleteBtn = screen.getByLabelText("حذف نهائي");
    fireEvent.click(deleteBtn);
    expect(onPermanentDelete).toHaveBeenCalledWith(mockCases[0]);
  });

  it("handles pagination next and previous buttons", () => {
    const setPage = vi.fn();

    render(
      <MemoryRouter>
        <DentalCasesTable
          cases={mockCases}
          viewMode="ACTIVE"
          selectedCaseIds={new Set()}
          toggleSelect={vi.fn()}
          toggleSelectAllPage={vi.fn()}
          actionBusyId={null}
          isCaseOverdue={() => false}
          getDaysOverdue={() => 0}
          onInspectCase={vi.fn()}
          onAdvanceCase={vi.fn()}
          onEditCase={vi.fn()}
          onPrintPanLabel={vi.fn()}
          onTrashCase={vi.fn()}
          onRestoreCase={vi.fn()}
          onPermanentDelete={vi.fn()}
          page={2}
          totalPages={4}
          setPage={setPage}
        />
      </MemoryRouter>
    );

    expect(screen.getByText("2 / 4")).toBeInTheDocument();

    const prevBtn = screen.getByText("السابق");
    fireEvent.click(prevBtn);
    expect(setPage).toHaveBeenCalledTimes(1);

    const nextBtn = screen.getByText("التالي");
    fireEvent.click(nextBtn);
    expect(setPage).toHaveBeenCalledTimes(2);
  });
});
