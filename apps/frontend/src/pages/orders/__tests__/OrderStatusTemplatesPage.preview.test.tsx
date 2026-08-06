/**
 * resolveVariablesForPreview بيحل متغيرات القالب بقيم نموذجية عشان المعاينة تكون واقعية.
 * المتغيرات اللي مش معروفة بتظهر باسمها بين أقواس [name].
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import OrderStatusTemplatesPage, { resolveVariablesForPreview } from "../OrderStatusTemplatesPage";

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
  test("يحل المتغيرات المعروفة بقيم نموذجية", () => {
    const result = resolveVariablesForPreview("مرحباً {{customerName}}");
    expect(result).toContain("أحمد محمد");
    expect(result).not.toContain("{{customerName}}");
  });

  test("المتغير غير المعروف بيظهر باسمه بين أقواس", () => {
    expect(resolveVariablesForPreview("كود {{unknownVar}}")).toContain("[unknownVar]");
  });

  test("النص بدون متغيرات بيبقى زي ما هو", () => {
    expect(resolveVariablesForPreview("مرحبا")).toBe("مرحبا");
  });

  test("النص الفارغ بيرجع نص فارغ", () => {
    expect(resolveVariablesForPreview("")).toBe("");
  });

  test("بيحل أكتر من متغير في نفس النص", () => {
    const result = resolveVariablesForPreview("طلبك {{orderNumber}} بقيمة {{total}}");
    expect(result).toContain("ORD-12345");
    expect(result).toContain("500");
  });
});

describe("OrderStatusTemplatesPage preview UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("المعاينة بتعرض المتغيرات محلولة مش مكتوبة بالنيابة", async () => {
    apiClient.get.mockImplementation((url: string) => {
      if (url === "/order-status/with-templates") {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                id: "st1",
                code: "CONFIRMED",
                name: "مؤكد",
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
                  content: "أهلاً {{customerName}}، طلبك {{orderNumber}} في الطريق",
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
    await user.click(screen.getByRole("button", { name: /^معاينة/ }));

    expect(screen.getAllByText(/أحمد محمد/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ORD-12345/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/customerName/)).not.toBeInTheDocument();
  });
});
