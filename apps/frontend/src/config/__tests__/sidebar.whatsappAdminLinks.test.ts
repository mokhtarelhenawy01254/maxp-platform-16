import { describe, expect, it } from "vitest";
import { getSidebarConfig } from "../sidebar";

describe("whatsapp sidebar sections", () => {
  it("shows all 6 WhatsApp sections for legacy whatsapp-integration companies", () => {
    const config = getSidebarConfig((key) => key, {
      role: "OWNER",
      company: {
        isCurrent: true,
        activeApps: ["whatsapp-integration"],
      },
    });

    const whatsappSectionIds = config
      .filter((s) => s.id.startsWith("whatsapp-"))
      .map((s) => s.id);

    expect(whatsappSectionIds).toEqual([
      "whatsapp-inbox",
      "whatsapp-routing",
      "whatsapp-templates",
      "whatsapp-notifications",
      "whatsapp-analytics",
      "whatsapp-settings",
    ]);
  });

  it("shows only the specific sections for granular app installs", () => {
    const config = getSidebarConfig((key) => key, {
      role: "OWNER",
      company: {
        isCurrent: true,
        activeApps: ["whatsapp-inbox", "whatsapp-templates"],
      },
    });

    const visibleSections = config
      .filter((s) => s.id.startsWith("whatsapp-") && !s.hidden)
      .map((s) => s.id);

    expect(visibleSections).toEqual(["whatsapp-inbox", "whatsapp-templates"]);
  });

  it("each WhatsApp section has the correct items", () => {
    const config = getSidebarConfig((key) => key, {
      role: "OWNER",
      company: {
        isCurrent: true,
        activeApps: ["whatsapp-integration"],
      },
    });

    const inboxSection = config.find((s) => s.id === "whatsapp-inbox");
    expect(inboxSection?.hidden).toBe(false);
    expect(inboxSection?.items.map((i) => i.to)).toEqual(["/whatsapp"]);

    const routingSection = config.find((s) => s.id === "whatsapp-routing");
    expect(routingSection?.hidden).toBe(false);
    expect(routingSection?.items.map((i) => i.to)).toEqual(["/whatsapp-inbox", "/settings/inbox"]);

    const templatesSection = config.find((s) => s.id === "whatsapp-templates");
    expect(templatesSection?.hidden).toBe(false);
    expect(templatesSection?.items.map((i) => i.to)).toEqual(["/whatsapp/templates"]);

    const notificationsSection = config.find((s) => s.id === "whatsapp-notifications");
    expect(notificationsSection?.hidden).toBe(false);
    expect(notificationsSection?.items.map((i) => i.to)).toEqual(["/whatsapp/notifications"]);

    const analyticsSection = config.find((s) => s.id === "whatsapp-analytics");
    expect(analyticsSection?.hidden).toBe(false);
    expect(analyticsSection?.items.map((i) => i.to)).toEqual(["/whatsapp/analytics"]);

    const settingsSection = config.find((s) => s.id === "whatsapp-settings");
    expect(settingsSection?.hidden).toBe(false);
    expect(settingsSection?.items.map((i) => i.to)).toEqual(["/whatsapp/settings"]);
  });

  it("hides sections when company has no WhatsApp apps", () => {
    const config = getSidebarConfig((key) => key, {
      role: "OWNER",
      company: {
        isCurrent: true,
        activeApps: [],
      },
    });

    const whatsappSections = config.filter((s) => s.id.startsWith("whatsapp-"));
    whatsappSections.forEach((s) => {
      expect(s.hidden).toBe(true);
    });
  });
});
