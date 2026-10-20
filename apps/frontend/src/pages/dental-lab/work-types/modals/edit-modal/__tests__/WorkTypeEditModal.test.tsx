// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import WorkTypeEditModal from "../../WorkTypeEditModal";
import * as shared from "../../../../shared";
import type { WorkTypeForm } from "../../../types/workTypeTypes";

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
        "dentalLab.common.name": "اسم نوع الشغل",
        "dentalLab.common.cancel": "إلغاء",
        "dentalLab.common.save": "حفظ",
        "dentalLab.common.saving": "جاري الحفظ...",
        "dentalLab.common.active": "نشط ومفعل",
        "dentalLab.workTypes.category": "التصنيف الرئيسي",
        "dentalLab.workTypes.leadTimeDays": "مدة الإنجاز",
        "dentalLab.workTypes.sortOrder": "ترتيب الظهور",
        "dentalLab.workTypes.created": "تم إنشاء نوع الشغل بنجاح",
        "dentalLab.workTypes.updated": "تم تحديث نوع الشغل بنجاح",
      };
      return translations[key] || key;
    },
  }),
}));

const mockNewWorkType: WorkTypeForm = {
  name: "",
  category: "CROWN_BRIDGE",
  pricingMode: "PER_UNIT",
  price: 0,
  costPrice: 0,
  leadTimeDays: 3,
  urgentLeadTimeDays: 1,
  defaultMaterial: "",
  materialBrand: "",
  instructions: "",
  defaultWarrantyYears: 0,
  defaultCrownCount: 1,
  sortOrder: 0,
  isActive: true,
};

const mockExistingWorkType: WorkTypeForm = {
  id: "wt-100",
  name: "Zirconia Multilayer Crown",
  category: "CROWN_BRIDGE",
  pricingMode: "PER_UNIT",
  price: 1500,
  costPrice: 500,
  leadTimeDays: 3,
  urgentLeadTimeDays: 1,
  defaultMaterial: "Zirconia",
  materialBrand: "Aidite",
  instructions: "Chamfer preparation required",
  defaultWarrantyYears: 5,
  defaultCrownCount: 1,
  sortOrder: 1,
  isActive: true,
};

describe("WorkTypeEditModal (Batch 351 Modular Deconstruction)", () => {
  const onCloseMock = vi.fn();
  const onSavedMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(shared, "createWorkType").mockResolvedValue({
      id: "wt-new",
      name: "E-max Crown",
    } as unknown as shared.WorkType);
    vi.spyOn(shared, "updateWorkType").mockResolvedValue({
      id: "wt-100",
      name: "Zirconia Multilayer Crown",
    } as unknown as shared.WorkType);
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = (form = mockNewWorkType) => {
    return render(
      <WorkTypeEditModal
        modal={form}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />
    );
  };

  it("1. renders create mode with add title and empty fields", () => {
    renderModal();

    expect(
      screen.getByText("إضافة نوع شغل جديد (2026 Ready)")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "مثال: تاج زيركون متعدد الطبقات (Zirconia Multilayer Crown)"
      )
    ).toBeInTheDocument();
  });

  it("2. renders edit mode with existing data and active checkbox", () => {
    renderModal(mockExistingWorkType);

    expect(screen.getByText("تعديل نوع الشغل")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Zirconia Multilayer Crown")
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("1500")).toBeInTheDocument();
    expect(screen.getByDisplayValue("500")).toBeInTheDocument();
    expect(screen.getByLabelText(/نشط ومفعل/)).toBeChecked();
  });

  it("3. switches pricing mode between PER_UNIT and FLAT", () => {
    renderModal();

    const pricingSelect = screen.getByDisplayValue(
      "تسعير لكل وحدة (Per Unit)"
    );
    fireEvent.change(pricingSelect, { target: { value: "FLAT" } });

    expect(
      screen.getByText("السعر الإجمالي للخدمة (ج.م) *")
    ).toBeInTheDocument();
  });

  it("4. submits createWorkType on valid form input", async () => {
    renderModal();

    const nameInput = screen.getByPlaceholderText(
      "مثال: تاج زيركون متعدد الطبقات (Zirconia Multilayer Crown)"
    );
    fireEvent.change(nameInput, { target: { value: "تاج زركونيا فائق الشفافية" } });

    const saveBtn = screen.getByText("حفظ");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(shared.createWorkType).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "تاج زركونيا فائق الشفافية",
          pricingMode: "PER_UNIT",
          isActive: true,
        })
      );
      expect(onSavedMock).toHaveBeenCalled();
    });
  });

  it("5. submits updateWorkType when editing existing work type", async () => {
    renderModal(mockExistingWorkType);

    const nameInput = screen.getByDisplayValue("Zirconia Multilayer Crown");
    fireEvent.change(nameInput, { target: { value: "Zirconia Ultra Crown" } });

    const saveBtn = screen.getByText("حفظ");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(shared.updateWorkType).toHaveBeenCalledWith(
        "wt-100",
        expect.objectContaining({
          name: "Zirconia Ultra Crown",
          isActive: true,
        })
      );
      expect(onSavedMock).toHaveBeenCalled();
    });
  });

  it("6. closes modal on cancel click and X button click", () => {
    renderModal();

    const cancelBtn = screen.getByText("إلغاء");
    fireEvent.click(cancelBtn);
    expect(onCloseMock).toHaveBeenCalled();

    const closeIcon = screen.getByLabelText("إغلاق");
    fireEvent.click(closeIcon);
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });
});
