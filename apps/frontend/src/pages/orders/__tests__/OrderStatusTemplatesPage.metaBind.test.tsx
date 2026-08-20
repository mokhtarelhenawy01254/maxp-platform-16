/**
 * ╪▒╪¿╪╖ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º: slot ┘à┘è╪¬╪º ┘à╪│╪¬┘é┘ä ╪¼┘å╪¿ slot ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ ╪º┘ä╪╣╪º╪»┘è.
 * ╪º┘ä╪¬╪╣╪»┘è┘ä ╪╣┘ä┘ë slot ┘à┘è╪¬╪º ╪¿┘è┘ü╪¬╪¡ ╪º┘ä╪»┘è╪º┘ä┘ê╪¼ ┘ü┘è ┘ê╪╢╪╣ ┘à┘è╪¬╪º ┘à╪¿╪º╪┤╪▒╪⌐ (┘à┘ü┘è╪┤ ╪¬╪¿┘ê┘è╪¿).
 */
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
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

const META_SESSIONS = [{ id: "ms1", name: "╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º", provider: "META_CLOUD", metaDisplayPhoneNumber: "201000000000" }];

const META_TEMPLATES = [
  {
    name: "order_confirm_ar",
    status: "APPROVED",
    language: "ar",
    category: "UTILITY",
    components: [{ type: "BODY", text: "┘à╪▒╪¡╪¿╪º┘ï {{1}}╪î ╪╖┘ä╪¿┘â {{2}} ┘ü┘è ╪º┘ä╪╖╪▒┘è┘é" }],
    boundToLocalTemplateId: null,
    boundToEventType: null,
  },
];

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
    isNonNotifiable: false,
    hasTemplate: true,
    template: {
      id: "t1",
      name: "t1",
      content: "┘à╪▒╪¡╪¿╪º {{customerName}} ╪ú┘â╪» ╪╖┘ä╪¿┘â",
      eventType: "CONFIRMED",
      isActive: true,
      channel: "AUTO",
      metaTemplateName: null,
      metaTemplateStatus: null,
    },
    ...overrides,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockApi(status: any, options: { postResubmit?: boolean } = {}) {
  apiClient.get.mockImplementation((url: string) => {
    if (url === "/order-status/with-templates") {
      return Promise.resolve({ data: { success: true, data: [status] } });
    }
    if (url === "/whatsapp/notifications/settings") {
      return Promise.resolve({ data: { success: true, settings: { defaultSessionId: "ms1" }, sessions: [] } });
    }
    if (url === "/whatsapp-notifications/templates/delivery-preview") {
      return Promise.resolve({
        data: { success: true, defaultSession: { id: "ms1", name: "╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º", provider: "META_CLOUD" }, preview: [] },
      });
    }
    if (url === "/whatsapp/sessions") {
      return Promise.resolve({ data: { sessions: META_SESSIONS } });
    }
    if (url.startsWith("/whatsapp-notifications/templates/meta-available")) {
      return Promise.resolve({ data: { templates: META_TEMPLATES } });
    }
    return Promise.resolve({ data: {} });
  });
  apiClient.put.mockResolvedValue({ data: { success: true } });
  apiClient.post.mockResolvedValue({ data: { success: true, metaTemplateName: "order_confirm_ar" } });
  void options;
}

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <OrderStatusTemplatesPage />
    </MemoryRouter>,
  );
}

function metaSlot() {
  return screen.getByTestId("meta-slot-st1");
}

