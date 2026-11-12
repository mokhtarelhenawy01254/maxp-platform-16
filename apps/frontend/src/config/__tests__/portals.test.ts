import { describe, expect, test } from "vitest";
import {
  PORTAL_PREFIXES,
  PORTAL_AUTH_BYPASS_PATHS,
  PORTAL_CONNECT_PREFIXES,
  isPortalPath,
  isPortalAuthBypassPath,
  isPortalOrRegistrationPath,
  getPortalRoleFromPath,
  getPortalEntryPath,
  isIsolatedPortalContextPath,
} from "../portals";

describe("portals config & routing helpers", () => {
  test("recognizes all configured portal prefixes with exact segment matching", () => {
    for (const prefix of PORTAL_PREFIXES) {
      expect(isPortalPath(prefix)).toBe(true);
      expect(isPortalPath(`${prefix}/dashboard`)).toBe(true);
    }

    expect(isPortalPath("/parenting")).toBe(false);
    expect(isPortalPath("/doctors")).toBe(false);
    expect(isPortalPath("/accounting")).toBe(false);
    expect(isPortalPath("/auth/customer-register")).toBe(false);
  });

  test("handles auth bypass paths and registration bypasses", () => {
    for (const bypass of PORTAL_AUTH_BYPASS_PATHS) {
      expect(isPortalAuthBypassPath(bypass)).toBe(true);
      expect(isPortalOrRegistrationPath(bypass)).toBe(true);
    }
    expect(isPortalOrRegistrationPath("/register/merchant")).toBe(true);
    expect(isPortalOrRegistrationPath("/affiliate-register")).toBe(true);
    expect(isPortalOrRegistrationPath("/proposal/abc")).toBe(true);
    expect(isPortalOrRegistrationPath("/store/product/123")).toBe(false);
  });

  test("resolves portal roles cleanly while keeping /portal/production and ERP academy isolated", () => {
    expect(getPortalRoleFromPath("/parent/login")).toBe("parent");
    expect(getPortalRoleFromPath("/teacher/schedule")).toBe("teacher");
    expect(getPortalRoleFromPath("/doctor/dashboard")).toBe("doctor");
    expect(getPortalRoleFromPath("/patient/appointments")).toBe("patient");
    expect(getPortalRoleFromPath("/dental-portal/cases")).toBe("dental");
    expect(getPortalRoleFromPath("/courier-portal")).toBe("courier");
    expect(getPortalRoleFromPath("/portal/my-courses")).toBe("student");
    expect(getPortalRoleFromPath("/academy/portal")).toBe("student");
    expect(getPortalRoleFromPath("/academy/course/c1")).toBe("student");
    expect(getPortalRoleFromPath("/academy/student/login")).toBe("student");
    expect(getPortalRoleFromPath("/account/cashback")).toBe("customer");
    expect(getPortalRoleFromPath("/wholesale-portal/orders")).toBe("wholesale");
    expect(getPortalRoleFromPath("/agency/client-portal/tok")).toBe("client");

    // Manufacturing share links & ERP admin routes must not register portal SW/manifest
    expect(getPortalRoleFromPath("/portal/production/order-token")).toBeNull();
    expect(isPortalPath("/portal/production/order-token")).toBe(false);
    expect(isPortalOrRegistrationPath("/portal/production/order-token")).toBe(true);
    expect(isPortalPath("/client-portal/shipping")).toBe(false);
    expect(isPortalOrRegistrationPath("/client-portal/shipping")).toBe(true);

    // ERP admin LMS pages stay null role & non-portal SW scope so ERP API calls preserve tenant context
    expect(getPortalRoleFromPath("/academy")).toBeNull();
    expect(getPortalRoleFromPath("/academy/dashboard")).toBeNull();
    expect(getPortalRoleFromPath("/academy/courses")).toBeNull();
    expect(getPortalRoleFromPath("/academy/students")).toBeNull();
    expect(isPortalPath("/academy")).toBe(false);
    expect(isPortalPath("/academy/dashboard")).toBe(false);
    expect(isPortalPath("/academy/courses")).toBe(false);
    expect(isPortalPath("/academy/courses/course-1")).toBe(true);
    expect(isPortalPath("/academy/portal")).toBe(true);
  });

  test("identifies isolated portal contexts for apiClient tenant header protection", () => {
    expect(isIsolatedPortalContextPath("/parent/login")).toBe(true);
    expect(isIsolatedPortalContextPath("/dental-portal/dashboard")).toBe(true);
    expect(isIsolatedPortalContextPath("/academy/portal")).toBe(true);
    expect(isIsolatedPortalContextPath("/account")).toBe(true);
    expect(isIsolatedPortalContextPath("/wholesale-portal/orders")).toBe(true);
    expect(isIsolatedPortalContextPath("/auth/customer-register")).toBe(true);
    expect(isIsolatedPortalContextPath("/portal/production/tok")).toBe(true);

    expect(isIsolatedPortalContextPath("/academy/dashboard")).toBe(false);
    expect(isIsolatedPortalContextPath("/client-portal/shipping")).toBe(false);
    expect(isIsolatedPortalContextPath("/orders")).toBe(false);
  });

  test("excludes /i, /i/:slug, and /portal-connect from storefront without registering actor portal SWs", () => {
    for (const prefix of PORTAL_CONNECT_PREFIXES) {
      expect(isPortalOrRegistrationPath(prefix)).toBe(true);
      expect(isPortalPath(prefix)).toBe(false);
      expect(isIsolatedPortalContextPath(prefix)).toBe(true);
    }
    expect(isPortalOrRegistrationPath("/i/swan")).toBe(true);
    expect(isPortalOrRegistrationPath("/portal-connect?portal=parent")).toBe(true);
    expect(isPortalPath("/i/swan")).toBe(false);
    expect(isPortalPath("/portal-connect")).toBe(false);
    expect(isPortalOrRegistrationPath("/invite/swan")).toBe(false);
  });

  test("getPortalEntryPath resolves login and dashboard routes for all portal keys", () => {
    expect(getPortalEntryPath("parent", false)).toBe("/parent/login");
    expect(getPortalEntryPath("parent", true)).toBe("/parent/dashboard");
    expect(getPortalEntryPath("teacher", false)).toBe("/teacher/login");
    expect(getPortalEntryPath("teacher", true)).toBe("/teacher/dashboard");
    expect(getPortalEntryPath("student", false)).toBe("/portal/login");
    expect(getPortalEntryPath("student", true)).toBe("/portal/my-courses");
    expect(getPortalEntryPath("academy", false)).toBe("/portal/login");
    expect(getPortalEntryPath("academy", true)).toBe("/portal/my-courses");
    expect(getPortalEntryPath("doctor", false)).toBe("/doctor/login");
    expect(getPortalEntryPath("doctor", true)).toBe("/doctor/dashboard");
    expect(getPortalEntryPath("patient", false)).toBe("/patient/login");
    expect(getPortalEntryPath("patient", true)).toBe("/patient/dashboard");
    expect(getPortalEntryPath("dental", false)).toBe("/dental-portal/login");
    expect(getPortalEntryPath("dental", true)).toBe("/dental-portal/dashboard");
    expect(getPortalEntryPath("courier", false)).toBe("/courier-portal/login");
    expect(getPortalEntryPath("courier", true)).toBe("/courier-portal");
    expect(getPortalEntryPath("wholesale", false)).toBe("/auth/customer-register");
    expect(getPortalEntryPath("wholesale", true)).toBe("/wholesale-portal/orders");
    expect(getPortalEntryPath("customer", false)).toBe("/auth/customer-register");
    expect(getPortalEntryPath("customer", true)).toBe("/account");
    expect(getPortalEntryPath("account", false)).toBe("/auth/customer-register");
    expect(getPortalEntryPath("account", true)).toBe("/account");
    expect(getPortalEntryPath("client", false)).toBe("/client-portal/shipping");
    expect(getPortalEntryPath("client", true)).toBe("/client-portal/shipping");
    expect(getPortalEntryPath(null, false)).toBe("/parent/login");
    expect(getPortalEntryPath(undefined, true)).toBe("/parent/dashboard");
  });
});
