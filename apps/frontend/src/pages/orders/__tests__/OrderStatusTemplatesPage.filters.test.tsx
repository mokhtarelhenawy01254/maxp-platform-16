/**
 * بحث + filter chips + فرز — كلهم بيشتغلوا مع بعض (AND logic) على نفس القائمة.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function template(content: string, extra: Record<string, any> = {}): any {
  return { id: `t-${content.length}`, name: "قالب", content, eventType: "EVENT", isActive: true, ...extra };
}

const STATUSES = [
  makeStatus({
    id: "st1",
    code: "CONFIRMED",
    name: "مؤكد",
    hasTemplate: true,
    template: template("مرحباً {{customerName}} أكد طلبك"),
  }),
  makeStatus({
    id: "st2",
    code: "SHIPPED",
    name: "تم الشحن",
    statusType: "shipping",
    sortOrder: 2,
    hasTemplate: true,
    template: template("تم تغيير حالة طلبك إلى: تم الشحن", {
      metaTemplateName: "shipping_approved",
      metaTemplateStatus: "APPROVED",
    }),
  }),
  makeStatus({ id: "st3", code: "PAYMENT_PENDING", name: "في انتظار الدفع", statusType: "payment", sortOrder: 3 }),
  makeStatus({
    id: "st4",
    code: "DELIVERED",
    name: "تم التسليم",
    statusType: "shipping",
    sortOrder: 4,
    notifyCustomer: false,
    hasTemplate: true,
    template: template("تم تسليم طلبك بنجاح"),
  }),
];

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

function visibleRowIds(): string[] {
  return Array.from(document.querySelectorAll('[data-testid^="status-row-"]')).map(
    (el) => el.getAttribute("data-testid") || ""
  );
}

describe("OrderStatusTemplatesPage filters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("البحث بيفلتر بالكود case-insensitive", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByTestId("status-row-st1")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/ابحث باسم الحالة أو الكود/), "shipped");

    expect(screen.getByTestId("status-row-st2")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st3")).not.toBeInTheDocument();
  });

  test("chip مخصصة بيفلتر القوالب اللي فيها متغيرات {{ }}", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(screen.getByRole("button", { name: "مخصصة" }));

    expect(screen.getByTestId("status-row-st1")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st3")).not.toBeInTheDocument();
  });

  test("chip مربوطة بميتا بيفلتر بالـ metaTemplateName", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(screen.getByRole("button", { name: "مربوطة بميتا" }));

    expect(screen.getByTestId("status-row-st2")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st3")).not.toBeInTheDocument();
  });

  test("chip بدون قالب بيفلتر الحالات اللي ملهاش قالب", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(screen.getByRole("button", { name: "بدون قالب" }));

    expect(screen.getByTestId("status-row-st3")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st2")).not.toBeInTheDocument();
  });

  test("chip متوقفة بيفلتر الحالات اللي notifyCustomer فيها false", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(screen.getByRole("button", { name: "متوقفة" }));

    expect(screen.getByTestId("status-row-st4")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st1")).not.toBeInTheDocument();
  });

  test("الفرز الأبجدي بيرتب القائمة", async () => {
    mockApi([
      makeStatus({ id: "st1", code: "A", name: "أحمد", sortOrder: 2 }),
      makeStatus({ id: "st2", code: "B", name: "باسم", sortOrder: 1 }),
    ]);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");

    await user.selectOptions(screen.getByRole("combobox"), "alphabetical");

    expect(visibleRowIds()).toEqual(["status-row-st1", "status-row-st2"]);
  });

  test("الـ chip والـ search بيشتغلوا مع بعض (AND)", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(screen.getByRole("button", { name: "مخصصة" }));
    await user.type(screen.getByPlaceholderText(/ابحث باسم الحالة أو الكود/), "SHIPPED");

    expect(await screen.findByText(/لا توجد حالات مطابقة لبحثك/)).toBeInTheDocument();
  });
});