describe("OrderStatusTemplatesPage Meta template binding (two slots)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("slot ┘à┘è╪¬╪º ╪¿┘è┘ü╪¬╪¡ ╪º┘ä╪»┘è╪º┘ä┘ê╪¼ ┘ü┘è ┘ê╪╢╪╣ ┘à┘è╪¬╪º ┘ê┘è╪╣╪▒╪╢ ╪▒╪│╪º┘ä╪⌐ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪«╪¬╪º╪▒", async () => {
    mockApi(makeStatus({}));
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(within(metaSlot()).getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í/ }));

    await user.selectOptions(await screen.findByRole("combobox", { name: /┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»/ }), "order_confirm_ar");

    expect(await screen.findByText(/╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä┘ä┘è ┘ç╪¬╪¬╪¿╪╣╪¬ ┘ä┘ä╪╣┘à┘è┘ä/)).toBeInTheDocument();
    expect(screen.getAllByText(/╪ú╪¡┘à╪» ┘à╪¡┘à╪»/).length).toBeGreaterThan(0);
  });

  test("╪¿┘è╪╕┘ç╪▒ ┘à╪ñ╪┤╪▒ ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘à╪▒╪¿┘ê╪╖╪⌐ ┘ê╪º┘ä╪▓╪▒ ╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪» ┘ä┘à╪º ┘è┘â┘ê┘å ╪º┘ä┘é╪º┘ä╪¿ ┘à╪▒╪¿┘ê╪╖", async () => {
    mockApi(
      makeStatus({
        template: {
          id: "t1",
          name: "t1",
          content: "┘à╪▒╪¡╪¿╪º {{customerName}} ╪ú┘â╪» ╪╖┘ä╪¿┘â",
          eventType: "CONFIRMED",
          isActive: true,
          channel: "AUTO",
          metaTemplateName: "order_confirm_ar",
          metaTemplateStatus: "APPROVED",
        },
      })
    );
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    // slot ┘à┘è╪¬╪º ╪¿┘è╪╣╪▒╪╢ ╪º┘ä╪▒╪¿╪╖ ╪º┘ä┘é╪»┘è┘à ╪╣┘ä┘ë ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪╣╪º╪»┘è (╪¬┘ê╪º┘ü┘é ┘é╪»┘è┘à) ΓÇö ┘ü╪¬╪¡ ┘ê╪╢╪╣ ╪¬╪╣╪»┘è┘ä ╪º┘ä┘à╪¡╪¬┘ê┘ë
    await user.click(within(metaSlot()).getByRole("button", { name: /╪¬╪╣╪»┘è┘ä ╪º┘ä┘à╪¡╪¬┘ê┘ë/ }));

    expect(await screen.findByText(/╪º┘ä╪▒╪¿╪╖ ╪º┘ä╪¡╪º┘ä┘è/)).toBeInTheDocument();
    // resubmit button should NOT show yet ΓÇö content hasn't changed
    expect(screen.queryByRole("button", { name: /╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪»/ })).not.toBeInTheDocument();

    // edit the content to trigger resubmit button
    const textarea = screen.getByRole("textbox", { name: /┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è/ });
    await user.clear(textarea);
    await user.type(textarea, "╪¬┘à ╪¬╪¡╪»┘è╪½ ╪╖┘ä╪¿┘â ╪¿┘å╪¼╪º╪¡ - ╪┤┘â╪▒╪º┘ï ┘ä┘â");

    expect(await screen.findByRole("button", { name: /╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪»/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪»/ }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/resubmit-meta"),
        expect.objectContaining({ sessionId: "ms1" })
      )
    );
    expect(apiClient.put).toHaveBeenCalledWith(
      expect.stringContaining("/templates/t1"),
      expect.objectContaining({ content: "╪¬┘à ╪¬╪¡╪»┘è╪½ ╪╖┘ä╪¿┘â ╪¿┘å╪¼╪º╪¡ - ╪┤┘â╪▒╪º┘ï ┘ä┘â" })
    );
  });

  test("╪º┘ä┘à╪▒╪¼╪╣ ╪º┘ä┘à╪¡┘ä┘è ╪¿┘è╪╕┘ç╪▒ ╪¿╪º┘ä╪¬┘ê╪│┘è╪╣ ┘ü┘è ┘ê╪╢╪╣ ╪▒╪¿╪╖ ┘à┘è╪¬╪º ┘ä┘ä╪¬╪╣╪»┘è┘ä", async () => {
    mockApi(makeStatus({}));
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(within(metaSlot()).getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í/ }));

    await user.click(screen.getByRole("button", { name: /╪º┘ä┘à╪▒╪¼╪╣ ╪º┘ä┘à╪¡┘ä┘è/ }));

    const contentArea = screen.getByPlaceholderText(/╪º┘â╪¬╪¿ ╪▒╪│╪º┘ä╪¬┘â ┘ç┘å╪º/);
    expect(contentArea).toBeInTheDocument();
    expect(contentArea).toHaveValue("┘à╪▒╪¡╪¿╪º {{customerName}} ╪ú┘â╪» ╪╖┘ä╪¿┘â");
  });

  test("╪▒╪¿╪╖ ┘é╪º┘ä╪¿ ╪¼╪»┘è╪» (┘à┘ü┘è╪┤ template.id) ╪¿┘è┘å╪┤╪ª ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï ╪½┘à ┘è╪▒╪¿╪╖┘ç ╪¿┘à┘è╪¬╪º", async () => {
    const createdId = "t-new";
    mockApi(makeStatus({ template: null, hasTemplate: false }));
    apiClient.post.mockImplementation((url: string, body?: any) => {
      if (url === "/whatsapp/notifications/templates") {
        return Promise.resolve({
          data: { success: true, template: { id: createdId, ...body } },
        });
      }
      if (url.endsWith("/bind-meta")) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.resolve({ data: { success: true, metaTemplateName: "order_confirm_ar" } });
    });
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(within(metaSlot()).getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í/ }));
    await user.selectOptions(await screen.findByRole("combobox", { name: /┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»/ }), "order_confirm_ar");
    await user.click(screen.getByRole("button", { name: /╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º/ }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        "/whatsapp/notifications/templates",
        expect.objectContaining({ name: "┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪ñ┘â╪»", eventType: "CONFIRMED", channel: "META_CLOUD" })
      )
    );
    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/bind-meta"),
        expect.objectContaining({ metaTemplateName: "order_confirm_ar" })
      )
    );
  });

  test("╪▓╪▒ ╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪¼╪»┘è╪» ╪¿┘è╪¡┘ü╪╕ ╪º┘ä┘à╪¡┘ä┘è ╪½┘à ╪¿┘è┘å╪┤╪▒ ╪º┘ä┘é╪º┘ä╪¿ ╪╣┘ä┘ë ┘à┘è╪¬╪º ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐", async () => {
    mockApi(makeStatus({}));
    apiClient.post.mockImplementation((url: string, body?: any) => {
      if (url.endsWith("/publish")) {
        return Promise.resolve({ data: { success: true } });
      }
      if (url === "/whatsapp/notifications/templates") {
        return Promise.resolve({ data: { success: true, template: { id: "t-new", ...body } } });
      }
      return Promise.resolve({ data: { success: true, metaTemplateName: "order_confirm_ar" } });
    });
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(within(metaSlot()).getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í/ }));

    await user.click(screen.getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪¼╪»┘è╪»/ }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/publish"),
        expect.objectContaining({ sessionId: "ms1" })
      )
    );
    expect(apiClient.post).toHaveBeenCalledWith(
      "/whatsapp/notifications/templates",
      expect.objectContaining({ channel: "META_CLOUD" })
    );
  });

  test("┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪▒╪¿┘ê╪╖ ╪¿╪¡╪º┘ä╪⌐ ╪¬╪º┘å┘è╪⌐ ┘ä╪│┘ç ╪¿┘è╪╕┘ç╪▒ ┘ä┘ä╪º╪«╪¬┘è╪º╪▒ (multi-bind) + ╪¬┘ê╪╢┘è╪¡ ╪º┘ä╪▒╪¿╪╖", async () => {
    mockApi(makeStatus({}));
    apiClient.get.mockImplementation((url: string) => {
      if (url === "/order-status/with-templates") {
        return Promise.resolve({ data: { success: true, data: [makeStatus({})] } });
      }
      if (url === "/whatsapp/notifications/settings") {
        return Promise.resolve({ data: { success: true, settings: { defaultSessionId: "ms1" }, sessions: [] } });
      }
      if (url === "/whatsapp-notifications/templates/delivery-preview") {
        return Promise.resolve({
          data: { success: true, defaultSession: { id: "ms1", name: "╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º", provider: "META_CLOUD" }, preview: [] },
        });
      }
      if (url === "/whatsapp/sessions") {
        return Promise.resolve({ data: { sessions: META_SESSIONS } });
      }
      if (url.startsWith("/whatsapp-notifications/templates/meta-available")) {
        return Promise.resolve({
          data: {
            templates: [
              {
                name: "order_confirm_ar",
                status: "APPROVED",
                language: "ar",
                category: "UTILITY",
                components: [{ type: "BODY", text: "┘à╪▒╪¡╪¿╪º┘ï {{1}}╪î ╪╖┘ä╪¿┘â {{2}} ┘ü┘è ╪º┘ä╪╖╪▒┘è┘é" }],
                boundToLocalTemplateIds: ["t-other"],
                boundToEventTypes: ["SHIPPED"],
                boundToLocalTemplateId: "t-other",
                boundToEventType: "SHIPPED",
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(within(metaSlot()).getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í/ }));

    const select = await screen.findByRole("combobox", { name: /┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»/ });
    expect(within(select).getByText(/┘à╪▒╪¿┘ê╪╖ ╪¿┘Ç SHIPPED/)).toBeInTheDocument();

    await user.selectOptions(select, "order_confirm_ar");
    expect(await screen.findByText(/╪º┘ä┘é╪º┘ä╪¿ ╪»┘ç ┘à╪▒╪¿┘ê╪╖ ╪¡╪º┘ä┘è╪º┘ï ╪¿┘â┘à╪º┘å: SHIPPED/)).toBeInTheDocument();
  });

  test("╪º╪«╪¬┘è╪º╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪¿┘è╪¿┘å┘è ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º┘ä┘à╪¡┘ä┘è ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘ä┘ê ╪º┘ä┘é╪º┘ä╪¿ ┘à╪▒╪¿┘ê╪╖ ╪¿╪¡╪º┘ä╪⌐ ╪¬╪º┘å┘è╪⌐ (auto-fill)", async () => {
    mockApi(makeStatus({}));
    apiClient.get.mockImplementation((url: string) => {
      if (url === "/order-status/with-templates") {
        return Promise.resolve({ data: { success: true, data: [makeStatus({})] } });
      }
      if (url === "/whatsapp/notifications/settings") {
        return Promise.resolve({ data: { success: true, settings: { defaultSessionId: "ms1" }, sessions: [] } });
      }
      if (url === "/whatsapp-notifications/templates/delivery-preview") {
        return Promise.resolve({
          data: { success: true, defaultSession: { id: "ms1", name: "╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º", provider: "META_CLOUD" }, preview: [] },
        });
      }
      if (url === "/whatsapp/sessions") {
        return Promise.resolve({ data: { sessions: META_SESSIONS } });
      }
      if (url.startsWith("/whatsapp-notifications/templates/meta-available")) {
        return Promise.resolve({
          data: {
            templates: [
              {
                name: "order_confirm_ar",
                status: "APPROVED",
                language: "ar",
                category: "UTILITY",
                components: [{ type: "BODY", text: "┘à╪▒╪¡╪¿╪º┘ï {{1}}╪î ╪╖┘ä╪¿┘â {{2}} ┘ü┘è ╪º┘ä╪╖╪▒┘è┘é" }],
                boundToLocalTemplateIds: ["t-other"],
                boundToEventTypes: ["SHIPPED"],
                boundToLocalTemplateId: "t-other",
                boundToEventType: "SHIPPED",
                boundLocalContent: "┘à╪▒╪¡╪¿╪º┘ï {{customerName}}╪î ╪╖┘ä╪¿┘â {{orderNumber}} ┘ü┘è ╪º┘ä╪╖╪▒┘è┘é",
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(within(metaSlot()).getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í/ }));

    // ╪¬┘ê╪│┘è╪╣ ╪º┘ä┘à╪▒╪¼╪╣ ╪º┘ä┘à╪¡┘ä┘è ╪╣╪┤╪º┘å ┘å╪┤┘ê┘ü ╪º┘ä┘Ç textarea
    await user.click(screen.getByRole("button", { name: /╪º┘ä┘à╪▒╪¼╪╣ ╪º┘ä┘à╪¡┘ä┘è/ }));
    const textarea = await screen.findByRole("textbox", { name: /┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è/ });
    expect(textarea).toHaveValue("┘à╪▒╪¡╪¿╪º {{customerName}} ╪ú┘â╪» ╪╖┘ä╪¿┘â");

    const select = await screen.findByRole("combobox", { name: /┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»/ });
    await user.selectOptions(select, "order_confirm_ar");

    // ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º╪¬╪¿┘å┘ë ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘à┘å ┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪▒╪¿┘ê╪╖
    expect(textarea).toHaveValue("┘à╪▒╪¡╪¿╪º┘ï {{customerName}}╪î ╪╖┘ä╪¿┘â {{orderNumber}} ┘ü┘è ╪º┘ä╪╖╪▒┘è┘é");
    expect(await screen.findByText(/╪º╪¬╪¿┘å┘ë ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º┘ä┘à╪¡┘ä┘è ╪¬┘ä┘é╪º╪ª┘è╪º┘ï/)).toBeInTheDocument();
  });

  test("╪º╪«╪¬┘è╪º╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪¿╪»┘ê┘å ╪▒╪¿╪╖ ╪¿┘è╪¿┘å┘è ┘à╪¡╪¬┘ê┘ë ╪º┘ü╪¬╪▒╪º╪╢┘è ┘à┘å ┘å╪╡ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º", async () => {
    mockApi(makeStatus({}));
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(within(metaSlot()).getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í/ }));

    await user.click(screen.getByRole("button", { name: /╪º┘ä┘à╪▒╪¼╪╣ ╪º┘ä┘à╪¡┘ä┘è/ }));
    const textarea = await screen.findByRole("textbox", { name: /┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è/ });
    const select = await screen.findByRole("combobox", { name: /┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»/ });
    await user.selectOptions(select, "order_confirm_ar");

    expect(textarea).toHaveValue("┘à╪▒╪¡╪¿╪º┘ï {{customerName}}╪î ╪╖┘ä╪¿┘â {{orderNumber}} ┘ü┘è ╪º┘ä╪╖╪▒┘è┘é");
  });

  test("╪¿┘è┘à┘å╪╣ ╪º┘ä╪¡┘ü╪╕ ┘ä┘à╪º ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪¡┘ä┘è╪⌐ ╪ú┘é┘ä ┘à┘å ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘ê┘è╪╣╪▒╪╢ ╪▒╪│╪º┘ä╪⌐", async () => {
    mockApi(makeStatus({}));
    apiClient.get.mockImplementation((url: string) => {
      if (url === "/order-status/with-templates") {
        return Promise.resolve({ data: { success: true, data: [makeStatus({})] } });
      }
      if (url === "/whatsapp/notifications/settings") {
        return Promise.resolve({ data: { success: true, settings: { defaultSessionId: "ms1" }, sessions: [] } });
      }
      if (url === "/whatsapp-notifications/templates/delivery-preview") {
        return Promise.resolve({
          data: { success: true, defaultSession: { id: "ms1", name: "╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º", provider: "META_CLOUD" }, preview: [] },
        });
      }
      if (url === "/whatsapp/sessions") {
        return Promise.resolve({ data: { sessions: META_SESSIONS } });
      }
      if (url.startsWith("/whatsapp-notifications/templates/meta-available")) {
        return Promise.resolve({ data: { templates: META_TEMPLATES } });
      }
      return Promise.resolve({ data: {} });
    });
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(within(metaSlot()).getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í/ }));

    const select = await screen.findByRole("combobox", { name: /┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»/ });
    await user.selectOptions(select, "order_confirm_ar");

    // ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º╪¬╪¿┘å┘ë ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪¿┘à╪¬╪║┘è╪▒┘è┘å ΓÇö ┘å┘à╪│╪¡ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ┘å╪╣┘â╪│ ╪º┘ä┘Ç mismatch
    await user.click(screen.getByRole("button", { name: /╪º┘ä┘à╪▒╪¼╪╣ ╪º┘ä┘à╪¡┘ä┘è/ }));
    const textarea = screen.getByRole("textbox", { name: /┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è/ });
    await user.clear(textarea);
    await user.type(textarea, "┘å╪╡ ┘à┘å ╪║┘è╪▒ ┘à╪¬╪║┘è╪▒╪º╪¬");

    expect(await screen.findByRole("alert")).toHaveTextContent(/┘à╪¡╪¬╪º╪¼/);
    expect(screen.getByRole("button", { name: /╪¡┘ü╪╕ ┘ê╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º/ })).toBeDisabled();
  });

  test("╪¬╪║┘è┘è╪▒ ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘è┘ü╪¬╪¡ ┘ê╪╢╪╣ ╪¿╪│┘è╪╖ (switch) ╪¿╪»┘ê┘å ┘à╪¡╪▒╪▒ ┘à╪¡╪¬┘ê┘ë ┘ê┘è╪▒╪¿╪╖ ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪«╪¬╪º╪▒", async () => {
    mockApi(
      makeStatus({
        metaTemplate: {
          id: "mt1",
          name: "┘é╪º┘ä╪¿ ╪╖┘ä╪¿ ╪¼╪»┘è╪»",
          content: "┘à╪▒╪¡╪¿╪º {{customerName}} ╪ú┘â╪» ╪╖┘ä╪¿┘â",
          eventType: "CONFIRMED",
          isActive: true,
          channel: "META_CLOUD",
          metaTemplateName: "order_confirm_ar",
          metaTemplateStatus: "APPROVED",
        },
      })
    );
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(within(metaSlot()).getByRole("button", { name: /╪¬╪║┘è┘è╪▒ ╪º┘ä┘é╪º┘ä╪¿/ }));

    expect(await screen.findByText(/╪¬╪║┘è┘è╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º: ┘à╪ñ┘â╪»/)).toBeInTheDocument();
    // ┘ê╪╢╪╣ switch ┘à┘ü┘è╪┤ ┘à╪¡╪▒╪▒ ┘à╪¡╪¬┘ê┘ë
    expect(screen.queryByRole("textbox", { name: /┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è/ })).not.toBeInTheDocument();
    // ┘ü┘è ╪▓╪▒ ╪▒╪¿╪╖/╪¡┘ü╪╕ ╪¿╪│┘è╪╖
    expect(screen.getByRole("button", { name: /╪¡┘ü╪╕ ╪º┘ä╪¬╪║┘è┘è╪▒/ })).toBeInTheDocument();
  });

  test("╪º┘ä┘à┘ê╪¬ ┘ä╪º ╪¬╪╕┘ç╪▒ ╪▓╪▒ ╪º┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘ü┘è slot ┘à┘è╪¬╪º ╪º┘ä┘à╪▒╪¿┘ê╪╖ ΓÇö ╪º┘ä╪ú╪▓╪▒╪º╪▒ ╪º┘ä╪ú╪▒╪¿╪╣╪⌐ ┘à┘å┘ü╪╡┘ä╪⌐", async () => {
    mockApi(
      makeStatus({
        metaTemplate: {
          id: "mt1",
          name: "┘é╪º┘ä╪¿ ╪╖┘ä╪¿ ╪¼╪»┘è╪»",
          content: "┘à╪▒╪¡╪¿╪º {{customerName}} ╪ú┘â╪» ╪╖┘ä╪¿┘â",
          eventType: "CONFIRMED",
          isActive: true,
          channel: "META_CLOUD",
          metaTemplateName: "order_confirm_ar",
          metaTemplateStatus: "APPROVED",
        },
      })
    );
    renderPage();
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    const slot = metaSlot();
    // ╪ú╪▒╪¿╪╣╪⌐ ╪ú┘ü╪╣╪º┘ä ┘à┘à┘è╪▓╪⌐: ╪¬╪║┘è┘è╪▒ ╪º┘ä┘é╪º┘ä╪¿ + ╪¬╪╣╪»┘è┘ä ╪º┘ä┘à╪¡╪¬┘ê┘ë + ┘ü┘â ╪º┘ä╪▒╪¿╪╖ (+ ┘à╪╣╪º┘è┘å╪⌐)
    expect(within(slot).getByRole("button", { name: /╪¬╪║┘è┘è╪▒ ╪º┘ä┘é╪º┘ä╪¿/ })).toBeInTheDocument();
    expect(within(slot).getByRole("button", { name: /╪¬╪╣╪»┘è┘ä ╪º┘ä┘à╪¡╪¬┘ê┘ë/ })).toBeInTheDocument();
    expect(within(slot).getByRole("button", { name: /┘ü┘â ╪º┘ä╪▒╪¿╪╖/ })).toBeInTheDocument();
    // ╪▓╪▒ ╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘à╪¬╪º╪¡ ╪»╪º╪ª┘à╪º┘ï ┘ü┘è slot ╪º┘ä┘à╪▒╪¿┘ê╪╖ (┘ä┘ä╪Ñ┘å╪┤╪º╪í ┘à┘å ╪¼╪»┘è╪»)
    expect(within(slot).getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿/ })).toBeInTheDocument();
  });
});
