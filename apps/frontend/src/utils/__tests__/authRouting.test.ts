import {
  getPostAuthDestination,
  resolvePostAuthDestination,
  saveLastPath,
  isAllowedPostAuthPath,
  getLastPath,
} from "../postAuthRouting";

const installMemoryStorage = () => {
  const store = new Map<string, string>();
  const storage: Storage = {
    length: 0,
    key: jest.fn(() => null),
    getItem: jest.fn((k: string) => store.get(k) ?? null),
    setItem: jest.fn((k: string, v: string) => {
      store.set(k, String(v));
    }),
    removeItem: jest.fn((k: string) => {
      store.delete(k);
    }),
    clear: jest.fn(() => {
      store.clear();
    }),
  };
  Object.defineProperty(global, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  return storage;
};

const companyUser = (overrides: Record<string, unknown> = {}) => ({
  id: "u1",
  role: "MODERATOR",
  permissions: ["orders.view", "customers.view"],
  companyId: "c1",
  ...overrides,
});

describe("getPostAuthDestination", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns user.settings.defaultPage when stored as JSON string", () => {
    expect(
      getPostAuthDestination({
        role: "MODERATOR",
        settings: JSON.stringify({ defaultPage: "/whatsapp#chat" }),
      }),
    ).toBe("/whatsapp#chat");
  });

  it("returns user.settings.defaultPage when stored as object", () => {
    expect(
      getPostAuthDestination({
        role: "AGENT",
        settings: { defaultPage: "/apps/whatsapp" },
      }),
    ).toBe("/apps/whatsapp");
  });

  it("accepts defaultPage equal to /apps when explicitly configured", () => {
    expect(
      getPostAuthDestination({
        role: "AGENT",
        settings: JSON.stringify({ defaultPage: "/apps" }),
      }),
    ).toBe("/apps");
  });

  it("falls back to localStorage maxp-default-page when settings missing", () => {
    localStorage.setItem("maxp-default-page", "/whatsapp/routing");
    expect(getPostAuthDestination({ role: "AGENT" })).toBe("/whatsapp/routing");
  });

  it("returns /merchant-portal for MERCHANT role", () => {
    expect(getPostAuthDestination({ role: "MERCHANT" })).toBe("/merchant-portal");
  });

  it("returns /affiliates/dashboard for AFFILIATE role", () => {
    expect(getPostAuthDestination({ role: "AFFILIATE" })).toBe("/affiliates/dashboard");
  });

  it("returns /super-admin/dev-dashboard for system roles without saved path", () => {
    expect(getPostAuthDestination({ role: "SUPER_ADMIN" })).toBe("/super-admin/dev-dashboard");
  });

  it("returns /super-admin/dev-dashboard for legacy 'Team Lead' only when explicitly SUPER_ADMIN-like is NOT the case", () => {
    expect(getPostAuthDestination({ role: "Team Lead" })).toBe("/apps");
  });

  it("returns /apps (app hub) for regular company roles", () => {
    expect(getPostAuthDestination({ role: "MODERATOR" })).toBe("/apps");
    expect(getPostAuthDestination({ role: "COMPANY_ADMIN" })).toBe("/apps");
    expect(getPostAuthDestination({ role: "EMPLOYEE" })).toBe("/apps");
  });

  it("returns /marketplace for unknown roles and null users", () => {
    expect(getPostAuthDestination({ role: "CUSTOMER" })).toBe("/marketplace");
    expect(getPostAuthDestination(null)).toBe("/marketplace");
  });
});

describe("resolvePostAuthDestination precedence", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("uses state.from as the freshest destination", () => {
    expect(
      resolvePostAuthDestination(companyUser(), "/orders/123"),
    ).toBe("/orders/123");
  });

  it("ignores state.from when it is a public/landing path", () => {
    expect(
      resolvePostAuthDestination(companyUser(), "/auth/register"),
    ).not.toBe("/auth/register");
  });

  it("ignores state.from when the user no longer has access", () => {
    const user = companyUser({ permissions: ["orders.view"] });
    expect(resolvePostAuthDestination(user, "/customers/42")).toBe(
      "/apps",
    );
  });

  it("prioritizes saved default page over last saved path", () => {
    const user = companyUser({ settings: { defaultPage: "/whatsapp#chat" } });
    saveLastPath(user, "/settings");
    expect(resolvePostAuthDestination(user)).toBe("/whatsapp#chat");
  });

  it("falls back to the last saved page before logout when default page is not set", () => {
    const user = companyUser();
    saveLastPath(user, "/settings");
    expect(resolvePostAuthDestination(user)).toBe("/settings");
  });

  it("does not resume a last path the user cannot access anymore", () => {
    const user = companyUser({ permissions: [] });
    saveLastPath(user, "/customers");
    expect(resolvePostAuthDestination(user)).toBe("/apps");
  });

  it("saves last path per user+company", () => {
    const user = companyUser();
    saveLastPath(user, "/settings");
    const other = companyUser({ id: "u2" });
    expect(getLastPathForTest(other)).toBeNull();
  });

  it("merchant never resumes a path outside its portal surface", () => {
    const merchant = companyUser({ role: "MERCHANT" });
    saveLastPath(merchant, "/orders/workspace");
    expect(resolvePostAuthDestination(merchant)).toBe("/merchant-portal");
  });
});

describe("SUPER_ADMIN post-auth routing", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("does not resume a company page like /apps as the last path", () => {
    const superAdmin = { id: "sa1", role: "SUPER_ADMIN" };
    saveLastPath(superAdmin, "/apps");
    expect(getLastPath(superAdmin)).toBeNull();
    expect(resolvePostAuthDestination(superAdmin)).toBe("/super-admin/dev-dashboard");
  });

  it("ignores state.from pointing to /apps", () => {
    const superAdmin = { id: "sa1", role: "SUPER_ADMIN" };
    expect(resolvePostAuthDestination(superAdmin, "/apps")).toBe(
      "/super-admin/dev-dashboard",
    );
  });

  it("resumes a super-admin dashboard path saved before logout", () => {
    const superAdmin = { id: "sa1", role: "SUPER_ADMIN" };
    saveLastPath(superAdmin, "/super-admin/companies-v2");
    expect(resolvePostAuthDestination(superAdmin)).toBe("/super-admin/companies-v2");
  });

  it("resumes state.from pointing to a super-admin path", () => {
    const superAdmin = { id: "sa1", role: "SUPER_ADMIN" };
    expect(resolvePostAuthDestination(superAdmin, "/super-admin/dashboard")).toBe(
      "/super-admin/dashboard",
    );
  });
});

describe("isAllowedPostAuthPath", () => {
  it("rejects public, auth, checkout and landing paths", () => {
    expect(isAllowedPostAuthPath("/auth/login")).toBe(false);
    expect(isAllowedPostAuthPath("/lp/some-page")).toBe(false);
    expect(isAllowedPostAuthPath("/checkout/abc")).toBe(false);
    expect(isAllowedPostAuthPath("/")).toBe(false);
    expect(isAllowedPostAuthPath("/store")).toBe(false);
  });

  it("accepts app paths", () => {
    expect(isAllowedPostAuthPath("/orders")).toBe(true);
    expect(isAllowedPostAuthPath("/settings")).toBe(true);
    expect(isAllowedPostAuthPath("/super-admin/companies")).toBe(true);
    expect(isAllowedPostAuthPath("/marketplace")).toBe(true);
  });
});

// Small helper so the private key format is not asserted inside the test body.
const getLastPathForTest = (user: { id: string; companyId: string }) =>
  localStorage.getItem(`maxp_lastPath:${user.id}:${user.companyId}`);
