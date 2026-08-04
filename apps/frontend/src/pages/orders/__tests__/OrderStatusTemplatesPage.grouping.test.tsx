/**
 * القوالب المتشابهة (أكتر من 4 بنفس المحتوى) بتتطوى افتراضياً تحت رأس group واحد،
 * وبتتفتح بضغطة "عرض التفاصيل". المعاينة بتظهر بس عند الطلب.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStatus(overrides: Record<string, any>) {
  return {
    id: "st1",
    code: "CONFIRMED",
    name: "مؤكد",
    color: "#3B82F6",
    sortOrder: 1,
    statusType: "order",
    notifyCustomer: true,
    isSystemStatus: true,
    hasTemplate: false,
    isNonNotifiable: false,
    template: null,
    ...overrides,
  };
}

const GENERIC_CONTENT = "مرحبا، تم تغيير حالة طلبك بنجاح";

const GROUPED_STATUSES = [
  makeStatus({ id: "st1", code: "CONFIRMED", name: "مؤكد", hasTemplate: true, template: { id: "t1", name: "t1", content: GENERIC_CONTENT, eventType: "CONFIRMED", isActive: true } }),
  makeStatus({ id: "st2", code: "SHIPPED", name: "تم الشحن", statusType: "shipping", sortOrder: 2, hasTemplate: true, template: { id: "t2", name: "t2", content: GENERIC_CONTENT, eventType: "SHIPPED", isActive: true } }),
  makeStatus({ id: "st3", code: "DELIVERED", name: "تم التسليم", statusType: "shipping", sortOrder: 3, hasTemplate: true, template: { id: "t3", name: "t3", content: GENERIC_CONTENT, eventType: "DELIVERED", isActive: true } }),
  makeStatus({ id: "st4", code: "PROCESSING", name: "قيد التنفيذ", statusType: "preparation", sortOrder: 4, hasTemplate: true, template: { id: "t4", name: "t4", content: GENERIC_CONTENT, eventType: "PROCESSING", isActive: true } }),
  makeStatus({ id: "st5", code: "CANCELLED", name: "ملغي", statusType: "order", sortOrder: 5, hasTemplate: true, template: { id: "t5", name: "t5", content: GENERIC_CONTENT, eventType: "CANCELLED", isActive: true } }),
  makeStatus({ id: "st6", code: "REFUNDED", name: "مسترد", statusType: "order", sortOrder: 6, hasTemplate: true, template: { id: "t6", name: "t6", content: GENERIC_CONTENT, eventType: "REFUNDED", isActive: true } }),
];

const CUSTOM_STATUS = makeStatus({
  id: "st7",
  code: "CUSTOM_STATUS",
  name: "حالة مخصصة",
  sortOrder: 7,
  hasTemplate: true,
  template: { id: "t7", name: "t7", content: "مرحباً {{customerName}} استلمت طلبك", eventType: "CUSTOM_STATUS", isActive: true },
});

function mockApi(statuses: Array<Record<string, unknown>>) {
  apiClient.get.mockImplementation((url: string) => {
    if (url === "/order-status/with-templates") {
      return Promise.resolve({ data: { success: true, data: statuses } });
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

describe("OrderStatusTemplatesPage grouping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("group أكبر من 4 بتتطوى افتراضياً تحت رأس واحد", async () => {
    mockApi([...GROUPED_STATUSES, CUSTOM_STATUS]);
    renderPage();

    expect(await screen.findByTestId("group-header")).toBeInTheDocument();
    expect(screen.getByText("6 حالة بنفس القالب العام")).toBeInTheDocument();

    expect(screen.queryByTestId("status-row-st1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st6")).not.toBeInTheDocument();

    expect(screen.getByTestId("status-row-st7")).toBeInTheDocument();
  });

  test("زر عرض التفاصيل بيفتح الـ group", async () => {
    mockApi([...GROUPED_STATUSES, CUSTOM_STATUS]);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("group-header");
    await user.click(screen.getByRole("button", { name: /عرض التفاصيل/ }));

    expect(screen.getByTestId("status-row-st1")).toBeInTheDocument();
    expect(screen.getByTestId("status-row-st6")).toBeInTheDocument();
  });

  test("المعاينة مطوية افتراضياً وبتفتح بضغطة معاينة", async () => {
    mockApi([CUSTOM_STATUS]);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st7");
    expect(screen.queryByText("معاينة القالب")).not.toBeInTheDocument();
    expect(screen.queryByText(/أحمد محمد/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^معاينة/ }));

    expect(screen.getByText("معاينة القالب")).toBeInTheDocument();
    expect(screen.getByText(/أحمد محمد/)).toBeInTheDocument();
  });
});
