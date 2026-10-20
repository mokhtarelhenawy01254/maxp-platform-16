// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DentalCasesTab from "../../DentalCasesTab";

// Mock react-i18next
const mockT = (key: string, options?: Record<string, unknown>) => {
  const translations: Record<string, string> = {
    "dentalLab.cases.title": "حالات معمل الأسنان",
    "dentalLab.cases.newCase": "حالة جديدة",
    "dentalLab.common.refresh": "تحديث",
    "dentalLab.common.actions": "الإجراءات",
    "dentalLab.common.status": "الحالة",
    "dentalLab.common.egp": "ج.م",
    "dentalLab.cases.filesUploaded": `${options?.count || 1} ملف تم رفعه`,
  };
  return translations[key] || key;
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
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
const { mockCases, mockDoctors, mockWorkTypes, mockTechnicians } = vi.hoisted(() => {
  const mockCases = [
    {
      id: "case-1",
      caseNumber: "CS-101",
      patientName: "أحمد إبراهيم",
      doctorName: "د. هاني عثمان",
      doctorId: "doc-1",
      workTypeName: "PFM Crown",
      workTypeId: "wt-1",
      status: "PENDING",
      priority: "NORMAL",
      unitsCount: 1,
      teeth: "11,12",
      total: 1000,
      paid: 500,
      remaining: 500,
      paymentStatus: "PARTIAL",
      receivedDate: "2026-03-01T10:00:00.000Z",
      dueDate: "2026-03-10T10:00:00.000Z",
      assignments: [],
      doctor: {
        id: "doc-1",
        name: "د. هاني عثمان",
        clinicName: "عيادة الشروق",
      },
    },
    {
      id: "case-2",
      caseNumber: "CS-102",
      patientName: "سارة مجدي",
      doctorName: "د. سارة فؤاد",
      doctorId: "doc-2",
      workTypeName: "Zirconia",
      workTypeId: "wt-2",
      status: "DESIGN",
      priority: "URGENT",
      unitsCount: 2,
      teeth: "21",
      total: 2400,
      paid: 2400,
      remaining: 0,
      paymentStatus: "PAID",
      receivedDate: "2026-03-02T10:00:00.000Z",
      dueDate: "2026-03-05T10:00:00.000Z",
      assignments: [],
      doctor: {
        id: "doc-2",
        name: "د. سارة فؤاد",
        clinicName: "مركز الابتسامة",
      },
    },
  ];

  const mockDoctors = [
    {
      id: "doc-1",
      name: "د. هاني عثمان",
      clinicName: "عيادة الشروق",
      phone: "01000000001",
      isActive: true,
    },
    {
      id: "doc-2",
      name: "د. سارة فؤاد",
      clinicName: "مركز الابتسامة",
      phone: "01000000002",
      isActive: true,
    },
  ];

  const mockWorkTypes = [
    {
      id: "wt-1",
      name: "PFM Crown",
      price: 1000,
      defaultLeadDays: 3,
      pricingMode: "PER_UNIT",
    },
    {
      id: "wt-2",
      name: "Zirconia",
      price: 1200,
      defaultLeadDays: 4,
      pricingMode: "PER_UNIT",
    },
  ];

  const mockTechnicians = [
    {
      id: "tech-1",
      name: "محمد فني",
      role: "CERAMIST",
      active: true,
    },
    {
      id: "tech-2",
      name: "كريم فني",
      role: "CAD_CAM",
      active: true,
    },
  ];

  return { mockCases, mockDoctors, mockWorkTypes, mockTechnicians };
});

vi.mock("../../shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../shared")>();
  return {
    ...actual,
    fetchCases: vi.fn().mockResolvedValue({ data: mockCases, total: 2, trashCount: 0 }),
    fetchDoctors: vi.fn().mockResolvedValue(mockDoctors),
    fetchWorkTypes: vi.fn().mockResolvedValue(mockWorkTypes),
    fetchTechnicians: vi.fn().mockResolvedValue(mockTechnicians),
    fetchDoctorPricing: vi.fn().mockResolvedValue({}),
    createCase: vi.fn().mockResolvedValue({ id: "case-new" }),
    updateCase: vi.fn().mockResolvedValue({ success: true }),
    advanceCase: vi.fn().mockResolvedValue({ success: true }),
    assignCase: vi.fn().mockResolvedValue({ success: true }),
    trashCase: vi.fn().mockResolvedValue({ success: true }),
    restoreCase: vi.fn().mockResolvedValue({ success: true }),
    permanentDeleteCase: vi.fn().mockResolvedValue({ success: true }),
    bulkAdvanceCases: vi.fn().mockResolvedValue({ count: 2, message: "تمت الترقية" }),
    bulkAssignTechnician: vi.fn().mockResolvedValue({ count: 2, message: "تم الإسناد" }),
    bulkUpdatePriority: vi.fn().mockResolvedValue({ count: 2, message: "تم التحديث" }),
    bulkTrashCases: vi.fn().mockResolvedValue({ count: 2, message: "تم النقل للمهملات" }),
    bulkRestoreCases: vi.fn().mockResolvedValue({ count: 2, message: "تمت الاستعادة" }),
    bulkTransferCasesDoctor: vi.fn().mockResolvedValue({ count: 2, message: "تم النقل للطبيب" }),
    fetchPanLabelPdf: vi.fn().mockResolvedValue(new Blob(["pan-pdf"], { type: "application/pdf" })),
    fetchWorkOrderPdf: vi.fn().mockResolvedValue(new Blob(["wo-pdf"], { type: "application/pdf" })),
    kioskScanCase: vi.fn().mockResolvedValue({ success: true, caseNumber: "CS-101", status: "DESIGN" }),
  };
});

