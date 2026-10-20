// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalTechBenchTab from "../../DentalTechBenchTab";
import * as shared from "../../../shared";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock DentalModelViewer
vi.mock("../../../DentalModelViewer", () => ({
  default: ({ url, ext }: { url: string; ext: string }) => (
    <div data-testid="mock-dental-model-viewer">
      <span>3D Viewer: {ext}</span>
      <span data-url={url} />
    </div>
  ),
}));

// Mock shared advanceCase and uploadTechAttachment
vi.spyOn(shared, "advanceCase").mockImplementation(async () => ({ success: true } as any));
vi.spyOn(shared, "uploadTechAttachment").mockImplementation(async () => ({ success: true } as any));

const mockCases = [
  {
    id: "case-1",
    caseNumber: "DL-1001",
    patientName: "أحمد علي",
    doctorName: "د. هاني شاكر",
    workTypeName: "Zirconia Crown",
    status: "CASTING",
    activeStageName: "صب النموذج",
    shade: "A2",
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days overdue
    priority: "NORMAL",
    attachments: [
      {
        id: "att-1",
        fileType: "STL",
        fileName: "scan_upper.stl",
        fileUrl: "https://example.com/scan_upper.stl",
      },
    ],
  },
  {
    id: "case-2",
    caseNumber: "DL-1002",
    patientName: "منى سمير",
    doctorName: "د. خالد مرعي",
    workTypeName: "PFM Bridge",
    status: "FINISHING",
    activeStageName: "التلميع النهائي",
    shade: "B1",
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days in future
    priority: "URGENT",
    attachments: [],
  },
  {
    id: "case-3",
    caseNumber: "DL-1003",
    patientName: "محمود حسن",
    doctorName: "د. سامي يوسف",
    workTypeName: "E-max Inlay",
    status: "DESIGN",
    activeStageName: "التصميم الرقمي",
    shade: "A1",
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    priority: "NORMAL",
    attachments: [],
  },
] as any[];

describe("DentalTechBenchTab (Batch 347 Modular Deconstruction)", () => {
  const onReloadMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderBench = (initialFilter: "ALL" | "OVERDUE" | "URGENT" | "SCAN" = "ALL") => {
    return render(
      <BrowserRouter>
        <DentalTechBenchTab
          cases={mockCases}
          onReload={onReloadMock}
          initialFilter={initialFilter}
        />
      </BrowserRouter>
    );
  };

  it("1. renders filter bar with counts, search input, and case cards", () => {
    renderBench();

    expect(screen.getByText(/الكل/)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // 3 total cases
    expect(screen.getByText(/المتأخرة/)).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1); // 1 overdue case
    expect(screen.getByText("المستعجل والطارئ")).toBeInTheDocument();
    expect(screen.getByText("تحتوي ملفات 3D")).toBeInTheDocument();

    // Check rendered case numbers in cards
    expect(screen.getByText("#DL-1001")).toBeInTheDocument();
    expect(screen.getByText("#DL-1002")).toBeInTheDocument();
    expect(screen.getByText("#DL-1003")).toBeInTheDocument();
  });

  it("2. shows overdue banner and filters overdue cases when clicked", () => {
    renderBench();

    // Banner should be visible
    expect(
      screen.getByText(/حالة متأخرة عن موعد التسليم المقرر للعيادة/)
    ).toBeInTheDocument();

    // Click filter overdue
    fireEvent.click(screen.getByText("تصفية المتأخرات فقط"));

    expect(screen.getByText("#DL-1001")).toBeInTheDocument();
    expect(screen.queryByText("#DL-1002")).not.toBeInTheDocument();
    expect(screen.queryByText("#DL-1003")).not.toBeInTheDocument();
  });

  it("3. filters cases by search keyword", () => {
    renderBench();

    const searchInput = screen.getByPlaceholderText("بحث برقم الحالة، الطبيب...");
    fireEvent.change(searchInput, { target: { value: "منى" } });

    expect(screen.getByText("#DL-1002")).toBeInTheDocument();
    expect(screen.queryByText("#DL-1001")).not.toBeInTheDocument();
    expect(screen.queryByText("#DL-1003")).not.toBeInTheDocument();
  });

  it("4. switches view mode to table and renders table rows", () => {
    renderBench();

    const tableModeBtn = screen.getByTitle("عرض الجدول السريع");
    fireEvent.click(tableModeBtn);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("رقم الحالة")).toBeInTheDocument();
    expect(screen.getByText("نوع الشغل")).toBeInTheDocument();
    expect(screen.getByText("المرحلة الحالية")).toBeInTheDocument();
  });

  it("5. toggles timer on a case card", () => {
    renderBench();

    const timerBtn = screen.getAllByTitle("بدء عداد وقت المرحلة")[0];
    fireEvent.click(timerBtn);

    // After click, title changes to pause
    expect(screen.getByTitle("إيقاف مؤقت للوقت")).toBeInTheDocument();
  });

  it("6. advances case stage on button click and calls onReload", async () => {
    renderBench();

    const advanceBtns = screen.getAllByText("إنهاء المرحلة");
    fireEvent.click(advanceBtns[0]);

    await waitFor(() => {
      expect(shared.advanceCase).toHaveBeenCalled();
      expect(onReloadMock).toHaveBeenCalled();
    });
  });

  it("7. opens 3D preview modal when clicking 3D attachment preview button", () => {
    renderBench();

    const preview3DBtn = screen.getByText("معاينة STL");
    fireEvent.click(preview3DBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("mock-dental-model-viewer")).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByLabelText("إغلاق المعاينة"));
    expect(screen.queryByTestId("mock-dental-model-viewer")).not.toBeInTheDocument();
  });

  it("8. opens upload modal and handles cancel", () => {
    renderBench();

    const uploadBtns = screen.getAllByTitle("رفع مخرجات المرحلة أو صور");
    fireEvent.click(uploadBtns[0]);

    expect(screen.getByText("رفع مخرجات المرحلة أو صور توثيق")).toBeInTheDocument();

    // Click cancel
    fireEvent.click(screen.getByText("إلغاء"));
    expect(
      screen.queryByText("رفع مخرجات المرحلة أو صور توثيق")
    ).not.toBeInTheDocument();
  });
});
