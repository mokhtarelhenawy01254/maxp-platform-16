// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import TechnicianLedgerModal from "../../TechnicianLedgerModal";
import * as shared from "../../../../shared";
import type { DentalTechnician, DentalTechnicianPayout, TechnicianPayoutSummary } from "../../../../shared";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockTech: DentalTechnician = {
  id: "tech-99",
  name: "طارق سليم",
  phone: "01011223344",
  role: "CERAMIST",
  isActive: true,
  activeCasesCount: 3,
  completedCasesCount: 50,
  wagePerStage: 160,
  dailyCap: 12,
  workingDays: ["SATURDAY", "SUNDAY"],
  vacations: [],
};

const mockSummary: TechnicianPayoutSummary = {
  totalEarned: 15000,
  completedStages: 75,
  completedUnits: 120,
  totalPaid: 10000,
  totalAdvances: 2000,
  totalBonuses: 1500,
  totalDeductions: 500,
  netDue: 6000,
};

const mockPayouts: DentalTechnicianPayout[] = [
  {
    id: "pay-1",
    technicianId: "tech-99",
    type: "PAYOUT",
    amount: 5000,
    paymentMethod: "CASH",
    reference: "REC-101",
    notes: "صرف أجر النصف الأول من الشهر",
    paidAt: "2026-10-15T12:00:00Z",
    createdByName: "أحمد المحاسب",
    createdAt: "2026-10-15T12:00:00Z",
  },
  {
    id: "pay-2",
    technicianId: "tech-99",
    type: "BONUS",
    amount: 1500,
    paymentMethod: "BANK_TRANSFER",
    reference: "BON-202",
    notes: "مكافأة تميز في إنتاج الفينير",
    paidAt: "2026-10-16T14:00:00Z",
    createdByName: "الإدارة",
    createdAt: "2026-10-16T14:00:00Z",
  },
  {
    id: "pay-3",
    technicianId: "tech-99",
    type: "DEDUCTION",
    amount: 500,
    paymentMethod: "OTHER",
    reference: "DED-303",
    notes: "خصم كاست تالف معاد",
    paidAt: "2026-10-17T09:00:00Z",
    createdByName: "الإدارة",
    createdAt: "2026-10-17T09:00:00Z",
  },
];

describe("TechnicianLedgerModal", () => {
  const onClose = vi.fn();
  const onAddPayout = vi.fn();
  const onDataChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockImplementation(() => true);
    vi.spyOn(window, "print").mockImplementation(() => {});

    vi.spyOn(shared, "fetchTechnicianPayouts").mockResolvedValue({
      payouts: mockPayouts,
      summary: mockSummary,
    });
    vi.spyOn(shared, "deleteTechnicianPayout").mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("loads and renders technician header and 5 summary KPI cards", async () => {
    render(
      <TechnicianLedgerModal
        tech={mockTech}
        onClose={onClose}
        onAddPayout={onAddPayout}
        onDataChanged={onDataChanged}
      />
    );

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText("كشف حساب وسجل مستحقات الفني")).toBeInTheDocument();
    });

    expect(screen.getAllByText(/طارق سليم/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/01011223344/).length).toBeGreaterThan(0);

    // Summary cards
    expect(screen.getByText("أجر الإنتاج المكتسب")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(shared.fmtMoney(mockSummary.totalEarned)))).toBeInTheDocument();
    expect(screen.getByText(/75 مرحلة/)).toBeInTheDocument();

    expect(screen.getByText("إجمالي ما صُرف للفني")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(shared.fmtMoney(mockSummary.totalPaid)))).toBeInTheDocument();

    expect(screen.getByText("المكافآت والحوافز")).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(shared.fmtMoney(mockSummary.totalBonuses))).length).toBeGreaterThan(0);

    expect(screen.getByText("الخصومات والتوالف")).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(shared.fmtMoney(mockSummary.totalDeductions))).length).toBeGreaterThan(0);

    expect(screen.getByText("صافي المستحق القائم")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(shared.fmtMoney(mockSummary.netDue)))).toBeInTheDocument();
  });

  it("renders payouts table rows with badges, methods, notes, and references", async () => {
    render(
      <TechnicianLedgerModal
        tech={mockTech}
        onClose={onClose}
        onAddPayout={onAddPayout}
        onDataChanged={onDataChanged}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("صرف مستحقات")).toBeInTheDocument();
    });

    expect(screen.getByText("مكافأة أداء")).toBeInTheDocument();
    expect(screen.getByText("خصم تالف/إعادة")).toBeInTheDocument();

    expect(screen.getByText("صرف أجر النصف الأول من الشهر")).toBeInTheDocument();
    expect(screen.getByText("مكافأة تميز في إنتاج الفينير")).toBeInTheDocument();
    expect(screen.getByText("خصم كاست تالف معاد")).toBeInTheDocument();

    expect(screen.getByText("نقدي")).toBeInTheDocument();
    expect(screen.getByText("تحويل بنكي")).toBeInTheDocument();
  });

  it("deletes a payout item after confirmation and calls onDataChanged", async () => {
    render(
      <TechnicianLedgerModal
        tech={mockTech}
        onClose={onClose}
        onAddPayout={onAddPayout}
        onDataChanged={onDataChanged}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByTitle("حذف السند").length).toBe(3);
    });

    const deleteButtons = screen.getAllByTitle("حذف السند");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(shared.deleteTechnicianPayout).toHaveBeenCalledWith("pay-1");
      expect(onDataChanged).toHaveBeenCalledTimes(1);
    });
  });

  it("handles print and add payout button clicks", async () => {
    render(
      <TechnicianLedgerModal
        tech={mockTech}
        onClose={onClose}
        onAddPayout={onAddPayout}
        onDataChanged={onDataChanged}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("طباعة كشف الحساب")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("طباعة كشف الحساب"));
    expect(window.print).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("صرف جديد / سلفة"));
    expect(onAddPayout).toHaveBeenCalledTimes(1);
  });

  it("renders empty state when there are no payouts", async () => {
    vi.spyOn(shared, "fetchTechnicianPayouts").mockResolvedValue({
      payouts: [],
      summary: null,
    });

    render(
      <TechnicianLedgerModal
        tech={mockTech}
        onClose={onClose}
        onAddPayout={onAddPayout}
        onDataChanged={onDataChanged}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("لا توجد سندات صرف أو حركات مسجلة لهذا الفني حتى الآن")
      ).toBeInTheDocument();
    });
  });
});
