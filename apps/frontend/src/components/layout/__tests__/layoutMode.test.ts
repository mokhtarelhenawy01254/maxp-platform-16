import { describe, it, expect } from "vitest";
import {
  FEATURE_UNIFIED_SUPERADMIN_SHELL,
  matchesSuperAdminNavigationPath,
  shouldUseSuperAdminShell,
} from "../layoutMode";

describe("shouldUseSuperAdminShell", () => {
  it("uses the super admin shell for super admin routes only", () => {
    const expected = !FEATURE_UNIFIED_SUPERADMIN_SHELL;
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/super-admin")).toBe(expected);
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/super-admin/companies-v2")).toBe(
      expected,
    );
    expect(
      shouldUseSuperAdminShell("SUPER_ADMIN", "/super-admin/companies/cmuuxrfpz08cdju0waqwzfrf0"),
    ).toBe(expected);
    expect(
      shouldUseSuperAdminShell("SUPER_ADMIN", "/super-admin/companies-v2/cmuuxrfpz08cdju0waqwzfrf0"),
    ).toBe(expected);
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/admin/support")).toBe(expected);
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/admin/ai-hub")).toBe(expected);
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/company-dashboard")).toBe(
      false,
    );
  });

  it("keeps company roles on the company shell even when a URL is under super admin", () => {
    expect(shouldUseSuperAdminShell("OWNER", "/super-admin/companies-v2")).toBe(
      false,
    );
    expect(
      shouldUseSuperAdminShell("OWNER", "/super-admin/companies/cmuuxrfpz08cdju0waqwzfrf0"),
    ).toBe(false);
    expect(shouldUseSuperAdminShell(null, "/super-admin/companies-v2")).toBe(false);
  });
});

describe("matchesSuperAdminNavigationPath", () => {
  it("matches the companies route and company details routes", () => {
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies-v2",
        "/super-admin/companies-v2",
      ),
    ).toBe(true);
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies",
        "/super-admin/companies-v2",
      ),
    ).toBe(true);
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies/123",
        "/super-admin/companies-v2",
      ),
    ).toBe(true);
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies/cmuuxrfpz08cdju0waqwzfrf0",
        "/super-admin/companies-v2",
      ),
    ).toBe(true);
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies-v2/123",
        "/super-admin/companies-v2",
      ),
    ).toBe(true);
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies-v2/cmuuxrfpz08cdju0waqwzfrf0",
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
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies-reports/123",
        "/super-admin/companies-v2",
      ),
    ).toBe(false);
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/company-activity",
        "/super-admin/companies-v2",
      ),
    ).toBe(false);
  });
});
