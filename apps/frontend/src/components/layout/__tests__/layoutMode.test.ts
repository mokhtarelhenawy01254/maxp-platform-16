import { describe, it, expect } from "vitest";
import {
  matchesSuperAdminNavigationPath,
  shouldUseSuperAdminShell,
} from "../layoutMode";

describe("shouldUseSuperAdminShell", () => {
  it("uses the super admin shell for super admin routes only", () => {
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/super-admin")).toBe(true);
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/super-admin/companies-v2")).toBe(
      true,
    );
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/admin/support")).toBe(true);
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/admin/ai-hub")).toBe(true);
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/company-dashboard")).toBe(
      false,
    );
  });

  it("keeps company roles on the company shell even when a URL is under super admin", () => {
    expect(shouldUseSuperAdminShell("OWNER", "/super-admin/companies-v2")).toBe(
      false,
    );
    expect(shouldUseSuperAdminShell(null, "/super-admin/companies-v2")).toBe(false);
  });
});

describe("matchesSuperAdminNavigationPath", () => {
  it("matches the companies route", () => {
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies-v2",
        "/super-admin/companies-v2",
      ),
    ).toBe(true);
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies/123",
        "/super-admin/companies-v2",
      ),
    ).toBe(false);
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies-v2/123",
        "/super-admin/companies-v2",
      ),
    ).toBe(true);
  });

  it("keeps unrelated company-like routes separate", () => {
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies-reports",
        "/super-admin/companies-v2",
      ),
    ).toBe(false);
  });
});
