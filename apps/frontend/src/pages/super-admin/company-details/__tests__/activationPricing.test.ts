import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolvePriceSummaryKind } from "../activationPricing";

describe("resolvePriceSummaryKind", () => {
  it("FREE — كل الأدوات غير المثبتة مجانية", () => {
    expect(
      resolvePriceSummaryKind({ freeAppsCount: 3, uninstalledCount: 3, totalMonthlyCost: 0, unknownPricePaidAppsCount: 0 }),
    ).toBe("FREE");
  });

  it("MONTHLY — مجموع شهري بدون أدوات مجهولة السعر", () => {
    expect(
      resolvePriceSummaryKind({ freeAppsCount: 0, uninstalledCount: 2, totalMonthlyCost: 250, unknownPricePaidAppsCount: 0 }),
    ).toBe("MONTHLY");
  });

  it("MONTHLY_WITH_UNKNOWN — مجموع شهري + أدوات بسعر غير محدد", () => {
    expect(
      resolvePriceSummaryKind({ freeAppsCount: 1, uninstalledCount: 4, totalMonthlyCost: 250, unknownPricePaidAppsCount: 2 }),
    ).toBe("MONTHLY_WITH_UNKNOWN");
  });

  it("UNKNOWN — لا مجاني ولا مجموع معروف", () => {
    expect(
      resolvePriceSummaryKind({ freeAppsCount: 0, uninstalledCount: 2, totalMonthlyCost: 0, unknownPricePaidAppsCount: 2 }),
    ).toBe("UNKNOWN");
  });
});

describe("CompanyActivationCenter wiring", () => {
  const source = readFileSync(
    new URL("../CompanyActivationCenter.tsx", import.meta.url),
    "utf8",
  );

  it("يستورد الدالة المستخرجة بدل تكرار المنطق", () => {
    expect(source).toContain("resolvePriceSummaryKind");
    expect(source).toContain("./activationPricing");
  });

  it("مفيش نسخة تانية من شرط المجاني داخل الكومبوننت", () => {
    expect(source).not.toContain("freeAppsCount === uninstalledCount");
  });
});
