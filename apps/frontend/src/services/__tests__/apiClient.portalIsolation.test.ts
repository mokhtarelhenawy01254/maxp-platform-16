// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { apiClient } from "../apiClient";
import { tokenManager } from "../../utils/tokenManager";

function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.sig`;
}

describe("apiClient portal isolation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    tokenManager.clearTokens();
    window.history.replaceState({}, "", "/");
  });

  test("preserves explicit Authorization and prevents ERP X-Company-Id leak on portal routes", async () => {
    const erpToken = makeJwt({ userId: "admin_1", companyId: "cmp_erp", role: "COMPANY_ADMIN" });
    const portalToken = makeJwt({ parentId: "p_1", companyId: "cmp_portal", role: "PARENT" });

    tokenManager.setAccessToken(erpToken);
    window.localStorage.setItem("user", JSON.stringify({ companyId: "cmp_erp" }));
    window.localStorage.setItem("currentCompanyId", "cmp_erp");

    let capturedConfig: Record<string, unknown> = {};

    window.history.replaceState({}, "", "/parent/dashboard");

    // 1. Explicit portal Authorization MUST NOT be overwritten and MUST resolve companyId from portalToken
    await apiClient.get("/education/parent-portal/dashboard", {
      headers: {
        Authorization: `Bearer ${portalToken}`,
      },
      adapter: async (cfg) => {
        capturedConfig = {
          headers: { ...(cfg.headers as Record<string, unknown>) },
          _skipAuthRefresh: (cfg as unknown as Record<string, unknown>)["_skipAuthRefresh"],
        };
        return {
          data: { success: true },
          status: 200,
          statusText: "OK",
          headers: {},
          config: cfg,
        };
      },
    });

    const headers1 = capturedConfig["headers"] as Record<string, unknown>;
    expect(headers1["Authorization"]).toBe(`Bearer ${portalToken}`);
    expect(headers1["X-Company-Id"]).toBe("cmp_portal");
    expect(capturedConfig["_skipAuthRefresh"]).toBe(true);

    // 2. Unauthenticated public call on portal login MUST NOT attach ERP Authorization or ERP X-Company-Id
    await apiClient.get("/public/storefront/settings", {
      adapter: async (cfg) => {
        capturedConfig = {
          headers: { ...(cfg.headers as Record<string, unknown>) },
        };
        return {
          data: { success: true },
          status: 200,
          statusText: "OK",
          headers: {},
          config: cfg,
        };
      },
    });

    const headers2 = capturedConfig["headers"] as Record<string, unknown>;
    expect(headers2["Authorization"]).toBeUndefined();
    expect(headers2["X-Company-Id"]).toBeUndefined();

    // 3. Regular ERP route (/dashboard) continues receiving ERP Authorization & X-Company-Id
    window.history.replaceState({}, "", "/dashboard");
    await apiClient.get("/orders", {
      adapter: async (cfg) => {
        capturedConfig = {
          headers: { ...(cfg.headers as Record<string, unknown>) },
        };
        return {
          data: { success: true },
          status: 200,
          statusText: "OK",
          headers: {},
          config: cfg,
        };
      },
    });

    const headers3 = capturedConfig["headers"] as Record<string, unknown>;
    expect(headers3["Authorization"]).toBe(`Bearer ${erpToken}`);
    expect(headers3["X-Company-Id"]).toBe("cmp_erp");
  });

  test("allows CUSTOMER token on /account while blocking ERP staff token on /account", async () => {
    let capturedHeaders: Record<string, unknown> = {};

    window.history.replaceState({}, "", "/account");

    // ERP admin token should NOT leak into /account
    const erpToken = makeJwt({ userId: "admin_1", companyId: "cmp_erp", role: "COMPANY_ADMIN" });
    tokenManager.setAccessToken(erpToken);
    window.localStorage.setItem("currentCompanyId", "cmp_erp");

    await apiClient.get("/public/storefront/settings", {
      adapter: async (cfg) => {
        capturedHeaders = { ...(cfg.headers as Record<string, unknown>) };
        return { data: { success: true }, status: 200, statusText: "OK", headers: {}, config: cfg };
      },
    });
    expect(capturedHeaders["Authorization"]).toBeUndefined();
    expect(capturedHeaders["X-Company-Id"]).toBeUndefined();

    // CUSTOMER token SHOULD work on /account
    const customerToken = makeJwt({ userId: "cust_1", companyId: "cmp_store", role: "CUSTOMER" });
    tokenManager.setAccessToken(customerToken);

    await apiClient.get("/wholesale-portal/me", {
      adapter: async (cfg) => {
        capturedHeaders = { ...(cfg.headers as Record<string, unknown>) };
        return { data: { success: true }, status: 200, statusText: "OK", headers: {}, config: cfg };
      },
    });
    expect(capturedHeaders["Authorization"]).toBe(`Bearer ${customerToken}`);
    expect(capturedHeaders["X-Company-Id"]).toBe("cmp_store");
  });
});
