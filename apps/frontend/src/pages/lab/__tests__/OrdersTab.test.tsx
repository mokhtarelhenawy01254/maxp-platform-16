import React from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrdersTab from "../OrdersTab";
import { toast } from "sonner";

jest.mock("../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn((p: string) => `http://localhost/api/v1/${p}`) }));
jest.mock("../../../utils/tokenManager", () => ({
  __esModule: true,
  default: { createAuthHeaders: jest.fn(() => ({ "Content-Type": "application/json" })) },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const jsonResponse = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

const order = {
  id: "o1",
  orderNumber: "LAB-20260808-0001",
  patientName: "مختار",
  patientPhone: "0100",
  status: "PENDING",
  reportStatus: "RESULTS_ENTERED",
  subtotal: 100,
  discount: 0,
  total: 100,
  paid: 50,
  remaining: 50,
  createdAt: "2026-08-08T10:00:00.000Z",
  tests: [],
};

beforeEach(() => {
  (global.localStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    key === "user" ? JSON.stringify({ companyId: "123" }) : null,
  );
});

afterEach(() => { jest.clearAllMocks(); cleanup(); });

function listFetchMock(overrides: { failSecondFetch?: boolean } = {}) {
  let orderGetCount = 0;
  const fetchMock = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/lab/orders") && init?.method === "PUT") {
      return jsonResponse({ success: true, data: {} });
    }
    if (u.includes("/lab/orders")) {
      orderGetCount += 1;
      if (overrides.failSecondFetch && orderGetCount > 1) {
        return jsonResponse({ success: false, error: "فشل تحميل الطلبات" });
      }
      return jsonResponse({ success: true, data: { items: [order], total: 1, page: 1, limit: 50 } });
    }
    return jsonResponse({ success: false, error: "not found" });
  });
  return fetchMock;
}

describe("OrdersTab", () => {
  test("renders rows from GET orders -> {data: {items, total}}", async () => {
    const fetchMock = listFetchMock();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<OrdersTab />);

    expect(await screen.findByText("مختار")).toBeInTheDocument();
    expect(screen.getByText("LAB-20260808-0001")).toBeInTheDocument();
    expect(screen.getByText(/100.00/)).toBeInTheDocument();
  });

  test("double-click on the confirm action fires only one status PUT", async () => {
    const user = userEvent.setup();
    let resolvePut!: (v: Response) => void;
    const fetchMock = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/lab/orders") && init?.method === "PUT") {
        return new Promise<Response>((resolve) => { resolvePut = resolve; });
      }
      if (u.includes("/lab/orders")) {
        return jsonResponse({ success: true, data: { items: [order], total: 1, page: 1, limit: 50 } });
      }
      return jsonResponse({ success: false, error: "not found" });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<OrdersTab />);
    await screen.findByText("مختار");

    await user.click(screen.getByRole("button", { name: "مراجعة" }));
    const confirmBtn = screen.getByRole("button", { name: "تأكيد" });
    await user.click(confirmBtn);
    await user.click(confirmBtn);

    const putCalls = fetchMock.mock.calls.filter(
      ([url, init]) => String(url).includes("/lab/orders") && init?.method === "PUT",
    ).length;
    expect(putCalls).toBe(1);

    await act(async () => {
      resolvePut(jsonResponse({ success: true, data: {} }));
    });
  });

  test("a failed orders refetch after a successful action does not clobber the success toast", async () => {
    const user = userEvent.setup();
    const fetchMock = listFetchMock({ failSecondFetch: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<OrdersTab />);
    await screen.findByText("مختار");

    await user.click(screen.getByRole("button", { name: "مراجعة" }));
    await user.click(screen.getByRole("button", { name: "تأكيد" }));
    await screen.findByText("مختار");

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("تمت مراجعة"));
    expect(toast.error).not.toHaveBeenCalledWith("فشل تحميل الطلبات");
  });

  test("results modal prefills existing results from tests[].test.parameters", async () => {
    const detail = {
      ...order,
      tests: [
        {
          id: "ot1",
          orderId: "o1",
          testId: "t1",
          price: 50,
          status: "PENDING",
          results: [
            { parameterId: "p1", parameterName: "هيموجلوبين", unit: "g/dL", result: "موجب", flag: "normal" },
          ],
          test: {
            id: "t1",
            name: "CBC",
            abbreviation: "CBC",
            category: "دم",
            parameters: [
              {
                id: "p1",
                testId: "t1",
                name: "هيموجلوبين",
                unit: "g/dL",
                referenceRange: "13-17",
                resultOptions: ["سالب", "موجب"],
                showFlag: true,
                sortOrder: 0,
                isActive: true,
              },
            ],
          },
        },
      ],
    };
    const fetchMock = jest.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("/lab/orders/o1")) return jsonResponse({ success: true, data: detail });
      if (u.includes("/lab/orders")) return jsonResponse({ success: true, data: { items: [order], total: 1, page: 1, limit: 50 } });
      return jsonResponse({ success: false, error: "not found" });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<OrdersTab />);
    await screen.findByText("مختار");
    await userEvent.click(screen.getByTitle("إدخال النتائج"));

    expect(await screen.findByDisplayValue("موجب")).toBeInTheDocument();
    expect(screen.getAllByText("هيموجلوبين").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "حفظ النتائج" })).not.toBeDisabled();
  });
});
