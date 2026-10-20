// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DentalWorkTypesTab from "../../DentalWorkTypesTab";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

// Mock DentalWorkTypeStagesModal
vi.mock("../../DentalWorkTypeStagesModal", () => ({
  default: ({
    workType,
    onClose,
  }: {
    workType: { name: string };
    onClose: () => void;
  }) => (
    <div data-testid="stages-modal">
      <p>مراحل: {workType.name}</p>
      <button onClick={onClose}>إغلاق المراحل</button>
    </div>
  ),
}));

// Hoisted mock data
const { mockWorkTypes } = vi.hoisted(() => {
  const mockWorkTypes = [
    {
      id: "wt-1",
      name: "تاج زيركون متعدد الطبقات",
      category: "CROWN",
      pricingMode: "PER_UNIT",
      price: 1500,
      costPrice: 400,
      leadTimeDays: 3,
      urgentLeadTimeDays: 1,
      defaultMaterial: "زيركون (Zirconia Multilayer)",
      materialBrand: "Aidite (3D Pro Zir, Honor)",
      instructions: "تحضير الشامفر 0.8 مم",
      defaultWarrantyYears: 5,
      defaultCrownCount: 1,
      sortOrder: 1,
      isActive: true,
    },
    {
      id: "wt-2",
      name: "طقم أسنان متحرك كامل",
      category: "REMOVABLE",
      pricingMode: "FLAT",
      price: 3200,
      costPrice: 800,
      leadTimeDays: 7,
      urgentLeadTimeDays: 3,
      defaultMaterial: "أكريل وطباعة 3D (PMMA / 3D Print)",
      materialBrand: "Ivoclar Vivadent",
      instructions: "",
      defaultWarrantyYears: 2,
      defaultCrownCount: 1,
      sortOrder: 2,
      isActive: false,
    },
  ];

  return { mockWorkTypes };
});

// Mock shared API methods
vi.mock("../../shared", () => ({
  fetchWorkTypes: vi.fn(async () => mockWorkTypes),
  createWorkType: vi.fn(async () => ({ id: "wt-new", name: "فينير إيماكس" })),
  updateWorkType: vi.fn(async () => ({ id: "wt-1", name: "تاج زيركون معدل" })),
  deleteWorkType: vi.fn(async () => ({ message: "تم الحذف بنجاح" })),
  MODAL_CONTENT_CLS: "bg-white dark:bg-gray-800 rounded-xl p-6",
  MODAL_INPUT_CLS: "w-full border rounded-lg px-3 py-2 text-sm",
  fmtMoney: (v: number) => `${Number(v).toLocaleString("en-US")} ج.م`,
}));

describe("DentalWorkTypesTab (Batch 341 Modular Deconstruction)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders page header and new work type button", async () => {
    render(
      <MemoryRouter>
        <DentalWorkTypesTab />
      </MemoryRouter>
    );

    expect(screen.getAllByText("dentalLab.workTypes.title").length).toBeGreaterThan(0);
    expect(screen.getByText("dentalLab.workTypes.newWorkType")).toBeInTheDocument();
    expect(screen.getByText("dentalLab.common.refresh")).toBeInTheDocument();
  });

  it("renders work types table with records, prices, and profit margins", async () => {
    render(
      <MemoryRouter>
        <DentalWorkTypesTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("تاج زيركون متعدد الطبقات")).toBeInTheDocument();
      expect(screen.getByText("طقم أسنان متحرك كامل")).toBeInTheDocument();
      expect(screen.getByText("تيجان")).toBeInTheDocument();
      expect(screen.getByText("أطقم")).toBeInTheDocument();
      expect(screen.getByText("لكل وحدة")).toBeInTheDocument();
      expect(screen.getByText("سعر ثابت للخدمة")).toBeInTheDocument();
      expect(screen.getByText("Aidite (3D Pro Zir, Honor)")).toBeInTheDocument();
      expect(screen.getByText("ضمان 5 سنوات")).toBeInTheDocument();
    });
  });

  it("opens create work type modal when clicking new work type button", async () => {
    render(
      <MemoryRouter>
        <DentalWorkTypesTab />
      </MemoryRouter>
    );

    const newBtn = screen.getByText("dentalLab.workTypes.newWorkType");
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(
        screen.getByText("إضافة نوع شغل جديد (2026 Ready)")
      ).toBeInTheDocument();
      expect(
        screen.getByText("معاينة حية (كيف تظهر للطبيب في البوابة)")
      ).toBeInTheDocument();
      expect(screen.getByText("تحليل ربحية الخدمة")).toBeInTheDocument();
    });

    const cancelBtn = screen.getByText("dentalLab.common.cancel");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(
        screen.queryByText("إضافة نوع شغل جديد (2026 Ready)")
      ).not.toBeInTheDocument();
    });
  });

  it("opens edit modal when clicking edit button on a row", async () => {
    render(
      <MemoryRouter>
        <DentalWorkTypesTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("تاج زيركون متعدد الطبقات")).toBeInTheDocument();
    });

    const editBtns = screen.getAllByTitle("dentalLab.common.edit");
    fireEvent.click(editBtns[0]);

    await waitFor(() => {
      expect(screen.getByText("تعديل نوع الشغل")).toBeInTheDocument();
    });
  });

  it("opens stages modal when clicking stages button on a row", async () => {
    render(
      <MemoryRouter>
        <DentalWorkTypesTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("تاج زيركون متعدد الطبقات")).toBeInTheDocument();
    });

    const stagesBtns = screen.getAllByTitle("قالب مراحل الإنتاج ومواصفات SLA");
    fireEvent.click(stagesBtns[0]);

    await waitFor(() => {
      expect(screen.getByTestId("stages-modal")).toBeInTheDocument();
      expect(
        screen.getByText("مراحل: تاج زيركون متعدد الطبقات")
      ).toBeInTheDocument();
    });

    const closeBtn = screen.getByText("إغلاق المراحل");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("stages-modal")).not.toBeInTheDocument();
    });
  });
});
