// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalMaterialsTab from "../../DentalMaterialsTab";

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

// Hoisted mock data
const { mockMaterials, mockSuppliers, mockSummary } = vi.hoisted(() => {
  const mockMaterials = [
    {
      id: "mat-1",
      name: "Katana Zirconia HTML",
      category: "MILLING_DISC",
      brand: "Kuraray Noritake",
      defaultShade: "A2",
      standardCapacity: 20,
      costPerUnit: 160,
      costPerItem: 3200,
      totalAvailableUnits: 34,
      isLowStock: false,
      stocks: [
        {
          id: "stk-1",
          lotNumber: "LOT-9921",
          shade: "A2",
          initialUnits: 20,
          remainingUnits: 18,
        },
        {
          id: "stk-2",
          lotNumber: "LOT-9922",
          shade: "A3",
          initialUnits: 20,
          remainingUnits: 16,
        },
      ],
    },
    {
      id: "mat-2",
      name: "IPS e.max CAD Block",
      category: "MILLING_BLOCK",
      brand: "Ivoclar",
      defaultShade: "A1",
      standardCapacity: 5,
      costPerUnit: 250,
      costPerItem: 1250,
      totalAvailableUnits: 1,
      isLowStock: true,
      stocks: [
        {
          id: "stk-3",
          lotNumber: "LOT-BLK-01",
          shade: "A1",
          initialUnits: 5,
          remainingUnits: 1,
        },
      ],
    },
  ];

  const mockSuppliers = [
    {
      id: "supp-1",
      name: "شركة دلتا لطب الأسنان",
      contactPerson: "م. أحمد خليل",
      phone: "01012345678",
      city: "القاهرة",
      currentBalance: 0,
    },
  ];

  const mockSummary = {
    totalMaterials: 2,
    totalActiveStocks: 3,
    totalStockUnits: 35,
    lowStockCount: 1,
  };

  return { mockMaterials, mockSuppliers, mockSummary };
});

// Mock shared API methods
vi.mock("../../shared", async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  return {
    ...actual,
    fetchDentalMaterials: vi.fn().mockResolvedValue(mockMaterials),
    fetchDentalSuppliers: vi.fn().mockResolvedValue(mockSuppliers),
    fetchDentalMaterialsSummary: vi.fn().mockResolvedValue(mockSummary),
    createDentalMaterial: vi.fn().mockResolvedValue({ id: "mat-new", name: "خامة جديدة" }),
    recordDentalMaterialStockIn: vi.fn().mockResolvedValue({ ok: true }),
    createDentalSupplier: vi.fn().mockResolvedValue({ id: "supp-new", name: "مورد جديد" }),
  };
});

describe("DentalMaterialsTab (Batch 338 Modular)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders KPI cards with summary data", async () => {
    render(<DentalMaterialsTab />);

    expect(screen.getByText(/خامات المعمل والموردين/)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Katana Zirconia HTML")).toBeInTheDocument();
      expect(screen.getByText("IPS e.max CAD Block")).toBeInTheDocument();
    });

    expect(screen.getByText("أنواع الخامات النشطة")).toBeInTheDocument();
    expect(screen.getByText("أقراص وباتشات قيد العمل")).toBeInTheDocument();
    expect(screen.getByText("إجمالي الوحدات المتاحة للتفريز")).toBeInTheDocument();
    expect(screen.getByText("تنبيهات قرب النفاد")).toBeInTheDocument();
  });

  it("filters materials when switching category tabs", async () => {
    render(<DentalMaterialsTab />);

    await waitFor(() => {
      expect(screen.getByText("Katana Zirconia HTML")).toBeInTheDocument();
      expect(screen.getByText("IPS e.max CAD Block")).toBeInTheDocument();
    });

    // Click on "بلوكات خراطة" tab button
    const blockTab = screen.getByRole("button", { name: /بلوكات خراطة/ });
    fireEvent.click(blockTab);

    await waitFor(() => {
      expect(screen.getByText("IPS e.max CAD Block")).toBeInTheDocument();
      expect(screen.queryByText("Katana Zirconia HTML")).not.toBeInTheDocument();
    });
  });

  it("opens Add Material modal when clicking New Material button", async () => {
    render(<DentalMaterialsTab />);

    await waitFor(() => {
      expect(screen.getByText("Katana Zirconia HTML")).toBeInTheDocument();
    });

    const addBtn = screen.getByText("خامة جديدة");
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText("إضافة خامة معمل جديدة")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Katana Zirconia HTML أو e.max CAD/)).toBeInTheDocument();
    });
  });

  it("opens Stock In modal when clicking توريد قرص جديد on a material card", async () => {
    render(<DentalMaterialsTab />);

    await waitFor(() => {
      expect(screen.getByText("Katana Zirconia HTML")).toBeInTheDocument();
    });

    const stockInBtns = screen.getAllByText("توريد قرص جديد");
    fireEvent.click(stockInBtns[0]);

    await waitFor(() => {
      expect(screen.getByText("توريد قرص / باتش جديد")).toBeInTheDocument();
      expect(screen.getByText(/الخامة: Katana Zirconia HTML/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g. LOT-2026-X198")).toBeInTheDocument();
    });
  });

  it("opens View Suppliers modal when clicking الموردين والشركات button", async () => {
    render(<DentalMaterialsTab />);

    await waitFor(() => {
      expect(screen.getByText("Katana Zirconia HTML")).toBeInTheDocument();
    });

    const viewSuppsBtn = screen.getByText(/الموردين والشركات/);
    fireEvent.click(viewSuppsBtn);

    await waitFor(() => {
      expect(screen.getByText(/الشركات والموردين المعتمدين/)).toBeInTheDocument();
      expect(screen.getByText("شركة دلتا لطب الأسنان")).toBeInTheDocument();
      expect(screen.getByText("القاهرة")).toBeInTheDocument();
    });
  });
});
