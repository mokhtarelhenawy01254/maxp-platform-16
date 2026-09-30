import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RatingSettingsManager from "../RatingSettingsManager";
import { returnService } from "../../../services/returnService";

// Mock returnService
jest.mock("../../../services/returnService", () => ({
  returnService: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    getRatingHealth: jest.fn(),
  },
}));

// Mock i18n-toast
jest.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("RatingSettingsManager - Automated Order Settings & Health Guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (returnService.getSettings as jest.Mock).mockResolvedValue({
      data: {
        excellentThreshold: 90,
        goodThreshold: 75,
        averageThreshold: 50,
        minOrdersForRating: 3,
        autoApproveExcellent: false,
        autoRejectBad: false,
      },
    });

    (returnService.getRatingHealth as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          companyId: "comp-1",
          totalCustomers: 150,
          ratedCustomers: 120,
          unratedCustomers: 30,
          breakdown: {
            EXCELLENT: 45,
            GOOD: 50,
            AVERAGE: 15,
            POOR: 10,
            UNKNOWN: 30,
          },
          rulesVersion: "2026.09.30.v2",
          lastRunAt: "2026-09-30T10:00:00.000Z",
          failureCount: 0,
          status: "HEALTHY",
        },
      },
    });
  });

  it("loads and displays all 4 automated rating threshold fields and live health telemetry report", async () => {
    render(<RatingSettingsManager />);

    expect(screen.getByText("جاري تحميل الإعدادات...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("حدود التقييم الآلي للعملاء")).toBeInTheDocument();
      expect(screen.getByText("تقرير صحة التقييم الآلي للعملاء")).toBeInTheDocument();
    });

    expect(screen.getByText(/ممتاز \(Excellent\)/i)).toBeInTheDocument();
    expect(screen.getByText(/جيد \(Good\)/i)).toBeInTheDocument();
    expect(screen.getByText(/متوسط \(Average\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/الحد الأدنى للطلبات/i).length).toBeGreaterThanOrEqual(1);

    // Verify health metrics displayed
    expect(screen.getByText("150")).toBeInTheDocument(); // total
    expect(screen.getByText("45")).toBeInTheDocument(); // excellent count
    expect(screen.getByText("50")).toBeInTheDocument(); // good count
    expect(screen.getByText("30")).toBeInTheDocument(); // unknown count
    expect(screen.getByText("نظام تلقائي 100%")).toBeInTheDocument();
  });

  it("calls updateSettings with updated thresholds on save without manual buttons", async () => {
    (returnService.updateSettings as jest.Mock).mockResolvedValue({ data: {} });
    render(<RatingSettingsManager />);

    await waitFor(() => {
      expect(screen.getByText("حدود التقييم الآلي للعملاء")).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /حفظ التغييرات/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(returnService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          excellentThreshold: 90,
          goodThreshold: 75,
          averageThreshold: 50,
          minOrdersForRating: 3,
        })
      );
    });
  });

  it("warns and disables saving when thresholds are disordered (e.g. good >= excellent)", async () => {
    (returnService.getSettings as jest.Mock).mockResolvedValue({
      data: {
        excellentThreshold: 80,
        goodThreshold: 85, // Disordered: good > excellent
        averageThreshold: 50,
        minOrdersForRating: 3,
      },
    });

    render(<RatingSettingsManager />);

    await waitFor(() => {
      expect(screen.getByText(/نسبة التقييم الجيد يجب أن تكون أقل/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", { name: /حفظ التغييرات/i });
    expect(saveButton).toBeDisabled();
  });
});
