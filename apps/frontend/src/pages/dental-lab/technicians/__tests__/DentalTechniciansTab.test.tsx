// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DentalTechniciansTab from "../../DentalTechniciansTab";

// Mock react-i18next
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    "dentalLab.common.refresh": "تحديث",
    "dentalLab.common.egp": "ج.م",
    "dentalLab.common.name": "الاسم",
    "dentalLab.common.phone": "الهاتف",
    "dentalLab.common.status": "الحالة",
    "dentalLab.common.actions": "الإجراءات",
    "dentalLab.common.active": "نشط",
    "dentalLab.common.inactive": "معطل",
    "dentalLab.common.edit": "تعديل",
    "dentalLab.common.delete": "حذف",
    "dentalLab.common.cancel": "إلغاء",
    "dentalLab.common.save": "حفظ",
    "dentalLab.common.saving": "جاري الحفظ...",
    "dentalLab.common.noResults": "لا توجد نتائج",
  };
  return translations[key] || key;
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Hoisted mock data
const { mockTechniciansResponse, mockTeam, mockPayoutsResponse } = vi.hoisted(() => {
  const mockTechniciansResponse = {
    items: [
      {
        id: "tech-1",
        name: "كريم ممدوح",
        phone: "01098765432",
        role: "CAD_DESIGNER",
        wagePerStage: 75,
        workingDays: [0, 1, 2, 3, 4],
        dailyCap: 10,
        completedStages: 14,
        totalEarnings: 1050,
        totalPaid: 400,
        totalBonuses: 50,
        totalDeductions: 0,
        balanceDue: 700,
        isActive: true,
        userEmail: "karim@lab.com",
      },
      {
        id: "tech-2",
        name: "ياسر النجار",
        phone: "01123456789",
        role: "CERAMIST",
        wagePerStage: null,
        workingDays: [6, 0, 1, 2, 3],
        dailyCap: 5,
        completedStages: 8,
        totalEarnings: 480,
        totalPaid: 480,
        balanceDue: 0,
        isActive: false,
      },
    ],
    wageDefaults: {
      defaultPerStage: 60,
    },
  };

  const mockTeam = [
    {
      id: "tm-1",
      userId: "u-1",
      name: "كريم ممدوح",
      email: "karim@lab.com",
      role: "TECHNICIAN",
    },
  ];

  const mockPayoutsResponse = {
    payouts: [
      {
        id: "pay-1",
        technicianId: "tech-1",
        amount: 400,
        type: "PAYOUT",
        paymentMethod: "CASH",
        reference: "REC-001",
        notes: "صرف دفعة أولى",
        paidAt: "2026-03-01T10:00:00.000Z",
        createdByName: "الإدارة",
      },
    ],
    summary: {
      totalEarned: 1050,
      totalPaid: 400,
      totalAdvances: 0,
      totalBonuses: 50,
      totalDeductions: 0,
      netDue: 700,
      completedStages: 14,
      completedUnits: 18,
    },
  };

  return { mockTechniciansResponse, mockTeam, mockPayoutsResponse };
});

// Mock shared API methods
vi.mock("../../shared", async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    fetchTechnicians: vi.fn().mockResolvedValue(mockTechniciansResponse),
    fetchTeam: vi.fn().mockResolvedValue(mockTeam),
    createTechnician: vi.fn().mockResolvedValue({ id: "tech-new", name: "فني جديد" }),
    updateTechnician: vi.fn().mockResolvedValue({ ok: true }),
    deleteTechnician: vi.fn().mockResolvedValue({ ok: true }),
    fetchTechnicianPayouts: vi.fn().mockResolvedValue(mockPayoutsResponse),
    createTechnicianPayout: vi.fn().mockResolvedValue({ id: "pay-new" }),
    deleteTechnicianPayout: vi.fn().mockResolvedValue({ ok: true }),
  };
});

describe("DentalTechniciansTab (Batch 337 Modular)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders KPI cards with correct wage default and totals", async () => {
    render(
      <MemoryRouter>
        <DentalTechniciansTab />
      </MemoryRouter>
    );

    expect(screen.getByText("فريق العمل والمحطات")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("كريم ممدوح")).toBeInTheDocument();
      expect(screen.getByText("ياسر النجار")).toBeInTheDocument();
    });

    // Check KPI cards
    expect(screen.getByText("أجر المرحلة الافتراضي")).toBeInTheDocument();
    expect(screen.getByText("إجمالي مستحقات الإنتاج")).toBeInTheDocument();
    expect(screen.getByText("إجمالي المنصرف والسلف")).toBeInTheDocument();
    expect(screen.getByText("صافي المستحق القائم للفريق")).toBeInTheDocument();
  });

  it("renders table with technicians, roles, and status", async () => {
    render(
      <MemoryRouter>
        <DentalTechniciansTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("كريم ممدوح")).toBeInTheDocument();
      expect(screen.getByText("karim@lab.com")).toBeInTheDocument();
    });

    expect(screen.getByText("نشط")).toBeInTheDocument();
    expect(screen.getByText("معطل")).toBeInTheDocument();
  });

  it("opens Create Technician modal when clicking Add button", async () => {
    render(
      <MemoryRouter>
        <DentalTechniciansTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("كريم ممدوح")).toBeInTheDocument();
    });

    const addBtn = screen.getByText("إضافة عضو جديد للفريق");
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText("إضافة فني جديد وحساب المنصة")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("مثال: أحمد مصطفى")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("technician@lab.com")).toBeInTheDocument();
    });
  });

  it("opens Payout Modal when clicking wallet action button", async () => {
    render(
      <MemoryRouter>
        <DentalTechniciansTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("كريم ممدوح")).toBeInTheDocument();
    });

    const payoutBtns = screen.getAllByTitle("صرف مستحقات / سلفة");
    fireEvent.click(payoutBtns[0]);

    await waitFor(() => {
      expect(screen.getByText("تسجيل حركة مالية / سند صرف")).toBeInTheDocument();
      expect(screen.getByText(/صرف مستحقات إنتاج/)).toBeInTheDocument();
    });
  });

  it("opens Ledger Modal when clicking receipt action button", async () => {
    render(
      <MemoryRouter>
        <DentalTechniciansTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("كريم ممدوح")).toBeInTheDocument();
    });

    const ledgerBtns = screen.getAllByTitle("كشف حساب وسجل السندات");
    fireEvent.click(ledgerBtns[0]);

    await waitFor(() => {
      expect(screen.getByText("كشف حساب وسجل مستحقات الفني")).toBeInTheDocument();
      expect(screen.getByText("طباعة كشف الحساب")).toBeInTheDocument();
      expect(screen.getByText("صرف دفعة أولى")).toBeInTheDocument();
    });
  });

  it("filters technician rows based on search input", async () => {
    render(
      <MemoryRouter>
        <DentalTechniciansTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("كريم ممدوح")).toBeInTheDocument();
      expect(screen.getByText("ياسر النجار")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("بحث بالاسم أو الهاتف...");
    fireEvent.change(searchInput, { target: { value: "كريم" } });

    await waitFor(() => {
      expect(screen.getByText("كريم ممدوح")).toBeInTheDocument();
      expect(screen.queryByText("ياسر النجار")).not.toBeInTheDocument();
    });
  });
});
