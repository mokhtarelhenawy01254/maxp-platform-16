import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import TestsTab from "../TestsTab";

jest.mock("../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn((p: string) => `http://localhost/api/v1/${p}`) }));
jest.mock("../../../utils/tokenManager", () => ({
  __esModule: true,
  default: { createAuthHeaders: jest.fn(() => ({ "Content-Type": "application/json" })) },
}));

const jsonResponse = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

const labTest = {
  id: "t1",
  name: "┘ç┘è┘à┘ê╪¼┘ä┘ê╪¿┘è┘å",
  category: "╪»┘à",
  abbreviation: "HGB",
  sampleType: "╪»┘à ┘ê╪▒┘è╪»┘è",
  price: 50,
  isActive: true,
  parameterCount: 2,
  createdAt: "2026-01-01",
};

beforeEach(() => {
  (global.localStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    key === "user" ? JSON.stringify({ companyId: "123" }) : null,
  );
});

afterEach(() => { jest.clearAllMocks(); cleanup(); });

describe("TestsTab", () => {
  test("renders tests from the paginated list response (GET tests -> {data, total, page, limit})", async () => {
    const fetchMock = jest.fn(async (url: RequestInfo | URL) => {
      const u = new URL(String(url));
      if (u.pathname.includes("/lab/tests")) {
        if (u.searchParams.get("limit") === "200") {
          return jsonResponse({ success: true, data: [labTest], total: 1, page: 1, limit: 200 });
        }
        return jsonResponse({ success: true, data: [labTest], total: 1, page: 1, limit: 50 });
      }
      return jsonResponse({ success: false, error: "not found" });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<TestsTab />);

    expect(await screen.findByText("┘ç┘è┘à┘ê╪¼┘ä┘ê╪¿┘è┘å")).toBeInTheDocument();
    expect(screen.getByText("╪╣╪▒╪╢ 1 ┘à┘å 1 ╪º╪«╪¬╪¿╪º╪▒")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "╪»┘à" })).toBeInTheDocument();
    expect(screen.getByText("50 ╪¼.┘à")).toBeInTheDocument();
  });
});
