/**
 * الحالات الداخلية (TRASH/DRAFT/DUPLICATE_ORDER/...) مخفية افتراضياً من القائمة،
 * وتظهر بس لما المستخدم يفعّل الـ toggle. عدّاد تبويب "الكل" مش بيشملهم.
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

describe("OrderStatusTemplatesPage internal statuses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("الحالات الداخلية مخفية افتراضياً وعدّاد الكل مش بيشملهم", async () => {
    mockApi([
      makeStatus({ id: "st1", code: "CONFIRMED", name: "مؤكد" }),
      makeStatus({ id: "st2", code: "SHIPPED", name: "تم الشحن", statusType: "shipping", sortOrder: 2 }),
      makeStatus({ id: "st3", code: "TRASH", name: "سلة المحذوفات", isNonNotifiable: true }),
      makeStatus({ id: "st4", code: "DRAFT", name: "مسودة", isNonNotifiable: true }),
    ]);
    renderPage();

    expect(await screen.findByTestId("status-row-st1")).toBeInTheDocument();
    expect(screen.getByTestId("status-row-st2")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st3")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st4")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: /الكل 2/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/عرض الحالات الداخلية/)).toBeInTheDocument();
  });

  test("الـ toggle بيظهر الحالات الداخلية", async () => {
    mockApi([
      makeStatus({ id: "st1", code: "CONFIRMED", name: "مؤكد" }),
      makeStatus({ id: "st3", code: "TRASH", name: "سلة المحذوفات", isNonNotifiable: true }),
    ]);
    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByTestId("status-row-st1")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st3")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText(/عرض الحالات الداخلية/));

    expect(screen.getByTestId("status-row-st3")).toBeInTheDocument();
  });
});