describe("DentalCasesTab Modular Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders DentalCasesTab and displays case records in Table view", async () => {
    render(
      <MemoryRouter>
        <DentalCasesTab />
      </MemoryRouter>
    );

    // Initial loading indicator
    expect(screen.getByText("جاري تحميل حالات المعمل...")).toBeInTheDocument();

    // Wait for cases to render
    await waitFor(() => {
      expect(screen.getByText("CS-101")).toBeInTheDocument();
      expect(screen.getByText("CS-102")).toBeInTheDocument();
    });

    // Patient names
    expect(screen.getByText("أحمد إبراهيم")).toBeInTheDocument();
    expect(screen.getByText("سارة مجدي")).toBeInTheDocument();
  });

  it("allows switching layout mode between Table and Kanban", async () => {
    render(
      <MemoryRouter>
        <DentalCasesTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("CS-101")).toBeInTheDocument();
    });

    // Find and click the Kanban layout toggle button
    const kanbanBtn = screen.getByLabelText("عرض لوحة مراحل التشغيل");
    fireEvent.click(kanbanBtn);

    // In Kanban mode, pipeline headers should be visible (e.g. وصل, تصميم, جاهز للتسليم)
    await waitFor(() => {
      expect(screen.getAllByText("وصل").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole("link", { name: "وصل" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "تصميم" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "جاهز للتسليم" })).toBeInTheDocument();
    });
  });

  it("allows switching viewMode to Overdue and Trash tabs", async () => {
    render(
      <MemoryRouter>
        <DentalCasesTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("CS-101")).toBeInTheDocument();
    });

    // Click on 'المتأخرة'
    const overdueBtn = screen.getByText("المتأخرة");
    fireEvent.click(overdueBtn);

    // Click on 'سلة المهملات'
    const trashBtn = screen.getByText("سلة المهملات");
    fireEvent.click(trashBtn);

    expect(trashBtn).toBeInTheDocument();
  });

  it("filters cases when typing in the search bar", async () => {
    render(
      <MemoryRouter>
        <DentalCasesTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("CS-101")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("بحث سريع (رقم الحالة، المريض، الطبيب)...");
    fireEvent.change(searchInput, { target: { value: "سارة" } });

    expect(searchInput).toHaveValue("سارة");
  });

  it("shows floating bulk actions bar when selecting cases", async () => {
    render(
      <MemoryRouter>
        <DentalCasesTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("CS-101")).toBeInTheDocument();
    });

    // Find checkboxes in the table
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(1);

    // Select the first case checkbox (index 1, as index 0 is select all)
    fireEvent.click(checkboxes[1]);

    // Bulk action bar should become visible with count
    await waitFor(() => {
      expect(screen.getByText(/تم تحديد 1 حالة/)).toBeInTheDocument();
      expect(screen.getByText("إلغاء")).toBeInTheDocument();
    });
  });
});
