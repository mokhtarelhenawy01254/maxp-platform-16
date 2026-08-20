/**
 * ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º5.4 ΓÇö delivery preview UI):
 * OrderStatusTemplatesPage must show the admin the expected delivery fate per
 * status (provider badge + risk badge) so they aren't blind to Meta failures.
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
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../services/apiClient", () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

const { apiClient } = require("../../../services/apiClient") as {
  apiClient: { get: jest.Mock; put: jest.Mock; post: jest.Mock; delete: jest.Mock; patch: jest.Mock };
};

function mockApi({
  defaultSession,
  preview,
}: {
  defaultSession: { id: string; name: string; provider: string; phoneNumber?: string } | null;
  preview: Array<{
    templateId: string;
    eventType: string;
    provider: string | null;
    deliveryStatus: string;
    riskLevel: "none" | "warning" | "danger";
    message: string;
    metaTemplateName?: string | null;
    metaTemplateStatus?: string | null;
  }>;
}) {
  apiClient.get.mockImplementation((url: string) => {
    if (url === "/order-status/with-templates") {
      return Promise.resolve({
        data: {
          success: true,
          data: [
            {
              id: "st1",
              code: "CANCELLED",
              name: "┘à┘ä╪║┘è",
              color: "#ef4444",
              sortOrder: 1,
              statusType: "order",
              notifyCustomer: true,
              isSystemStatus: true,
              hasTemplate: true,
              template: { id: "t1", name: "┘é╪º┘ä╪¿", content: "┘à╪▒╪¡╪¿╪º", eventType: "CANCELLED", isActive: true },
            },
          ],
        },
      });
    }
    if (url === "/whatsapp/notifications/settings") {
      return Promise.resolve({
        data: {
          success: true,
          settings: { defaultSessionId: defaultSession?.id || null },
          sessions: defaultSession
            ? [{ id: defaultSession.id, name: defaultSession.name, phoneNumber: defaultSession.phoneNumber, status: "CONNECTED", provider: defaultSession.provider }]
            : [],
        },
      });
    }
    if (url === "/whatsapp-notifications/templates/delivery-preview") {
      return Promise.resolve({
        data: { success: true, defaultSession, connectedSessionsCount: defaultSession ? 1 : 0, hasBaileysBackup: false, preview },
      });
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

describe("OrderStatusTemplatesPage delivery preview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("┘è╪╣╪▒╪╢ ╪▓╪▒ ╪º╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘ä┘ä╪┤╪º╪▒╪⌐ ╪º┘ä╪¡┘à╪▒╪º (┘à┘è╪¬╪º ╪¿╪»┘ê┘å ┘é╪º┘ä╪¿ ┘à╪╣╪¬┘à╪»)", async () => {
    mockApi({
      defaultSession: { id: "s2", name: "╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º", provider: "META_CLOUD" },
      preview: [
        {
          templateId: "t1",
          eventType: "CANCELLED",
          provider: "META_CLOUD",
          deliveryStatus: "meta_no_template",
          riskLevel: "danger",
          message: "┘à┘è╪¬╪º ╪¿╪»┘ê┘å ┘é╪º┘ä╪¿ ┘à╪╣╪¬┘à╪» ΓÇö ╪│┘è┘ü╪┤┘ä ╪«╪º╪▒╪¼ ┘å╪º┘ü╪░╪⌐ 24 ╪│╪º╪╣╪⌐",
        },
      ],
    });

    renderPage();
    const bindButton = await screen.findByRole("button", { name: /╪º╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º/ });
    expect(bindButton).toBeInTheDocument();
    expect(screen.getByText(/≡ƒö┤/)).toBeInTheDocument();
    expect(screen.getByTitle(/┘à┘è╪¬╪º ╪¿╪»┘ê┘å ┘é╪º┘ä╪¿ ┘à╪╣╪¬┘à╪»/)).toBeInTheDocument();
  });

  test("┘è╪╣╪▒╪╢ ╪▓╪▒ ╪º╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘ä┘ê ┘à┘ü┘è╪┤ ╪¼┘ä╪│╪⌐ ┘à╪¬╪╡┘ä╪⌐", async () => {
    mockApi({
      defaultSession: null,
      preview: [
        {
          templateId: "t1",
          eventType: "CANCELLED",
          provider: null,
          deliveryStatus: "no_session",
          riskLevel: "danger",
          message: "┘ä╪º ╪¬┘ê╪¼╪» ╪¼┘ä╪│╪⌐ ┘ê╪º╪¬╪│╪º╪¿ ┘à╪¬╪╡┘ä╪⌐",
        },
      ],
    });

    renderPage();
    expect(await screen.findByRole("button", { name: /╪º╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º/ })).toBeInTheDocument();
    expect(screen.getByTitle(/┘ä╪º ╪¬┘ê╪¼╪» ╪¼┘ä╪│╪⌐ ┘ê╪º╪¬╪│╪º╪¿ ┘à╪¬╪╡┘ä╪⌐/)).toBeInTheDocument();
  });

  test("┘è╪╣╪▒╪╢ ╪¿╪▒┘ê┘ü╪º┘è╪»╪▒ ╪º┘ä┘Ç default session ╪¼┘å╪¿ dropdown ┘ü┘è ╪¬╪¿┘ê┘è╪¿ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬", async () => {
    mockApi({
      defaultSession: { id: "s2", name: "╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º", provider: "META_CLOUD" },
      preview: [],
    });

    renderPage();
    const user = userEvent.setup();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: /╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬/ }));
    expect(await screen.findByText(/Meta Cloud API/)).toBeInTheDocument();
    expect(screen.getByText(/╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪¡╪º┘ä┘è╪⌐/)).toBeInTheDocument();
  });
});
