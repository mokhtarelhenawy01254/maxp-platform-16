import { describe, expect, it } from "vitest";
import { getSidebarConfig } from "../sidebar";

describe("HR and My Account sidebar gating", () => {
  it("hides both my-account and hr sections when no HR apps are active", () => {
    const config = getSidebarConfig((key: string) => key, {
      role: "OWNER",
      company: {
        isCurrent: true,
        activeApps: ["store", "order-core", "whatsapp-business"],
      },
    });

    const myAccountSection = config.find((section) => section.id === "my-account");
    const hrSection = config.find((section) => section.id === "hr");

    expect(myAccountSection?.hidden).toBe(true);
    expect(hrSection?.hidden).toBe(true);
  });

  it("shows my-account and hr sections when hr-core is active", () => {
    const config = getSidebarConfig((key: string) => key, {
      role: "OWNER",
      company: {
        isCurrent: true,
        activeApps: ["hr-core"],
      },
    });

    const myAccountSection = config.find((section) => section.id === "my-account");
    const hrSection = config.find((section) => section.id === "hr");

    expect(myAccountSection?.hidden).toBe(false);
    expect(hrSection?.hidden).toBe(false);
  });
});
