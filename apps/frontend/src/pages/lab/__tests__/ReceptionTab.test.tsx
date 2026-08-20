import React from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReceptionTab from "../ReceptionTab";

jest.mock("../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn((p: string) => `http://localhost/api/v1/${p}`) }));
jest.mock("../../../utils/tokenManager", () => ({
  __esModule: true,
  default: { createAuthHeaders: jest.fn(() => ({ "Content-Type": "application/json" })) },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const jsonResponse = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

const labTest = {
  id: "t1",
  name: "┘ç┘è┘à┘ê╪¼┘ä┘ê╪¿┘è┘å",
  abbreviation: "HGB",
  category: "╪»┘à",
  sampleType: "╪»┘à ┘ê╪▒┘è╪»┘è",
  price: 50,
  isActive: true,
  createdAt: "2026-01-01",
};

beforeEach(() => {
  (global.localStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    key === "user" ? JSON.stringify({ companyId: "123" }) : null,
  );
});

afterEach(() => { jest.clearAllMocks(); cleanup(); });

describe("ReceptionTab", () => {
  test("double-click on create order fires only one POST", async () => {
    const user = userEvent.setup();
    let resolvePost!: (v: Response) => void;
    const fetchMock = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/lab/tests")) {
        return jsonResponse({ success: true, data: [labTest], total: 1, page: 1, limit: 200 });
      }
      if (u.includes("/lab/orders") && init?.method === "POST") {
        return new Promise<Response>((resolve) => { resolvePost = resolve; });
      }
      return jsonResponse({ success: false, error: "not found" });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ReceptionTab />);
    await screen.findByText("┘ç┘è┘à┘ê╪¼┘ä┘ê╪¿┘è┘å");
    await user.click(screen.getByText("┘ç┘è┘à┘ê╪¼┘ä┘ê╪¿┘è┘å"));
    await user.type(screen.getByPlaceholderText("╪º┘ä╪º╪│┘à ╪º┘ä┘â╪º┘à┘ä"), "┘à╪¡┘à╪»");

    const submit = screen.getByRole("button", { name: "╪Ñ┘å╪┤╪º╪í ╪º┘ä╪╖┘ä╪¿" });
    await user.click(submit);
    await user.click(submit);

    const postCalls = fetchMock.mock.calls.filter(
      ([url, init]) => String(url).includes("/lab/orders") && init?.method === "POST",
    ).length;
    expect(postCalls).toBe(1);

    await act(async () => {
      resolvePost(jsonResponse({ success: true, data: { id: "o1", orderNumber: "LAB-1" } }));
    });
  });

  test("fetches the full tests catalog with an explicit limit", async () => {
    const fetchMock = jest.fn(async (url: RequestInfo | URL) => {
      const u = new URL(String(url));
      if (u.pathname.includes("/lab/tests")) {
        expect(u.searchParams.get("limit")).toBe("200");
        return jsonResponse({ success: true, data: [labTest], total: 1, page: 1, limit: 200 });
      }
      return jsonResponse({ success: false, error: "not found" });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<ReceptionTab />);
    expect(await screen.findByText("┘ç┘è┘à┘ê╪¼┘ä┘ê╪¿┘è┘å")).toBeInTheDocument();
  });
});
