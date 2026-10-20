// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import DentalCaseEditModal from "../../DentalCaseEditModal";
import * as shared from "../../../../shared";
import type { DentalLabCase, DentalLabDoctor, DentalLabWorkType } from "../../../../shared";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "dentalLab.common.cancel": "إلغاء",
        "dentalLab.common.save": "حفظ التغييرات",
        "dentalLab.common.saved": "تم الحفظ بنجاح",
        "dentalLab.common.name": "يرجى إدخال اسم المريض",
      };
      return translations[key] || key;
    },
  }),
}));

const mockCase: DentalLabCase = {
  id: "case-edit-1",
  caseNumber: "CASE-999",
  doctorId: "doc-1",
  doctorName: "د. أحمد",
  patientName: "سامر علي",
  patientPhone: "01011112222",
  workTypeId: "wt-1",
  workTypeName: "Zirconia",
  unitsCount: 2,
  unitPrice: 500,
  priceSnapshot: 1000,
  discount: 100,
  receivedDate: "2026-10-15T00:00:00Z",
  dueDate: "2026-10-25T00:00:00Z",
  priority: "NORMAL",
  status: "RECEIVED",
  teeth: "11, 12",
  shade: "A2",
  material: "Zirconia",
  materialBrand: "Katana",
  lotNumber: "LOT-456",
  warrantyYears: 5,
  notes: "يرجى الانتباه للشيد",
  total: 900,
  paid: 0,
  remaining: 900,
} as unknown as DentalLabCase;

const mockDoctors: DentalLabDoctor[] = [
  {
    id: "doc-1",
    name: "د. أحمد سامي",
    clinicName: "النور",
    isActive: true,
  } as DentalLabDoctor,
  {
    id: "doc-2",
    name: "د. سارة محمود",
    clinicName: "الأمل",
    isActive: true,
  } as DentalLabDoctor,
];

const mockWorkTypes: DentalLabWorkType[] = [
  {
    id: "wt-1",
    name: "Zirconia",
    price: 500,
    isActive: true,
    defaultMaterial: "Zirconia Multi",
    materialBrand: "Katana",
    defaultWarrantyYears: 5,
  } as DentalLabWorkType,
  {
    id: "wt-2",
    name: "E-Max",
    price: 600,
    isActive: true,
  } as DentalLabWorkType,
];

describe("DentalCaseEditModal", () => {
  it("renders modal with case data prefilled and cancels correctly", () => {
    const onClose = vi.fn();

    render(
      <DentalCaseEditModal
        caseData={mockCase}
        doctors={mockDoctors}
        workTypes={mockWorkTypes}
        onClose={onClose}
        onSaved={vi.fn()}
      />
    );

    expect(screen.getByText("تعديل بيانات الحالة بالكامل")).toBeInTheDocument();
    expect(screen.getByText("CASE-999")).toBeInTheDocument();
    expect(screen.getByDisplayValue("سامر علي")).toBeInTheDocument();
    expect(screen.getByDisplayValue("01011112222")).toBeInTheDocument();
    expect(screen.getByDisplayValue("يرجى الانتباه للشيد")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "إلغاء" });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("updates case fields and calls updateCase on save", async () => {
    const onSaved = vi.fn();
    const updateCaseSpy = vi.spyOn(shared, "updateCase").mockResolvedValue({} as DentalLabCase);

    render(
      <DentalCaseEditModal
        caseData={mockCase}
        doctors={mockDoctors}
        workTypes={mockWorkTypes}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    );

    const nameInput = screen.getByLabelText("اسم المريض *");
    fireEvent.change(nameInput, { target: { value: "سامر علي حسن" } });

    const notesInput = screen.getByLabelText("ملاحظات وتعليمات الشغل");
    fireEvent.change(notesInput, { target: { value: "ملاحظة جديدة" } });

    const saveBtn = screen.getByRole("button", { name: "حفظ التغييرات" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateCaseSpy).toHaveBeenCalledWith(
        "case-edit-1",
        expect.objectContaining({
          patientName: "سامر علي حسن",
          notes: "ملاحظة جديدة",
        })
      );
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });

  it("advances case if general status was changed", async () => {
    const onSaved = vi.fn();
    const advanceCaseSpy = vi.spyOn(shared, "advanceCase").mockResolvedValue({} as DentalLabCase);
    vi.spyOn(shared, "updateCase").mockResolvedValue({} as DentalLabCase);

    render(
      <DentalCaseEditModal
        caseData={mockCase}
        doctors={mockDoctors}
        workTypes={mockWorkTypes}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    );

    const statusSelect = screen.getByLabelText("حالة الشغل العامة");
    fireEvent.change(statusSelect, { target: { value: "DESIGN" } });

    const saveBtn = screen.getByRole("button", { name: "حفظ التغييرات" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(advanceCaseSpy).toHaveBeenCalledWith("case-edit-1", { status: "DESIGN" });
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });
});
