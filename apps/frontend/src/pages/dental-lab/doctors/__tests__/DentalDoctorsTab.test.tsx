// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import DentalDoctorsTab from "../../DentalDoctorsTab";

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
const { mockDoctorsResponse, mockWorkTypes, mockPricing } = vi.hoisted(() => {
  const mockDoctorsResponse = {
    items: [
      {
        id: "doc-1",
        name: "د. هاني شاكر",
        phone: "01012345678",
        clinicName: "عيادات النخبة لطب الأسنان",
        governorate: "القاهرة",
        portalPin: "1234",
        creditLimit: 20000,
        totalBilled: 45000,
        totalPaid: 35000,
        outstanding: 10000,
        activeCases: 4,
        overdueCases: 1,
        creditExceeded: false,
        isActive: true,
        doctors: [
          {
            id: "sub-1",
            name: "د. سارة عادل",
            specialty: "تركيبات",
            phone: "01122334455",
          },
        ],
      },
      {
        id: "doc-2",
        name: "د. حازم إمام",
        phone: "01234567890",
        clinicName: "مركز وايت دينتال",
        governorate: "الجيزة",
        portalPin: "5678",
        creditLimit: 5000,
        totalBilled: 15000,
        totalPaid: 8000,
        outstanding: 7000,
        activeCases: 2,
        overdueCases: 0,
        creditExceeded: true,
        isActive: false,
        doctors: [],
      },
    ],
    activeCount: 1,
    archivedCount: 1,
    summary: {
      totalBilled: 60000,
      totalPaid: 43000,
      totalOutstanding: 17000,
    },
  };

  const mockWorkTypes = [
    { id: "wt-1", name: "Zirconia Multi-Layer", price: 1200, isActive: true },
    { id: "wt-2", name: "Emax Crown", price: 900, isActive: true },
  ];

  const mockPricing = {
    "wt-1": 1100,
  };

  return { mockDoctorsResponse, mockWorkTypes, mockPricing };
});

// Mock shared API methods
vi.mock("../../shared", () => ({
  fetchDoctorsFull: vi.fn(async () => mockDoctorsResponse),
  fetchWorkTypes: vi.fn(async () => mockWorkTypes),
  fetchDoctorPricing: vi.fn(async () => mockPricing),
  saveDoctorPricing: vi.fn(async () => ({ success: true })),
  recordDoctorBulkPayment: vi.fn(async (_id, payload) => ({
    totalPaid: payload.amount,
    allocations: [{ invoiceId: "inv-1", amount: payload.amount }],
  })),
  createDoctor: vi.fn(async () => ({ id: "doc-new", name: "د. جديد" })),
  updateDoctor: vi.fn(async () => ({ id: "doc-1", name: "د. هاني شاكر" })),
  deleteDoctor: vi.fn(async () => ({ message: "تم الحذف بنجاح" })),
  restoreDoctor: vi.fn(async () => ({ message: "تمت الاستعادة بنجاح" })),
  permanentDeleteDoctor: vi.fn(async () => ({ message: "تم الحذف النهائي" })),
  MODAL_CONTENT_CLS: "bg-white dark:bg-gray-800 rounded-xl p-6",
  MODAL_INPUT_CLS: "w-full border rounded-lg px-3 py-2 text-sm",
  fmtMoney: (v: number) => `${Number(v).toLocaleString("en-US")} ج.م`,
}));

