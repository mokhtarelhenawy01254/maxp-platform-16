// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalInvoiceMonthlySettlementModal from "../../DentalInvoiceMonthlySettlementModal";
import * as shared from "../../../../shared";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock voucher modal
vi.mock("../../DentalInvoiceSettlementVoucherModal", () => ({
  DentalInvoiceSettlementVoucherModal: ({
    settlement,
    onClose,
  }: {
    settlement: any;
    onClose: () => void;
  }) => (
    <div data-testid="mock-voucher-modal">
      <p>سند تقفيل: {settlement.doctorName}</p>
      <button onClick={onClose}>إغلاق السند</button>
    </div>
  ),
}));

const mockDoctors = [
  { id: "doc-1", name: "د. هاني شاكر", clinicName: "عيادة الشاكر" },
  { id: "doc-2", name: "د. نجوى فؤاد", clinicName: "عيادة النجوم" },
] as any[];

const mockSettlementData = {
  summary: {
    totalBilled: 50000,
    totalPaid: 35000,
    totalAdjustments: 2000,
    totalClosingBalance: 13000,
    closedCount: 1,
    totalDoctors: 2,
  },
  settlements: [
    {
      id: "set-1",
      doctorId: "doc-1",
      doctorName: "د. هاني شاكر",
      clinicName: "عيادة الشاكر",
      phone: "01011112222",
      periodKey: "2026-10",
      openingBalance: 5000,
      totalBilled: 25000,
      totalPaid: 20000,
      totalAdjustments: 1000,
      closingBalance: 9000,
      invoicesCount: 4,
      casesCount: 4,
      status: "OPEN",
      isClosed: false,
    },
    {
      id: "set-2",
      doctorId: "doc-2",
      doctorName: "د. نجوى فؤاد",
      clinicName: "عيادة النجوم",
      phone: "01033334444",
      periodKey: "2026-10",
      openingBalance: 0,
      totalBilled: 25000,
      totalPaid: 15000,
      totalAdjustments: 1000,
      closingBalance: 9000,
      invoicesCount: 3,
      casesCount: 3,
      status: "CLOSED",
      isClosed: true,
      closedByName: "المحاسب أحمد",
    },
  ],
};

describe("DentalInvoiceMonthlySettlementModal (Batch 349 Modular Deconstruction)", () => {
  const onCloseMock = vi.fn();
  const onUpdatedMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(shared, "fetchMonthlySettlements").mockResolvedValue(
      mockSettlementData as any
    );
    vi.spyOn(shared, "closeMonthlySettlement").mockResolvedValue({
      success: true,
    } as any);
    vi.spyOn(shared, "reopenMonthlySettlement").mockResolvedValue({
      success: true,
    } as any);
    window.confirm = vi.fn(() => true);
    window.open = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = () => {
    return render(
      <DentalInvoiceMonthlySettlementModal
        doctors={mockDoctors}
        onClose={onCloseMock}
        onUpdated={onUpdatedMock}
      />
    );
  };

  it("1. renders header, period, and calls fetchMonthlySettlements", async () => {
    renderModal();

    expect(
      screen.getByText("تقفيل المستحقات الشهرية وتجميد الأرصدة")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(shared.fetchMonthlySettlements).toHaveBeenCalled();
      expect(screen.getByText("د. هاني شاكر")).toBeInTheDocument();
      expect(screen.getByText("د. نجوى فؤاد")).toBeInTheDocument();
    });
  });

  it("2. displays summary metrics accurately", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("د. هاني شاكر")).toBeInTheDocument();
    });

    expect(screen.getByText("إجمالي فواتير الشهر")).toBeInTheDocument();
    expect(screen.getByText("إجمالي المسدد")).toBeInTheDocument();
    expect(screen.getByText("إجمالي التسويات")).toBeInTheDocument();
    expect(screen.getByText("صافي المديونية المرحلة")).toBeInTheDocument();
    expect(screen.getByText("نسبة الاعتماد للشهر")).toBeInTheDocument();
  });

  it("3. filters by selected doctor", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("د. هاني شاكر")).toBeInTheDocument();
    });

    const docSelect = screen.getByLabelText("اختيار الطبيب");
    fireEvent.change(docSelect, { target: { value: "doc-1" } });

    await waitFor(() => {
      expect(shared.fetchMonthlySettlements).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: "doc-1" })
      );
    });
  });

  it("4. closes single doctor settlement after user confirms", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("د. هاني شاكر")).toBeInTheDocument();
    });

    const closeSingleBtn = screen.getByTitle("تقفيل واعتماد الحساب وتجميده");
    fireEvent.click(closeSingleBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(shared.closeMonthlySettlement).toHaveBeenCalledWith(
        expect.objectContaining({ doctorId: "doc-1" })
      );
      expect(onUpdatedMock).toHaveBeenCalled();
    });
  });

  it("5. closes all settlements when clicking bulk close button", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("د. هاني شاكر")).toBeInTheDocument();
    });

    const closeAllBtn = screen.getByText(
      "إغلاق واعتماد كافة الحسابات دفعة واحدة"
    );
    fireEvent.click(closeAllBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(shared.closeMonthlySettlement).toHaveBeenCalled();
      expect(onUpdatedMock).toHaveBeenCalled();
    });
  });

  it("6. opens reopen modal and reopens closed settlement with audit reason", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("د. نجوى فؤاد")).toBeInTheDocument();
    });

    const reopenBtn = screen.getByTitle("إعادة فتح الشهر للتدقيق");
    fireEvent.click(reopenBtn);

    expect(
      screen.getByText(/إعادة فتح شهر .* للتعديل المحاسبي/)
    ).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(
      "مثال: إضافة دفعة متأخرة أو تصحيح خصم بناءً على مراجعة الطبيب..."
    );
    fireEvent.change(textarea, { target: { value: "مراجعة خصم متفق عليه مع الطبيب" } });

    const confirmReopenBtn = screen.getByText("تأكيد إعادة الفتح");
    fireEvent.click(confirmReopenBtn);

    await waitFor(() => {
      expect(shared.reopenMonthlySettlement).toHaveBeenCalledWith("set-2", {
        reason: "مراجعة خصم متفق عليه مع الطبيب",
      });
      expect(onUpdatedMock).toHaveBeenCalled();
    });
  });

  it("7. opens voucher preview modal on print icon click", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("د. هاني شاكر")).toBeInTheDocument();
    });

    const voucherBtns = screen.getAllByTitle("عرض وطباعة سند التقفيل");
    fireEvent.click(voucherBtns[0]);

    expect(screen.getByTestId("mock-voucher-modal")).toBeInTheDocument();
    expect(screen.getByText("سند تقفيل: د. هاني شاكر")).toBeInTheDocument();

    fireEvent.click(screen.getByText("إغلاق السند"));
    expect(screen.queryByTestId("mock-voucher-modal")).not.toBeInTheDocument();
  });

  it("8. triggers WhatsApp message with settlement details", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByText("د. هاني شاكر")).toBeInTheDocument();
    });

    const waBtns = screen.getAllByTitle("مراسلة الطبيب بتفاصيل التقفيل عبر واتساب");
    fireEvent.click(waBtns[0]);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/201011112222"),
      "_blank"
    );
  });
});
