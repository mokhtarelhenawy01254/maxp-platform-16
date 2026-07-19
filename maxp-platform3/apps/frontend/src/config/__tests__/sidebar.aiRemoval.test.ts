import { describe, expect, it } from "vitest";
import { getSidebarConfig } from "../sidebar";

const removedAiRoutes = new Set([
  "/settings/ai",
  "/settings/company-assistant",
  "/company-assistant/chat",
  "/ai-skills",
  "/ai-approvals",
  "/test-chat",
  "/settings/workspace-files",
  "/rag-analytics",
  "/admin/rag",
  "/admin/ai-approvals",
  "/admin/ai-settings",
  "/image-studio",
  "/posts/ai-tracking",
  "/advertising/facebook-ads/ai-builder",
]);

const collectRoutes = (config: ReturnType<typeof getSidebarConfig>) =>
  config.flatMap((section) => section.items.map((item) => item.to));

describe("AI sidebar removal", () => {
  it("keeps removed AI-only routes out of the company sidebar", () => {
    const config = getSidebarConfig((key) => key, {
      role: "OWNER",
      company: {
        isCurrent: true,
        activeApps: [
          "ai-chat-basic",
          "ai-rag-knowledge",
          "crm-basic",
          "facebook-ads-pro",
        ],
      },
    });

    const routes = collectRoutes(config);

    expect(config.find((section) => section.id === "ai")).toBeUndefined();
    expect(routes.filter((route) => removedAiRoutes.has(route))).toEqual([]);
    expect(routes).toContain("/settings/smart-replies");
    expect(routes).toContain("/admin/faqs");
    expect(routes).toContain("/admin/policies");
  });
});
