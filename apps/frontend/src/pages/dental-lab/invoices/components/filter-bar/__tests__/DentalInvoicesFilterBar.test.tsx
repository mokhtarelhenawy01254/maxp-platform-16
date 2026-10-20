// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { DentalInvoicesFilterBar } from "../../DentalInvoicesFilterBar";
import type { DentalLabDoctor, UninvoicedSummaryResult } from "../../../../shared";
import type { ActiveDoctorStats } from "../types";

afterEach(() => {
  cleanup();
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "dentalLab.invoices.title": "فواتير الأطباء",
        "dentalLab.invoices.newInvoice": "فاتورة جديدة",
        "dentalLab.common.refresh": "تحديث",
        "dentalLab.common.egp": "ج.م",
      };
      return translations[key] || key;
    },
  }),
}));

const mockDoctors: DentalLabDoctor[] = [
  {
    id: "doc-1",
    name: "د. أحمد سامي",
    clinicName: "عيادة النور",
    phone: "01012345678",
    outstanding: 5000,
  } as DentalLabDoctor,
  {
    id: "doc-2",
    name: "د. هدى منصور",
    clinicName: "عيادة الأمل",
    phone: "01198765432",
    outstanding: 0,
  } as DentalLabDoctor,
];

const mockStats: ActiveDoctorStats = {
  totalBilled: 15000,
  totalPaid: 10000,
  outstanding: 5000,
  invoicesCount: 4,
  uninvoicedCases: 2,
  uninvoicedAmount: 3200,
  creditLimit: 20000,
  creditExceeded: false,
};

const mockUninvoicedSummary: UninvoicedSummaryResult = {
  totalCases: 5,
  totalDoctors: 2,
  totalAmount: 12500,
  doctors: [],
};

