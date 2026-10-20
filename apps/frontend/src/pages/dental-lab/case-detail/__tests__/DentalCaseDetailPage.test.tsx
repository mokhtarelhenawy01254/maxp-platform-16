// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalCaseDetailPage from "../../DentalCaseDetailPage";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "case-123" }),
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Mock react-i18next
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    "dentalLab.common.back": "رجوع",
    "dentalLab.common.refresh": "تحديث",
    "dentalLab.detail.workOrder": "أمر الشغل",
    "dentalLab.cases.advance": "نقل المرحلة",
    "dentalLab.detail.info": "بيانات الحالة",
    "dentalLab.detail.timeline": "سجل التغييرات",
    "dentalLab.detail.stages": "مراحل الشغل",
    "dentalLab.detail.team": "فريق العمل",
    "dentalLab.detail.qualityTitle": "فحص الجودة",
    "dentalLab.detail.refabTitle": "إعادة التصنيع",
    "dentalLab.detail.files": "الملفات والمرفقات",
    "dentalLab.detail.invoices": "الفواتير والمدفوعات",
    "dentalLab.cases.patient": "المريض",
    "dentalLab.cases.doctor": "الطبيب",
    "dentalLab.cases.workType": "نوع الشغل",
    "dentalLab.cases.receivedDate": "تاريخ الاستلام",
    "dentalLab.cases.dueDate": "تاريخ التسليم",
    "dentalLab.cases.shade": "اللون",
  };
  return translations[key] || key;
};
const mockTranslation = { t: mockT };

vi.mock("react-i18next", () => ({
  useTranslation: () => mockTranslation,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    promise: vi.fn(),
  },
}));

// Mock DentalModelViewer & OdontogramChart
vi.mock("../../DentalModelViewer", () => ({
  default: () => <div data-testid="mock-dental-model-viewer">3D Viewer Mock</div>,
}));

vi.mock("../../OdontogramChart", () => ({
  default: ({ selectedTeeth }: { selectedTeeth: string[] }) => (
    <div data-testid="mock-odontogram-chart">Odontogram: {selectedTeeth?.join(", ")}</div>
  ),
}));

const mockCase = {
  id: "case-123",
  caseNumber: "DL-2026-0042",
  status: "MANUFACTURING",
  priority: "HIGH",
  doctorId: "doc-1",
  doctorName: "د. هاني شاكر",
  doctor: { id: "doc-1", name: "د. هاني شاكر", clinicName: "عيادة النخبة" },
  patientName: "أحمد عبد الله",
  patientPhone: "01012345678",
  workTypeId: "wt-1",
  workTypeName: "زيركون كامل (Full Zirconia)",
  workType: { id: "wt-1", name: "زيركون كامل (Full Zirconia)" },
  unitsCount: 3,
  unitPrice: 500,
  priceSnapshot: 1500,
  discount: 100,
  receivedDate: "2026-10-10T00:00:00Z",
  dueDate: "2026-10-15T00:00:00Z",
  shade: "A2",
  material: "زيركون",
  materialBrand: "Aidite",
  lotNumber: "LOT-2026-789",
  warrantyYears: 5,
  teeth: "11, 12, 13",
  notes: "يرجى مراعاة تطابق اللون والجماليات",
  isDeleted: false,
  isTryIn: false,
  stages: [
    {
      id: "stage-1",
      name: "تصميم CAD",
      status: "COMPLETED",
      startedAt: "2026-10-10T10:00:00Z",
      completedAt: "2026-10-11T12:00:00Z",
      assigneeName: "م. كمال",
      assignees: [
        {
          id: "asg-1",
          stageId: "stage-1",
          technicianId: "tech-1",
          technicianName: "م. كمال",
          role: "PRIMARY",
          technician: { id: "tech-1", name: "م. كمال" },
        },
      ],
    },
    {
      id: "stage-2",
      name: "تفريز CAM",
      status: "IN_PROGRESS",
      startedAt: "2026-10-11T14:00:00Z",
      assigneeName: "فادي سامي",
      assignees: [],
    },
  ],
  assignments: [
    {
      id: "asg-root-1",
      technicianId: "tech-1",
      role: "CERAMIST",
      assignedAt: "2026-10-10T10:00:00Z",
      technician: { id: "tech-1", name: "م. كمال" },
    },
  ],
  attachments: [
    {
      id: "att-1",
      fileName: "upper_jaw.stl",
      mimeType: "application/sla",
      size: 5242880,
      kind: "SCAN_3D",
      storedName: "mock_stored_name.stl",
    },
  ],
  history: [
    {
      id: "hist-1",
      fromStatus: "RECEIVED",
      toStatus: "DESIGN",
      userName: "أحمد المشرف",
      createdAt: "2026-10-10T10:00:00Z",
    },
  ],
  qualityChecks: [],
  refabrications: [],
  creditNotes: [],
  materialUsages: [
    {
      id: "usage-1",
      materialId: "mat-1",
      unitsUsed: 3,
      lotNumber: "LOT-DISC-001",
      consumedAt: "2026-10-11T14:00:00Z",
      material: { id: "mat-1", name: "قرص زيركون A2", category: "DISC", unit: "وحدة" },
    },
  ],
  invoices: [
    {
      id: "inv-1",
      invoiceNumber: "INV-2026-0042",
      total: 1400,
      paid: 400,
      remaining: 1000,
      paymentStatus: "PARTIAL",
      payments: [
        {
          id: "pay-1",
          amount: 400,
          method: "CASH",
          createdAt: "2026-10-10T12:00:00Z",
        },
      ],
    },
  ],
  customValues: [],
};

