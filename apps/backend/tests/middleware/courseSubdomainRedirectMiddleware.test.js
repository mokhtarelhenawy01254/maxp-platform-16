"use strict";

const {
  handleCourseSubdomainRedirect,
  isApexHost,
} = require("../../middleware/courseSubdomainRedirectMiddleware");

describe("courseSubdomainRedirectMiddleware (قرار مختار 18-10)", () => {
  describe("isApexHost detection", () => {
    it("identifies apex domain as central", () => {
      expect(isApexHost("maxp.online")).toBe(true);
      expect(isApexHost("www.maxp.online")).toBe(true);
      expect(isApexHost("localhost")).toBe(true);
      expect(isApexHost("127.0.0.1")).toBe(true);
      expect(isApexHost("maxp.online:3000")).toBe(true);
    });

    it("identifies tenant subdomains as non-apex", () => {
      expect(isApexHost("max-p.maxp.online")).toBe(false);
      expect(isApexHost("swan.maxp.online")).toBe(false);
      expect(isApexHost("demo.maxp.online")).toBe(false);
      expect(isApexHost("max-p.localhost")).toBe(false);
    });
  });

  describe("handleCourseSubdomainRedirect execution", () => {
    it("redirects apex GET /portal/course/cmuzmwaxs07r2juml2v04xon5 to max-p subdomain via 302", async () => {
      const req = {
        method: "GET",
        path: "/portal/course/cmuzmwaxs07r2juml2v04xon5",
        originalUrl: "/portal/course/cmuzmwaxs07r2juml2v04xon5?utm_source=telegram&utm_content=launch-tg",
        get: jest.fn().mockReturnValue("maxp.online"),
      };
      const res = {
        set: jest.fn(),
        redirect: jest.fn(),
      };
      const next = jest.fn();

      await handleCourseSubdomainRedirect(req, res, next);

      expect(res.redirect).toHaveBeenCalledWith(
        302,
        "https://max-p.maxp.online/portal/course/cmuzmwaxs07r2juml2v04xon5?utm_source=telegram&utm_content=launch-tg"
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("does NOT redirect when already on the company subdomain (no redirect loop)", async () => {
      const req = {
        method: "GET",
        path: "/portal/course/cmuzmwaxs07r2juml2v04xon5",
        originalUrl: "/portal/course/cmuzmwaxs07r2juml2v04xon5",
        get: jest.fn().mockReturnValue("max-p.maxp.online"),
      };
      const res = {
        set: jest.fn(),
        redirect: jest.fn(),
      };
      const next = jest.fn();

      await handleCourseSubdomainRedirect(req, res, next);

      expect(res.redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("does NOT redirect /portal catalog route (catalog stays on apex)", async () => {
      const req = {
        method: "GET",
        path: "/portal",
        originalUrl: "/portal",
        get: jest.fn().mockReturnValue("maxp.online"),
      };
      const res = {
        set: jest.fn(),
        redirect: jest.fn(),
      };
      const next = jest.fn();

      await handleCourseSubdomainRedirect(req, res, next);

      expect(res.redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("does NOT redirect /api/v1 routes", async () => {
      const req = {
        method: "GET",
        path: "/api/v1/academy/courses/cmuzmwaxs07r2juml2v04xon5/outline",
        originalUrl: "/api/v1/academy/courses/cmuzmwaxs07r2juml2v04xon5/outline",
        get: jest.fn().mockReturnValue("maxp.online"),
      };
      const res = {
        set: jest.fn(),
        redirect: jest.fn(),
      };
      const next = jest.fn();

      await handleCourseSubdomainRedirect(req, res, next);

      expect(res.redirect).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
