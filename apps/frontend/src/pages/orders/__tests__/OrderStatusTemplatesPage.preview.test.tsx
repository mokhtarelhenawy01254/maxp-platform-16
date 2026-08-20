/**
 * resolveVariablesForPreview ╪¿┘è╪¡┘ä ┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘é┘è┘à ┘å┘à┘ê╪░╪¼┘è╪⌐ ╪╣╪┤╪º┘å ╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ╪¬┘â┘ê┘å ┘ê╪º┘é╪╣┘è╪⌐.
 * ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘ä┘è ┘à╪┤ ┘à╪╣╪▒┘ê┘ü╪⌐ ╪¿╪¬╪╕┘ç╪▒ ╪¿╪º╪│┘à┘ç╪º ╪¿┘è┘å ╪ú┘é┘ê╪º╪│ [name].
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import OrderStatusTemplatesPage, { resolveVariablesForPreview, buildLocalContentFromMetaBody } from "../OrderStatusTemplatesPage";

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

describe("resolveVariablesForPreview", () => {
  test("┘è╪¡┘ä ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪╣╪▒┘ê┘ü╪⌐ ╪¿┘é┘è┘à ┘å┘à┘ê╪░╪¼┘è╪⌐", () => {
    const result = resolveVariablesForPreview("┘à╪▒╪¡╪¿╪º┘ï {{customerName}}");
    expect(result).toContain("╪ú╪¡┘à╪» ┘à╪¡┘à╪»");
    expect(result).not.toContain("{{customerName}}");
  });

  test("╪º┘ä┘à╪¬╪║┘è╪▒ ╪║┘è╪▒ ╪º┘ä┘à╪╣╪▒┘ê┘ü ╪¿┘è╪╕┘ç╪▒ ╪¿╪º╪│┘à┘ç ╪¿┘è┘å ╪ú┘é┘ê╪º╪│", () => {
    expect(resolveVariablesForPreview("┘â┘ê╪» {{unknownVar}}")).toContain("[unknownVar]");
  });

  test("╪º┘ä┘å╪╡ ╪¿╪»┘ê┘å ┘à╪¬╪║┘è╪▒╪º╪¬ ╪¿┘è╪¿┘é┘ë ╪▓┘è ┘à╪º ┘ç┘ê", () => {
    expect(resolveVariablesForPreview("┘à╪▒╪¡╪¿╪º")).toBe("┘à╪▒╪¡╪¿╪º");
  });

  test("╪º┘ä┘å╪╡ ╪º┘ä┘ü╪º╪▒╪║ ╪¿┘è╪▒╪¼╪╣ ┘å╪╡ ┘ü╪º╪▒╪║", () => {
    expect(resolveVariablesForPreview("")).toBe("");
  });

  test("╪¿┘è╪¡┘ä ╪ú┘â╪¬╪▒ ┘à┘å ┘à╪¬╪║┘è╪▒ ┘ü┘è ┘å┘ü╪│ ╪º┘ä┘å╪╡", () => {
    const result = resolveVariablesForPreview("╪╖┘ä╪¿┘â {{orderNumber}} ╪¿┘é┘è┘à╪⌐ {{total}}");
    expect(result).toContain("ORD-12345");
    expect(result).toContain("500");
  });
});

describe("buildLocalContentFromMetaBody", () => {
  test("╪¿┘è╪¡┘ê┘æ┘ä {{1}} {{2}} ╪Ñ┘ä┘ë ┘à╪¬╪║┘è╪▒╪º╪¬ ┘à╪¡┘ä┘è╪⌐ ╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐", () => {
    const result = buildLocalContentFromMetaBody("╪ú┘ç┘ä┘ï╪º {{1}} ≡ƒæï\n╪╖┘ä╪¿┘â {{2}} ╪¿┘é┘è┘à╪⌐ {{3}}");
    expect(result).toContain("{{customerName}}");
    expect(result).toContain("{{orderNumber}}");
    expect(result).toContain("{{orderItems}}");
    expect(result).not.toContain("{{1}}");
    expect(result).not.toContain("{{2}}");
  });

  test("╪¿┘è╪¡╪º┘ü╪╕ ╪╣┘ä┘ë ╪º┘ä┘å╪╡ ╪º┘ä╪½╪º╪¿╪¬ ┘à┘å ╪║┘è╪▒ ┘à╪¬╪║┘è╪▒╪º╪¬", () => {
    const result = buildLocalContentFromMetaBody("┘à╪▒╪¡╪¿╪º ╪¿┘â ┘ü┘è ╪¬╪╖╪¿┘è┘é┘å╪º");
    expect(result).toBe("┘à╪▒╪¡╪¿╪º ╪¿┘â ┘ü┘è ╪¬╪╖╪¿┘è┘é┘å╪º");
  });

  test("╪¿┘è╪▒╪¼┘æ╪╣ ┘å╪╡ ┘ü╪º╪╢┘è ┘ä┘ê ╪º┘ä┘å╪╡ ┘ü╪º╪╢┘è", () => {
    expect(buildLocalContentFromMetaBody("")).toBe("");
  });

  test("╪¿┘è╪¡╪╖ ╪▒┘é┘à ┘à┘è╪¬╪º ╪▓┘è ┘à╪º ┘ç┘ê ┘ä┘ê ╪º┘ä╪╣╪»┘æ╪º╪» ┘ü╪º┘è╪¬ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪¬╪º╪¡╪⌐", () => {
    const result = buildLocalContentFromMetaBody("{{1}} {{2}} {{3}} {{4}} {{5}} {{6}} {{7}} {{8}} {{9}} {{10}} {{11}} {{12}} {{13}} {{14}} {{15}}");
    expect(result).toContain("{{customerName}}");
    expect(result).toContain("{{reason}}");
    expect(result).toContain("{{15}}");
  });
});

describe("OrderStatusTemplatesPage preview UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ╪¿╪¬╪╣╪▒╪╢ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ┘à╪¡┘ä┘ê┘ä╪⌐ ┘à╪┤ ┘à┘â╪¬┘ê╪¿╪⌐ ╪¿╪º┘ä┘å┘è╪º╪¿╪⌐", async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url === "/order-status/with-templates") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
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
                  content: "╪ú┘ç┘ä╪º┘ï {{customerName}}╪î ╪╖┘ä╪¿┘â {{orderNumber}} ┘ü┘è ╪º┘ä╪╖╪▒┘è┘é",
                  eventType: "CONFIRMED",
                  isActive: true,
                },
              },
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
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OrderStatusTemplatesPage />
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await screen.findByTestId("status-row-st1");
    await user.click(screen.getByRole("button", { name: /^┘à╪╣╪º┘è┘å╪⌐/ }));

    expect(screen.getAllByText(/╪ú╪¡┘à╪» ┘à╪¡┘à╪»/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ORD-12345/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/customerName/)).not.toBeInTheDocument();
  });
});