// Mock shared
vi.mock("../../shared", async () => {
  const actual = await vi.importActual<any>("../../shared");
  return {
    ...actual,
    fetchCaseDetail: vi.fn(async () => mockCase),
    fetchTechnicians: vi.fn(async () => [
      { id: "tech-1", name: "م. كمال", role: "CERAMIST", isActive: true },
      { id: "tech-2", name: "فادي سامي", role: "CAD_CAM", isActive: true },
    ]),
    fetchDoctors: vi.fn(async () => [
      { id: "doc-1", name: "د. هاني شاكر", clinicName: "عيادة النخبة", isActive: true },
    ]),
    fetchWorkTypes: vi.fn(async () => [
      { id: "wt-1", name: "زيركون كامل (Full Zirconia)", price: 500, isActive: true },
    ]),
    fetchDentalMaterials: vi.fn(async () => []),
    fetchWorkOrderPdf: vi.fn(async () => new Blob(["mock pdf"], { type: "application/pdf" })),
    fetchPanLabelPdf: vi.fn(async () => new Blob(["mock pan"], { type: "application/pdf" })),
    fetchWarrantyCertificatePdf: vi.fn(
      async () => new Blob(["mock cert"], { type: "application/pdf" })
    ),
    fetchCaseFileBlob: vi.fn(async () => new Blob(["stl data"], { type: "application/octet-stream" })),
  };
});

describe("DentalCaseDetailPage Orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders case number, patient name, doctor, and work type correctly", async () => {
    render(<DentalCaseDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("DL-2026-0042")).toBeInTheDocument();
      expect(screen.getByText("أحمد عبد الله")).toBeInTheDocument();
      expect(screen.getByText("د. هاني شاكر")).toBeInTheDocument();
      expect(screen.getByText("زيركون كامل (Full Zirconia)")).toBeInTheDocument();
    });
  });

  it("renders overdue alert banner when case passed due date", async () => {
    render(<DentalCaseDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/تنبيه تأخير/i)).toBeInTheDocument();
      expect(screen.getByText(/تأجيل \+1 يوم/i)).toBeInTheDocument();
    });
  });

  it("renders stages table and material consumption traceability", async () => {
    render(<DentalCaseDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("تصميم CAD")).toBeInTheDocument();
      expect(screen.getByText("تفريز CAM")).toBeInTheDocument();
      expect(screen.getByText("قرص زيركون A2")).toBeInTheDocument();
      expect(screen.getByText("LOT-DISC-001")).toBeInTheDocument();
    });
  });

  it("opens edit case modal when clicking 'تعديل الحالة بالكامل'", async () => {
    render(<DentalCaseDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("تعديل الحالة بالكامل")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("تعديل الحالة بالكامل"));

    await waitFor(() => {
      expect(screen.getByText("بيانات الطبيب والمريض")).toBeInTheDocument();
      expect(screen.getByText("مواصفات الشغل والأسنان")).toBeInTheDocument();
    });
  });

  it("renders invoices and files attachments", async () => {
    render(<DentalCaseDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("INV-2026-0042")).toBeInTheDocument();
      expect(screen.getByText("upper_jaw.stl")).toBeInTheDocument();
    });
  });
});
