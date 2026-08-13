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

    expect(rows).toHaveLength(2);
    const loyalty = rows.find((r) => r.code === "LOYALTY_POINTS_AWARDED")!;
    expect(loyalty.name).toBe("كسب نقاط");
    expect(loyalty.notifyCustomer).toBe(true);
    expect(loyalty.channel).toBe("BAILEYS");
    expect(loyalty.delayValue).toBe(24);
    expect(loyalty.trigger).toBe("عند كسب نقاط");
    // القالب العادي + الميتا مربوطين بالحدث الصحيح
    expect(loyalty.template?.content).toBe("مرحباً {{customerName}} كسبت {{points}} نقطة");
    expect(loyalty.metaTemplate?.content).toBe("مرحباً {{customerName}}");
    // القالب خارج النطاق مستبعد
    expect(loyalty.template?.name).toBe("عادي");
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
    expect(f.enableButtons).toBe(false);
    expect(f.enableMetaSwitch).toBe(false);
    expect(f.categoryMode).toBe("manual");
    expect(customerScopeConfig.tabs.map((t) => t.key)).toEqual(["schedule", "loyalty", "cashback", "quality", "autoDiscount"]);
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
