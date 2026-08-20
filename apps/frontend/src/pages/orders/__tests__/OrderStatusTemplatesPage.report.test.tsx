/**
 * تقارير الحالات — تبويب التقرير اليومي: الملخص + جدول الحالات + التفاصيل.
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
      customerName: "أحمد",
      recipientPhone: "201000000000",
      templateName: "قالب التأكيد",
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
      customerName: "محمد",
      recipientPhone: "201111111111",
      templateName: "قالب الشحن",
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
            { id: "st1", code: "CONFIRMED", name: "مؤكد", color: "#3B82F6", sortOrder: 1, statusType: "order", notifyCustomer: true, isSystemStatus: true, hasTemplate: true, isNonNotifiable: false, template: null },
            { id: "st2", code: "SHIPPED", name: "تم الشحن", color: "#10B981", sortOrder: 2, statusType: "shipping", notifyCustomer: true, isSystemStatus: true, hasTemplate: true, isNonNotifiable: false, template: null },
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

describe("OrderStatusTemplatesPage تقارير الحالات", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("التبويب يعرض الملخص وعدد الميتا/العادي وصفوف الحالات", async () => {
    mockApi();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /تقارير الحالات/ }));

    expect(await screen.findByTestId("status-report-tab")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining("status-report"),
      expect.objectContaining({ params: expect.objectContaining({ startDate: expect.any(String) }) }),
    );

    await waitFor(() => {
      expect(screen.getByText("إجمالي الإرسالات")).toBeInTheDocument();
    });
    expect(screen.getAllByText("قالب ميتا").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("واتساب عادي").length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("مؤكد")).toBeInTheDocument();
    expect(screen.getByText("تم الشحن")).toBeInTheDocument();

    const orderConfirmedRow = screen.getAllByRole("row").find((r) => r.textContent?.includes("مؤكد"));
    expect(orderConfirmedRow?.textContent).toContain("2");
  });

  test("فتح تفاصيل حالة يجيب السجلات ويعرض شارة ميتا/عادي وأرقام الطلبات", async () => {
    mockApi();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /تقارير الحالات/ }));
    await screen.findByTestId("status-report-tab");
    await waitFor(() => expect(screen.getByText("إجمالي الإرسالات")).toBeInTheDocument());

    const row = screen.getAllByRole("row").find((r) => r.textContent?.includes("تم الشحن"));
    expect(row).toBeTruthy();
    await user.click(row!);

    await waitFor(() => {
      expect(screen.getByText("ORD-101")).toBeInTheDocument();
      expect(screen.getByText("محمد")).toBeInTheDocument();
    });

    expect(screen.getAllByText("☁️ ميتا").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("📱 عادي").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("فشل").length).toBeGreaterThanOrEqual(1);
  });

  test("فلتر ميتا بيقصر الجدول على الإرسالات عبر قالب ميتا", async () => {
    mockApi();
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /تقارير الحالات/ }));
    await screen.findByTestId("status-report-tab");
    await waitFor(() => expect(screen.getByText("إجمالي الإرسالات")).toBeInTheDocument());

    await user.selectOptions(screen.getByRole("combobox", { name: "فلترة نوع الإرسال" }), "meta");

    expect(screen.getByText("مؤكد")).toBeInTheDocument();
    expect(screen.queryByText("تم الشحن")).not.toBeInTheDocument();
  });
});
