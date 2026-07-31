import { getPostAuthDestination } from "../authRouting";

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
        role: "موديريتور",
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

  it("ignores defaultPage equal to /apps and falls back to role", () => {
    expect(
      getPostAuthDestination({
        role: "AGENT",
        settings: JSON.stringify({ defaultPage: "/apps" }),
      }),
    ).toBe("/marketplace");
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

  it("returns /marketplace for regular company roles", () => {
    expect(getPostAuthDestination({ role: "موديريتور" })).toBe("/marketplace");
    expect(getPostAuthDestination(null)).toBe("/marketplace");
  });
});
