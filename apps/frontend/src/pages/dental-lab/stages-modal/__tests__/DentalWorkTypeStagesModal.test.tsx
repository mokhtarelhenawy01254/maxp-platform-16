// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalWorkTypeStagesModal from "../../DentalWorkTypeStagesModal";
import { type DentalWorkType } from "../../shared";

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
const { mockWorkType, mockStages } = vi.hoisted(() => {
  const mockWorkType: DentalWorkType = {
    id: "wt-crown-1",
    name: "تاج زيركون فاخر",
    category: "CROWN",
    pricingMode: "PER_UNIT",
    price: 1500,
    costPrice: 400,
    leadTimeDays: 3,
    urgentLeadTimeDays: 1,
    defaultMaterial: "Zirconia 3D Pro",
    materialBrand: "Aidite",
    instructions: "شامفر 0.8 مم",
    defaultWarrantyYears: 5,
    defaultCrownCount: 1,
    sortOrder: 1,
    isActive: true,
  };

  const mockStages = [
    {
      name: "استلام المقاس والصب",
      requiredRole: "RECEPTION_LOGISTICS",
      slaHours: 12,
      stageWage: 20,
      isRequired: true,
      sortOrder: 0,
    },
    {
      name: "التصميم الرقمي CAD",
      requiredRole: "CAD_DESIGNER",
      slaHours: 24,
      stageWage: 50,
      isRequired: true,
      sortOrder: 1,
    },
    {
      name: "الخراطة والتلبين CAM",
      requiredRole: "CERAMIST",
      slaHours: 36,
      stageWage: 80,
      isRequired: true,
      sortOrder: 2,
    },
  ];

  return { mockWorkType, mockStages };
});

// Mock shared API functions
vi.mock("../../shared", () => ({
  fetchWorkTypeStages: vi.fn(async () => JSON.parse(JSON.stringify(mockStages))),
  saveWorkTypeStages: vi.fn(async () => ({ success: true })),
  MODAL_CONTENT_CLS: "bg-white dark:bg-gray-800 rounded-xl p-6",
  MODAL_INPUT_CLS: "w-full border rounded-lg px-3 py-2 text-sm",
  fmtMoney: (v: number) => `${Number(v).toLocaleString("en-US")}`,
}));

describe("DentalWorkTypeStagesModal (Batch 344 Modular Deconstruction)", () => {
  const onClose = vi.fn();
  const onSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = () => {
    return render(
      <DentalWorkTypeStagesModal
        workType={mockWorkType}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  };

  it("1. renders modal header and summary bar with telemetries", async () => {
    renderModal();

    expect(
      screen.getByText("قالب مراحل الإنتاج — تاج زيركون فاخر")
    ).toBeInTheDocument();

    await waitFor(() => {
      // 3 stages
      expect(screen.getByDisplayValue("استلام المقاس والصب")).toBeInTheDocument();
      expect(screen.getByDisplayValue("التصميم الرقمي CAD")).toBeInTheDocument();
      expect(screen.getByDisplayValue("الخراطة والتلبين CAM")).toBeInTheDocument();
    });

    // Summary bar telemetries: 3 stages, 72 hours (3.0 days), 150 EGP wages
    expect(screen.getByTestId("stages-count")).toHaveTextContent("3");
    expect(screen.getByText(/72 ساعة/)).toBeInTheDocument();
    expect(screen.getByText(/150/)).toBeInTheDocument();
  });

  it("2. adds a new stage when clicking the add stage button", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByDisplayValue("استلام المقاس والصب")).toBeInTheDocument();
    });

    const addBtn = screen.getByText("إضافة محطة / مرحلة إنتاجية جديدة");
    fireEvent.click(addBtn);

    // Now there should be 4 stages
    await waitFor(() => {
      expect(screen.getByTestId("stages-count")).toHaveTextContent("4");
    });
  });

  it("3. deletes a stage when clicking its delete button", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByDisplayValue("استلام المقاس والصب")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByLabelText("حذف المرحلة استلام المقاس والصب");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(
        screen.queryByDisplayValue("استلام المقاس والصب")
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("stages-count")).toHaveTextContent("2");
    });
  });

  it("4. resets stages to the 5 canonical presets", async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getByDisplayValue("استلام المقاس والصب")).toBeInTheDocument();
    });

    const resetBtn = screen.getByText("استعادة الـ 5 مراحل المعتمدة");
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByTestId("stages-count")).toHaveTextContent("5");
      expect(screen.getByDisplayValue("الاستلام")).toBeInTheDocument();
      expect(screen.getByDisplayValue("التصميم")).toBeInTheDocument();
      expect(screen.getByDisplayValue("التصنيع")).toBeInTheDocument();
      expect(screen.getByDisplayValue("مراجعة الجودة")).toBeInTheDocument();
      expect(screen.getByDisplayValue("التسليم")).toBeInTheDocument();
    });
  });

  it("5. saves updated stages and calls onSaved and onClose callbacks", async () => {
    const { saveWorkTypeStages } = await import("../../shared");

    renderModal();

    await waitFor(() => {
      expect(screen.getByDisplayValue("استلام المقاس والصب")).toBeInTheDocument();
    });

    const saveBtn = screen.getByText("حفظ قالب المراحل");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveWorkTypeStages).toHaveBeenCalledWith(
        "wt-crown-1",
        expect.arrayContaining([
          expect.objectContaining({ name: "استلام المقاس والصب" }),
          expect.objectContaining({ name: "التصميم الرقمي CAD" }),
          expect.objectContaining({ name: "الخراطة والتلبين CAM" }),
        ])
      );
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
