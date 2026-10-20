// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import AgentWorkspace from "../AgentWorkspace";
import { apiClient } from "../../../services/apiClient";
import {
  normalizeArabicDigits,
  sanitizeWhatsAppPhone,
} from "../workspace/WorkspaceWhatsAppDrawer";

afterEach(() => {
  cleanup();
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("../../../components/ui/GovernorateAreaSearch", () => ({
  GovernorateAreaSearch: ({ value, onChange, placeholder }: any) => (
    <div data-testid="mock-gov-search">
      <input
        data-testid="gov-input"
        placeholder={placeholder}
        value={value?.governorate || ""}
        onChange={(e) =>
          onChange({
            governorate: e.target.value,
            area: value?.area || "",
          })
        }
      />
    </div>
  ),
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
  confirmationDisabled,
}: {
  orders: TestOrder[];
  stats?: unknown;
  pagination?: unknown;
  confirmationDisabled?: boolean;
}) => ({
  data: {
    success: true,
    data: orders,
    stats,
    pagination,
    confirmationDisabled,
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

const renderWorkspace = (initialEntries = ["/orders/workspace?tab=pending"]) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
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

    expect(screen.queryByText(/urgent|عاجل/i)).not.toBeInTheDocument();
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

    expect(screen.getAllByText(/urgent|عاجل/i).length).toBeGreaterThanOrEqual(1);
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

    expect(screen.getAllByText(/urgent|عاجل/i).length).toBeGreaterThanOrEqual(1);
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

  it("fetches abandoned carts and isolates them under incomplete tab", async () => {
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

    // Verify pending queue displays normal pending order
    const normalNames = await screen.findAllByText("محمود حسن");
    expect(normalNames.length).toBeGreaterThanOrEqual(1);

    // Switch to Abandoned Carts tab
    const incompleteTab = screen.getByRole("tab", { name: /Abandoned Carts|السلات المتروكة/i });
    fireEvent.click(incompleteTab);

    // Verify incomplete cart is displayed under incomplete tab
    const nameElements = await screen.findAllByText("سارة أحمد");
    expect(nameElements.length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("button", { name: /اعتماد وتأكيد الطلب|Confirm Order|confirmOrder/i }).length,
    ).toBeGreaterThanOrEqual(1);
  }, 15000);

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

  it("renders the 2 quick filter tabs and switches filters on click", async () => {
    setMockOrdersData([makeOrder({ id: "o1", orderNumber: "ORD-1" })]);
    renderWorkspace();

    // Verify the 2 quick tabs exist
    const pendingTab = screen.getByRole("tab", { name: /Pending|قيد الانتظار/i });
    const incompleteTab = screen.getByRole("tab", { name: /Abandoned Carts|السلات المتروكة/i });

    expect(pendingTab).toBeInTheDocument();
    expect(incompleteTab).toBeInTheDocument();

    // Clicking Abandoned Carts triggers fetch for incomplete carts
    fireEvent.click(incompleteTab);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "/orders-new/incomplete",
        expect.objectContaining({
          params: expect.objectContaining({
            hasPhone: "true",
          }),
        }),
      );
    });

    // Clicking Pending triggers fetch with status: "PENDING"
    fireEvent.click(pendingTab);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "/agent-workspace/my-orders",
        expect.objectContaining({
          params: expect.objectContaining({
            status: "PENDING",
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
        incomplete: 25,
      },
      { total: 15, page: 1, limit: 50, pages: 1 },
    );

    render(
      <MemoryRouter initialEntries={["/orders/workspace"]}>
        <AgentWorkspace />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("15")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
    });
  });

  it("rolls back optimistic removal and shows error toast when quick action fails", async () => {
    const order1 = makeOrder({ id: "o1", orderNumber: "ORD-1", customerName: "Customer One" });
    const order2 = makeOrder({ id: "o2", orderNumber: "ORD-2", customerName: "Customer Two" });
    setMockOrdersData([order1, order2]);

    mockPost.mockImplementation(async (url: string) => {
      if (url.includes("/quick-action")) {
        return { data: { success: false, error: "Network error approving order" } };
      }
      return { data: { success: true } };
    });

    renderWorkspace();

    await screen.findAllByText(/#?ORD-1/);
    expect(screen.getAllByText("Customer One").length).toBeGreaterThanOrEqual(1);

    const confirmBtn = screen.getAllByRole("button", {
      name: /اعتماد وتأكيد الطلب|Confirm Order|confirmOrder/i,
    })[0];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network error approving order");
    });

    // The order should be restored to the queue via rollback
    expect(screen.getAllByText("Customer One").length).toBeGreaterThanOrEqual(1);
  });

  it("rolls back optimistic removal and shows error toast when log-call fails", async () => {
    const order1 = makeOrder({ id: "o1", orderNumber: "ORD-1", customerName: "Customer One" });
    const order2 = makeOrder({ id: "o2", orderNumber: "ORD-2", customerName: "Customer Two" });
    setMockOrdersData([order1, order2]);

    mockPost.mockImplementation(async (url: string) => {
      if (url.includes("/log-call")) {
        return { data: { success: false, error: "Call log failed on server" } };
      }
      return { data: { success: true } };
    });

    renderWorkspace();

    await screen.findAllByText(/#?ORD-1/);
    const unreachedBtn = screen.getAllByRole("button", {
      name: /لم يرد|Unreached|unreached/i,
    })[0];
    fireEvent.click(unreachedBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Call log failed on server");
    });

    // The order should be restored
    expect(screen.getAllByText("Customer One").length).toBeGreaterThanOrEqual(1);
  });

  it("preserves URL query param and selects deep-linked order on initial load", async () => {
    const order1 = makeOrder({ id: "o1", orderNumber: "ORD-1", customerName: "Customer One" });
    const order2 = makeOrder({ id: "o2", orderNumber: "ORD-2", customerName: "Customer Two" });
    setMockOrdersData([order1, order2]);

    render(
      <MemoryRouter initialEntries={["/orders/workspace?order=o2"]}>
        <AgentWorkspace />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Customer Two").length).toBeGreaterThanOrEqual(1);
    });

    // Customer Two should be active in inspector
    expect(screen.getAllByText("Customer Two").length).toBeGreaterThanOrEqual(2);
  });

  it("normalizes Arabic-Indic numerals and handles KSA/EG prefixes in WhatsApp sanitizer", () => {
    expect(normalizeArabicDigits("٠١٠١٢٣٤٥٦٧٨")).toBe("01012345678");
    expect(normalizeArabicDigits("٠٥١٢٣٤٥٦٧٨")).toBe("0512345678");

    const ksaResult = sanitizeWhatsAppPhone("٠٥١٢٣٤٥٦٧٨");
    expect(ksaResult.standardPhone).toBe("966512345678");

    const egResult = sanitizeWhatsAppPhone("٠١٠١٢٣٤٥٦٧٨");
    expect(egResult.standardPhone).toBe("201012345678");

    const rawKsa = sanitizeWhatsAppPhone("+966 51 234 5678");
    expect(rawKsa.standardPhone).toBe("966512345678");
  });

  it("triggers confirmation on 'c' key and log call on '1' key when not focused in input", async () => {
    const order1 = makeOrder({ id: "o1", orderNumber: "ORD-1", customerName: "Customer One" });
    setMockOrdersData([order1]);

    renderWorkspace();

    await screen.findAllByText(/#?ORD-1/);

    // Press 'c' to confirm order
    fireEvent.keyDown(window, { key: "c" });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/agent-workspace/orders/o1/quick-action",
        expect.objectContaining({ action: "confirm" }),
      );
    });

    // Press '1' to log unreached call
    fireEvent.keyDown(window, { key: "1" });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        "/agent-workspace/orders/o1/log-call",
        expect.objectContaining({ result: "unreached" }),
      );
    });
  });

  it("shows recalculate shipping alert when governorate is changed in customer editor", async () => {
    const order1 = makeOrder({
      id: "o1",
      orderNumber: "ORD-1",
      customerName: "Customer One",
      governorate: "Cairo",
      city: "Nasr City",
    });
    setMockOrdersData([order1]);

    renderWorkspace();

    await screen.findAllByText(/#?ORD-1/);

    // Click edit customer button
    const editBtn = screen.getByTitle(/Edit Customer|تعديل بيانات العميل/i);
    fireEvent.click(editBtn);

    // Locate governorate input from mock
    const govInput = screen.getByTestId("gov-input");
    expect(govInput).toHaveValue("Cairo");

    // Change governorate to Alexandria
    fireEvent.change(govInput, { target: { value: "Alexandria" } });

    // Warning alert should appear
    await waitFor(() => {
      expect(screen.getByTestId("governorate-shipping-warning")).toBeInTheDocument();
    });
  });

  it("renders reports tab button in top bar and switches to reports tab on click", async () => {
    setMockOrdersData([makeOrder({ id: "o1", orderNumber: "ORD-1" })]);
    renderWorkspace();

    const reportsTab = screen.getByRole("tab", { name: /Reports|التقارير/i });
    expect(reportsTab).toBeInTheDocument();

    fireEvent.click(reportsTab);

    // Clicking reports tab should switch active tab to reports
    expect(reportsTab).toHaveAttribute("aria-selected", "true");
  });

  it("allows switching views via inspector and intelligence navigation on mobile", async () => {
    const order1 = makeOrder({ id: "o1", orderNumber: "ORD-1", customerName: "Test Customer" });
    setMockOrdersData([order1]);
    renderWorkspace();

    await screen.findAllByText(/#?ORD-1/);

    // Click order to open inspector
    const orderItem = screen.getAllByText("Test Customer")[0];
    fireEvent.click(orderItem);

    // Inspector navigation buttons
    const dossierNavBtn = screen.getByText(/Customer Dossier|سجل العميل والرادار/i);
    expect(dossierNavBtn).toBeInTheDocument();

    // Navigate to intelligence
    fireEvent.click(dossierNavBtn);

    // Back to order details in intelligence rail
    const backBtn = screen.getByText(/Back to Order Details|العودة إلى تفاصيل الطلب/i);
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);

    // Back to queue from inspector
    const backToQueueBtn = screen.getByText(/orders\.workspaceSection|لوحة التحكم|الطلبات/i);
    expect(backToQueueBtn).toBeInTheDocument();
    fireEvent.click(backToQueueBtn);
  });

  it("toggles intelligence rail in inspector", async () => {
    const order1 = makeOrder({ id: "o1", orderNumber: "ORD-1", customerName: "Test Customer" });
    setMockOrdersData([order1]);
    renderWorkspace();

    await screen.findAllByText(/#?ORD-1/);

    const dossierToggleBtn = screen.getByTitle(/Toggle customer trust dossier|عرض\/إخفاء سجل العميل/i);
    expect(dossierToggleBtn).toBeInTheDocument();

    // Toggle off
    fireEvent.click(dossierToggleBtn);
    // Toggle back on
    fireEvent.click(dossierToggleBtn);
  });

  it("renders disabled confirmation warning banner with link to settings when confirmationDisabled is true", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/agent-workspace/my-orders')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [],
            stats: defaultStats(0),
            pagination: { total: 0, page: 1, limit: 50, pages: 1 },
            confirmationDisabled: true,
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderWorkspace();

    // Verify warning banner in queue and inspector
    const banners = await screen.findAllByText(/المركز مقفول من الإعدادات|مركز التأكيد مقفول من الإعدادات|Confirmation Center Disabled/i);
    expect(banners.length).toBeGreaterThan(0);

    // Verify link to settings is present
    const settingsLinks = screen.getAllByRole("link", { name: /الانتقال لإعدادات التأكيد|فتح إعدادات مركز التأكيد|Settings/i });
    expect(settingsLinks.length).toBeGreaterThan(0);
    expect(settingsLinks[0]).toHaveAttribute("href", "/settings/orders?tab=confirmation");
  });

  it("renders orders normally and does not show warning banner when confirmationDisabled is false", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/agent-workspace/my-orders')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [makeOrder({ id: "o-active", orderNumber: "ORD-ACTIVE" })],
            stats: defaultStats(1),
            pagination: { total: 1, page: 1, limit: 50, pages: 1 },
            confirmationDisabled: false,
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderWorkspace();

    // Verify order is rendered
    await screen.findAllByText(/#?ORD-ACTIVE/);

    // Verify warning banner is NOT in the document
    expect(
      screen.queryByText(/المركز مقفول من الإعدادات|مركز التأكيد مقفول من الإعدادات|Confirmation Center Disabled/i)
    ).not.toBeInTheDocument();
  });

  it("fetches followup orders when navigating to followup tab via URL", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/agent-workspace/my-orders')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              makeOrder({
                id: "o-f1",
                orderNumber: "ORD-FOLLOWUP-1",
                followUpDate: new Date(Date.now() + 3600000).toISOString(),
              }),
            ],
            stats: { ...defaultStats(1), followup: 1 },
            pagination: { total: 1, page: 1, limit: 50, pages: 1 },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    render(
      <MemoryRouter initialEntries={["/orders/workspace?tab=followup"]}>
        <AgentWorkspace />
      </MemoryRouter>,
    );

    await screen.findAllByText(/#?ORD-FOLLOWUP-1/);

    expect(mockGet).toHaveBeenCalledWith(
      "/agent-workspace/my-orders",
      expect.objectContaining({
        params: expect.objectContaining({
          followUpOnly: "true",
        }),
      }),
    );
  });

  it("shows error state with retry button when initial API fetch fails, and retries successfully on click", async () => {
    let callCount = 0;
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/agent-workspace/my-orders')) {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("Server error loading queue"));
        }
        return Promise.resolve({
          data: {
            success: true,
            data: [makeOrder({ id: "o-retry", orderNumber: "ORD-RETRY-SUCCESS" })],
            stats: defaultStats(1),
            pagination: { total: 1, page: 1, limit: 50, pages: 1 },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderWorkspace();

    // Error toast should be triggered
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });

    // Try again button should be displayed
    const retryBtn = await screen.findByRole("button", {
      name: /إعادة المحاولة|Try again/i,
    });
    expect(retryBtn).toBeInTheDocument();

    // Click retry
    fireEvent.click(retryBtn);

    // After retry succeeds, order should appear
    await screen.findAllByText(/#?ORD-RETRY-SUCCESS/);
  });
});


