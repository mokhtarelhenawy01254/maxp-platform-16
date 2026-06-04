import {
  matchesSuperAdminNavigationPath,
  shouldUseSuperAdminShell,
} from "../layoutMode";

describe("shouldUseSuperAdminShell", () => {
  it("uses the super admin shell for super admin routes only", () => {
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/super-admin")).toBe(true);
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/super-admin/companies")).toBe(
      true,
    );
    expect(shouldUseSuperAdminShell("SUPER_ADMIN", "/company-dashboard")).toBe(
      false,
    );
  });

  it("keeps company roles on the company shell even when a URL is under super admin", () => {
    expect(shouldUseSuperAdminShell("OWNER", "/super-admin/companies")).toBe(
      false,
    );
    expect(shouldUseSuperAdminShell(null, "/super-admin/companies")).toBe(false);
  });
});

describe("matchesSuperAdminNavigationPath", () => {
  it("treats companies-v2 as the current companies navigation item", () => {
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies-v2",
        "/super-admin/companies",
      ),
    ).toBe(true);
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies-v2/health",
        "/super-admin/companies",
      ),
    ).toBe(true);
  });

  it("keeps unrelated company-like routes separate", () => {
    expect(
      matchesSuperAdminNavigationPath(
        "/super-admin/companies-legacy",
        "/super-admin/companies",
      ),
    ).toBe(false);
  });
});