describe("DentalDoctorsTab (Batch 340 Modular Deconstruction)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders page header, action buttons, and summary cards", async () => {
    render(
      <MemoryRouter>
        <DentalDoctorsTab />
      </MemoryRouter>
    );

    expect(screen.getAllByText("dentalLab.doctors.title").length).toBeGreaterThan(0);
    expect(screen.getByText("dentalLab.doctors.newDoctor")).toBeInTheDocument();
    expect(screen.getByText("dentalLab.common.refresh")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("dentalLab.doctors.ledger.totalOutstanding")
      ).toBeInTheDocument();
      expect(
        screen.getByText("dentalLab.doctors.ledger.totalBilled")
      ).toBeInTheDocument();
      expect(
        screen.getByText("dentalLab.doctors.ledger.overCredit")
      ).toBeInTheDocument();
      expect(screen.getByText(/17,000/)).toBeInTheDocument();
      expect(screen.getByText(/60,000/)).toBeInTheDocument();
    });
  });

  it("renders doctors table and displays doctor information and clinic doctors badge", async () => {
    render(
      <MemoryRouter>
        <DentalDoctorsTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("د. هاني شاكر")).toBeInTheDocument();
      expect(screen.getByText("عيادات النخبة لطب الأسنان")).toBeInTheDocument();
      expect(screen.getByText("1 أطباء بالعيادة")).toBeInTheDocument();
      expect(screen.getByText("القاهرة")).toBeInTheDocument();
      expect(screen.getByText("01012345678")).toBeInTheDocument();
    });
  });

  it("allows switching between active and archived views", async () => {
    render(
      <MemoryRouter>
        <DentalDoctorsTab />
      </MemoryRouter>
    );

    const archivedBtn = screen.getByText("الأطباء المؤرشفين");
    fireEvent.click(archivedBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "الأطباء المؤرشفين محتفظ بسجلاتهم المالية السابقة ولا يمكن تعيين حالات جديدة لهم."
        )
      ).toBeInTheDocument();
    });

    const activeBtn = screen.getByText("الأطباء النشطين");
    fireEvent.click(activeBtn);

    await waitFor(() => {
      expect(
        screen.queryByText(
          "الأطباء المؤرشفين محتفظ بسجلاتهم المالية السابقة ولا يمكن تعيين حالات جديدة لهم."
        )
      ).not.toBeInTheDocument();
    });
  });

  it("opens create doctor modal when clicking new doctor button", async () => {
    render(
      <MemoryRouter>
        <DentalDoctorsTab />
      </MemoryRouter>
    );

    const newBtn = screen.getByText("dentalLab.doctors.newDoctor");
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByText("dentalLab.doctors.createTitle")).toBeInTheDocument();
      expect(
        screen.getByText("أطباء العيادة / الفريق الطبي التابع للعيادة")
      ).toBeInTheDocument();
    });

    const cancelBtn = screen.getByText("dentalLab.common.cancel");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(
        screen.queryByText("dentalLab.doctors.createTitle")
      ).not.toBeInTheDocument();
    });
  });

  it("opens custom pricing modal when clicking pricing button", async () => {
    render(
      <MemoryRouter>
        <DentalDoctorsTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("د. هاني شاكر")).toBeInTheDocument();
    });

    const pricingBtns = screen.getAllByTitle("dentalLab.doctors.pricing.title");
    fireEvent.click(pricingBtns[0]);

    await waitFor(() => {
      expect(
        screen.getByText("dentalLab.doctors.pricing.title")
      ).toBeInTheDocument();
      expect(screen.getByText("Zirconia Multi-Layer")).toBeInTheDocument();
      expect(screen.getByText("Emax Crown")).toBeInTheDocument();
    });
  });

  it("opens bulk payment modal when clicking bulk payment button", async () => {
    render(
      <MemoryRouter>
        <DentalDoctorsTab />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("د. هاني شاكر")).toBeInTheDocument();
    });

    const bulkBtns = screen.getAllByTitle("تحصيل دفعة على الحساب");
    fireEvent.click(bulkBtns[0]);

    await waitFor(() => {
      expect(screen.getByText("تحصيل دفعة على الحساب")).toBeInTheDocument();
      expect(
        screen.getByText(
          "سيتم توزيع المبلغ تلقائياً على الفواتير المفتوحة والأقدم أولاً (FIFO)."
        )
      ).toBeInTheDocument();
      expect(screen.getByText("تسجيل الدفعة وتوزيعها")).toBeInTheDocument();
    });
  });
});
