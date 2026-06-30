import { describe, expect, it } from "vitest";
import { getSidebarConfig } from "../sidebar";

const createOwnerSidebar = () =>
  getSidebarConfig((key) => key, {
    role: "OWNER",
    company: {
      isCurrent: true,
      activeApps: ["whatsapp-integration"],
    },
  });

describe("whatsapp sidebar admin links", () => {
  it("keeps the WhatsApp section in the requested admin order", () => {
    const config = createOwnerSidebar();
    const whatsappSection = config.find((section) => section.id === "whatsapp");
    const visibleItems =
      whatsappSection?.items?.filter((item) => item.hidden !== true) || [];

    expect(whatsappSection?.hidden).toBe(false);
    expect(visibleItems.map((item) => item.to)).toEqual([
      "/whatsapp",
      "/whatsapp/notifications",
      "/whatsapp-inbox",
      "/whatsapp/settings",
      "/whatsapp/analytics",
    ]);
  });
});
