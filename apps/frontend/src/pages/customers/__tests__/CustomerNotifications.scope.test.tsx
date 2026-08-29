/**
 * customerScope — التحقق من دمج schedule + templates في EventRow[] موحّد
 * ومن أن الصفحة تعرض تبويب الجدولة بدون كسر النطاق.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { customerScopeConfig } from "../../templates/scopes/customerScope";

describe("customerScope", () => {
  const SCHEDULE = {
    data: {
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
          templates: [],
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
          templates: [],
        },
      ],
    },
  };

  const TEMPLATES = {
    data: {
      success: true,
      templates: [
        {
          id: "t1",
          eventType: "LOYALTY_POINTS_AWARDED",
          name: "عادي",
          content: "مرحباً {customerName} كسبت {points} نقطة",
          channel: "BAILEYS",
          isActive: true,
        },
        {
          id: "t2",
          eventType: "LOYALTY_POINTS_AWARDED",
          name: "ميتا",
          content: "مرحباً {customerName}",
          channel: "META_CLOUD",
          isActive: true,
        },
        {
          id: "t3",
          eventType: "OTHER_EVENT",
          name: "خارج النطاق",
          content: "مش المفروض يظهر",
          channel: "BAILEYS",
          isActive: true,
        },
      ],
    },
  };

  const api = {
    get: jest.fn((url: string) => {
      if (url === "/hr/customer-loyalty/notifications/schedule") return Promise.resolve(SCHEDULE);
      if (url === "/whatsapp-notifications/templates") return Promise.resolve(TEMPLATES);
      return Promise.resolve({ data: {} });
    }),
    put: jest.fn().mockResolvedValue({ data: { success: true } }),
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  test("loadEvents بيدمج schedule + templates في EventRow[] مع تطبيع المتغيرات", async () => {
    const rows = await customerScopeConfig.loadEvents(api as any);

    // صفان من الجدولة — بدون صف placeholder (مناسبة جديدة بقت من الشريط العلوي)
    expect(rows).toHaveLength(2);
    const loyalty = rows.find((r) => r.code === "LOYALTY_POINTS_AWARDED")!;
    // التسمية من EVENT_LABELS الأولاً (الـ backend بيرجّع نص مشوّه الترميز)
    expect(loyalty.name).toBe("كسب نقاط ولاء");
    expect(loyalty.notifyCustomer).toBe(true);
    expect(loyalty.channel).toBe("BAILEYS");
    expect(loyalty.delayValue).toBe(24);
    // الـ trigger بيتعرّض من EVENT_TRIGGERS في الـ scope
    expect(loyalty.trigger).toBe("عند تسليم الطلب");
    // قوالب أحداث الجدولة بتتخزن بصيغة القوس المفرد (variableSyntax: single) —
    // التطبيع للمزدوج بيحصل للعرض فقط (وللمناسبات/المنتجات عند التجميع)
    expect(loyalty.template?.content).toBe("مرحباً {customerName} كسبت {points} نقطة");
    expect(loyalty.metaTemplate?.content).toBe("مرحباً {customerName}");
    // القالب خارج النطاق مستبعد
    expect(loyalty.template?.name).toBe("عادي");
  });

  test("loadEvents مش بيرجّع صف مناسبة جديدة — الإنشاء من الشريط العلوي", async () => {
    const rows = await customerScopeConfig.loadEvents(api as any);
    expect(rows.some((r) => r.id === "__new_occasion__")).toBe(false);
    expect(rows.some((r) => r.id === "__new_product__")).toBe(false);
  });

  test("loadEvents بيجمع قوالب OCCASION حسب eventType: عادي + واتساب بيزنس (ميتا)", async () => {
    const apiOcc = {
      get: jest.fn((url: string) => {
        if (url === "/hr/customer-loyalty/notifications/schedule") return Promise.resolve({ data: { data: [] } });
        if (url === "/whatsapp-notifications/templates") {
          return Promise.resolve({
            data: {
              success: true,
              templates: [
                { id: "occ-regular", eventType: "CUSTOMER_OCCASION_abc", name: "قالب عيد الأم", content: "كل سنة وانتي طيبة {customerName}", channel: "BAILEYS", isActive: true, category: "OCCASION" },
                { id: "occ-meta", eventType: "CUSTOMER_OCCASION_abc", name: "عيد الأم - بيزنس", content: "كل سنة وانتي طيبة {customerName}", channel: "META_CLOUD", isActive: true, category: "OCCASION" },
              ],
            },
          });
        }
        return Promise.resolve({ data: {} });
      }),
      put: jest.fn().mockResolvedValue({ data: { success: true } }),
      post: jest.fn().mockResolvedValue({ data: { success: true } }),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    const rows = await customerScopeConfig.loadEvents(apiOcc as any);
    const occasion = rows.find((r) => r.code === "CUSTOMER_OCCASION_abc")!;
    expect(occasion).toBeDefined();
    expect(occasion.category).toBe("OCCASION");
    // السلوة العادية (واتساب)
    expect(occasion.template?.name).toBe("قالب عيد الأم");
    expect(occasion.template?.content).toBe("كل سنة وانتي طيبة {{customerName}}");
    // السلوة البيزنس (ميتا)
    expect(occasion.metaTemplate?.name).toBe("عيد الأم - بيزنس");
    expect(occasion.hasTemplate).toBe(true);
    expect(occasion.hasMetaTemplate).toBe(true);
    // كل مناسبة = صف واحد بس
    expect(rows.filter((r) => r.category === "OCCASION").length).toBe(1);
  });

  test("toggleNotify في صف OCCASION بيفعّل/يوقف القالب نفسه بدل الـ schedule", async () => {
    await customerScopeConfig.toggleNotify(api as any, { code: "CUSTOMER_OCCASION", category: "OCCASION", template: { id: "occ-1" }, notifyCustomer: false } as any);
    expect(api.put).toHaveBeenCalledWith("/whatsapp-notifications/templates/occ-1", { isActive: true });
  });

  test("toggleNotify بيكتب للـ schedule بنفس الحدث", async () => {
    await customerScopeConfig.toggleNotify(api as any, { code: "CASHBACK_CREDITED", notifyCustomer: false } as any);
    expect(api.put).toHaveBeenCalledWith("/hr/customer-loyalty/notifications/schedule", {
      eventType: "CASHBACK_CREDITED",
      enabled: true,
      activeChannel: "AUTO",
      delayValue: 0,
      delayUnit: "HOURS",
    });
  });

  test("saveSchedule بيكتب كل حقول الجدولة", async () => {
    await customerScopeConfig.saveSchedule!(api as any, { code: "LOYALTY_POINTS_AWARDED" } as any, {
      enabled: true,
      activeChannel: "META_CLOUD",
      delayValue: 12,
      delayUnit: "DAYS",
    });
    expect(api.put).toHaveBeenCalledWith("/hr/customer-loyalty/notifications/schedule", {
      eventType: "LOYALTY_POINTS_AWARDED",
      enabled: true,
      activeChannel: "META_CLOUD",
      delayValue: 12,
      delayUnit: "DAYS",
    });
  });

  test("testSend بيبعت للـ test endpoint", async () => {
    await customerScopeConfig.testSend!(api as any, "01000000000", "LOYALTY_POINTS_AWARDED");
    expect(api.post).toHaveBeenCalledWith("/whatsapp-notifications/test", {
      phone: "01000000000",
      eventType: "LOYALTY_POINTS_AWARDED",
    });
  });

  test("ميزات نطاق العملاء مفعّلة بشكل صحيح", () => {
    const f = customerScopeConfig.features;
    expect(f.enableSchedule).toBe(true);
    expect(f.enableTestSender).toBe(true);
    expect(f.enableButtons).toBe(true);
    expect(f.enableMetaSwitch).toBe(true);
    expect(f.enableReports).toBe(true);
    expect(f.categoryMode).toBe("manual");
    expect(customerScopeConfig.tabs.map((t) => t.key)).toEqual([
      "schedule",
      "occasions",
      "products",
      "loyalty",
      "cashback",
      "quality",
      "autoDiscount",
      "delivery",
      "birthday",
      "review",
      "cadence",
      "reports",
    ]);
  });

  test("تسمية الكيان ومسار الإعدادات — لأن تبويب الإعدادات معطّل في النطاق", () => {
    expect(customerScopeConfig.entityLabel).toEqual({ singular: "حدث", plural: "أحداث" });
    expect(customerScopeConfig.settingsPath).toBe("/orders/status-templates");
    expect(customerScopeConfig.features.enableSettings).toBe(false);
  });

  test("نطاق الخصم التلقائي يشمل الأحداث الثلاثة ومتغيراته", () => {
    const adEvents = (customerScopeConfig as any).tabs.find((t: any) => t.key === "autoDiscount");
    expect(adEvents).toBeDefined();
    const vars = customerScopeConfig.variables.map((v) => v.var);
    expect(vars).toContain("{discountPercent}");
    expect(vars).toContain("{voucherAmount}");
    expect(vars).toContain("{validityDays}");
    expect(customerScopeConfig.sampleVariables.discountPercent).toBe("10");
    expect(customerScopeConfig.sampleVariables.voucherAmount).toBe("50.00");
  });
});
