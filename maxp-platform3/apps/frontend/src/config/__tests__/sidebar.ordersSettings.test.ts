import { describe, expect, it } from "vitest";
import { getSidebarConfig } from "../sidebar";

const createOwnerSidebar = () =>
  getSidebarConfig((key) => key, {
    role: "OWNER",
    company: {
      isCurrent: true,
      activeApps: ["ecommerce-basic"],
    },
  });

describe("orders settings sidebar links", () => {
  it("keeps customer blocklist as a separate orders sidebar item", () => {
    const config = createOwnerSidebar();
    const ordersSection = config.find((section) => section.id === "orders");
    const visibleItems =
      ordersSection?.items?.filter((item) => item.hidden !== true) || [];

    expect(ordersSection?.hidden).toBe(false);
    expect(visibleItems.some((item) => item.to === "/settings/orders")).toBe(true);
    expect(
      visibleItems.some(
        (item) => item.to === "/settings/customer-blocks",
      ),
    ).toBe(true);
  });
});
