// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DentalCasesModals } from "../DentalCasesModals";
import { DentalCaseInspectorDrawer } from "../DentalCaseInspectorDrawer";
import { DentalCasesView } from "../DentalCasesView";
import type { DentalCase } from "../../../shared";

// Mock child modals and inspector to keep subcomponent tests unit-focused
vi.mock("../../../QuickOrderModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="quick-order-modal">
      <button onClick={onClose}>Close Quick Order</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseCreateModal", () => ({
  DentalCaseCreateModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="create-modal">
      <button onClick={onClose}>Close Create</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseAdvanceModal", () => ({
  DentalCaseAdvanceModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="advance-modal">
      <button onClick={onClose}>Close Advance</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseAssignModal", () => ({
  DentalCaseAssignModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="assign-modal">
      <button onClick={onClose}>Close Assign</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseInvoiceModal", () => ({
  DentalCaseInvoiceModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="invoice-modal">
      <button onClick={onClose}>Close Invoice</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseKioskScannerModal", () => ({
  DentalCaseKioskScannerModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="kiosk-modal">
      <button onClick={onClose}>Close Kiosk</button>
    </div>
  ),
}));

vi.mock("../../../DentalCaseInspector", () => ({
  default: ({ onClose, caseData }: { onClose: () => void; caseData: DentalCase }) => (
    <div data-testid="inspector-content">
      <span>{caseData.caseNumber}</span>
      <button onClick={onClose}>Close Inspector</button>
    </div>
  ),
}));

vi.mock("../DentalCasesTable", () => ({
  DentalCasesTable: () => <div data-testid="dental-cases-table" />,
}));

vi.mock("../DentalCasesKanban", () => ({
  DentalCasesKanban: () => <div data-testid="dental-cases-kanban" />,
}));

const sampleCase: DentalCase = {
  id: "case-1",
  caseNumber: "CS-101",
  patientName: "أحمد إبراهيم",
  doctorId: "doc-1",
  doctorName: "د. هاني",
  workTypeId: "wt-1",
  workTypeName: "Zirconia",
  status: "PENDING",
  priority: "NORMAL",
  unitsCount: 1,
  teeth: "11",
  total: 1000,
  paid: 0,
  remaining: 1000,
  paymentStatus: "UNPAID",
  receivedDate: "2026-03-01T10:00:00Z",
  dueDate: "2026-03-05T10:00:00Z",
};

describe("DentalCasesTab Subcomponents", () => {
  afterEach(() => {
    cleanup();
  });

  describe("DentalCasesModals", () => {
    it("renders respective modals when flags are active", () => {
      const handleCloseCreate = vi.fn();
      render(
        <DentalCasesModals
          createOpen={true}
          editingCase={null}
          doctors={[]}
          workTypes={[]}
          technicians={[]}
          onCloseCreate={handleCloseCreate}
          onSavedCase={vi.fn()}
          kioskOpen={true}
          onCloseKiosk={vi.fn()}
          onScannedKiosk={vi.fn()}
          quickOrderOpen={true}
          onCloseQuickOrder={vi.fn()}
          onSavedQuickOrder={vi.fn()}
          advanceCaseData={sampleCase}
          onCloseAdvance={vi.fn()}
          onSavedAdvance={vi.fn()}
          assignCaseData={sampleCase}
          onCloseAssign={vi.fn()}
          onSavedAssign={vi.fn()}
          invoiceCase={sampleCase}
          onCloseInvoice={vi.fn()}
          onSavedInvoice={vi.fn()}
        />
      );

      expect(screen.getByTestId("create-modal")).toBeInTheDocument();
      expect(screen.getByTestId("kiosk-modal")).toBeInTheDocument();
      expect(screen.getByTestId("quick-order-modal")).toBeInTheDocument();
      expect(screen.getByTestId("advance-modal")).toBeInTheDocument();
      expect(screen.getByTestId("assign-modal")).toBeInTheDocument();
      expect(screen.getByTestId("invoice-modal")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Close Create"));
      expect(handleCloseCreate).toHaveBeenCalled();
    });
  });

  describe("DentalCaseInspectorDrawer", () => {
    it("renders drawer when isOpen and selectedCase are provided", () => {
      const handleClose = vi.fn();
      render(
        <DentalCaseInspectorDrawer
          isOpen={true}
          selectedCase={sampleCase}
          onClose={handleClose}
          onAdvance={vi.fn()}
          onAssign={vi.fn()}
          onEdit={vi.fn()}
          onInvoice={vi.fn()}
          onUpload={vi.fn()}
          onPrintPanLabel={vi.fn()}
          onPrintWorkOrder={vi.fn()}
          onTrash={vi.fn()}
          isBusy={false}
          uploadingId={null}
        />
      );

      expect(screen.getByTestId("inspector-content")).toBeInTheDocument();
      expect(screen.getByText("CS-101")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Close Inspector"));
      expect(handleClose).toHaveBeenCalled();
    });

    it("renders nothing when isOpen is false", () => {
      const { container } = render(
        <DentalCaseInspectorDrawer
          isOpen={false}
          selectedCase={sampleCase}
          onClose={vi.fn()}
          onAdvance={vi.fn()}
          onAssign={vi.fn()}
          onEdit={vi.fn()}
          onInvoice={vi.fn()}
          onUpload={vi.fn()}
          onPrintPanLabel={vi.fn()}
          onPrintWorkOrder={vi.fn()}
          onTrash={vi.fn()}
          isBusy={false}
          uploadingId={null}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("DentalCasesView", () => {
    it("renders Kanban when layoutMode is KANBAN and viewMode is ACTIVE", () => {
      render(
        <MemoryRouter>
          <DentalCasesView
            layoutMode="KANBAN"
            viewMode="ACTIVE"
            cases={[sampleCase]}
            selectedCaseIds={new Set()}
            toggleSelect={vi.fn()}
            toggleSelectAllPage={vi.fn()}
            actionBusyId={null}
            isCaseOverdue={() => false}
            getDaysOverdue={() => 0}
            applyFilter={vi.fn()}
            onAdvanceCase={vi.fn()}
            onAssignCase={vi.fn()}
            onEditCase={vi.fn()}
            onInspectCase={vi.fn()}
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

      expect(screen.getByTestId("dental-cases-kanban")).toBeInTheDocument();
      expect(screen.queryByTestId("dental-cases-table")).not.toBeInTheDocument();
    });

    it("renders Table when layoutMode is TABLE", () => {
      render(
        <MemoryRouter>
          <DentalCasesView
            layoutMode="TABLE"
            viewMode="ACTIVE"
            cases={[sampleCase]}
            selectedCaseIds={new Set()}
            toggleSelect={vi.fn()}
            toggleSelectAllPage={vi.fn()}
            actionBusyId={null}
            isCaseOverdue={() => false}
            getDaysOverdue={() => 0}
            applyFilter={vi.fn()}
            onAdvanceCase={vi.fn()}
            onAssignCase={vi.fn()}
            onEditCase={vi.fn()}
            onInspectCase={vi.fn()}
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

      expect(screen.getByTestId("dental-cases-table")).toBeInTheDocument();
      expect(screen.queryByTestId("dental-cases-kanban")).not.toBeInTheDocument();
    });
  });
});
