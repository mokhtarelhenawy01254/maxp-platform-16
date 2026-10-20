// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DoctorEditModal } from "../DoctorEditModal";
import type { DoctorForm } from "../../types/doctorsTypes";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "dentalLab.doctors.createTitle": "إضافة طبيب جديد",
        "dentalLab.doctors.editTitle": "تعديل بيانات الطبيب",
        "dentalLab.common.name": "الاسم",
        "dentalLab.common.phone": "الهاتف",
        "dentalLab.doctors.clinicName": "اسم العيادة",
        "dentalLab.doctors.governorate": "المحافظة",
        "dentalLab.doctors.portalPin": "رمز الدخول",
        "dentalLab.doctors.creditLimit": "الحد الائتماني",
        "dentalLab.common.notes": "ملاحظات",
        "dentalLab.common.active": "نشط",
        "dentalLab.common.cancel": "إلغاء",
        "dentalLab.common.save": "حفظ",
        "dentalLab.common.saving": "جاري الحفظ...",
        "dentalLab.doctors.created": "تم إضافة الطبيب بنجاح",
        "dentalLab.doctors.updated": "تم تحديث بيانات الطبيب",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock shared API functions
const { mockCreateDoctor, mockUpdateDoctor } = vi.hoisted(() => ({
  mockCreateDoctor: vi.fn().mockResolvedValue({ id: "doc-created" }),
  mockUpdateDoctor: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../../../shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../shared")>();
  return {
    ...actual,
    createDoctor: mockCreateDoctor,
    updateDoctor: mockUpdateDoctor,
    MODAL_INPUT_CLS: "test-input-cls",
  };
});

describe("DoctorEditModal (Batch 365)", () => {
  const defaultCreateForm: DoctorForm = {
    name: "",
    phone: "",
    clinicName: "",
    governorate: "",
    portalPin: "",
    creditLimit: 0,
    notes: "",
    isActive: true,
    doctors: [],
  };

  const defaultEditForm: DoctorForm = {
    id: "doc-123",
    name: "د. هاني عثمان",
    phone: "01000000001",
    clinicName: "عيادة النور",
    governorate: "القاهرة",
    portalPin: "1234",
    creditLimit: 5000,
    notes: "طبيب متميز",
    isActive: true,
    doctors: [
      {
        id: "sub-1",
        name: "د. ريم أحمد",
        specialty: "تقويم",
        phone: "01111111111",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders create modal with empty fields and default labels", () => {
    render(
      <DoctorEditModal
        modal={defaultCreateForm}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(screen.getByText("إضافة طبيب جديد")).toBeInTheDocument();
    expect(screen.getByText("أطباء العيادة / الفريق الطبي التابع للعيادة")).toBeInTheDocument();
    expect(screen.getByText("لم يتم إضافة أطباء إضافيين للعيادة بعد (الحساب يسجل باسم الطبيب الرئيسي أعلاه).")).toBeInTheDocument();
  });

  it("renders edit modal with prefilled data and existing clinic team", () => {
    render(
      <DoctorEditModal
        modal={defaultEditForm}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(screen.getByText("تعديل بيانات الطبيب")).toBeInTheDocument();
    expect(screen.getByDisplayValue("د. هاني عثمان")).toBeInTheDocument();
    expect(screen.getByDisplayValue("عيادة النور")).toBeInTheDocument();
    expect(screen.getByDisplayValue("القاهرة")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5000")).toBeInTheDocument();
    expect(screen.getByText("د. ريم أحمد")).toBeInTheDocument();
    expect(screen.getByText("تقويم")).toBeInTheDocument();
  });

  it("adds a new clinic doctor to the team and removes existing", () => {
    render(
      <DoctorEditModal
        modal={defaultEditForm}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    // Initial doctor present
    expect(screen.getByText("د. ريم أحمد")).toBeInTheDocument();

    // Type in new clinic doctor
    const nameInput = screen.getByPlaceholderText("اسم الدكتور (مثال: د. سارة أحمد)");
    const specInput = screen.getByPlaceholderText("التخصص (مثال: تركيبات / زراعة)");
    const phoneInput = screen.getByPlaceholderText("الهاتف (اختياري)");

    fireEvent.change(nameInput, { target: { value: "د. طارق محمود" } });
    fireEvent.change(specInput, { target: { value: "زراعة" } });
    fireEvent.change(phoneInput, { target: { value: "01234567890" } });

    // Click add button
    const addBtn = screen.getByRole("button", { name: "إضافة" });
    fireEvent.click(addBtn);

    // New doctor should now be rendered
    expect(screen.getByText("د. طارق محمود")).toBeInTheDocument();
    expect(screen.getByText("زراعة")).toBeInTheDocument();

    // Remove first doctor
    const deleteButtons = screen.getAllByTitle("حذف الطبيب من العيادة");
    expect(deleteButtons.length).toBe(2);
    fireEvent.click(deleteButtons[0]);

    // First doctor removed
    expect(screen.queryByText("د. ريم أحمد")).not.toBeInTheDocument();
    expect(screen.getByText("د. طارق محمود")).toBeInTheDocument();
  });

  it("submits updateDoctor payload on save for existing doctor", async () => {
    const handleSaved = vi.fn();
    render(
      <DoctorEditModal
        modal={defaultEditForm}
        onClose={vi.fn()}
        onSaved={handleSaved}
      />
    );

    const saveBtn = screen.getByRole("button", { name: "حفظ" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateDoctor).toHaveBeenCalledWith("doc-123", expect.objectContaining({
        name: "د. هاني عثمان",
        clinicName: "عيادة النور",
        governorate: "القاهرة",
        creditLimit: 5000,
        isActive: true,
      }));
      expect(handleSaved).toHaveBeenCalled();
    });
  });

  it("submits createDoctor payload on save for new doctor", async () => {
    const handleSaved = vi.fn();
    render(
      <DoctorEditModal
        modal={defaultCreateForm}
        onClose={vi.fn()}
        onSaved={handleSaved}
      />
    );

    // Type name
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "د. حازم إمام" } });

    const saveBtn = screen.getByRole("button", { name: "حفظ" });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockCreateDoctor).toHaveBeenCalledWith(expect.objectContaining({
        name: "د. حازم إمام",
        isActive: true,
      }));
      expect(handleSaved).toHaveBeenCalled();
    });
  });
});
