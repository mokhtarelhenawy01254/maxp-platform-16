// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalInvoicesTab from "../../DentalInvoicesTab";

// Mock react-i18next
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    "dentalLab.invoices.title": "فواتير معمل الأسنان",
    "dentalLab.invoices.newInvoice": "فاتورة جديدة",
    "dentalLab.invoices.createTitle": "إصدار فاتورة جديدة",
    "dentalLab.invoices.linkCase": "ربط بحالة فنية",
    "dentalLab.invoices.doctorName": "اسم الطبيب",
    "dentalLab.invoices.total": "الإجمالي",
    "dentalLab.invoices.paid": "المسدد",
    "dentalLab.invoices.remaining": "المتبقي",
    "dentalLab.common.status": "الحالة",
    "dentalLab.common.actions": "الإجراءات",
    "dentalLab.common.refresh": "تحديث",
    "dentalLab.common.egp": "ج.م",
    "dentalLab.invoices.noData": "لا توجد فواتير مطابقة",
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
const { mockInvoices, mockDoctors, mockCases, mockUninvoiced } = vi.hoisted(() => {
  const mockInvoices = [
    {
      id: "inv-001",
      invoiceNumber: "INV-1001",
      doctorId: "doc-1",
      doctorName: "د. طارق محمود",
      patientName: "أحمد علي",
      total: 2500,
      paid: 1500,
      remaining: 1000,
      status: "PARTIAL",
      createdAt: "2026-03-01T10:00:00.000Z",
      dueDate: "2026-03-15T00:00:00.000Z",
      notes: "حالة تركيب زركونيا",
      doctor: {
        id: "doc-1",
        name: "د. طارق محمود",
        clinicName: "عيادة النور",
        phone: "01012345678",
      },
      case: {
        id: "case-001",
        caseNumber: "CS-500",
        patientName: "أحمد علي",
        workTypeName: "Zirconia Crown",
        unitsCount: 2,
        unitPrice: 1250,
      },
    },
    {
      id: "inv-002",
      invoiceNumber: "INV-1002",
      doctorId: "doc-2",
      doctorName: "د. سارة فؤاد",
      patientName: "منى خالد",
      total: 1800,
      paid: 1800,
      remaining: 0,
      status: "PAID",
      createdAt: "2026-03-02T12:00:00.000Z",
      notes: "",
      doctor: {
        id: "doc-2",
        name: "د. سارة فؤاد",
        clinicName: "مركز الابتسامة",
        phone: "01198765432",
      },
    },
  ];

  const mockDoctors = [
    {
      id: "doc-1",
      name: "د. طارق محمود",
      clinicName: "عيادة النور",
      phone: "01012345678",
      outstanding: 1000,
      creditLimit: 5000,
    },
    {
      id: "doc-2",
      name: "د. سارة فؤاد",
      clinicName: "مركز الابتسامة",
      phone: "01198765432",
      outstanding: 0,
      creditLimit: 10000,
    },
  ];

  const mockCases = [
    {
      id: "case-001",
      caseNumber: "CS-500",
      patientName: "أحمد علي",
      doctorName: "د. طارق محمود",
      workTypeName: "Zirconia Crown",
      unitsCount: 2,
      unitPrice: 1250,
    },
  ];

  const mockUninvoiced = {
    totalCases: 5,
    totalDoctors: 2,
    totalAmount: 6200,
    doctors: [
      {
        doctorId: "doc-1",
        doctorName: "د. طارق محمود",
        casesCount: 3,
        totalAmount: 3700,
      },
    ],
  };

  return { mockInvoices, mockDoctors, mockCases, mockUninvoiced };
});

vi.mock("../../shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../shared")>();
  return {
    ...actual,
    fetchInvoices: vi.fn().mockResolvedValue(mockInvoices),
    fetchCases: vi.fn().mockResolvedValue({ data: mockCases, total: 1 }),
    fetchDoctors: vi.fn().mockResolvedValue(mockDoctors),
    fetchUninvoicedSummary: vi.fn().mockResolvedValue(mockUninvoiced),
    fetchMonthlySettlements: vi.fn().mockResolvedValue({ settlements: [], summary: null }),
    closeMonthlySettlement: vi.fn().mockResolvedValue({ success: true }),
    reopenMonthlySettlement: vi.fn().mockResolvedValue({ success: true }),
    voidInvoice: vi.fn().mockResolvedValue({ success: true }),
    fetchInvoicePdf: vi.fn().mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" })),
    fetchInvoicePaymentLink: vi.fn().mockResolvedValue({ configured: false, message: "Not configured" }),
  };
});

describe("DentalInvoicesTab Modular Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the main invoices tab title, action buttons, and uninvoiced banner", async () => {
    render(<DentalInvoicesTab />);

    // Check title
    expect(await screen.findByText("فواتير معمل الأسنان")).toBeInTheDocument();
    expect(screen.getByText("فاتورة جديدة")).toBeInTheDocument();
    expect(screen.getByText("تصدير Excel")).toBeInTheDocument();
    expect(screen.getByText("تقفيل المستحقات الشهرية")).toBeInTheDocument();

    // Check uninvoiced banner
    expect(await screen.findByText("دورة الفوترة الشهرية وتصفية الحسابات")).toBeInTheDocument();
    expect(screen.getByText("5 حالة معلقة")).toBeInTheDocument();
  });

  it("renders invoices rows with invoice numbers, doctor names, and amounts", async () => {
    render(<DentalInvoicesTab />);

    // Check invoice numbers
    expect(await screen.findByText("INV-1001")).toBeInTheDocument();
    expect(screen.getByText("INV-1002")).toBeInTheDocument();

    // Check doctors
    expect(screen.getAllByText("د. طارق محمود").length).toBeGreaterThan(0);
    expect(screen.getByText("د. سارة فؤاد")).toBeInTheDocument();

    // Check status pill
    expect(screen.getByText("عدد الفواتير: 2")).toBeInTheDocument();
  });

  it("opens create invoice modal when clicking 'فاتورة جديدة'", async () => {
    render(<DentalInvoicesTab />);

    const newBtn = await screen.findByText("فاتورة جديدة");
    fireEvent.click(newBtn);

    expect(await screen.findByText("إصدار فاتورة جديدة")).toBeInTheDocument();
  });

  it("opens invoice detail modal when clicking an invoice row", async () => {
    render(<DentalInvoicesTab />);

    const invRow = await screen.findByText("INV-1001");
    fireEvent.click(invRow);

    expect(await screen.findByText("فاتورة #INV-1001")).toBeInTheDocument();
    expect(screen.getByText("تفاصيل العمل الفني بالحالة:")).toBeInTheDocument();
    expect(screen.getByText("فاتورة PDF")).toBeInTheDocument();
  });

  it("filters invoices list when typing in search input", async () => {
    render(<DentalInvoicesTab />);

    const searchInput = await screen.findByPlaceholderText("بحث برقم الفاتورة، اسم الدكتور، المريض...");
    fireEvent.change(searchInput, { target: { value: "طارق" } });

    expect(searchInput).toHaveValue("طارق");
  });
});
