import { describe, expect, it } from "vitest";
import { getSidebarConfig } from "../sidebar";

const createOwnerSidebar = () =>
  getSidebarConfig((key) => key, {
    role: "OWNER",
    company: {
      isCurrent: true,
      activeApps: ["whatsapp-business"],
    },
  });

describe("whatsapp sidebar admin links", () => {
  it("keeps the WhatsApp section in the requested admin order", () => {
    const config = createOwnerSidebar();
    const whatsappSection = config.find((section) => section.id === "whatsapp");
    const visibleItems =
      whatsappSection?.items?.filter((item) => item.hidden !== true) || [];

    expect(whatsappSection?.hidden).toBe(false);
    expect(visibleItems[0].to).toBe("/whatsapp");
    expect(visibleItems.map((item) => item.to)).toContain("/whatsapp/settings");
  });
});
