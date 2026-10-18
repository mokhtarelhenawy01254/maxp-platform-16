import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BulkStatusUpdatePage } from "./BulkStatusUpdatePage";
import bulkStatusUpdateService from "../../services/bulkStatusUpdateService";

jest.mock("../../i18n", () => ({
  getDirection: () => "rtl",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, defaultValue?: string) => defaultValue || k,
    i18n: { language: "ar" },
  }),
}));

jest.mock("../../services/bulkStatusUpdateService", () => ({
  __esModule: true,
  default: {
    downloadTemplate: jest.fn().mockResolvedValue(true),
    uploadFile: jest.fn().mockResolvedValue({
      data: {
        summary: { total: 10, success: 9, failed: 1 },
        results: [
          { orderNumber: "1001", status: "DELIVERED", success: true },
          { orderNumber: "1002", status: "CANCELLED", success: false, error: "Order not found" },
        ],
      },
    }),
  },
}));

describe("BulkStatusUpdatePage Suite", () => {
  it("renders bulk status header and action steps", () => {
    render(<BulkStatusUpdatePage />);

    expect(screen.getByText("تحديث حالات الطلبات جماعياً")).toBeInTheDocument();
    expect(screen.getByText("تحميل قالب الإكسيل")).toBeInTheDocument();
    expect(screen.getByText("رفع ومعالجة الملف")).toBeInTheDocument();
  });

  it("handles template download click", () => {
    render(<BulkStatusUpdatePage />);

    const downloadButtons = screen.getAllByText(/تحميل القالب/i);
    fireEvent.click(downloadButtons[0]);

    expect(bulkStatusUpdateService.downloadTemplate).toHaveBeenCalledTimes(1);
  });
});
