// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TechnicianTable } from "../../TechnicianTable";
import type { DentalTechnician, TeamMember } from "../../../../shared";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "dentalLab.common.name": "الاسم",
        "dentalLab.common.phone": "الهاتف",
        "dentalLab.common.status": "الحالة",
        "dentalLab.common.actions": "الإجراءات",
        "dentalLab.common.active": "نشط",
        "dentalLab.common.inactive": "معطل",
        "dentalLab.common.edit": "تعديل",
        "dentalLab.common.delete": "حذف",
        "dentalLab.common.noResults": "لا توجد نتائج",
      };
      return map[key] || key;
    },
  }),
}));

const mockTechnicians: DentalTechnician[] = [
  {
    id: "tech-1",
    name: "كريم أحمد",
    role: "CERAMIST",
    phone: "01000000001",
    isActive: true,
    wagePerStage: 150,
    completedStages: 24,
    totalEarnings: 3600,
    totalBonuses: 200,
    totalDeductions: 50,
    totalPaid: 2000,
    balanceDue: 1750,
    workingDays: ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY"],
    dailyCap: 5,
    userEmail: "karim@example.com",
  },
  {
    id: "tech-2",
    name: "محمود فني",
    role: "CAD_CAM",
    phone: "01000000002",
    isActive: false,
    wagePerStage: undefined,
    completedStages: 10,
    totalEarnings: 1000,
    totalPaid: 1000,
    balanceDue: 0,
    workingDays: [],
    dailyCap: 0,
    backupTechnicianId: "tech-1",
    vacations: [
      {
        id: "vac-1",
        startDate: "2026-10-15",
        endDate: "2026-10-25",
        reason: "إجازة سنوية",
      },
    ],
  },
];

const mockTeam: TeamMember[] = [
  {
    userId: "u-1",
    name: "كريم أحمد",
    email: "karim@example.com",
    role: "TECHNICIAN",
  },
];

describe("TechnicianTable (Batch 369)", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    rows: mockTechnicians,
    wageDefault: 100,
    loading: false,
    removingId: null,
    team: mockTeam,
    onOpenEdit: vi.fn(),
    onRemove: vi.fn(),
    onToggleActive: vi.fn(),
    onOpenPayout: vi.fn(),
    onOpenLedger: vi.fn(),
  };

  it("renders table header and technician rows with details", () => {
    render(
      <MemoryRouter>
        <TechnicianTable {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.getByText("الاسم")).toBeInTheDocument();
    expect(screen.getByText("التخصص / المحطة")).toBeInTheDocument();

    // First tech name and backup badge
    expect(screen.getAllByText("كريم أحمد").length).toBe(2);
    expect(screen.getByText("01000000001")).toBeInTheDocument();
    expect(screen.getByText("5 أيام عمل")).toBeInTheDocument();
    expect(screen.getByText("سقف: 5 حالة/يوم")).toBeInTheDocument();
    expect(screen.getByText("karim@example.com")).toBeInTheDocument();
    expect(screen.getByText("نشط")).toBeInTheDocument();

    // Second tech
    expect(screen.getByText("محمود فني")).toBeInTheDocument();
    expect(screen.getByText("01000000002")).toBeInTheDocument();
    expect(screen.getByText("6 أيام (افتراضي)")).toBeInTheDocument();
    expect(screen.getByText("سقف مفتوح")).toBeInTheDocument();
    expect(screen.getByText("معطل")).toBeInTheDocument();
  });

  it("triggers action callbacks on row button clicks", () => {
    const handleOpenEdit = vi.fn();
    const handleRemove = vi.fn();
    const handleToggleActive = vi.fn();
    const handleOpenPayout = vi.fn();
    const handleOpenLedger = vi.fn();

    render(
      <MemoryRouter>
        <TechnicianTable
          {...defaultProps}
          onOpenEdit={handleOpenEdit}
          onRemove={handleRemove}
          onToggleActive={handleToggleActive}
          onOpenPayout={handleOpenPayout}
          onOpenLedger={handleOpenLedger}
        />
      </MemoryRouter>
    );

    // Click active toggle
    const activeBtn = screen.getByText("نشط");
    fireEvent.click(activeBtn);
    expect(handleToggleActive).toHaveBeenCalledWith(mockTechnicians[0]);

    // Click Payout button
    const payoutButtons = screen.getAllByTitle("صرف مستحقات / سلفة");
    fireEvent.click(payoutButtons[0]);
    expect(handleOpenPayout).toHaveBeenCalledWith(mockTechnicians[0]);

    // Click Ledger button
    const ledgerButtons = screen.getAllByTitle("كشف حساب وسجل السندات");
    fireEvent.click(ledgerButtons[0]);
    expect(handleOpenLedger).toHaveBeenCalledWith(mockTechnicians[0]);

    // Click Edit button
    const editButtons = screen.getAllByTitle("تعديل");
    fireEvent.click(editButtons[0]);
    expect(handleOpenEdit).toHaveBeenCalledWith(mockTechnicians[0]);

    // Click Delete button
    const deleteButtons = screen.getAllByTitle("حذف");
    fireEvent.click(deleteButtons[0]);
    expect(handleRemove).toHaveBeenCalledWith(mockTechnicians[0]);
  });

  it("renders empty state when rows is empty", () => {
    render(
      <MemoryRouter>
        <TechnicianTable {...defaultProps} rows={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText("لا توجد نتائج")).toBeInTheDocument();
  });

  it("renders loading spinner when loading is true", () => {
    const { container } = render(
      <MemoryRouter>
        <TechnicianTable {...defaultProps} loading={true} />
      </MemoryRouter>
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
