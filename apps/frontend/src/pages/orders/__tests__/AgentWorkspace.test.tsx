import React from "react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import AgentWorkspace from "../AgentWorkspace";
import { apiClient } from "../../../services/apiClient";

afterEach(() => {
  cleanup();
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("../../../services/apiClient", () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: "EGP",
    formatPrice: (amount: number) => `EGP ${amount}`,
    isLoading: false,
    error: null,
  }),
}));

let mockCurrentUser = { id: "u1", role: "AGENT" };

vi.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({ user: mockCurrentUser }),
  useOptionalAuth: () => ({ user: mockCurrentUser }),
}));

vi.mock("../../../components/orders/EnhancedOrderModal", () => () => null);

vi.mock("../OrderConfirmationQueue", () => () => null);
vi.mock("../components/SimplifiedProductSelectionModal", () => () => null);

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

type TestOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  city: string;
  total: number;
  status: string;
  callAttempts: number;
  lastCallAt: string | null;
  followUpDate: string | null;
  createdAt: string;
  items: unknown[];
  type?: "GUEST" | "REGULAR";
};

const hoursAgo = (hours: number): string =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const makeOrder = (overrides: Partial<TestOrder> = {}): TestOrder => ({
  id: "o1",
  orderNumber: "ORD-1",
  customerName: "A",
  customerPhone: "01",
  governorate: "",
  city: "",
  total: 100,
  status: "PENDING",
  callAttempts: 0,
  lastCallAt: null,
  followUpDate: null,
  createdAt: hoursAgo(2),
  items: [],
  type: "REGULAR",
  ...overrides,
});

const defaultStats = (count: number) => ({
  total: count,
  pending: count,
  confirmed: 0,
  cancelled: 0,
  followup: 0,
});

const mockOrdersResponse = ({
  orders,
  stats,
  pagination,
}: {
  orders: TestOrder[];
  stats?: unknown;
  pagination?: unknown;
}) => ({
  data: {
    success: true,
    data: orders,
    stats,
    pagination,
  },
});

let mockGet: any;
let mockPost: any;

beforeEach(() => {
  vi.clearAllMocks();
  mockGet = apiClient.get as any;
  mockPost = apiClient.post as any;
  mockGet.mockReset();
  mockPost.mockReset();
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/orders-new/incomplete')) {
      return Promise.resolve({ data: { success: true, data: [] } });
    }
    if (url.includes('/whatsapp/sessions')) {
      return Promise.resolve({ data: { success: true, sessions: [] } });
    }
    return Promise.resolve(
      mockOrdersResponse({
        orders: [],
        stats: defaultStats(0),
        pagination: { total: 0, page: 1, limit: 50, pages: 1 },
      }),
    );
  });
  mockPost.mockResolvedValue({ data: { success: true, data: {} } });
});

const setMockOrdersData = (orders: TestOrder[], stats?: any, pagination?: any) => {
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/orders-new/incomplete')) {
      return Promise.resolve({ data: { success: true, data: [] } });
    }
    if (url.includes('/whatsapp/sessions')) {
      return Promise.resolve({ data: { success: true, sessions: [] } });
    }
    return Promise.resolve(
      mockOrdersResponse({
        orders,
        stats: stats || defaultStats(orders.length),
        pagination: pagination || { total: orders.length, page: 1, limit: 50, pages: 1 },
      }),
    );
  });
};

const renderWorkspace = () =>
  render(
    <MemoryRouter initialEntries={["/orders/workspace?tab=pending"]}>
      <AgentWorkspace />
    </MemoryRouter>,
  );

