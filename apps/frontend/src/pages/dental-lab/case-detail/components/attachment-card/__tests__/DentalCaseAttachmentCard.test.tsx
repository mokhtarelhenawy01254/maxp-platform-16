// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import DentalCaseAttachmentCard from "../../DentalCaseAttachmentCard";
import * as shared from "../../../../shared";
import type { DentalCaseAttachment } from "../../../../shared";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "dentalLab.common.confirmDelete": "هل أنت متأكد من الحذف؟",
        "dentalLab.detail.fileDeleted": "تم حذف الملف بنجاح",
        "dentalLab.detail.download": "تحميل",
        "dentalLab.common.delete": "حذف",
      };
      return translations[key] || key;
    },
  }),
}));

// Mock DentalModelViewer
vi.mock("../../../../DentalModelViewer", () => ({
  default: ({ url, ext }: { url: string; ext: string }) => (
    <div data-testid="dental-model-viewer" data-url={url} data-ext={ext}>
      DentalModelViewer Mock
    </div>
  ),
}));

const mockStlAttachment: DentalCaseAttachment = {
  id: "att-1",
  caseId: "case-100",
  fileName: "lower_jaw.stl",
  storedName: "store-lower-jaw-123",
  size: 2 * 1024 * 1024,
  mimeType: "application/octet-stream",
  createdAt: "2026-10-20T10:00:00Z",
};

const mockPdfAttachment: DentalCaseAttachment = {
  id: "att-2",
  caseId: "case-100",
  fileName: "prescription.pdf",
  storedName: "store-prescription-456",
  size: 500 * 1024,
  mimeType: "application/pdf",
  createdAt: "2026-10-20T10:00:00Z",
};

const mockHtmlAttachment: DentalCaseAttachment = {
  id: "att-3",
  caseId: "case-100",
  fileName: "exocad_preview.html",
  storedName: "store-exocad-789",
  size: 1.5 * 1024 * 1024,
  mimeType: "text/html",
  createdAt: "2026-10-20T10:00:00Z",
};

describe("DentalCaseAttachmentCard", () => {
  const onDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockImplementation(() => true);
    vi.spyOn(window, "open").mockImplementation(() => null);

    // Mock createObjectURL & revokeObjectURL
    window.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/dummy-blob");
    window.URL.revokeObjectURL = vi.fn();

    vi.spyOn(shared, "fetchCaseFileBlob").mockResolvedValue(new Blob(["mock-content"]));
    vi.spyOn(shared, "deleteCaseAttachment").mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders 3D attachment (.stl) with 3D badge and opens 3D viewer modal", async () => {
    render(<DentalCaseAttachmentCard attachment={mockStlAttachment} onDeleted={onDeleted} />);

    await waitFor(() => {
      expect(screen.getByText("lower_jaw.stl")).toBeInTheDocument();
    });

    expect(screen.getByText("3D")).toBeInTheDocument();

    // Click 3D Preview button
    const preview3dBtn = screen.getByLabelText("3D Preview");
    fireEvent.click(preview3dBtn);

    expect(screen.getByTestId("dental-model-viewer")).toBeInTheDocument();
    expect(screen.getByText("اسحب لتدوير · عجلة للتقريب · نقرة مزدوجة للإعادة")).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByLabelText("Close");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("dental-model-viewer")).not.toBeInTheDocument();
    });
  });

  it("renders PDF attachment and opens PDF viewer modal", async () => {
    render(<DentalCaseAttachmentCard attachment={mockPdfAttachment} onDeleted={onDeleted} />);

    await waitFor(() => {
      expect(screen.getByText("prescription.pdf")).toBeInTheDocument();
    });

    expect(screen.getByText("PDF")).toBeInTheDocument();

    // Click PDF Preview
    const previewPdfBtn = screen.getByLabelText("PDF Preview");
    fireEvent.click(previewPdfBtn);

    expect(screen.getByText("الروشتة / الوصفة الطبية")).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByLabelText("Close");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("الروشتة / الوصفة الطبية")).not.toBeInTheDocument();
    });
  });

  it("renders HTML attachment and opens HTML viewer modal with iframe", async () => {
    render(<DentalCaseAttachmentCard attachment={mockHtmlAttachment} onDeleted={onDeleted} />);

    await waitFor(() => {
      expect(screen.getByText("exocad_preview.html")).toBeInTheDocument();
    });

    expect(screen.getByText("HTML 3D")).toBeInTheDocument();

    // Click HTML Preview
    const previewHtmlBtn = screen.getByLabelText("HTML Preview");
    fireEvent.click(previewHtmlBtn);

    expect(screen.getByText("فتح في نافذة كاملة")).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByLabelText("Close");
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText("فتح في نافذة كاملة")).not.toBeInTheDocument();
    });
  });

  it("handles delete action after user confirmation", async () => {
    render(<DentalCaseAttachmentCard attachment={mockStlAttachment} onDeleted={onDeleted} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Delete"));

    expect(window.confirm).toHaveBeenCalledWith("هل أنت متأكد من الحذف؟");
    await waitFor(() => {
      expect(shared.deleteCaseAttachment).toHaveBeenCalledWith("case-100", "att-1");
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });
  });
});
