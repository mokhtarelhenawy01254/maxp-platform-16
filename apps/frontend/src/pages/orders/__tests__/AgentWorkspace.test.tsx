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

jest.mock("../../../components/orders/EnhancedOrderModal", () => () => null);

jest.mock("../OrderConfirmationQueue", () => () => null);

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
  mockGet.mockResolvedValue(
    mockOrdersResponse({
      orders: [],
      stats: defaultStats(0),
      pagination: { total: 0, page: 1, limit: 50, pages: 1 },
    }),
  );
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
    mockGet
      .mockResolvedValueOnce(
        mockOrdersResponse({
          orders: [makeOrder({ id: "o1", orderNumber: "ORD-1" })],
          stats: defaultStats(60),
          pagination: { total: 60, page: 1, limit: 50, pages: 2 },
        }),
      )
      .mockResolvedValueOnce(
        mockOrdersResponse({
          orders: [makeOrder({ id: "o2", orderNumber: "ORD-2" })],
          stats: defaultStats(60),
          pagination: { total: 60, page: 2, limit: 50, pages: 2 },
        }),
      );

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
    expect(mockGet).toHaveBeenCalledTimes(2);
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
});
