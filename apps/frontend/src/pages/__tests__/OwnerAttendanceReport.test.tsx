// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import OwnerAttendanceReport from "../owner/OwnerAttendanceReport";
import { apiClient } from "../../services/apiClient";

vi.mock("../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

vi.mock("../../utils/i18n-toast", () => ({
  tToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("OwnerAttendanceReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          dateRange: { start: "2026-10-01", end: "2026-10-26" },
          overview: {
            totalCompanies: 2,
            totalEmployees: 15,
            totalPresent: 12,
            totalLate: 2,
            totalAbsent: 1,
            totalOnLeave: 0,
          },
          byEmployee: [
            {
              user: {
                id: "u1",
                firstName: "كريم",
                lastName: "محمود",
                email: "karim@example.com",
                avatar: null,
              },
              company: {
                id: "c1",
                name: "شركة النور",
                logo: null,
              },
              stats: {
                present: 18,
                late: 2,
                absent: 0,
                onLeave: 0,
                totalRecords: 20,
              },
            },
          ],
        },
      },
    });
  });

  it("renders attendance overview and employee cards", async () => {
    render(<OwnerAttendanceReport />);

    await waitFor(() => {
      expect(screen.getByText("تقرير حضور الموظفين")).toBeDefined();
      expect(screen.getByText("كريم محمود")).toBeDefined();
      expect(screen.getAllByText("شركة النور").length).toBeGreaterThan(0);
    });
  });
});
