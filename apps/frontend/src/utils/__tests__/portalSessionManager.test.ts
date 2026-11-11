// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import {
  PORTAL_SESSIONS_VAULT_KEY,
  activateCompanySession,
  clearPortalSession,
  decodeJwtPayload,
  getActivePortalToken,
  getCurrentSubdomainFromHost,
  getSavedSessionsForRole,
  normalizePortalCompanyOptions,
  savePortalSession,
  verifyTokenMatchesHostCompany,
} from "../portalSessionManager";

function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) => {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.sig`;
}

describe("portalSessionManager", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test("decodes base64url + UTF-8 Arabic JWT payloads safely", () => {
    const token = makeJwt({
      parentId: "p_1",
      companyId: "cmp_swan",
      companyName: "أكاديمية سوان",
    });

    const decoded = decodeJwtPayload(token);
    expect(decoded).toMatchObject({
      parentId: "p_1",
      companyId: "cmp_swan",
      companyName: "أكاديمية سوان",
    });
    expect(decodeJwtPayload("invalid-token")).toBeNull();
  });

  test("saves multi-company sessions to vault while syncing legacy localStorage keys", () => {
    const tokenA = makeJwt({ parentId: "p_1", companyId: "cmp_a" });
    const tokenB = makeJwt({ parentId: "p_1", companyId: "cmp_b" });

    savePortalSession({
      role: "parent",
      companyId: "cmp_a",
      companyName: "مدرسة ألف",
      companySlug: "alpha",
      token: tokenA,
      profile: { id: "p_1", name: "ولي أمر أ" },
    });

    expect(window.localStorage.getItem("parentToken")).toBe(tokenA);
    expect(JSON.parse(window.localStorage.getItem("parent") || "{}")).toMatchObject({
      name: "ولي أمر أ",
    });

    savePortalSession({
      role: "parent",
      companyId: "cmp_b",
      companyName: "مدرسة باء",
      companySlug: "beta",
      token: tokenB,
      profile: { id: "p_1", name: "ولي أمر ب" },
    });

    expect(window.localStorage.getItem("parentToken")).toBe(tokenB);
    const sessions = getSavedSessionsForRole("parent");
    expect(sessions).toHaveLength(2);
    expect(window.localStorage.getItem(PORTAL_SESSIONS_VAULT_KEY)).toBeTruthy();

    const switched = activateCompanySession("parent", "cmp_a");
    expect(switched?.token).toBe(tokenA);
    expect(window.localStorage.getItem("parentToken")).toBe(tokenA);
  });

  test("syncs student and courier legacy keys and clears properly", () => {
    const studentToken = makeJwt({ id: "st_1", companyId: "cmp_edu" });
    savePortalSession({
      role: "student",
      companyId: "cmp_edu",
      token: studentToken,
      profile: { phone: "01011112222", name: "أحمد علي" },
    });
    expect(window.localStorage.getItem("studentToken")).toBe(studentToken);
    expect(window.localStorage.getItem("studentPhone")).toBe("01011112222");
    expect(window.localStorage.getItem("studentName")).toBe("أحمد علي");

    clearPortalSession("student");
    expect(window.localStorage.getItem("studentToken")).toBeNull();
    expect(window.localStorage.getItem("studentPhone")).toBeNull();
    expect(window.localStorage.getItem("studentName")).toBeNull();

    const courierToken = makeJwt({ courierId: "c_1", companyId: "cmp_ship" });
    savePortalSession({
      role: "courier",
      companyId: "cmp_ship",
      token: courierToken,
      profile: { id: "c_1", name: "كابتن" },
    });
    expect(getActivePortalToken("courier")).toBe(courierToken);
    expect(window.sessionStorage.getItem("courier_portal_token")).toBe(courierToken);

    clearPortalSession("courier", "cmp_ship");
    expect(getActivePortalToken("courier")).toBeNull();
    expect(getSavedSessionsForRole("courier")).toHaveLength(0);
  });

  test("validates token company against host company and extracts subdomains", () => {
    const tokenA = makeJwt({ companyId: "cmp_a" });
    expect(verifyTokenMatchesHostCompany(tokenA, "cmp_a")).toBe(true);
    expect(verifyTokenMatchesHostCompany(tokenA, "cmp_b")).toBe(false);
    expect(verifyTokenMatchesHostCompany(tokenA, null)).toBe(true);

    expect(getCurrentSubdomainFromHost("swan.maxp.online")).toBe("swan");
    expect(getCurrentSubdomainFromHost("app.maxp.online")).toBeNull();
    expect(getCurrentSubdomainFromHost("www.maxp.online")).toBeNull();
    expect(getCurrentSubdomainFromHost("localhost")).toBeNull();
    expect(getCurrentSubdomainFromHost("swan.localhost")).toBe("swan");
  });

  test("normalizes company selection options across standard and dental lab shapes", () => {
    const normalized = normalizePortalCompanyOptions([
      { companyId: "cmp_1", companyName: "معمل النور", clinicName: "عيادة د. كريم" },
      { id: "cmp_2", name: "مركز التفوق", slug: "tafwok", logo: "/uploads/logo.png" },
      { invalid: true },
    ]);
    expect(normalized).toEqual([
      {
        companyId: "cmp_1",
        companyName: "معمل النور",
        companySlug: null,
        companyLogo: null,
        label: "عيادة د. كريم",
      },
      {
        companyId: "cmp_2",
        companyName: "مركز التفوق",
        companySlug: "tafwok",
        companyLogo: "/uploads/logo.png",
        label: null,
      },
    ]);
  });
});
