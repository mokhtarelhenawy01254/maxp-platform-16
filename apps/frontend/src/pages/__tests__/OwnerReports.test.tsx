// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OwnerReports from "../owner/OwnerReports";
import { apiClient } from "../../services/apiClient";

vi.mock("../../services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("../../utils/i18n-toast", () => ({
  tToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("OwnerReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          date: "2026-10-26",
          totalPresent: 14,
          totalLate: 3,
          records: [
            {
              id: "rec-1",
              employee: {
                id: "emp-1",
                firstName: "طارق",
                lastName: "عادل",
                email: "tarek@example.com",
                avatar: null,
                employeeNumber: "EMP-101",
              },
              company: {
                id: "comp-1",
                name: "شركة الرواد",
                logo: null,
              },
              checkIn: "2026-10-26T08:00:00.000Z",
              checkOut: null,
              workHours: null,
              lateMinutes: 0,
              status: "PRESENT",
            },
          ],
        },
      },
    });
  });

  it("renders unified reports header and today attendance table", async () => {
    render(
      <MemoryRouter>
        <OwnerReports />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("التقارير الموحدة")).toBeDefined();
      expect(screen.getByText("طارق عادل")).toBeDefined();
      expect(screen.getByText("شركة الرواد")).toBeDefined();
    });
  });
});
