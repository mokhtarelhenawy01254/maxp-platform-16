/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  applyPublicRouteSeo,
  buildCanonicalUrl,
  getPrivateAppTitle,
  isPrivateAppRoute,
  PRIVATE_APP_PREFIXES,
} from "../publicRouteSeo";

describe("publicRouteSeo & Dashboard Hardening", () => {
  beforeEach(() => {
    // Reset document head and title before each test
    document.title = "Default Title";
    document.head.innerHTML = `
      <link rel="canonical" href="https://maxp.online/" />
      <meta name="robots" content="index, follow" />
    `;
    // Mock apex host
    Object.defineProperty(window, "location", {
      value: { hostname: "maxp.online" },
      writable: true,
    });
  });

  describe("isPrivateAppRoute", () => {
    it("identifies private merchant and admin routes correctly", () => {
      expect(isPrivateAppRoute("/dashboard")).toBe(true);
      expect(isPrivateAppRoute("/dashboard/overview")).toBe(true);
      expect(isPrivateAppRoute("/orders")).toBe(true);
      expect(isPrivateAppRoute("/orders/12345")).toBe(true);
      expect(isPrivateAppRoute("/products")).toBe(true);
      expect(isPrivateAppRoute("/super-admin")).toBe(true);
      expect(isPrivateAppRoute("/super-admin/users")).toBe(true);
      expect(isPrivateAppRoute("/admin")).toBe(true);
      expect(isPrivateAppRoute("/pos")).toBe(true);
      expect(isPrivateAppRoute("/procurement")).toBe(true);
      expect(isPrivateAppRoute("/wholesale")).toBe(true);
      expect(isPrivateAppRoute("/ai-agents")).toBe(true);
      expect(isPrivateAppRoute("/agency")).toBe(true);
      expect(isPrivateAppRoute("/developer")).toBe(true);
      expect(isPrivateAppRoute("/partner-dashboard")).toBe(true);
      expect(isPrivateAppRoute("/moderator-dashboard")).toBe(true);
      expect(isPrivateAppRoute("/my-dashboard")).toBe(true);
      expect(isPrivateAppRoute("/wallet")).toBe(true);
      expect(isPrivateAppRoute("/settings")).toBe(true);
    });

    it("does not classify public marketing routes as private", () => {
      expect(isPrivateAppRoute("/")).toBe(false);
      expect(isPrivateAppRoute("/for-merchants")).toBe(false);
      expect(isPrivateAppRoute("/lp/ai-inbox")).toBe(false);
      expect(isPrivateAppRoute("/register/merchant")).toBe(false);
      expect(isPrivateAppRoute("/faq")).toBe(false);
      expect(isPrivateAppRoute("/privacy")).toBe(false);
      expect(isPrivateAppRoute("/terms")).toBe(false);
      expect(isPrivateAppRoute("/portal")).toBe(false);
      expect(isPrivateAppRoute("/portal/course/cmuzmwaxs07r2juml2v04xon5")).toBe(false);
    });
  });

  describe("getPrivateAppTitle", () => {
    it("returns intuitive tab titles for each private area", () => {
      expect(getPrivateAppTitle("/dashboard")).toBe("لوحة التحكم | MaxP");
      expect(getPrivateAppTitle("/orders")).toBe("إدارة الطلبات | MaxP");
      expect(getPrivateAppTitle("/orders/details/42")).toBe("إدارة الطلبات | MaxP");
      expect(getPrivateAppTitle("/products")).toBe("إدارة المنتجات | MaxP");
      expect(getPrivateAppTitle("/super-admin")).toBe("لوحة تحكم السوبر أدمن | MaxP");
      expect(getPrivateAppTitle("/admin")).toBe("لوحة الإدارة | MaxP");
      expect(getPrivateAppTitle("/pos")).toBe("نظام نقاط البيع (POS) | MaxP");
      expect(getPrivateAppTitle("/settings")).toBe("إعدادات المتجر | MaxP");
    });
  });

  describe("applyPublicRouteSeo on Private Routes", () => {
    it("enforces noindex, nofollow, updates title, and removes canonical link on /dashboard", () => {
      applyPublicRouteSeo("/dashboard");

      expect(document.title).toBe("لوحة التحكم | MaxP");

      const robotsMeta = document.head.querySelector('meta[name="robots"]');
      expect(robotsMeta?.getAttribute("content")).toBe("noindex, nofollow");

      const canonicalLink = document.head.querySelector('link[rel="canonical"]');
      expect(canonicalLink).toBeNull();
    });

    it("enforces noindex, nofollow, updates title, and removes canonical link on /super-admin", () => {
      applyPublicRouteSeo("/super-admin");

      expect(document.title).toBe("لوحة تحكم السوبر أدمن | MaxP");

      const robotsMeta = document.head.querySelector('meta[name="robots"]');
      expect(robotsMeta?.getAttribute("content")).toBe("noindex, nofollow");

      const canonicalLink = document.head.querySelector('link[rel="canonical"]');
      expect(canonicalLink).toBeNull();
    });

    it("enforces noindex, nofollow on deep private routes like /orders/123", () => {
      applyPublicRouteSeo("/orders/123");

      expect(document.title).toBe("إدارة الطلبات | MaxP");

      const robotsMeta = document.head.querySelector('meta[name="robots"]');
      expect(robotsMeta?.getAttribute("content")).toBe("noindex, nofollow");

      const canonicalLink = document.head.querySelector('link[rel="canonical"]');
      expect(canonicalLink).toBeNull();
    });

    it("handles trailing slashes, query params, and hash fragments correctly", () => {
      applyPublicRouteSeo("/super-admin/?tab=users#active");

      expect(document.title).toBe("لوحة تحكم السوبر أدمن | MaxP");

      const robotsMeta = document.head.querySelector('meta[name="robots"]');
      expect(robotsMeta?.getAttribute("content")).toBe("noindex, nofollow");

      const canonicalLink = document.head.querySelector('link[rel="canonical"]');
      expect(canonicalLink).toBeNull();
    });
  });

  describe("applyPublicRouteSeo on Public Routes", () => {
    it("restores canonical and sets index, follow when navigating from private to public", () => {
      // First visit private route
      applyPublicRouteSeo("/dashboard");
      expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");

      // Navigate to public marketing route
      applyPublicRouteSeo("/for-merchants");
      expect(document.title).toContain("Max P للتجارة الإلكترونية");

      const robotsMeta = document.head.querySelector('meta[name="robots"]');
      expect(robotsMeta?.getAttribute("content")).toBe("index, follow");

      const canonicalLink = document.head.querySelector('link[rel="canonical"]');
      expect(canonicalLink?.getAttribute("href")).toBe("https://maxp.online/for-merchants");

      // Navigate to another private route
      applyPublicRouteSeo("/products");
      expect(document.title).toBe("إدارة المنتجات | MaxP");
      expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
    });
  });

  describe("Host Isolation", () => {
    it("is a no-op on non-apex tenant hostnames (e.g. swan.maxp.online)", () => {
      Object.defineProperty(window, "location", {
        value: { hostname: "swan.maxp.online" },
        writable: true,
      });

      const originalTitle = document.title;
      applyPublicRouteSeo("/dashboard");

      // Should not touch title or head
      expect(document.title).toBe(originalTitle);
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("index, follow");
    });
  });
});
