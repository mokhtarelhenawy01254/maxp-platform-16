// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DentalDoctorDetailPage from "../../DentalDoctorDetailPage";

// Mock react-i18next
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    "dentalLab.doctors.title": "الأطباء والعيادات",
    "dentalLab.doctors.editTitle": "تعديل بيانات الطبيب",
    "dentalLab.doctors.updated": "تم تحديث بيانات الطبيب",
    "dentalLab.doctors.governorate": "المحافظة",
    "dentalLab.doctors.clinicName": "اسم العيادة",
    "dentalLab.doctors.creditLimit": "حد الائتمان",
    "dentalLab.doctors.portalPin": "رمز الدخول للبوابة",
    "dentalLab.common.refresh": "تحديث",
    "dentalLab.common.save": "حفظ",
    "dentalLab.common.saving": "جاري الحفظ...",
    "dentalLab.common.cancel": "إلغاء",
    "dentalLab.common.name": "الاسم",
    "dentalLab.common.phone": "الهاتف",
    "dentalLab.common.notes": "ملاحظات",
    "dentalLab.common.nameRequired": "اسم الطبيب مطلوب",
    "dentalLab.doctors.pricing.saved": "تم حفظ قائمة الأسعار المخصصة",
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
const { mockDoctor, mockCases, mockInvoices, mockStatement, mockWorkTypes } = vi.hoisted(() => {
  const mockDoctor = {
    id: "doc-1",
    name: "د. هاني عثمان",
    clinicName: "عيادة الشروق",
    phone: "01012345678",
    governorate: "القاهرة",
    creditLimit: 10000,
    outstanding: 3500,
    totalBilled: 12000,
    totalPaid: 8500,
    casesCount: 8,
    activeCases: 3,
    completedCases: 5,
    overdueCases: 1,
    invoicesCount: 6,
    isActive: true,
    hasPortalPin: true,
    notes: "طبيب متميز ويفضل مواعيد صباحية",
    createdAt: "2026-01-15T10:00:00.000Z",
  };

  const mockCases = [
    {
      id: "case-101",
      caseNumber: "CS-101",
      patientName: "أحمد إبراهيم",
      doctorName: "د. هاني عثمان",
      workTypeName: "Zirconia Crown",
      status: "DESIGN",
      priority: "NORMAL",
      shade: "A2",
      teeth: "11, 21",
      dueDate: "2026-03-20T10:00:00.000Z",
      priceSnapshot: 1500,
    },
    {
      id: "case-102",
      caseNumber: "CS-102",
      patientName: "محمود حسن",
      doctorName: "د. هاني عثمان",
      workTypeName: "E-Max Inlay",
      status: "READY",
      priority: "URGENT",
      shade: "A1",
      teeth: "14",
      dueDate: "2026-03-18T10:00:00.000Z",
      priceSnapshot: 800,
    },
  ];

  const mockInvoices = [
    {
      id: "inv-201",
      invoiceNumber: "INV-201",
      doctorId: "doc-1",
      total: 1500,
      paid: 500,
      remaining: 1000,
      status: "PARTIAL",
      createdAt: "2026-03-10T10:00:00.000Z",
      case: {
        id: "case-101",
        caseNumber: "CS-101",
        patientName: "أحمد إبراهيم",
      },
    },
    {
      id: "inv-202",
      invoiceNumber: "INV-202",
      doctorId: "doc-1",
      total: 800,
      paid: 800,
      remaining: 0,
      status: "PAID",
      createdAt: "2026-03-12T10:00:00.000Z",
      case: {
        id: "case-102",
        caseNumber: "CS-102",
        patientName: "محمود حسن",
      },
    },
  ];

  const mockStatement = {
    totals: {
      invoiced: 12000,
      paid: 8500,
      remaining: 3500,
      cases: 8,
    },
    invoices: mockInvoices,
  };

  const mockWorkTypes = [
    {
      id: "wt-1",
      name: "Zirconia Crown",
      price: 1200,
      category: "Fixed Prosthodontics",
      isActive: true,
    },
    {
      id: "wt-2",
      name: "E-Max Inlay",
      price: 900,
      category: "Ceramics",
      isActive: true,
    },
  ];

  return { mockDoctor, mockCases, mockInvoices, mockStatement, mockWorkTypes };
});

