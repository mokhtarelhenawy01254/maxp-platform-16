/**
 * ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä┘à╪¬╪┤╪º╪¿┘ç╪⌐ (╪ú┘â╪¬╪▒ ┘à┘å 4 ╪¿┘å┘ü╪│ ╪º┘ä┘à╪¡╪¬┘ê┘ë) ╪¿╪¬╪¬╪╖┘ê┘ë ╪º┘ü╪¬╪▒╪º╪╢┘è╪º┘ï ╪¬╪¡╪¬ ╪▒╪ú╪│ group ┘ê╪º╪¡╪»╪î
 * ┘ê╪¿╪¬╪¬┘ü╪¬╪¡ ╪¿╪╢╪║╪╖╪⌐ "╪╣╪▒╪╢ ╪º┘ä╪¬┘ü╪º╪╡┘è┘ä". ╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ╪¿╪¬╪╕┘ç╪▒ ╪¿╪│ ╪╣┘å╪» ╪º┘ä╪╖┘ä╪¿.
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

const GENERIC_CONTENT = "┘à╪▒╪¡╪¿╪º╪î ╪¬┘à ╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿┘â ╪¿┘å╪¼╪º╪¡";

const GROUPED_STATUSES = [
  makeStatus({ id: "st1", code: "CONFIRMED", name: "┘à╪ñ┘â╪»", hasTemplate: true, template: { id: "t1", name: "t1", content: GENERIC_CONTENT, eventType: "CONFIRMED", isActive: true } }),
  makeStatus({ id: "st2", code: "SHIPPED", name: "╪¬┘à ╪º┘ä╪┤╪¡┘å", statusType: "shipping", sortOrder: 2, hasTemplate: true, template: { id: "t2", name: "t2", content: GENERIC_CONTENT, eventType: "SHIPPED", isActive: true } }),
  makeStatus({ id: "st3", code: "DELIVERED", name: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à", statusType: "shipping", sortOrder: 3, hasTemplate: true, template: { id: "t3", name: "t3", content: GENERIC_CONTENT, eventType: "DELIVERED", isActive: true } }),
  makeStatus({ id: "st4", code: "PROCESSING", name: "┘é┘è╪» ╪º┘ä╪¬┘å┘ü┘è╪░", statusType: "preparation", sortOrder: 4, hasTemplate: true, template: { id: "t4", name: "t4", content: GENERIC_CONTENT, eventType: "PROCESSING", isActive: true } }),
  makeStatus({ id: "st5", code: "CANCELLED", name: "┘à┘ä╪║┘è", statusType: "order", sortOrder: 5, hasTemplate: true, template: { id: "t5", name: "t5", content: GENERIC_CONTENT, eventType: "CANCELLED", isActive: true } }),
  makeStatus({ id: "st6", code: "REFUNDED", name: "┘à╪│╪¬╪▒╪»", statusType: "order", sortOrder: 6, hasTemplate: true, template: { id: "t6", name: "t6", content: GENERIC_CONTENT, eventType: "REFUNDED", isActive: true } }),
];

const CUSTOM_STATUS = makeStatus({
  id: "st7",
  code: "CUSTOM_STATUS",
  name: "╪¡╪º┘ä╪⌐ ┘à╪«╪╡╪╡╪⌐",
  sortOrder: 7,
  hasTemplate: true,
  template: { id: "t7", name: "t7", content: "┘à╪▒╪¡╪¿╪º┘ï {{customerName}} ╪º╪│╪¬┘ä┘à╪¬ ╪╖┘ä╪¿┘â", eventType: "CUSTOM_STATUS", isActive: true },
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

  test("group ╪ú┘â╪¿╪▒ ┘à┘å 4 ╪¿╪¬╪¬╪╖┘ê┘ë ╪º┘ü╪¬╪▒╪º╪╢┘è╪º┘ï ╪¬╪¡╪¬ ╪▒╪ú╪│ ┘ê╪º╪¡╪»", async () => {
    mockApi([...GROUPED_STATUSES, CUSTOM_STATUS]);
    renderPage();

    expect(await screen.findByTestId("group-header")).toBeInTheDocument();
    expect(screen.getByText("6 ╪¡╪º┘ä╪⌐ ╪¿┘å┘ü╪│ ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪╣╪º┘à")).toBeInTheDocument();

    expect(screen.queryByTestId("status-row-st1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-row-st6")).not.toBeInTheDocument();

    expect(screen.getByTestId("status-row-st7")).toBeInTheDocument();
  });

  test("╪▓╪▒ ╪╣╪▒╪╢ ╪º┘ä╪¬┘ü╪º╪╡┘è┘ä ╪¿┘è┘ü╪¬╪¡ ╪º┘ä┘Ç group", async () => {
    mockApi([...GROUPED_STATUSES, CUSTOM_STATUS]);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("group-header");
    await user.click(screen.getByRole("button", { name: /╪╣╪▒╪╢ ╪º┘ä╪¬┘ü╪º╪╡┘è┘ä/ }));

    expect(screen.getByTestId("status-row-st1")).toBeInTheDocument();
    expect(screen.getByTestId("status-row-st6")).toBeInTheDocument();
  });

  test("╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ┘à╪╖┘ê┘è╪⌐ ╪º┘ü╪¬╪▒╪º╪╢┘è╪º┘ï ┘ê╪¿╪¬┘ü╪¬╪¡ ╪¿╪╢╪║╪╖╪⌐ ┘à╪╣╪º┘è┘å╪⌐", async () => {
    mockApi([CUSTOM_STATUS]);
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st7");
    expect(screen.queryByText("╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ╪º┘ä┘â╪º┘à┘ä╪⌐")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^┘à╪╣╪º┘è┘å╪⌐/ }));

    expect(screen.getByText("╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ╪º┘ä┘â╪º┘à┘ä╪⌐")).toBeInTheDocument();
    expect(screen.getAllByText(/╪ú╪¡┘à╪» ┘à╪¡┘à╪»/).length).toBeGreaterThan(0);
  });
});
