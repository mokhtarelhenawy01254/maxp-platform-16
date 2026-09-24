import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RatingSettingsManager from "../RatingSettingsManager";
import { returnService } from "../../../services/returnService";

// Mock returnService
jest.mock("../../../services/returnService", () => ({
  returnService: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

// Mock i18n-toast
jest.mock("../../../utils/i18n-toast", () => ({
  tToast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("RatingSettingsManager - Automated Order Settings Guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (returnService.getSettings as jest.Mock).mockResolvedValue({
      data: {
        excellentThreshold: 90,
        goodThreshold: 70,
        averageThreshold: 50,
        minOrdersForRating: 3,
        autoApproveExcellent: false,
        autoRejectBad: false,
      },
    });
  });

  it("loads and displays all 4 automated rating threshold fields including minOrdersForRating", async () => {
    render(<RatingSettingsManager />);

    // Initially loading
    expect(screen.getByText("جاري تحميل الإعدادات...")).toBeInTheDocument();

    // After loading
    await waitFor(() => {
      expect(screen.getByText("حدود التقييم الآلي للعملاء")).toBeInTheDocument();
    });

    expect(screen.getByText(/ممتاز \(Excellent\)/i)).toBeInTheDocument();
    expect(screen.getByText(/جيد \(Good\)/i)).toBeInTheDocument();
    expect(screen.getByText(/متوسط \(Average\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/الحد الأدنى للطلبات/i).length).toBeGreaterThanOrEqual(1);

    // Explanation list
    expect(screen.getByText(/آلية التقييم التلقائي في النظام/i)).toBeInTheDocument();
    expect(screen.getByText("تلقائي 100%")).toBeInTheDocument();
  });

  it("calls updateSettings with updated minOrdersForRating and thresholds on save", async () => {
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
          goodThreshold: 70,
          averageThreshold: 50,
          minOrdersForRating: 3,
        })
      );
    });
  });
});
