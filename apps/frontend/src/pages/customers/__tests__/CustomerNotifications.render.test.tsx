/**
 * CustomerNotifications (╪╣╪¿╪▒ TemplateCenter) ΓÇö ╪º┘ä╪¬╪ú┘â╪» ┘à┘å ╪╣╪▒╪╢ ╪¬╪¿┘ê┘è╪¿ ╪º┘ä╪¼╪»┘ê┘ä╪⌐
 * ┘ê╪┤╪▒┘è╪╖ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪¬╪¼╪▒┘è╪¿┘è ┘ê╪¬╪¿┘ê┘è╪¿╪º╪¬ ┘é┘ê╪º┘ä╪¿ ╪º┘ä╪╣┘à┘ä╪º╪í.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CustomerNotifications from "../CustomerNotifications";

const mockT = jest.fn((key: string, fallback?: string) => fallback || key);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT, i18n: { language: "ar", dir: () => "rtl" } }),
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

const SCHEDULE = {
  success: true,
  data: [
    {
      id: "s1",
      eventType: "LOYALTY_POINTS_AWARDED",
      enabled: true,
      activeChannel: "BAILEYS",
      delayValue: 24,
      delayUnit: "HOURS",
      label: "┘â╪│╪¿ ┘å┘é╪º╪╖",
      category: "loyalty",
      trigger: "╪╣┘å╪» ┘â╪│╪¿ ┘å┘é╪º╪╖",
    },
    {
      id: "s2",
      eventType: "CASHBACK_CREDITED",
      enabled: false,
      activeChannel: "META_CLOUD",
      delayValue: 0,
      delayUnit: "HOURS",
      label: "┘â╪º╪┤ ╪¿╪º┘â",
      category: "cashback",
      trigger: "╪╣┘å╪» ╪Ñ╪╢╪º┘ü╪⌐ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â",
    },
  ],
};

function mockApi() {
  apiClient.get.mockImplementation((url: string) => {
    if (url === "/hr/customer-loyalty/notifications/schedule") return Promise.resolve({ data: SCHEDULE });
    if (url === "/whatsapp-notifications/templates") return Promise.resolve({ data: { success: true, templates: [] } });
    if (url === "/whatsapp/sessions") return Promise.resolve({ data: { sessions: [] } });
    return Promise.resolve({ data: {} });
  });
  apiClient.put.mockResolvedValue({ data: { success: true } });
  apiClient.post.mockResolvedValue({ data: { success: true } });
}

function renderPage() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CustomerNotifications />
    </MemoryRouter>,
  );
}

describe("CustomerNotifications ╪╣╪¿╪▒ TemplateCenter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi();
  });

  test("┘è╪╣╪▒╪╢ ╪º┘ä╪╣┘å┘ê╪º┘å + ╪┤╪▒┘è╪╖ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪¬╪¼╪▒┘è╪¿┘è + ╪¬╪¿┘ê┘è╪¿ ╪º┘ä╪¼╪»┘ê┘ä╪⌐ ┘â┘à┘ü╪¬╪º╪¡ ╪º┘ü╪¬╪▒╪º╪╢┘è", async () => {
    renderPage();
    expect(await screen.findByText("╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í")).toBeInTheDocument();
    // ╪┤╪▒┘è╪╖ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪¬╪¼╪▒┘è╪¿┘è (╪«╪º╪╡ ╪¿╪º┘ä╪╣┘à┘ä╪º╪í)
    expect(screen.getByPlaceholderText("01000000000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /╪Ñ╪▒╪│╪º┘ä ╪¬╪¼╪▒┘è╪¿┘è/ })).toBeInTheDocument();
    // ╪º┘ä╪¬╪¿┘ê┘è╪¿╪º╪¬
    expect(screen.getByRole("button", { name: /╪¼╪»┘ê┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒╪º╪¬/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /┘é┘ê╪º┘ä╪¿ ┘à┘å╪º╪│╪¿╪º╪¬ ╪º┘ä╪╣┘à┘ä╪º╪í/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /┘é┘ê╪º┘ä╪¿ ╪º┘ä┘ê┘ä╪º╪í/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /┘é┘ê╪º┘ä╪¿ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /┘é┘ê╪º┘ä╪¿ ╪º┘ä╪¬┘é╪│┘è┘à/ })).toBeInTheDocument();
  });

  test("╪¬╪¿┘ê┘è╪¿ ╪º┘ä╪¼╪»┘ê┘ä╪⌐ ┘è╪╣╪▒╪╢ ╪ú╪¡╪»╪º╪½ ╪º┘ä╪╣┘à┘ä╪º╪í ╪¿┘é┘è┘à┘ç╪º ┘à┘å ╪º┘ä┘Ç schedule", async () => {
    renderPage();
    expect((await screen.findAllByText("┘â╪│╪¿ ┘å┘é╪º╪╖")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("┘â╪º╪┤ ╪¿╪º┘â").length).toBeGreaterThan(0);
    expect(screen.getByText("╪╣┘å╪» ┘â╪│╪¿ ┘å┘é╪º╪╖")).toBeInTheDocument();
    expect(screen.getByText("24 ╪│╪º╪╣╪⌐")).toBeInTheDocument();
  });

  test("┘à┘ü╪¬╪º╪¡ ╪º┘ä╪¬╪¿╪»┘è┘ä ┘ü┘è ╪º┘ä╪¼╪»┘ê┘ä╪⌐ ╪¿┘è┘â╪¬╪¿ ┘ä┘ä┘Ç schedule ╪╣┘å╪» ╪º┘ä╪¡┘ü╪╕", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findAllByText("┘â╪│╪¿ ┘å┘é╪º╪╖");

    await user.click(screen.getAllByRole("button", { name: /╪¬╪╣╪»┘è┘ä/ })[0]);
    await user.click(screen.getByRole("button", { name: /╪¡┘ü╪╕/ }));

    expect(apiClient.put).toHaveBeenCalledWith(
      "/hr/customer-loyalty/notifications/schedule",
      expect.objectContaining({ eventType: "LOYALTY_POINTS_AWARDED" }),
    );
  });

  test("┘è╪╣╪▒╪╢ ╪¬╪¿┘ê┘è╪¿ ╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪▒╪│╪º╪ª┘ä ╪º┘ä╪«╪º╪╡ ╪¿╪º┘ä╪╣┘à┘ä╪º╪í ╪¿╪»┘ê┘å ╪¬╪¿┘ê┘è╪¿╪º╪¬ ╪º┘ä╪ú┘ê╪▒╪»╪▒╪▓ (╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬/╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬)", async () => {
    renderPage();
    await screen.findAllByText("┘â╪│╪¿ ┘å┘é╪º╪╖");
    // ╪¬╪¿┘ê┘è╪¿ ╪º┘ä╪¬┘é╪▒┘è╪▒ ╪º┘ä╪«╪º╪╡ ╪¿╪º┘ä╪╣┘à┘ä╪º╪í (MARKETING) ┘à┘ê╪¼┘ê╪»
    expect(screen.getByRole("button", { name: /╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪▒╪│╪º╪ª┘ä/ })).toBeInTheDocument();
    // ╪¬╪¿┘ê┘è╪¿╪º╪¬ ╪º┘ä╪ú┘ê╪▒╪»╪▒╪▓ (╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬/╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬) ┘à╪┤ ┘à┘ê╪¼┘ê╪»╪⌐ ┘ü┘è ┘å╪╖╪º┘é ╪º┘ä╪╣┘à┘ä╪º╪í
    expect(screen.queryByRole("button", { name: /╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬$/ })).not.toBeInTheDocument();
  });

  test("╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ┘ü┘è ┘å╪╖╪º┘é ╪º┘ä╪╣┘à┘ä╪º╪í ╪¬╪¡┘ä ┘à╪¬╪║┘è╪▒╪º╪¬┘ç┘à ╪¿┘é┘è┘à ┘å┘à┘ê╪░╪¼┘è╪⌐ (points/customerName)", async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url === "/hr/customer-loyalty/notifications/schedule") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "s1",
                eventType: "LOYALTY_POINTS_AWARDED",
                enabled: true,
                activeChannel: "BAILEYS",
                delayValue: 0,
                delayUnit: "HOURS",
                label: "┘â╪│╪¿ ┘å┘é╪º╪╖",
                category: "loyalty",
                trigger: "╪╣┘å╪» ┘â╪│╪¿ ┘å┘é╪º╪╖",
              },
            ],
          },
        });
      }
      if (url === "/whatsapp-notifications/templates") {
        return Promise.resolve({
          data: {
            success: true,
            templates: [
              {
                id: "t1",
                eventType: "LOYALTY_POINTS_AWARDED",
                name: "┘é╪º┘ä╪¿ ┘å┘é╪º╪╖",
                content: "┘â╪│╪¿╪¬ {points} ┘å┘é╪╖╪⌐ ┘è╪º {customerName}",
                channel: "BAILEYS",
                isActive: true,
              },
            ],
          },
        });
      }
      if (url === "/whatsapp/sessions") return Promise.resolve({ data: { sessions: [] } });
      return Promise.resolve({ data: {} });
    });
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /┘é┘ê╪º┘ä╪¿ ╪º┘ä┘ê┘ä╪º╪í/ }));
    await user.click(await screen.findByRole("button", { name: /^┘à╪╣╪º┘è┘å╪⌐/ }));
    expect(screen.getAllByText(/50 ┘å┘é╪╖╪⌐/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\[points\]/)).not.toBeInTheDocument();
  });
});
