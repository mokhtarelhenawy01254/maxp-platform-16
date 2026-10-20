// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalCaseCreateModal from "../../DentalCaseCreateModal";
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

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "dentalLab.cases.createTitle": "إضافة أمر شغل جديد",
        "dentalLab.common.patientName": "اسم المريض",
        "dentalLab.common.cancel": "إلغاء",
        "dentalLab.common.save": "حفظ الحالة",
        "dentalLab.common.saving": "جاري الحفظ...",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock OdontogramChart
vi.mock("../../../../OdontogramChart", () => ({
  default: ({
    selectedTeeth,
    onChange,
  }: {
    selectedTeeth: string[];
    onChange: (teeth: string[]) => void;
  }) => (
    <div data-testid="mock-odontogram-chart">
      <span>Odontogram: {selectedTeeth.join(", ")}</span>
      <button
        type="button"
        onClick={() => onChange([...selectedTeeth, "11"])}
      >
        Select Tooth 11
      </button>
    </div>
  ),
}));

const mockDoctors = [
  {
    id: "doc-1",
    name: "د. هاني شاكر",
    clinicName: "مركز الشاكر للأسنان",
    isActive: true,
    doctors: [
      { id: "sub-1", name: "د. أحمد سامي", specialty: "تركيبات" },
      { id: "sub-2", name: "د. سارة عادل", specialty: "جراحة" },
    ],
  },
  {
    id: "doc-2",
    name: "د. طارق مراد",
    clinicName: "عيادة د. طارق",
    isActive: true,
  },
] as any[];

const mockWorkTypes = [
  {
    id: "wt-1",
    name: "Zirconia Crown",
    price: 1200,
    pricingMode: "PER_UNIT",
    leadDays: 3,
    isActive: true,
  },
  {
    id: "wt-2",
    name: "Night Guard",
    price: 800,
    pricingMode: "FLAT",
    leadDays: 2,
    isActive: true,
  },
] as any[];

const mockTechnicians = [
  { id: "tech-1", name: "فني محمود", role: "CERAMIST", active: true },
  { id: "tech-2", name: "فني خالد", role: "CAD_CAM", active: true },
] as any[];

describe("DentalCaseCreateModal (Batch 350 Modular Deconstruction)", () => {
  const onCloseMock = vi.fn();
  const onSavedMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(shared, "createCase").mockResolvedValue({
      id: "case-new",
      caseNumber: "DL-9999",
    } as any);
    vi.spyOn(shared, "updateCase").mockResolvedValue({
      id: "case-1",
      caseNumber: "DL-1001",
    } as any);
    vi.spyOn(shared, "fetchDoctorPricing").mockResolvedValue({
      pricing: [],
    } as any);
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = (initial?: any) => {
    return render(
      <BrowserRouter>
        <DentalCaseCreateModal
          initial={initial}
          doctors={mockDoctors}
          workTypes={mockWorkTypes}
          technicians={mockTechnicians}
          onClose={onCloseMock}
          onSaved={onSavedMock}
        />
      </BrowserRouter>
    );
  };

  it("1. renders create mode drawer with empty fields and Odontogram chart", () => {
    renderModal();

    expect(screen.getByText("العيادة / المركز الطبي *")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("اسم المريض")).toBeInTheDocument();
    expect(screen.getByText("نوع الشغل / التركيبة *")).toBeInTheDocument();
    expect(screen.getByTestId("mock-odontogram-chart")).toBeInTheDocument();
  });

  it("2. renders edit mode with existing case data and order page link", () => {
    const existingCase = {
      id: "case-123",
      caseNumber: "DL-1234",
      doctorId: "doc-1",
      doctorName: "د. هاني شاكر",
      patientName: "سامي حسن",
      workTypeId: "wt-1",
      workTypeName: "Zirconia Crown",
      unitsCount: 2,
      teeth: "11, 21",
      shade: "A2",
      priceSnapshot: 2400,
      priority: "NORMAL",
    } as any;

    renderModal(existingCase);

    expect(screen.getByText(/تعديل الأوردر DL-1234/)).toBeInTheDocument();
    expect(screen.getByText("فتح صفحة الأوردر")).toBeInTheDocument();
    expect(screen.getByDisplayValue("سامي حسن")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A2")).toBeInTheDocument();
  });

  it("3. changes clinic selection and populates sub-doctors dropdown", () => {
    renderModal();

    const clinicSelect = screen.getByDisplayValue("— اختر العيادة / الحساب —");
    fireEvent.change(clinicSelect, { target: { value: "doc-1" } });

    expect(screen.getByText("الطبيب المعالج داخل العيادة")).toBeInTheDocument();
    expect(screen.getByText("د. أحمد سامي (تركيبات)")).toBeInTheDocument();
  });

  it("4. updates teeth through odontogram chart selection", () => {
    renderModal();

    const selectToothBtn = screen.getByText("Select Tooth 11");
    fireEvent.click(selectToothBtn);

    expect(screen.getByText("Odontogram: 11")).toBeInTheDocument();
  });

  it("5. selects work type and technician", () => {
    renderModal();

    const workTypeSelect = screen.getByDisplayValue("— اختر نوع الشغل —");
    fireEvent.change(workTypeSelect, { target: { value: "wt-1" } });

    expect(screen.getByText(/Zirconia Crown/)).toBeInTheDocument();

    const techSelect = screen.getByDisplayValue("— بدون إسناد حالياً —");
    fireEvent.change(techSelect, { target: { value: "tech-1" } });
  });

  it("6. submits valid form and calls createCase", async () => {
    renderModal();

    // Fill required clinic
    const clinicSelect = screen.getByDisplayValue("— اختر العيادة / الحساب —");
    fireEvent.change(clinicSelect, { target: { value: "doc-2" } });

    // Fill patient name
    const patientInput = screen.getByPlaceholderText("اسم المريض");
    fireEvent.change(patientInput, { target: { value: "محمد عبد الله" } });

    // Fill work type
    const workTypeSelect = screen.getByDisplayValue("— اختر نوع الشغل —");
    fireEvent.change(workTypeSelect, { target: { value: "wt-1" } });

    // Submit save
    const saveBtn = screen.getByText("حفظ الحالة");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(shared.createCase).toHaveBeenCalledWith(
        expect.objectContaining({
          doctorId: "doc-2",
          patientName: "محمد عبد الله",
          workTypeId: "wt-1",
        })
      );
      expect(onSavedMock).toHaveBeenCalled();
    });
  });

  it("7. closes drawer when clicking cancel button", () => {
    renderModal();

    const cancelBtn = screen.getByText("إلغاء");
    fireEvent.click(cancelBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });
});
