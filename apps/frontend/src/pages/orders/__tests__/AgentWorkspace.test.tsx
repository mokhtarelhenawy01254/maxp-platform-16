import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import AgentWorkspace from "../AgentWorkspace";
import { apiClient } from "../../../services/apiClient";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("../../../hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: "EGP",
    formatPrice: (amount: number) => `EGP ${amount}`,
    isLoading: false,
    error: null,
  }),
}));

let mockCurrentUser = { id: "u1", role: "AGENT" };

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({ user: mockCurrentUser }),
  useOptionalAuth: () => ({ user: mockCurrentUser }),
}));

jest.mock("../../../components/orders/EnhancedOrderModal", () => () => null);

jest.mock("../OrderConfirmationQueue", () => () => null);
jest.mock("../components/SimplifiedProductSelectionModal", () => () => null);

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
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

let mockGet: jest.Mock;
let mockPost: jest.Mock;

beforeEach(() => {
  mockGet = apiClient.get as jest.Mock;
  mockPost = apiClient.post as jest.Mock;
  mockGet.mockReset();
  mockPost.mockReset();
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/orders-new/incomplete')) {
      return Promise.resolve({ data: { success: true, data: [] } });
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

const renderWorkspace = () =>
  render(
    <MemoryRouter initialEntries={["/orders/workspace?tab=pending"]}>
      <AgentWorkspace />
    </MemoryRouter>,
  );

describe("AgentWorkspace", () => {
  it("does not mark a recent pending order (no calls) as urgent", async () => {
    mockGet.mockResolvedValue(
      mockOrdersResponse({
        orders: [
          makeOrder({
            id: "o1",
            orderNumber: "ORD-1",
            callAttempts: 0,
            createdAt: hoursAgo(2),
          }),
        ],
        stats: defaultStats(1),
        pagination: { total: 1, page: 1, limit: 50, pages: 1 },
      }),
    );

    renderWorkspace();

    await screen.findByText("#ORD-1");

    expect(screen.queryByText("orders.urgent")).not.toBeInTheDocument();
  });

  it("marks an old pending order with no calls as urgent", async () => {
    mockGet.mockResolvedValue(
      mockOrdersResponse({
        orders: [
          makeOrder({
            id: "o2",
            orderNumber: "ORD-2",
            callAttempts: 0,
            createdAt: hoursAgo(30),
          }),
        ],
        stats: defaultStats(1),
        pagination: { total: 1, page: 1, limit: 50, pages: 1 },
      }),
    );

    renderWorkspace();

    await screen.findByText("#ORD-2");

    expect(screen.getByText("orders.urgent")).toBeInTheDocument();
  });

  it("marks a pending order whose last call was more than 12h ago as urgent", async () => {
    mockGet.mockResolvedValue(
      mockOrdersResponse({
        orders: [
          makeOrder({
            id: "o3",
            orderNumber: "ORD-3",
            callAttempts: 1,
            lastCallAt: hoursAgo(20),
            createdAt: hoursAgo(72),
          }),
        ],
        stats: defaultStats(1),
        pagination: { total: 1, page: 1, limit: 50, pages: 1 },
      }),
    );

    renderWorkspace();

    await screen.findByText("#ORD-3");

    expect(screen.getByText("orders.urgent")).toBeInTheDocument();
  });

  it("fetches pending orders with status PENDING and sort oldest", async () => {
    renderWorkspace();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "/agent-workspace/my-orders",
        expect.objectContaining({
          params: expect.objectContaining({
            status: "PENDING",
            sort: "oldest",
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

    await screen.findByText("#ORD-2");

    expect(screen.getByText("#ORD-1")).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith(
      "/agent-workspace/my-orders",
      expect.objectContaining({
        params: expect.objectContaining({ page: 2 }),
      }),
    );
  });

  it("sends quick-action confirm and shows a success toast", async () => {
    mockGet.mockResolvedValue(
      mockOrdersResponse({
        orders: [makeOrder({ id: "o1", orderNumber: "ORD-1" })],
        stats: defaultStats(1),
        pagination: { total: 1, page: 1, limit: 50, pages: 1 },
      }),
    );

    renderWorkspace();

    const confirmButton = await screen.findByText("orders.confirmOrder");
    fireEvent.click(confirmButton);

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
    mockGet.mockResolvedValue(
      mockOrdersResponse({
        orders: [makeOrder({ id: "o1", orderNumber: "ORD-1" })],
        stats: defaultStats(1),
        pagination: { total: 1, page: 1, limit: 50, pages: 1 },
      }),
    );
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: { workflowStatus: "pending", requestId: "r1" },
      },
    });

    renderWorkspace();

    const confirmButton = await screen.findByText("orders.confirmOrder");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalled();
    });

    expect(toast.success).not.toHaveBeenCalled();
  });

  it("opens a cancel-reason modal without window.prompt and submits cancel action", async () => {
    const promptSpy = jest.spyOn(window, "prompt").mockReturnValue(null);

    mockGet.mockResolvedValue(
      mockOrdersResponse({
        orders: [makeOrder({ id: "o1", orderNumber: "ORD-1" })],
        stats: defaultStats(1),
        pagination: { total: 1, page: 1, limit: 50, pages: 1 },
      }),
    );

    renderWorkspace();

    const cancelButton = await screen.findByText("orders.cancelOrder");
    fireEvent.click(cancelButton);

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
    let callCount = 0;
    mockGet.mockImplementation((url: string) => {
      if (url.includes("/orders-new/incomplete")) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      callCount++;
      if (callCount === 1) {
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
      }
      return Promise.resolve(
        mockOrdersResponse({
          orders: [makeOrder({ id: "o2", orderNumber: "ORD-2" })],
          stats: defaultStats(1),
          pagination: { total: 1, page: 1, limit: 50, pages: 1 },
        }),
      );
    });

    renderWorkspace();

    await screen.findByText("#ORD-1");
    expect(screen.getByText("#ORD-2")).toBeInTheDocument();

    const confirmButton = await screen.findByText("orders.confirmOrder");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/agent-workspace/orders/o1/quick-action",
        expect.objectContaining({ action: "confirm" }),
      );
    });

    // o1 should disappear and advance to o2
    await waitFor(() => {
      expect(screen.queryByText("#ORD-1")).not.toBeInTheDocument();
      expect(screen.getByText("#ORD-2")).toBeInTheDocument();
    });
  });

  it("renders SupervisorDispatchStrip when user is a manager", async () => {
    mockCurrentUser = { id: "m1", role: "MANAGER" };

    mockGet.mockImplementation((url: string) => {
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

    // Verify unassigned button and agent name are rendered
    await screen.findByText("Ahmed CS");
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
      screen.getByRole("button", { name: /اعتماد وتأكيد الطلب|Confirm Order|confirmOrder/i }),
    ).toBeInTheDocument();
  });

  it("renders live edit items button in inspector", async () => {
    mockCurrentUser = { id: "u1", role: "AGENT" };
    mockGet.mockResolvedValue(
      mockOrdersResponse({
        orders: [
          makeOrder({
            id: "o1",
            orderNumber: "ORD-1",
            items: [{ productName: "قميص كلاسيك", quantity: 2, price: 150, total: 300 }],
          }),
        ],
        stats: defaultStats(1),
        pagination: { total: 1, page: 1, limit: 50, pages: 1 },
      }),
    );

    renderWorkspace();

    await screen.findByText("#ORD-1");
    // Verify edit items button is present
    const editBtn = screen.getByRole("button", { name: /Edit Items|تعديل البنود/i });
    expect(editBtn).toBeInTheDocument();

    // Clicking edit button reveals live item editor
    fireEvent.click(editBtn);
    expect(screen.getByText(/Edit Order Items|تعديل بنود وعروض الطلب/i)).toBeInTheDocument();
  });
});