describe("AgentWorkspace", () => {
  it("does not mark a recent pending order (no calls) as urgent", async () => {
    setMockOrdersData([
      makeOrder({
        id: "o1",
        orderNumber: "ORD-1",
        callAttempts: 0,
        createdAt: hoursAgo(2),
      }),
    ]);

    renderWorkspace();

    await screen.findAllByText(/#?ORD-1/);

    expect(screen.queryByText("orders.urgent")).not.toBeInTheDocument();
  });

  it("marks an old pending order with no calls as urgent", async () => {
    setMockOrdersData([
      makeOrder({
        id: "o2",
        orderNumber: "ORD-2",
        callAttempts: 0,
        createdAt: hoursAgo(30),
      }),
    ]);

    renderWorkspace();

    await screen.findAllByText(/#?ORD-2/);

    expect(screen.getAllByText("orders.urgent").length).toBeGreaterThanOrEqual(1);
  });

  it("marks a pending order whose last call was more than 12h ago as urgent", async () => {
    setMockOrdersData([
      makeOrder({
        id: "o3",
        orderNumber: "ORD-3",
        callAttempts: 1,
        lastCallAt: hoursAgo(20),
        createdAt: hoursAgo(72),
      }),
    ]);

    renderWorkspace();

    await screen.findAllByText(/#?ORD-3/);

    expect(screen.getAllByText("orders.urgent").length).toBeGreaterThanOrEqual(1);
  });

  it("fetches pending orders with status PENDING and sort recent", async () => {
    renderWorkspace();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "/agent-workspace/my-orders",
        expect.objectContaining({
          params: expect.objectContaining({
            status: "PENDING",
            sort: "recent",
          }),
        }),
      );
    });
  });

  it("loads more orders on button click and appends page 2", async () => {
    mockGet.mockImplementation((url: string, config?: any) => {
      if (url.includes("/orders-new/incomplete")) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      const requestedPage = config?.params?.page || 1;
      if (requestedPage === 2) {
        return Promise.resolve(
          mockOrdersResponse({
            orders: [makeOrder({ id: "o2", orderNumber: "ORD-2" })],
            stats: defaultStats(60),
            pagination: { total: 60, page: 2, limit: 50, pages: 2 },
          }),
        );
      }
      return Promise.resolve(
        mockOrdersResponse({
          orders: [makeOrder({ id: "o1", orderNumber: "ORD-1" })],
          stats: defaultStats(60),
          pagination: { total: 60, page: 1, limit: 50, pages: 2 },
        }),
      );
    });

    renderWorkspace();

    const loadMoreButton = await screen.findByText("orders.workspaceLoadMore");
    fireEvent.click(loadMoreButton);

    await screen.findAllByText(/#?ORD-2/);

    expect(screen.getAllByText(/#?ORD-1/).length).toBeGreaterThanOrEqual(1);
    expect(mockGet).toHaveBeenCalledWith(
      "/agent-workspace/my-orders",
      expect.objectContaining({
        params: expect.objectContaining({ page: 2 }),
      }),
    );
  });

  it("sends quick-action confirm and shows a success toast", async () => {
    setMockOrdersData([makeOrder({ id: "o1", orderNumber: "ORD-1" })]);

    renderWorkspace();

    const confirmButtons = await screen.findAllByText("orders.confirmOrder");
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/agent-workspace/orders/o1/quick-action",
        expect.objectContaining({
          action: "confirm",
          notes: "orders.confirmNote",
        }),
      );
    });

    expect(toast.success).toHaveBeenCalled();
  });

  it("shows an info toast when quick action returns a pending workflow", async () => {
    setMockOrdersData([makeOrder({ id: "o1", orderNumber: "ORD-1" })]);
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { workflowStatus: "pending", requestId: "r1" },
      },
    });

    renderWorkspace();

    const confirmButtons = await screen.findAllByText("orders.confirmOrder");
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalled();
    });

    expect(toast.success).not.toHaveBeenCalled();
  });

  it("opens a cancel-reason modal without window.prompt and submits cancel action", async () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);

    setMockOrdersData([makeOrder({ id: "o1", orderNumber: "ORD-1" })]);

    renderWorkspace();

    const cancelButtons = await screen.findAllByText("orders.cancelOrder");
    fireEvent.click(cancelButtons[0]);

    expect(screen.getByText("orders.cancelReasonTitle")).toBeInTheDocument();
    expect(promptSpy).not.toHaveBeenCalled();

    const reasonInput = screen.getByPlaceholderText(
      "orders.cancelReasonPlaceholder",
    );
    fireEvent.change(reasonInput, {
      target: { value: "customer changed mind" },
    });

    fireEvent.click(screen.getByText("orders.cancelConfirm"));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/agent-workspace/orders/o1/quick-action",
        expect.objectContaining({ action: "cancel" }),
      );
    });
  });

  it("removes order instantly from queue when quick-action confirm succeeds", async () => {
    let orderConfirmed = false;
    mockPost.mockImplementation((url: string) => {
      if (url.includes("/quick-action")) {
        orderConfirmed = true;
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/orders-new/incomplete")) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.includes("/whatsapp/sessions")) {
        return Promise.resolve({ data: { success: true, sessions: [] } });
      }
      if (orderConfirmed) {
        return Promise.resolve(
          mockOrdersResponse({
            orders: [makeOrder({ id: "o2", orderNumber: "ORD-2" })],
            stats: defaultStats(1),
            pagination: { total: 1, page: 1, limit: 50, pages: 1 },
          }),
        );
      }
      return Promise.resolve(
        mockOrdersResponse({
          orders: [
            makeOrder({ id: "o1", orderNumber: "ORD-1" }),
            makeOrder({ id: "o2", orderNumber: "ORD-2" }),
          ],
          stats: defaultStats(2),
          pagination: { total: 2, page: 1, limit: 50, pages: 1 },
        }),
      );
    });

    renderWorkspace();

    await screen.findAllByText(/#?ORD-1/);
    expect(screen.getAllByText(/#?ORD-2/).length).toBeGreaterThanOrEqual(1);

    const confirmButtons = await screen.findAllByText("orders.confirmOrder");
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/agent-workspace/orders/o1/quick-action",
        expect.objectContaining({ action: "confirm" }),
      );
    });

    // o1 should disappear and advance to o2
    await waitFor(() => {
      expect(screen.queryAllByText("#ORD-1").length).toBe(0);
      expect(screen.getAllByText("#ORD-2").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders SupervisorDispatchStrip when user is a manager", async () => {
    mockCurrentUser = { id: "m1", role: "MANAGER" };

    mockGet.mockImplementation((url: string) => {
      if (url.includes("/orders-new/incomplete")) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.includes("/whatsapp/sessions")) {
        return Promise.resolve({ data: { success: true, sessions: [] } });
      }
      if (url === "/agent-workspace/team-workload") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              unassignedCount: 15,
              agents: [
                {
                  id: "ag-1",
                  name: "Ahmed CS",
                  pendingCount: 10,
                  todayConfirmedCount: 20,
                  availability: "online",
                },
              ],
            },
          },
        });
      }
      return Promise.resolve(
        mockOrdersResponse({
          orders: [makeOrder({ id: "o1", orderNumber: "ORD-1" })],
          stats: defaultStats(1),
          pagination: { total: 1, page: 1, limit: 50, pages: 1 },
        }),
      );
    });

    renderWorkspace();

    // Team strip collapsed by default: agent names hidden until expanded
    // (test i18n mock uses language "en" → English labels)
    const teamToggle = await screen.findByText(/Team \(1\)/);
    expect(screen.queryByText("Ahmed CS")).not.toBeInTheDocument();

    // Expanding reveals the workload chips
    fireEvent.click(teamToggle);
    expect(await screen.findByText("Ahmed CS")).toBeInTheDocument();
    expect(screen.getByText("(15)")).toBeInTheDocument();
  });

  it("fetches abandoned carts and merges them into pending queue", async () => {
    mockCurrentUser = { id: "u1", role: "AGENT" };
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/orders-new/incomplete")) {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                cartId: "cart-999",
                total: 250,
                abandonReason: "توقف عند صفحة الشحن",
                checkoutStartedAt: new Date().toISOString(),
                checkoutData: {
                  guestName: "سارة أحمد",
                  customerPhone: "01099887766",
                  governorate: "القاهرة",
                },
                items: [
                  {
                    name: "فستان سهرة",
                    quantity: 1,
                    price: 250,
                  },
                ],
              },
            ],
            pagination: { total: 1, page: 1, limit: 50, pages: 1 },
          },
        });
      }
      if (url.includes("/whatsapp/sessions")) {
        return Promise.resolve({ data: { success: true, sessions: [] } });
      }
      return Promise.resolve(
        mockOrdersResponse({
          orders: [makeOrder({ id: "o1", orderNumber: "ORD-1", customerName: "محمود حسن" })],
          stats: { ...defaultStats(1), incomplete: 1 },
          pagination: { total: 1, page: 1, limit: 50, pages: 1 },
        }),
      );
    });

    render(
      <MemoryRouter initialEntries={["/orders/workspace?tab=pending"]}>
        <AgentWorkspace />
      </MemoryRouter>,
    );

    // Verify both normal pending order and incomplete cart are loaded in pending queue
    const normalNames = await screen.findAllByText("محمود حسن");
    expect(normalNames.length).toBeGreaterThanOrEqual(1);
    const nameElements = await screen.findAllByText("سارة أحمد");
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("button", { name: /اعتماد وتأكيد الطلب|Confirm Order|confirmOrder/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders live edit items button in inspector", async () => {
    mockCurrentUser = { id: "u1", role: "AGENT" };
    setMockOrdersData([
      makeOrder({
        id: "o1",
        orderNumber: "ORD-1",
        items: [{ productName: "قميص كلاسيك", quantity: 2, price: 150, total: 300 }],
      }),
    ]);

    renderWorkspace();

    await screen.findAllByText(/#?ORD-1/);
    // Verify edit items button is present
    const editBtns = screen.getAllByRole("button", { name: /Edit Items|تعديل البنود/i });
    expect(editBtns.length).toBeGreaterThanOrEqual(1);

    // Clicking edit button reveals live item editor
    fireEvent.click(editBtns[0]);
    expect(screen.getByText(/Edit Order Items|تعديل بنود وعروض الطلب/i)).toBeInTheDocument();
  });

  it("renders the 5 quick filter tabs and switches filters on click", async () => {
    setMockOrdersData([makeOrder({ id: "o1", orderNumber: "ORD-1" })]);
    renderWorkspace();

    // Verify all 5 quick tabs exist
    const allTab = screen.getByRole("tab", { name: /All Orders|كل الطلبات/i });
    const todayTab = screen.getByRole("tab", { name: /Today|اليوم/i });
    const pendingTab = screen.getByRole("tab", { name: /Pending|قيد الانتظار/i });
    const processingTab = screen.getByRole("tab", { name: /In Progress|قيد التنفيذ/i });
    const cancelledTab = screen.getByRole("tab", { name: /Cancelled|ملغي/i });

    expect(allTab).toBeInTheDocument();
    expect(todayTab).toBeInTheDocument();
    expect(pendingTab).toBeInTheDocument();
    expect(processingTab).toBeInTheDocument();
    expect(cancelledTab).toBeInTheDocument();

    // Clicking Today triggers fetch with todayOnly: "true"
    fireEvent.click(todayTab);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "/agent-workspace/my-orders",
        expect.objectContaining({
          params: expect.objectContaining({
            todayOnly: "true",
          }),
        }),
      );
    });

    // Clicking In Progress triggers fetch with status: "PROCESSING" and todayOnly: "true"
    fireEvent.click(processingTab);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "/agent-workspace/my-orders",
        expect.objectContaining({
          params: expect.objectContaining({
            status: "PROCESSING",
            todayOnly: "true",
          }),
        }),
      );
    });

    // Clicking Cancelled triggers fetch with status: "CANCELLED" and todayOnly: "true"
    fireEvent.click(cancelledTab);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "/agent-workspace/my-orders",
        expect.objectContaining({
          params: expect.objectContaining({
            status: "CANCELLED",
            todayOnly: "true",
          }),
        }),
      );
    });
  });

  it("renders live count badges in each quick tab from stats payload", async () => {
    setMockOrdersData(
      [makeOrder({ id: "1", status: "PENDING", orderNumber: "ORD-1" })],
      {
        total: 42,
        all: 42,
        today: 7,
        pending: 15,
        processing: 12,
        cancelled: 8,
        confirmed: 0,
        followup: 0,
      },
      { total: 42, page: 1, limit: 50, pages: 1 },
    );

    render(
      <MemoryRouter initialEntries={["/orders/workspace"]}>
        <AgentWorkspace />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    // Check count numbers are visible inside the tabs
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });
});

