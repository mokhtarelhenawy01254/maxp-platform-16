import React from "react";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkflowPage from "../WorkflowPage";
import { toast } from "sonner";

jest.mock("../../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn((p: string) => `http://localhost/api/v1/${p}`) }));
jest.mock("../../../../utils/tokenManager", () => ({
  __esModule: true, default: { createAuthHeaders: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../WorkflowStatusBadge", () => ({
  __esModule: true,
  default: ({ status }: { status?: string | null }) => <span data-testid="badge">{status || "ΓÇö"}</span>,
}));

const jsonResponse = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

const row = {
  id: "apt-1",
  customerName: "┘à╪«╪¬╪º╪▒",
  customerPhone: "0100",
  serviceName: "┘â╪┤┘ü",
  startTime: "10:00",
  endTime: "10:30",
  duration: 30,
  status: "pending",
  bookingStatus: "UNCONFIRMED",
  reportStatus: "PENDING",
  branchId: "b1",
  appointmentDate: "2026-08-08",
  createdAt: "2026-08-08",
  deliveredWithoutReport: false,
  resultDelivered: false,
};

const doctor = {
  id: "d1", title: "╪».", name: "╪ú╪¡┘à╪»", branchId: "b1", specialty: "╪¿╪º╪╖┘å╪⌐",
  phone: "0100", isActive: true, createdAt: "2024-01-01",
};

afterEach(() => { jest.clearAllMocks(); cleanup(); });

function routeFetch(overrides: { onPut?: () => Promise<Response>; failSecondQueueFetch?: boolean } = {}) {
  let queueCalls = 0;
  const fetchMock = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("/booking/branches")) return jsonResponse({ success: true, data: [] });
    if (u.includes("/booking/doctors")) return jsonResponse({ success: true, data: [doctor] });
    if (u.includes("workflow/queues/reception")) {
      queueCalls += 1;
      if (overrides.failSecondQueueFetch && queueCalls > 1) {
        return jsonResponse({ success: false, error: "┘ü╪┤┘ä ╪¬╪¡┘à┘è┘ä ╪º┘ä╪¿┘è╪º┘å╪º╪¬" });
      }
      return jsonResponse({ success: true, data: [row] });
    }
    if (u.includes("booking-status") && init?.method === "PUT") {
      return overrides.onPut ? overrides.onPut() : jsonResponse({ success: true, data: {} });
    }
    return jsonResponse({ success: false, error: "not found" });
  });
  return fetchMock;
}

describe("WorkflowPage", () => {
  test("double-click on the advance action fires only one status PUT", async () => {
    const user = userEvent.setup();
    let resolvePut!: (v: Response) => void;
    const fetchMock = routeFetch({
      onPut: () => new Promise<Response>((resolve) => { resolvePut = resolve; }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<WorkflowPage />);
    await screen.findByText("┘à╪«╪¬╪º╪▒");

    const advanceBtn = screen.getAllByTitle(/╪º┘ä╪«╪╖┘ê╪⌐ ╪º┘ä╪¬╪º┘ä┘è╪⌐/)[0];
    await user.click(advanceBtn);
    await user.click(advanceBtn);

    const putCalls = fetchMock.mock.calls.filter(
      ([url, init]) => String(url).includes("booking-status") && init?.method === "PUT",
    ).length;
    expect(putCalls).toBe(1);

    resolvePut(jsonResponse({ success: true, data: {} }));
  });

  test("a failed queue refetch after a successful action does not clobber the success toast", async () => {
    const user = userEvent.setup();
    let resolvePut!: (v: Response) => void;
    const fetchMock = routeFetch({
      failSecondQueueFetch: true,
      onPut: () => new Promise<Response>((resolve) => { resolvePut = resolve; }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<WorkflowPage />);
    await screen.findByText("┘à╪«╪¬╪º╪▒");

    await user.click(screen.getAllByTitle(/╪º┘ä╪«╪╖┘ê╪⌐ ╪º┘ä╪¬╪º┘ä┘è╪⌐/)[0]);
    await act(async () => {
      resolvePut(jsonResponse({ success: true, data: {} }));
    });

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("╪¬┘à ╪º┘ä╪º┘å╪¬┘é╪º┘ä"));
    expect(toast.error).not.toHaveBeenCalledWith("┘ü╪┤┘ä ╪¬╪¡┘à┘è┘ä ╪º┘ä╪¿┘è╪º┘å╪º╪¬");
  });
});
