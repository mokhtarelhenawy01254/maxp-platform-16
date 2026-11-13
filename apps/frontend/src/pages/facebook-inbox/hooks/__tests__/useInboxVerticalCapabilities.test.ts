// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { resolveVertical } from "../useInboxVerticalCapabilities";

describe("resolveVertical (Facebook Inbox 4-Tier dynamic vertical resolution)", () => {
  it("Tier 1: Explicit merchant inbox override takes highest priority", () => {
    const apps = new Set(["store", "booking-app"]);
    // Even if store apps exist, merchant explicitly chose education
    const vertical = resolveVertical(
      "ecommerce-retail",
      apps,
      "Store & Academy",
      "store-academy",
      "متجر وأكاديمية",
      "education",
    );
    expect(vertical).toBe("education");
  });

  it("Tier 1: Explicit merchant override can switch education company to commerce", () => {
    const apps = new Set(["academy-app"]);
    const vertical = resolveVertical(
      "education-academy",
      apps,
      "CodeTreps Academy",
      "codetreps",
      "أكاديمية تعليمية",
      "commerce",
    );
    expect(vertical).toBe("commerce");
  });

  it("Tier 2: Resolves education-academy database specialty to education vertical with booking-app", () => {
    const apps = new Set(["booking-app"]);
    const vertical = resolveVertical(
      "education-academy",
      apps,
      "CodeTreps",
      "codetreps",
      "أكاديميات ومراكز التعليم",
    );
    expect(vertical).toBe("education");
  });

  it("Tier 2: Resolves Arabic academy keywords in specialty/name to education vertical", () => {
    const apps = new Set(["booking-app"]);
    const vertical = resolveVertical(null, apps, "أكاديمية العباقرة", "geniuses-academy");
    expect(vertical).toBe("education");
  });

  it("Tier 3: Resolves domain-specific app (academy-app) to education vertical", () => {
    const apps = new Set(["academy-app"]);
    const vertical = resolveVertical(null, apps, "Future Center", "future-center");
    expect(vertical).toBe("education");
  });

  it("Tier 2: Resolves medical clinics to medical vertical only when medical cues exist", () => {
    const apps = new Set(["booking-app"]);
    const vertical = resolveVertical("medical-clinic", apps, "عيادة الحياة", "al-hayah-clinic");
    expect(vertical).toBe("medical");
  });

  it("Tier 4: Generic booking-app alone maps safely to services (NEVER medical)", () => {
    const apps = new Set(["booking-app"]);
    const vertical = resolveVertical(null, apps, "مكتب الرواد للاستشارات", "al-rowad");
    expect(vertical).toBe("services");
    expect(vertical).not.toBe("medical");
  });

  it("Tier 3: Resolves dental labs to dental vertical via domain app", () => {
    const apps = new Set(["dental-lab-app"]);
    const vertical = resolveVertical(null, apps, "معمل الدلتا لتركيبات الأسنان", "delta-lab");
    expect(vertical).toBe("dental");
  });

  it("Tier 4 Default: Resolves ecommerce stores to commerce vertical", () => {
    const apps = new Set(["store", "order-core"]);
    const vertical = resolveVertical(null, apps, "متجر زارا ستايل", "zara-style");
    expect(vertical).toBe("commerce");
  });
});
