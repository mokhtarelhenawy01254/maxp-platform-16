import { isInternalCourierAppActive } from "./internalCourierHelper";

describe("isInternalCourierAppActive", () => {
  it("returns true for SUPER_ADMIN role regardless of apps", () => {
    expect(isInternalCourierAppActive({ role: "SUPER_ADMIN" })).toBe(true);
  });

  it("returns true when string slug exists in currentCompany.activeApps", () => {
    const user = {
      role: "ADMIN",
      companies: [
        { isCurrent: true, activeApps: ["internal-courier-fleet", "analytics"] },
      ],
    };
    expect(isInternalCourierAppActive(user)).toBe(true);
  });

  it("returns true when object with slug exists in user.company.activeApps", () => {
    const user = {
      role: "MANAGER",
      company: {
        activeApps: [{ slug: "INTERNAL-COURIER-FLEET" }],
      },
    };
    expect(isInternalCourierAppActive(user)).toBe(true);
  });

  it("returns true when nested app.slug exists in user.activeApps", () => {
    const user = {
      role: "MEMBER",
      activeApps: [{ app: { slug: "internal-courier-fleet" } }],
    };
    expect(isInternalCourierAppActive(user)).toBe(true);
  });

  it("returns false when user is null, undefined, or has no courier app", () => {
    expect(isInternalCourierAppActive(null)).toBe(false);
    expect(isInternalCourierAppActive(undefined)).toBe(false);
    expect(isInternalCourierAppActive({ role: "USER", activeApps: [] })).toBe(false);
  });
});
