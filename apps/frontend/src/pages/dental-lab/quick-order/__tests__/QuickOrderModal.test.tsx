// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import QuickOrderModal from "../../QuickOrderModal";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
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
const { mockDoctors, mockWorkTypes, mockTechnicians, mockCreatedCase } = vi.hoisted(() => {
  const mockDoctors = [
    {
      id: "doc-1",
      name: "د. هاني عثمان",
      clinicName: "عيادة الشروق",
      phone: "01012345678",
      outstanding: 1500,
      creditLimit: 5000,
      creditExceeded: false,
      activeCases: 2,
    },
    {
      id: "doc-2",
      name: "د. سامي الجمال",
      clinicName: "مركز النخبة للأسنان",
      phone: "01198765432",
      outstanding: 8500,
      creditLimit: 5000,
      creditExceeded: true,
      activeCases: 4,
    },
  ];

  const mockWorkTypes = [
    {
      id: "wt-1",
      name: "Zirconia Crown",
      category: "CROWN_BRIDGE",
      price: 1200,
      pricingMode: "PER_UNIT",
      leadTimeDays: 3,
      urgentLeadTimeDays: 1,
      isActive: true,
    },
    {
      id: "wt-2",
      name: "Emax Inlay",
      category: "CROWN_BRIDGE",
      price: 900,
      pricingMode: "PER_UNIT",
      leadTimeDays: 2,
      urgentLeadTimeDays: 1,
      isActive: true,
    },
  ];

  const mockTechnicians = [
    {
      id: "tech-1",
      name: "كريم أحمد",
      role: "CAD_DESIGNER",
      isActive: true,
    },
  ];

  const mockCreatedCase = {
    id: "case-new-123",
    caseNumber: "CS-999",
    patientName: "طارق سليم",
    doctorName: "د. هاني عثمان",
    workTypeName: "Zirconia Crown",
    status: "PENDING",
    priceSnapshot: 1200,
    teeth: "11",
  };

  return { mockDoctors, mockWorkTypes, mockTechnicians, mockCreatedCase };
});

// Mock dental-lab shared API methods
vi.mock("../../shared", async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    fetchDoctors: vi.fn().mockResolvedValue(mockDoctors),
    fetchWorkTypes: vi.fn().mockResolvedValue(mockWorkTypes),
    fetchTechnicians: vi.fn().mockResolvedValue(mockTechnicians),
    fetchDoctorPricing: vi.fn().mockResolvedValue([]),
    createCase: vi.fn().mockResolvedValue(mockCreatedCase),
    fetchPanLabelPdf: vi.fn().mockResolvedValue(new Blob(["mock-pdf"], { type: "application/pdf" })),
  };
});

describe("QuickOrderModal (Batch 336 Modular)", () => {
  const onCloseMock = vi.fn();
  const onSavedMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Step 1 with doctor search and doctor cards", async () => {
    render(
      <QuickOrderModal
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />
    );

    expect(screen.getByText("الطلب السريع لأمر الشغل")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/بحث باسم الطبيب/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("د. هاني عثمان")).toBeInTheDocument();
      expect(screen.getByText("د. سامي الجمال")).toBeInTheDocument();
    });
  });

  it("advances to Step 2 when selecting a doctor and clicking Next", async () => {
    render(
      <QuickOrderModal
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("د. هاني عثمان")).toBeInTheDocument();
    });

    // Click on doctor card
    fireEvent.click(screen.getByText("د. هاني عثمان"));

    // Click Next
    const nextBtn = screen.getByText("التالي");
    fireEvent.click(nextBtn);

    // Verify Step 2 elements
    await waitFor(() => {
      expect(screen.getByText(/نوع الشغل والخدمة الأساسية/)).toBeInTheDocument();
      expect(screen.getByText("Zirconia Crown")).toBeInTheDocument();
      expect(screen.getByText(/دليل ألوان الأسنان/)).toBeInTheDocument();
    });
  });

  it("allows selecting a service, tooth shade, and progressing to Step 3", async () => {
    render(
      <QuickOrderModal
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("د. هاني عثمان")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("د. هاني عثمان"));
    fireEvent.click(screen.getByText("التالي"));

    await waitFor(() => {
      expect(screen.getByText("Zirconia Crown")).toBeInTheDocument();
    });

    // Select work type
    fireEvent.click(screen.getByText("Zirconia Crown"));

    // Select shade
    const shadeA2 = screen.getByText("A2");
    fireEvent.click(shadeA2);

    // Click Next to advance to Step 3
    fireEvent.click(screen.getByText("التالي"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("اسم المريض ثلاثي")).toBeInTheDocument();
      expect(screen.getByText(/ملخص أمر الشغل النهائي/)).toBeInTheDocument();
      expect(screen.getByText("حفظ أمر الشغل")).toBeInTheDocument();
    });
  });

  it("submits the order successfully and triggers onSaved callback", async () => {
    render(
      <QuickOrderModal
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("د. هاني عثمان")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("د. هاني عثمان"));
    fireEvent.click(screen.getByText("التالي"));

    await waitFor(() => {
      expect(screen.getByText("Zirconia Crown")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Zirconia Crown"));
    fireEvent.click(screen.getByText("التالي"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("اسم المريض ثلاثي")).toBeInTheDocument();
    });

    // Enter patient name
    fireEvent.change(screen.getByPlaceholderText("اسم المريض ثلاثي"), {
      target: { value: "طارق سليم" },
    });

    // Click Save
    const saveBtn = screen.getByText("حفظ أمر الشغل");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSavedMock).toHaveBeenCalledWith(mockCreatedCase);
    });
  });

  it("preselects doctor if preselectedDoctor prop is provided and starts on Step 2", async () => {
    render(
      <QuickOrderModal
        onClose={onCloseMock}
        onSaved={onSavedMock}
        preselectedDoctor={mockDoctors[0]}
      />
    );

    // Should immediately show Step 2
    await waitFor(() => {
      expect(screen.getByText(/نوع الشغل والخدمة الأساسية/)).toBeInTheDocument();
      expect(screen.getByText("Zirconia Crown")).toBeInTheDocument();
    });
  });
});
