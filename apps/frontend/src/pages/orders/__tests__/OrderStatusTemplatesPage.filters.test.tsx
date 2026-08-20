/**
 * ╪¿╪¡╪½ + filter chips + ┘ü╪▒╪▓ ΓÇö ┘â┘ä┘ç┘à ╪¿┘è╪┤╪¬╪║┘ä┘ê╪º ┘à╪╣ ╪¿╪╣╪╢ (AND logic) ╪╣┘ä┘ë ┘å┘ü╪│ ╪º┘ä┘é╪º╪ª┘à╪⌐.
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
    name: "┘à╪ñ┘â╪»",
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
  return { id: `t-${content.length}`, name: "┘é╪º┘ä╪¿", content, eventType: "EVENT", isActive: true, ...extra };
}

const STATUSES = [
  makeStatus({
    id: "st1",
    code: "CONFIRMED",
    name: "┘à╪ñ┘â╪»",
    hasTemplate: true,
    template: template("┘à╪▒╪¡╪¿╪º┘ï {{customerName}} ╪ú┘â╪» ╪╖┘ä╪¿┘â"),
  }),
  makeStatus({
    id: "st2",
    code: "SHIPPED",
    name: "╪¬┘à ╪º┘ä╪┤╪¡┘å",
    statusType: "shipping",
    sortOrder: 2,
    hasTemplate: true,
    template: template("╪¬┘à ╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿┘â ╪Ñ┘ä┘ë: ╪¬┘à ╪º┘ä╪┤╪¡┘å", {
      metaTemplateName: "shipping_approved",
      metaTemplateStatus: "APPROVED",
    }),
  }),
  makeStatus({ id: "st3", code: "PAYMENT_PENDING", name: "┘ü┘è ╪º┘å╪¬╪╕╪º╪▒ ╪º┘ä╪»┘ü╪╣", statusType: "payment", sortOrder: 3 }),
  makeStatus({
    id: "st4",
    code: "DELIVERED",
    name: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à",
    statusType: "shipping",
    sortOrder: 4,
    notifyCustomer: false,
    hasTemplate: true,
    template: template("╪¬┘à ╪¬╪│┘ä┘è┘à ╪╖┘ä╪¿┘â ╪¿┘å╪¼╪º╪¡"),
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

  test("╪º┘ä╪¿╪¡╪½ ╪¿┘è┘ü┘ä╪¬╪▒ ╪¿╪º┘ä┘â┘ê╪» case-insensitive", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByTestId("status-row-st1")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/╪º╪¿╪¡╪½ ╪¿╪º╪│┘à ╪º┘ä╪¡╪º┘ä╪⌐ ╪ú┘ê ╪º┘ä┘â┘ê╪»/), "shipped");

    expect(screen.getByTestId("status-row-st2")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st3")).not.toBeInTheDocument();
  });

  test("chip ┘à╪«╪╡╪╡╪⌐ ╪¿┘è┘ü┘ä╪¬╪▒ ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä┘ä┘è ┘ü┘è┘ç╪º ┘à╪¬╪║┘è╪▒╪º╪¬ {{ }}", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(screen.getByRole("button", { name: "┘à╪«╪╡╪╡╪⌐" }));

    expect(screen.getByTestId("status-row-st1")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st3")).not.toBeInTheDocument();
  });

  test("chip ┘à╪▒╪¿┘ê╪╖╪⌐ ╪¿┘à┘è╪¬╪º ╪¿┘è┘ü┘ä╪¬╪▒ ╪¿╪º┘ä┘Ç metaTemplateName", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(screen.getByRole("button", { name: "┘à╪▒╪¿┘ê╪╖╪⌐ ╪¿┘à┘è╪¬╪º" }));

    expect(screen.getByTestId("status-row-st2")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st3")).not.toBeInTheDocument();
  });

  test("chip ╪¿╪»┘ê┘å ┘é╪º┘ä╪¿ ╪¿┘è┘ü┘ä╪¬╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘ä┘è ┘à┘ä┘ç╪º╪┤ ┘é╪º┘ä╪¿", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(screen.getByRole("button", { name: "╪¿╪»┘ê┘å ┘é╪º┘ä╪¿" }));

    expect(screen.getByTestId("status-row-st3")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st2")).not.toBeInTheDocument();
  });

  test("chip ┘à╪¬┘ê┘é┘ü╪⌐ ╪¿┘è┘ü┘ä╪¬╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘ä┘è notifyCustomer ┘ü┘è┘ç╪º false", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(screen.getByRole("button", { name: "┘à╪¬┘ê┘é┘ü╪⌐" }));

    expect(screen.getByTestId("status-row-st4")).toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st1")).not.toBeInTheDocument();
  });

  test("╪º┘ä┘ü╪▒╪▓ ╪º┘ä╪ú╪¿╪¼╪»┘è ╪¿┘è╪▒╪¬╪¿ ╪º┘ä┘é╪º╪ª┘à╪⌐", async () => {
    mockApi([
      makeStatus({ id: "st1", code: "A", name: "╪ú╪¡┘à╪»", sortOrder: 2 }),
      makeStatus({ id: "st2", code: "B", name: "╪¿╪º╪│┘à", sortOrder: 1 }),
    ]);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");

    await user.selectOptions(screen.getByRole("combobox"), "alphabetical");

    expect(visibleRowIds()).toEqual(["status-row-st1", "status-row-st2"]);
  });

  test("╪º┘ä┘Ç chip ┘ê╪º┘ä┘Ç search ╪¿┘è╪┤╪¬╪║┘ä┘ê╪º ┘à╪╣ ╪¿╪╣╪╢ (AND)", async () => {
    mockApi(STATUSES);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(screen.getByRole("button", { name: "┘à╪«╪╡╪╡╪⌐" }));
    await user.type(screen.getByPlaceholderText(/╪º╪¿╪¡╪½ ╪¿╪º╪│┘à ╪º┘ä╪¡╪º┘ä╪⌐ ╪ú┘ê ╪º┘ä┘â┘ê╪»/), "SHIPPED");

    expect(await screen.findByText(/┘ä╪º ╪¬┘ê╪¼╪» ╪¡╪º┘ä╪º╪¬ ┘à╪╖╪º╪¿┘é╪⌐ ┘ä╪¿╪¡╪½┘â/)).toBeInTheDocument();
  });
});
