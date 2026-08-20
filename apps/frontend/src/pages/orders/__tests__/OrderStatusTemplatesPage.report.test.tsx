/**
 * ╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬ ΓÇö ╪¬╪¿┘ê┘è╪¿ ╪º┘ä╪¬┘é╪▒┘è╪▒ ╪º┘ä┘è┘ê┘à┘è: ╪º┘ä┘à┘ä╪«╪╡ + ╪¼╪»┘ê┘ä ╪º┘ä╪¡╪º┘ä╪º╪¬ + ╪º┘ä╪¬┘ü╪º╪╡┘è┘ä.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import OrderStatusTemplatesPage from "../OrderStatusTemplatesPage";

const mockT = jest.fn((key: string, fallback?: string) => fallback || key);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: "ar", dir: () => "rtl" },
  }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn(), patch: jest.fn() },
}));

const { apiClient } = require("../../../services/apiClient") as {
  apiClient: { get: jest.Mock; put: jest.Mock; post: jest.Mock; delete: jest.Mock; patch: jest.Mock };
};

const REPORT = {
  success: true,
  range: { startDate: "2026-08-11", endDate: "2026-08-11" },
  summary: { total: 4, meta: 2, regular: 2, delivered: 2, sent: 1, read: 0, failed: 1, pending: 0 },
  byStatus: [
    { eventType: "ORDER_CONFIRMED", total: 2, meta: 2, regular: 0, delivered: 2, sent: 0, read: 0, failed: 0, pending: 0 },
    { eventType: "ORDER_SHIPPED", total: 2, meta: 0, regular: 2, delivered: 0, sent: 1, read: 0, failed: 1, pending: 0 },
  ],
  items: [
    {
      id: "l1",
      eventType: "ORDER_CONFIRMED",
      orderId: "o1",
      orderNumber: "ORD-100",
      customerName: "╪ú╪¡┘à╪»",
      recipientPhone: "201000000000",
      templateName: "┘é╪º┘ä╪¿ ╪º┘ä╪¬╪ú┘â┘è╪»",
      metaTemplateName: "order_confirm_ar",
      templateChannel: "META_CLOUD",
      headerUsesOrderProduct: true,
      messageType: "TEMPLATE",
      status: "DELIVERED",
      sentAt: "2026-08-11T10:00:00Z",
      createdAt: "2026-08-11T10:00:00Z",
      failureReason: null,
      errorCode: null,
    },
    {
      id: "l2",
      eventType: "ORDER_SHIPPED",
      orderId: "o2",
      orderNumber: "ORD-101",
      customerName: "┘à╪¡┘à╪»",
      recipientPhone: "201111111111",
      templateName: "┘é╪º┘ä╪¿ ╪º┘ä╪┤╪¡┘å",
      metaTemplateName: null,
      templateChannel: "AUTO",
      headerUsesOrderProduct: null,
      messageType: "TEXT",
      status: "FAILED",
      sentAt: "2026-08-11T11:00:00Z",
      createdAt: "2026-08-11T11:00:00Z",
      failureReason: "rejected",
      errorCode: "131047",
    },
  ],
  pagination: { page: 1, limit: 200, total: 2, pages: 1 },
};

function mockApi() {
  apiClient.get.mockImplementation((url: string) => {
    if (url === "/order-status/with-templates") {
      return Promise.resolve({
        data: {
          success: true,
          data: [
            { id: "st1", code: "CONFIRMED", name: "┘à╪ñ┘â╪»", color: "#3B82F6", sortOrder: 1, statusType: "order", notifyCustomer: true, isSystemStatus: true, hasTemplate: true, isNonNotifiable: false, template: null },
            { id: "st2", code: "SHIPPED", name: "╪¬┘à ╪º┘ä╪┤╪¡┘å", color: "#10B981", sortOrder: 2, statusType: "shipping", notifyCustomer: true, isSystemStatus: true, hasTemplate: true, isNonNotifiable: false, template: null },
          ],
        },
      });
    }
    if (url === "/whatsapp/notifications/settings") {
      return Promise.resolve({ data: { success: true, settings: { defaultSessionId: null }, sessions: [] } });
    }
    if (url === "/whatsapp-notifications/templates/delivery-preview") {
      return Promise.resolve({ data: { success: true, defaultSession: null, preview: [] } });
    }
    if (url === "/whatsapp/sessions") {
      return Promise.resolve({ data: { sessions: [] } });
    }
    if (url === "/whatsapp/notifications/status-report") {
      return Promise.resolve({ data: REPORT });
    }
    return Promise.resolve({ data: {} });
  });
}

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <OrderStatusTemplatesPage />
    </MemoryRouter>,
  );
}

describe("OrderStatusTemplatesPage ╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("╪º┘ä╪¬╪¿┘ê┘è╪¿ ┘è╪╣╪▒╪╢ ╪º┘ä┘à┘ä╪«╪╡ ┘ê╪╣╪»╪» ╪º┘ä┘à┘è╪¬╪º/╪º┘ä╪╣╪º╪»┘è ┘ê╪╡┘ü┘ê┘ü ╪º┘ä╪¡╪º┘ä╪º╪¬", async () => {
    mockApi();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬/ }));

    expect(await screen.findByTestId("status-report-tab")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("status-report"),
      expect.objectContaining({ params: expect.objectContaining({ startDate: expect.any(String) }) }),
    );

    await waitFor(() => {
      expect(screen.getByText("╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪Ñ╪▒╪│╪º┘ä╪º╪¬")).toBeInTheDocument();
    });
    expect(screen.getAllByText("┘é╪º┘ä╪¿ ┘à┘è╪¬╪º").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("┘à╪ñ┘â╪»")).toBeInTheDocument();
    expect(screen.getByText("╪¬┘à ╪º┘ä╪┤╪¡┘å")).toBeInTheDocument();

    const orderConfirmedRow = screen.getAllByRole("row").find((r) => r.textContent?.includes("┘à╪ñ┘â╪»"));
    expect(orderConfirmedRow?.textContent).toContain("2");
  });

  test("┘ü╪¬╪¡ ╪¬┘ü╪º╪╡┘è┘ä ╪¡╪º┘ä╪⌐ ┘è╪¼┘è╪¿ ╪º┘ä╪│╪¼┘ä╪º╪¬ ┘ê┘è╪╣╪▒╪╢ ╪┤╪º╪▒╪⌐ ┘à┘è╪¬╪º/╪╣╪º╪»┘è ┘ê╪ú╪▒┘é╪º┘à ╪º┘ä╪╖┘ä╪¿╪º╪¬", async () => {
    mockApi();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬/ }));
    await screen.findByTestId("status-report-tab");
    await waitFor(() => expect(screen.getByText("╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪Ñ╪▒╪│╪º┘ä╪º╪¬")).toBeInTheDocument());

    const row = screen.getAllByRole("row").find((r) => r.textContent?.includes("╪¬┘à ╪º┘ä╪┤╪¡┘å"));
    expect(row).toBeTruthy();
    await user.click(row!);

    await waitFor(() => {
      expect(screen.getByText("ORD-101")).toBeInTheDocument();
      expect(screen.getByText("┘à╪¡┘à╪»")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Γÿü∩╕Å ┘à┘è╪¬╪º").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("≡ƒô▒ ╪╣╪º╪»┘è").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("┘ü╪┤┘ä").length).toBeGreaterThanOrEqual(1);
  });

  test("┘ü┘ä╪¬╪▒ ┘à┘è╪¬╪º ╪¿┘è┘é╪╡╪▒ ╪º┘ä╪¼╪»┘ê┘ä ╪╣┘ä┘ë ╪º┘ä╪Ñ╪▒╪│╪º┘ä╪º╪¬ ╪╣╪¿╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º", async () => {
    mockApi();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬/ }));
    await screen.findByTestId("status-report-tab");
    await waitFor(() => expect(screen.getByText("╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪Ñ╪▒╪│╪º┘ä╪º╪¬")).toBeInTheDocument());

    await user.selectOptions(screen.getByRole("combobox", { name: "┘ü┘ä╪¬╪▒╪⌐ ┘å┘ê╪╣ ╪º┘ä╪Ñ╪▒╪│╪º┘ä" }), "meta");

    expect(screen.getByText("┘à╪ñ┘â╪»")).toBeInTheDocument();
    expect(screen.queryByText("╪¬┘à ╪º┘ä╪┤╪¡┘å")).not.toBeInTheDocument();
  });
});
