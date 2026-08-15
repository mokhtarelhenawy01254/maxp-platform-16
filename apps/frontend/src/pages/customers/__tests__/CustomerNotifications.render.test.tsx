/**
 * CustomerNotifications (عبر TemplateCenter) — التأكد من عرض تبويب الجدولة
 * وشريط الإرسال التجريبي وتبويبات قوالب العملاء.
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
      label: "كسب نقاط",
      category: "loyalty",
      trigger: "عند كسب نقاط",
    },
    {
      id: "s2",
      eventType: "CASHBACK_CREDITED",
      enabled: false,
      activeChannel: "META_CLOUD",
      delayValue: 0,
      delayUnit: "HOURS",
      label: "كاش باك",
      category: "cashback",
      trigger: "عند إضافة الكاش باك",
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

describe("CustomerNotifications عبر TemplateCenter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi();
  });

  test("يعرض العنوان + شريط الإرسال التجريبي + تبويب الجدولة كمفتاح افتراضي", async () => {
    renderPage();
    expect(await screen.findByText("إشعارات العملاء")).toBeInTheDocument();
    // شريط الإرسال التجريبي (خاص بالعملاء)
    expect(screen.getByPlaceholderText("01000000000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /إرسال تجريبي/ })).toBeInTheDocument();
    // التبويبات
    expect(screen.getByRole("button", { name: /جدول الإشعارات/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /مناسبات العملاء/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /قوالب الولاء/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /قوالب الكاش باك/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /قوالب التقسيم/ })).toBeInTheDocument();
  });

  test("تبويب الجدولة يعرض أحداث العملاء بقيمها من الـ schedule", async () => {
    renderPage();
    expect((await screen.findAllByText("كسب نقاط")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("كاش باك").length).toBeGreaterThan(0);
    expect(screen.getByText("عند كسب نقاط")).toBeInTheDocument();
    expect(screen.getByText("24 ساعة")).toBeInTheDocument();
  });

  test("مفتاح التبديل في الجدولة بيكتب للـ schedule عند الحفظ", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findAllByText("كسب نقاط");

    await user.click(screen.getAllByRole("button", { name: /تعديل/ })[0]);
    await user.click(screen.getByRole("button", { name: /حفظ/ }));

    expect(apiClient.put).toHaveBeenCalledWith(
      "/hr/customer-loyalty/notifications/schedule",
      expect.objectContaining({ eventType: "LOYALTY_POINTS_AWARDED" }),
    );
  });

  test("يعرض تبويب تقارير الرسائل الخاص بالعملاء بدون تبويبات الأوردرز (تقارير الحالات/الإعدادات)", async () => {
    renderPage();
    await screen.findAllByText("كسب نقاط");
    // تبويب التقرير الخاص بالعملاء (MARKETING) موجود
    expect(screen.getByRole("button", { name: /تقارير الرسائل/ })).toBeInTheDocument();
    // تبويبات الأوردرز (تقارير الحالات/الإعدادات) مش موجودة في نطاق العملاء
    expect(screen.queryByRole("button", { name: /تقارير الحالات/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^الإعدادات$/ })).not.toBeInTheDocument();
  });

  test("المعاينة في نطاق العملاء تحل متغيراتهم بقيم نموذجية (points/customerName)", async () => {
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
                label: "كسب نقاط",
                category: "loyalty",
                trigger: "عند كسب نقاط",
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
                name: "قالب نقاط",
                content: "كسبت {points} نقطة يا {customerName}",
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
    await user.click(await screen.findByRole("button", { name: /قوالب الولاء/ }));
    await user.click(await screen.findByRole("button", { name: /^معاينة/ }));
    expect(screen.getAllByText(/50 نقطة/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\[points\]/)).not.toBeInTheDocument();
  });
});
