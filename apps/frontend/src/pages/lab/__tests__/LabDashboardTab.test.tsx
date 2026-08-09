import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import LabDashboardTab from "../LabDashboardTab";

jest.mock("../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn((p: string) => `http://localhost/api/v1/${p}`) }));
jest.mock("../../../utils/tokenManager", () => ({
  __esModule: true,
  default: { createAuthHeaders: jest.fn(() => ({ "Content-Type": "application/json" })) },
}));

const jsonResponse = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

beforeEach(() => {
  (global.localStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    key === "user" ? JSON.stringify({ companyId: "123" }) : null,
  );
});

afterEach(() => { jest.clearAllMocks(); cleanup(); });

describe("LabDashboardTab", () => {
  test("builds the orders URL with &limit (not a second ?) after companyId", async () => {
    const fetchMock = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("/lab/orders")) {
        return jsonResponse({ success: true, data: { items: [], total: 3, page: 1, limit: 200 } });
      }
      return jsonResponse({ success: false, error: "not found" });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<LabDashboardTab />);

    await screen.findByText("3");
    expect(screen.getByText("طلبات اليوم")).toBeInTheDocument();

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("companyId=123&limit=200");
    expect(calledUrl).not.toMatch(/companyId=123\?/);
  });
});