vi.mock("../../shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../shared")>();
  return {
    ...actual,
    fetchDoctorDetail: vi.fn().mockResolvedValue(mockDoctor),
    fetchCases: vi.fn().mockResolvedValue({ data: mockCases, total: 2 }),
    fetchInvoices: vi.fn().mockResolvedValue(mockInvoices),
    fetchDoctorStatement: vi.fn().mockResolvedValue(mockStatement),
    fetchWorkTypes: vi.fn().mockResolvedValue(mockWorkTypes),
    fetchDoctorPricing: vi.fn().mockResolvedValue({ "wt-1": 1100 }),
    updateDoctor: vi.fn().mockResolvedValue({ ...mockDoctor, name: "د. هاني عثمان المحدث" }),
    recordDoctorBulkPayment: vi.fn().mockResolvedValue({ totalPaid: 1000, allocations: [{ invoiceId: "inv-201", paid: 1000 }] }),
    addInvoicePayment: vi.fn().mockResolvedValue({ success: true }),
    saveDoctorPricing: vi.fn().mockResolvedValue({ success: true }),
    fetchInvoicePdf: vi.fn().mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" })),
    fetchInvoicePaymentLink: vi.fn().mockResolvedValue({ checkoutUrl: "https://pay.maxp.online/inv-201" }),
  };
});

describe("DentalDoctorDetailPage Modular Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={["/dental-lab/doctors/doc-1"]}>
        <Routes>
          <Route path="/dental-lab/doctors/:id" element={<DentalDoctorDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("renders doctor detail header with metrics and doctor information", async () => {
    renderComponent();

    // Initial loading indicator
    expect(screen.getByText("جاري تحميل بيانات الطبيب...")).toBeInTheDocument();

    // Wait for doctor to render
    await waitFor(() => {
      expect(screen.getAllByText("د. هاني عثمان").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("عيادة الشروق")).toBeInTheDocument();
      expect(screen.getByText("01012345678")).toBeInTheDocument();
    });

    // Check financial cards
    expect(screen.getByText("الرصيد المتبقي (المديونية)")).toBeInTheDocument();
    expect(screen.getByText("إجمالي المسحوبات (الفوترة)")).toBeInTheDocument();
  });

  it("displays cases in the active cases tab and allows switching to invoices tab", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("CS-101")).toBeInTheDocument();
      expect(screen.getByText("CS-102")).toBeInTheDocument();
    });

    // Patient names
    expect(screen.getByText("أحمد إبراهيم")).toBeInTheDocument();
    expect(screen.getByText("محمود حسن")).toBeInTheDocument();

    // Switch to invoices tab
    const invoicesTabBtn = screen.getByText("الفواتير والمدفوعات");
    fireEvent.click(invoicesTabBtn);

    await waitFor(() => {
      expect(screen.getByText("INV-201")).toBeInTheDocument();
      expect(screen.getByText("INV-202")).toBeInTheDocument();
    });
  });

  it("allows switching to Statement, Pricing, and Portal tabs", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText("د. هاني عثمان").length).toBeGreaterThanOrEqual(1);
    });

    // Statement tab
    const statementTabBtn = screen.getByText("كشف الحساب");
    fireEvent.click(statementTabBtn);
    await waitFor(() => {
      expect(screen.getByText("كشف حساب معمل الأسنان")).toBeInTheDocument();
      expect(screen.getByText("طباعة كشف الحساب")).toBeInTheDocument();
    });

    // Pricing tab
    const pricingTabBtn = screen.getByText("التسعير المخصص");
    fireEvent.click(pricingTabBtn);
    await waitFor(() => {
      expect(screen.getByText("قائمة الأسعار المخصصة للطبيب (Rate Sheet)")).toBeInTheDocument();
      expect(screen.getByText("Zirconia Crown")).toBeInTheDocument();
    });

    // Portal tab
    const portalTabBtn = screen.getByText("بوابة الطبيب والحساب");
    fireEvent.click(portalTabBtn);
    await waitFor(() => {
      expect(screen.getByText("بوابة الأطباء الذاتية (Doctor Portal)")).toBeInTheDocument();
      expect(screen.getByText("بيانات الاتصال والعيادة")).toBeInTheDocument();
    });
  });

  it("opens edit doctor modal and saves modifications", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("تعديل البيانات")).toBeInTheDocument();
    });

    const editBtn = screen.getByText("تعديل البيانات");
    fireEvent.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("تعديل بيانات الطبيب")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("د. هاني عثمان");
    fireEvent.change(nameInput, { target: { value: "د. هاني عثمان المحدث" } });

    const saveBtn = screen.getByText("حفظ");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByText("تعديل بيانات الطبيب")).not.toBeInTheDocument();
    });
  });

  it("opens bulk payment collection modal", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("تحصيل دفعة")).toBeInTheDocument();
    });

    const payBtn = screen.getByText("تحصيل دفعة");
    fireEvent.click(payBtn);

    await waitFor(() => {
      expect(screen.getByText("تحصيل دفعة على الحساب")).toBeInTheDocument();
      expect(screen.getByText("تأكيد التحصيل والتوزيع")).toBeInTheDocument();
    });

    // Cancel modal
    const cancelBtn = screen.getByText("إلغاء");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText("تحصيل دفعة على الحساب")).not.toBeInTheDocument();
    });
  });
});
