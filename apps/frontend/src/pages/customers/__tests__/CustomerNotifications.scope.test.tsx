/**
 * customerScope ΓÇö ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪»┘à╪¼ schedule + templates ┘ü┘è EventRow[] ┘à┘ê╪¡┘æ╪»
 * ┘ê┘à┘å ╪ú┘å ╪º┘ä╪╡┘ü╪¡╪⌐ ╪¬╪╣╪▒╪╢ ╪¬╪¿┘ê┘è╪¿ ╪º┘ä╪¼╪»┘ê┘ä╪⌐ ╪¿╪»┘ê┘å ┘â╪│╪▒ ╪º┘ä┘å╪╖╪º┘é.
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
          label: "┘â╪│╪¿ ┘å┘é╪º╪╖",
          category: "loyalty",
          trigger: "╪╣┘å╪» ┘â╪│╪¿ ┘å┘é╪º╪╖",
          templates: [],
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
          name: "╪╣╪º╪»┘è",
          content: "┘à╪▒╪¡╪¿╪º┘ï {customerName} ┘â╪│╪¿╪¬ {points} ┘å┘é╪╖╪⌐",
          channel: "BAILEYS",
          isActive: true,
        },
        {
          id: "t2",
          eventType: "LOYALTY_POINTS_AWARDED",
          name: "┘à┘è╪¬╪º",
          content: "┘à╪▒╪¡╪¿╪º┘ï {customerName}",
          channel: "META_CLOUD",
          isActive: true,
        },
        {
          id: "t3",
          eventType: "OTHER_EVENT",
          name: "╪«╪º╪▒╪¼ ╪º┘ä┘å╪╖╪º┘é",
          content: "┘à╪┤ ╪º┘ä┘à┘ü╪▒┘ê╪╢ ┘è╪╕┘ç╪▒",
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

  test("loadEvents ╪¿┘è╪»┘à╪¼ schedule + templates ┘ü┘è EventRow[] ┘à╪╣ ╪¬╪╖╪¿┘è╪╣ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬", async () => {
    const rows = await customerScopeConfig.loadEvents(api as any);

    expect(rows).toHaveLength(3);
    const loyalty = rows.find((r) => r.code === "LOYALTY_POINTS_AWARDED")!;
    expect(loyalty.name).toBe("┘â╪│╪¿ ┘å┘é╪º╪╖");
    expect(loyalty.notifyCustomer).toBe(true);
    expect(loyalty.channel).toBe("BAILEYS");
    expect(loyalty.delayValue).toBe(24);
    expect(loyalty.trigger).toBe("╪╣┘å╪» ┘â╪│╪¿ ┘å┘é╪º╪╖");
    // ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪╣╪º╪»┘è + ╪º┘ä┘à┘è╪¬╪º ┘à╪▒╪¿┘ê╪╖┘è┘å ╪¿╪º┘ä╪¡╪»╪½ ╪º┘ä╪╡╪¡┘è╪¡
    expect(loyalty.template?.content).toBe("┘à╪▒╪¡╪¿╪º┘ï {{customerName}} ┘â╪│╪¿╪¬ {{points}} ┘å┘é╪╖╪⌐");
    expect(loyalty.metaTemplate?.content).toBe("┘à╪▒╪¡╪¿╪º┘ï {{customerName}}");
    // ╪º┘ä┘é╪º┘ä╪¿ ╪«╪º╪▒╪¼ ╪º┘ä┘å╪╖╪º┘é ┘à╪│╪¬╪¿╪╣╪»
    expect(loyalty.template?.name).toBe("╪╣╪º╪»┘è");
  });

  test("loadEvents ╪¿┘è╪╢┘è┘ü ╪╡┘ü ╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘à┘å╪º╪│╪¿╪⌐ ╪¼╪»┘è╪» (occasions)", async () => {
    const rows = await customerScopeConfig.loadEvents(api as any);
    const newOccasion = rows.find((r) => r.id === "__new_occasion__")!;
    expect(newOccasion).toBeDefined();
    expect(newOccasion.category).toBe("OCCASION");
    expect(newOccasion.hasTemplate).toBe(false);
    expect(newOccasion.notifyCustomer).toBe(true);
  });

  test("loadEvents ╪¿┘è╪¼┘à╪╣ ┘é┘ê╪º┘ä╪¿ OCCASION ╪¡╪│╪¿ eventType: ╪╣╪º╪»┘è + ┘ê╪º╪¬╪│╪º╪¿ ╪¿┘è╪▓┘å╪│ (┘à┘è╪¬╪º)", async () => {
    const apiOcc = {
      get: jest.fn((url: string) => {
        if (url === "/hr/customer-loyalty/notifications/schedule") return Promise.resolve({ data: { data: [] } });
        if (url === "/whatsapp-notifications/templates") {
          return Promise.resolve({
            data: {
              success: true,
              templates: [
                { id: "occ-regular", eventType: "CUSTOMER_OCCASION_abc", name: "┘é╪º┘ä╪¿ ╪╣┘è╪» ╪º┘ä╪ú┘à", content: "┘â┘ä ╪│┘å╪⌐ ┘ê╪º┘å╪¬┘è ╪╖┘è╪¿╪⌐ {customerName}", channel: "BAILEYS", isActive: true, category: "OCCASION" },
                { id: "occ-meta", eventType: "CUSTOMER_OCCASION_abc", name: "╪╣┘è╪» ╪º┘ä╪ú┘à - ╪¿┘è╪▓┘å╪│", content: "┘â┘ä ╪│┘å╪⌐ ┘ê╪º┘å╪¬┘è ╪╖┘è╪¿╪⌐ {customerName}", channel: "META_CLOUD", isActive: true, category: "OCCASION" },
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
    // ╪º┘ä╪│┘ä┘ê╪⌐ ╪º┘ä╪╣╪º╪»┘è╪⌐ (┘ê╪º╪¬╪│╪º╪¿)
    expect(occasion.template?.name).toBe("┘é╪º┘ä╪¿ ╪╣┘è╪» ╪º┘ä╪ú┘à");
    expect(occasion.template?.content).toBe("┘â┘ä ╪│┘å╪⌐ ┘ê╪º┘å╪¬┘è ╪╖┘è╪¿╪⌐ {{customerName}}");
    // ╪º┘ä╪│┘ä┘ê╪⌐ ╪º┘ä╪¿┘è╪▓┘å╪│ (┘à┘è╪¬╪º)
    expect(occasion.metaTemplate?.name).toBe("╪╣┘è╪» ╪º┘ä╪ú┘à - ╪¿┘è╪▓┘å╪│");
    expect(occasion.hasTemplate).toBe(true);
    expect(occasion.hasMetaTemplate).toBe(true);
    // ┘â┘ä ┘à┘å╪º╪│╪¿╪⌐ = ╪╡┘ü ┘ê╪º╪¡╪» ╪¿╪│ (+ ╪╡┘ü "┘à┘å╪º╪│╪¿╪⌐ ╪¼╪»┘è╪»╪⌐" ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è)
    expect(rows.filter((r) => r.category === "OCCASION").length).toBe(2);
    expect(rows.filter((r) => r.category === "OCCASION" && r.id !== "__new_occasion__").length).toBe(1);
  });

  test("toggleNotify ┘ü┘è ╪╡┘ü OCCASION ╪¿┘è┘ü╪╣┘æ┘ä/┘è┘ê┘é┘ü ╪º┘ä┘é╪º┘ä╪¿ ┘å┘ü╪│┘ç ╪¿╪»┘ä ╪º┘ä┘Ç schedule", async () => {
    await customerScopeConfig.toggleNotify(api as any, { code: "CUSTOMER_OCCASION", category: "OCCASION", template: { id: "occ-1" }, notifyCustomer: false } as any);
    expect(api.put).toHaveBeenCalledWith("/whatsapp-notifications/templates/occ-1", { isActive: true });
  });

  test("toggleNotify ╪¿┘è┘â╪¬╪¿ ┘ä┘ä┘Ç schedule ╪¿┘å┘ü╪│ ╪º┘ä╪¡╪»╪½", async () => {
    await customerScopeConfig.toggleNotify(api as any, { code: "CASHBACK_CREDITED", notifyCustomer: false } as any);
    expect(api.put).toHaveBeenCalledWith("/hr/customer-loyalty/notifications/schedule", {
      eventType: "CASHBACK_CREDITED",
      enabled: true,
      activeChannel: "AUTO",
      delayValue: 0,
      delayUnit: "HOURS",
    });
  });

  test("saveSchedule ╪¿┘è┘â╪¬╪¿ ┘â┘ä ╪¡┘é┘ê┘ä ╪º┘ä╪¼╪»┘ê┘ä╪⌐", async () => {
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

  test("testSend ╪¿┘è╪¿╪╣╪¬ ┘ä┘ä┘Ç test endpoint", async () => {
    await customerScopeConfig.testSend!(api as any, "01000000000", "LOYALTY_POINTS_AWARDED");
    expect(api.post).toHaveBeenCalledWith("/whatsapp-notifications/test", {
      phone: "01000000000",
      eventType: "LOYALTY_POINTS_AWARDED",
    });
  });

  test("┘à┘è╪▓╪º╪¬ ┘å╪╖╪º┘é ╪º┘ä╪╣┘à┘ä╪º╪í ┘à┘ü╪╣┘æ┘ä╪⌐ ╪¿╪┤┘â┘ä ╪╡╪¡┘è╪¡", () => {
    const f = customerScopeConfig.features;
    expect(f.enableSchedule).toBe(true);
    expect(f.enableTestSender).toBe(true);
    expect(f.enableButtons).toBe(true);
    expect(f.enableMetaSwitch).toBe(false);
    expect(f.enableReports).toBe(true);
    expect(f.categoryMode).toBe("manual");
    expect(customerScopeConfig.tabs.map((t) => t.key)).toEqual(["schedule", "occasions", "loyalty", "cashback", "quality", "autoDiscount", "reports"]);
  });

  test("┘å╪╖╪º┘é ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘è╪┤┘à┘ä ╪º┘ä╪ú╪¡╪»╪º╪½ ╪º┘ä╪½┘ä╪º╪½╪⌐ ┘ê┘à╪¬╪║┘è╪▒╪º╪¬┘ç", () => {
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
