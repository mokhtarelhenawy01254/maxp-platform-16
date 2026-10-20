// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { DentalCaseDetailModals } from "../DentalCaseDetailModals";
import type { DentalLabCaseDetail, DentalInvoice } from "../../../shared";
import type { useDentalCaseDetail } from "../../hooks/useDentalCaseDetail";

// Mock child modals
vi.mock("../../modals/DentalCaseAdvanceModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="advance-modal">
      <button onClick={onClose}>Close Advance</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseEditModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="edit-modal">
      <button onClick={onClose}>Close Edit</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseAssignStageModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="assign-stage-modal">
      <button onClick={onClose}>Close Assign Stage</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseTryInModals", () => ({
  DentalCaseSendToTryInModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="tryin-send-modal">
      <button onClick={onClose}>Close TryIn Send</button>
    </div>
  ),
  DentalCaseReturnFromTryInModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="tryin-return-modal">
      <button onClick={onClose}>Close TryIn Return</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseOutsourceModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="outsource-modal">
      <button onClick={onClose}>Close Outsource</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCasePaymentModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="payment-modal">
      <button onClick={onClose}>Close Payment</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseQualityModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="quality-modal">
      <button onClick={onClose}>Close Quality</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseRefabricationModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="refab-modal">
      <button onClick={onClose}>Close Refab</button>
    </div>
  ),
}));

vi.mock("../../modals/DentalCaseMaterialConsumeModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="material-consume-modal">
      <button onClick={onClose}>Close Consume</button>
    </div>
  ),
}));

const mockCase: DentalLabCaseDetail = {
  id: "case-1",
  caseNumber: "CS-101",
  patientName: "أحمد إبراهيم",
  doctorId: "doc-1",
  doctorName: "د. هاني",
  workTypeId: "wt-1",
  workTypeName: "Zirconia",
  status: "DESIGN",
  priority: "NORMAL",
  unitsCount: 1,
  teeth: "11",
  total: 1000,
  paid: 0,
  remaining: 1000,
  paymentStatus: "UNPAID",
  receivedDate: "2026-03-01T10:00:00Z",
  dueDate: "2026-03-05T10:00:00Z",
  stages: [
    {
      id: "stage-1",
      caseId: "case-1",
      workTypeStageId: "wts-1",
      stageName: "تصميم CAD",
      stageOrder: 1,
      status: "PENDING",
      createdAt: "2026-03-01T10:00:00Z",
    },
  ],
};

describe("DentalCaseDetailModals (Batch 368)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders active modals based on detailState flags", () => {
    const handleCloseAdvance = vi.fn();
    const handleCloseStatus = vi.fn();

    const mockDetailState = {
      advanceOpen: true,
      setAdvanceOpen: handleCloseAdvance,
      statusOpen: true,
      setStatusOpen: handleCloseStatus,
      assignStage: {
        id: "stage-1",
        caseId: "case-1",
        workTypeStageId: "wts-1",
        stageName: "تصميم CAD",
        stageOrder: 1,
        status: "PENDING" as const,
        createdAt: "2026-03-01T10:00:00Z",
      },
      setAssignStage: vi.fn(),
      tryInSendOpen: true,
      setTryInSendOpen: vi.fn(),
      tryInReturnOpen: true,
      setTryInReturnOpen: vi.fn(),
      outsourceOpen: true,
      setOutsourceOpen: vi.fn(),
      paymentInvoice: { id: "inv-1", invoiceNumber: "INV-1" } as unknown as DentalInvoice,
      setPaymentInvoice: vi.fn(),
      qualityOpen: true,
      setQualityOpen: vi.fn(),
      refabOpen: true,
      setRefabOpen: vi.fn(),
      materialConsumeOpen: true,
      setMaterialConsumeOpen: vi.fn(),
      technicians: [],
      doctors: [],
      workTypes: [],
      materialsList: [],
      selectedMatId: "",
      setSelectedMatId: vi.fn(),
      selectedStockId: "",
      setSelectedStockId: vi.fn(),
      consumeUnits: 1,
      setConsumeUnits: vi.fn(),
      consumeNotes: "",
      setConsumeNotes: vi.fn(),
      materialBusy: false,
      handleConsumeSubmit: vi.fn(),
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof useDentalCaseDetail>;

    render(
      <DentalCaseDetailModals
        c={mockCase}
        next="WAXING"
        detailState={mockDetailState}
      />
    );

    expect(screen.getByTestId("advance-modal")).toBeInTheDocument();
    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
    expect(screen.getByTestId("assign-stage-modal")).toBeInTheDocument();
    expect(screen.getByTestId("tryin-send-modal")).toBeInTheDocument();
    expect(screen.getByTestId("tryin-return-modal")).toBeInTheDocument();
    expect(screen.getByTestId("outsource-modal")).toBeInTheDocument();
    expect(screen.getByTestId("payment-modal")).toBeInTheDocument();
    expect(screen.getByTestId("quality-modal")).toBeInTheDocument();
    expect(screen.getByTestId("refab-modal")).toBeInTheDocument();
    expect(screen.getByTestId("material-consume-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Close Advance"));
    expect(handleCloseAdvance).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByText("Close Edit"));
    expect(handleCloseStatus).toHaveBeenCalledWith(false);
  });
});