describe("DentalInvoicesFilterBar", () => {
  it("renders top header and triggers primary actions", () => {
    const onCreateInvoice = vi.fn();
    const onExportExcel = vi.fn();
    const onRefresh = vi.fn();
    const onOpenSettlement = vi.fn();

    render(
      <DentalInvoicesFilterBar
        selectedDoctorId=""
        onSelectDoctorId={vi.fn()}
        doctors={mockDoctors}
        activeDoctor={null}
        activeDoctorStats={null}
        uninvoicedSummary={null}
        searchQuery=""
        onSearchChange={vi.fn()}
        statusFilter="ALL"
        onStatusFilterChange={vi.fn()}
        datePreset="ALL"
        onDatePresetChange={vi.fn()}
        fetchedCount={12}
        onCreateInvoice={onCreateInvoice}
        onExportExcel={onExportExcel}
        onBatchInvoice={vi.fn()}
        onOpenSettlement={onOpenSettlement}
        onRefresh={onRefresh}
        onOpenStatement={vi.fn()}
        onBulkPayment={vi.fn()}
      />
    );

    expect(screen.getByText("فواتير الأطباء")).toBeInTheDocument();
    expect(screen.getByText("فاتورة جديدة")).toBeInTheDocument();
    expect(screen.getByText("تصدير Excel")).toBeInTheDocument();
    expect(screen.getByText("تقفيل المستحقات الشهرية")).toBeInTheDocument();
    expect(screen.getByText("عدد الفواتير: 12")).toBeInTheDocument();

    fireEvent.click(screen.getByText("فاتورة جديدة"));
    expect(onCreateInvoice).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("تصدير Excel"));
    expect(onExportExcel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("تحديث"));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("تقفيل المستحقات الشهرية"));
    expect(onOpenSettlement).toHaveBeenCalledTimes(1);
  });

  it("renders uninvoiced banner when pending cases exist and triggers batch invoice", () => {
    const onBatchInvoice = vi.fn();

    render(
      <DentalInvoicesFilterBar
        selectedDoctorId=""
        onSelectDoctorId={vi.fn()}
        doctors={mockDoctors}
        activeDoctor={null}
        activeDoctorStats={null}
        uninvoicedSummary={mockUninvoicedSummary}
        searchQuery=""
        onSearchChange={vi.fn()}
        statusFilter="ALL"
        onStatusFilterChange={vi.fn()}
        datePreset="ALL"
        onDatePresetChange={vi.fn()}
        fetchedCount={5}
        onCreateInvoice={vi.fn()}
        onExportExcel={vi.fn()}
        onBatchInvoice={onBatchInvoice}
        onOpenSettlement={vi.fn()}
        onRefresh={vi.fn()}
        onOpenStatement={vi.fn()}
        onBulkPayment={vi.fn()}
      />
    );

    expect(screen.getByText("دورة الفوترة الشهرية وتصفية الحسابات")).toBeInTheDocument();
    expect(screen.getByText("5 حالة معلقة")).toBeInTheDocument();

    const batchBtns = screen.getAllByRole("button", { name: /إصدار الفواتير المجمعة الآن/i });
    expect(batchBtns.length).toBeGreaterThan(0);
    fireEvent.click(batchBtns[0]);
    expect(onBatchInvoice).toHaveBeenCalledTimes(1);
  });

  it("selects doctor and displays doctor financial strip with actions", () => {
    const onSelectDoctorId = vi.fn();
    const onOpenStatement = vi.fn();
    const onBulkPayment = vi.fn();

    render(
      <DentalInvoicesFilterBar
        selectedDoctorId="doc-1"
        onSelectDoctorId={onSelectDoctorId}
        doctors={mockDoctors}
        activeDoctor={mockDoctors[0]}
        activeDoctorStats={mockStats}
        uninvoicedSummary={null}
        searchQuery=""
        onSearchChange={vi.fn()}
        statusFilter="ALL"
        onStatusFilterChange={vi.fn()}
        datePreset="ALL"
        onDatePresetChange={vi.fn()}
        fetchedCount={4}
        onCreateInvoice={vi.fn()}
        onExportExcel={vi.fn()}
        onBatchInvoice={vi.fn()}
        onOpenSettlement={vi.fn()}
        onRefresh={vi.fn()}
        onOpenStatement={onOpenStatement}
        onBulkPayment={onBulkPayment}
      />
    );

    const select = screen.getByLabelText("حساب الطبيب:") as HTMLSelectElement;
    expect(select.value).toBe("doc-1");

    fireEvent.change(select, { target: { value: "doc-2" } });
    expect(onSelectDoctorId).toHaveBeenCalledWith("doc-2");

    // Check doctor action buttons
    expect(screen.getByText("كشف حساب الطبيب")).toBeInTheDocument();
    expect(screen.getByText("تحصيل دفعة")).toBeInTheDocument();
    expect(screen.getByText("واتساب")).toBeInTheDocument();

    fireEvent.click(screen.getByText("كشف حساب الطبيب"));
    expect(onOpenStatement).toHaveBeenCalledWith(mockDoctors[0]);

    fireEvent.click(screen.getByText("تحصيل دفعة"));
    expect(onBulkPayment).toHaveBeenCalledWith(mockDoctors[0]);

    // Check financial strip stats
    expect(screen.getByText("إجمالي الفواتير")).toBeInTheDocument();
    expect(screen.getByText("إجمالي المسدد")).toBeInTheDocument();
    expect(screen.getByText("المديونية الحالية المتبقية")).toBeInTheDocument();
    expect(screen.getByText("حالات غير مفوترة")).toBeInTheDocument();
  });

  it("handles search, status filter, and date preset changes", () => {
    const onSearchChange = vi.fn();
    const onStatusFilterChange = vi.fn();
    const onDatePresetChange = vi.fn();

    render(
      <DentalInvoicesFilterBar
        selectedDoctorId=""
        onSelectDoctorId={vi.fn()}
        doctors={mockDoctors}
        activeDoctor={null}
        activeDoctorStats={null}
        uninvoicedSummary={null}
        searchQuery="فاتورة 101"
        onSearchChange={onSearchChange}
        statusFilter="ALL"
        onStatusFilterChange={onStatusFilterChange}
        datePreset="ALL"
        onDatePresetChange={onDatePresetChange}
        fetchedCount={1}
        onCreateInvoice={vi.fn()}
        onExportExcel={vi.fn()}
        onBatchInvoice={vi.fn()}
        onOpenSettlement={vi.fn()}
        onRefresh={vi.fn()}
        onOpenStatement={vi.fn()}
        onBulkPayment={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText("بحث برقم الفاتورة، اسم الدكتور، المريض...");
    expect(searchInput).toHaveValue("فاتورة 101");

    // Click clear search button
    const clearBtn = screen.getByLabelText("مسح البحث");
    fireEvent.click(clearBtn);
    expect(onSearchChange).toHaveBeenCalledWith("");

    // Click status filter
    const openStatusBtn = screen.getByRole("button", { name: "غير مسددة" });
    fireEvent.click(openStatusBtn);
    expect(onStatusFilterChange).toHaveBeenCalledWith("OPEN");

    // Click date preset
    const monthPresetBtn = screen.getByRole("button", { name: "هذا الشهر" });
    fireEvent.click(monthPresetBtn);
    expect(onDatePresetChange).toHaveBeenCalledWith("THIS_MONTH");
  });
});
