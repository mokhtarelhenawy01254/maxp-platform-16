// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { resolveVertical } from "../useInboxVerticalCapabilities";

describe("resolveVertical (Facebook Inbox dynamic vertical resolution)", () => {
  it("resolves CodeTreps to education vertical even with booking-app installed", () => {
    const apps = new Set(["booking-app"]);
    const vertical = resolveVertical(null, apps, "CodeTreps", "codetreps");
    expect(vertical).toBe("education");
  });

  it("resolves Arabic academy names to education vertical", () => {
    const apps = new Set(["booking-app"]);
    const vertical = resolveVertical(null, apps, "أكاديمية العباقرة للبرمجة", "geniuses-academy");
    expect(vertical).toBe("education");
  });

  it("resolves education-app or academy-app to education vertical", () => {
    const apps = new Set(["academy-app"]);
    const vertical = resolveVertical(null, apps, "Future Center", "future-center");
    expect(vertical).toBe("education");
  });

  it("resolves medical clinics to medical vertical only when medical cues exist", () => {
    const apps = new Set(["booking-app"]);
    const vertical = resolveVertical("clinic-care", apps, "عيادة الحياة", "al-hayah-clinic");
    expect(vertical).toBe("medical");
  });

  it("does NOT classify generic booking-app as medical when no clinic cues exist", () => {
    const apps = new Set(["booking-app"]);
    const vertical = resolveVertical(null, apps, "مكتب الرواد للاستشارات", "al-rowad");
    expect(vertical).toBe("services");
    expect(vertical).not.toBe("medical");
  });

  it("resolves dental labs to dental vertical", () => {
    const apps = new Set(["dental-lab-app"]);
    const vertical = resolveVertical(null, apps, "معمل الدلتا لتركيبات الأسنان", "delta-lab");
    expect(vertical).toBe("dental");
  });

  it("resolves ecommerce stores to commerce vertical", () => {
    const apps = new Set(["store", "order-core"]);
    const vertical = resolveVertical(null, apps, "متجر زارا ستايل", "zara-style");
    expect(vertical).toBe("commerce");
  });
});
