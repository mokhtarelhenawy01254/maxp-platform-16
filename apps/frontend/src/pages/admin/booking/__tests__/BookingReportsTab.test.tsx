import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import BookingReportsTab from "../BookingReportsTab";

jest.mock("../../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn((p: string) => `http://localhost/api/v1/${p}`) }));
jest.mock("../../../../utils/tokenManager", () => ({
  __esModule: true, default: { createAuthHeaders: jest.fn(() => ({ "Content-Type": "application/json" })) },
}));

const jsonResponse = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

const revenueData = {
  dateFrom: "2026-08-01",
  dateTo: "2026-08-08",
  totals: { billed: 100, discounts: 5, collected: 60, outstanding: 35, invoiceCount: 2 },
  byDoctor: [],
  byService: [],
};

afterEach(() => { jest.clearAllMocks(); cleanup(); });

describe("BookingReportsTab", () => {
  test("fetches branches/doctors exactly once and renders the revenue report", async () => {
    const fetchMock = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("/booking/branches")) return jsonResponse({ success: true, data: [] });
      if (u.includes("/booking/doctors")) return jsonResponse({ success: true, data: [] });
      if (u.includes("/booking/reports/revenue")) return jsonResponse({ success: true, data: revenueData });
      return jsonResponse({ success: false, error: "not found" });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<BookingReportsTab />);

    await screen.findByText("إجمالي الفواتير");
    await new Promise((r) => setTimeout(r, 150));

    const branchesCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/booking/branches")).length;
    const doctorsCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/booking/doctors")).length;
    expect(branchesCalls).toBe(1);
    expect(doctorsCalls).toBe(1);
  });

  test("renders empty state when a report returns empty rows", async () => {
    const fetchMock = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("/booking/branches")) return jsonResponse({ success: true, data: [] });
      if (u.includes("/booking/doctors")) return jsonResponse({ success: true, data: [] });
      if (u.includes("/booking/reports/revenue")) return jsonResponse({ success: true, data: revenueData });
      return jsonResponse({ success: false, error: "not found" });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<BookingReportsTab />);

    await screen.findByText("إجمالي الفواتير");
    expect(screen.getByText("100.00")).toBeInTheDocument();
    expect(screen.getAllByText("لا توجد بيانات").length).toBeGreaterThan(0);
  });
});
