import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import routeSeoData from "../public-routes.json";

describe("robots.txt Hardening & Compliance", () => {
  const robotsPath = path.resolve(__dirname, "../../../public/robots.txt");
  const content = fs.readFileSync(robotsPath, "utf-8");
  const lines = content.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

  const disallows = lines
    .filter((l) => l.startsWith("Disallow:"))
    .map((l) => l.replace(/^Disallow:\s*/, "").trim());

  it("ensures robots.txt exists and specifies User-agent: * and Sitemap", () => {
    expect(lines).toContain("User-agent: *");
    expect(lines).toContain("Allow: /");
    expect(lines.some((l) => l.startsWith("Sitemap: https://maxp.online/sitemap.xml"))).toBe(true);
  });

  it("strictly disallows both slash and non-slash variants for admin and super-admin", () => {
    expect(disallows).toContain("/admin");
    expect(disallows).toContain("/admin/");
    expect(disallows).toContain("/super-admin");
    expect(disallows).toContain("/super-admin/");
  });

  it("strictly disallows all modern merchant and operational backoffice modules", () => {
    const requiredBackofficeModules = [
      "/dashboard",
      "/orders",
      "/products",
      "/customers",
      "/conversations",
      "/inbox",
      "/unified-inbox",
      "/analytics",
      "/advertising",
      "/inventory",
      "/settings",
      "/pos",
      "/procurement",
      "/wholesale",
      "/ai-agents",
      "/agency",
      "/developer",
      "/partner-dashboard",
      "/moderator-dashboard",
      "/my-dashboard",
      "/company-dashboard",
      "/affiliates/dashboard",
      "/tasks",
      "/shipping",
      "/courier",
      "/wallet",
      "/dental-lab",
      "/doctor",
      "/patient",
      "/lab",
      "/radiology",
    ];

    for (const mod of requiredBackofficeModules) {
      expect(disallows).toContain(mod);
    }
  });

  it("never disallows public marketing routes from public-routes.json", () => {
    const publicPaths = (routeSeoData.routes || [])
      .map((r: { path: string }) => r.path)
      .filter((p: string) => !p.startsWith("/lp/clothing-bundle-")); // intentional ad disallow

    for (const pubPath of publicPaths) {
      // Disallow prefix must not match the public path
      const matchedDisallow = disallows.find((d) => pubPath === d || pubPath.startsWith(`${d}/`));
      expect(
        matchedDisallow,
        `Public route '${pubPath}' must not be blocked by robots.txt rule '${matchedDisallow}'`,
      ).toBeUndefined();
    }
  });
});
