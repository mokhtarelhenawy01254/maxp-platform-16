import { describe, expect, it } from "vitest";
import { getSidebarConfig } from "../sidebar";

const createOwnerSidebar = (activeApps = ["store"]) =>
  getSidebarConfig((key) => key, {
    role: "OWNER",
    company: {
      isCurrent: true,
      activeApps,
    },
  });

describe("orders settings sidebar links", () => {
  it("hides customer blocklist when customer-blocks app is not active", () => {
    const config = createOwnerSidebar(["store"]);
    const ordersSection = config.find((section) => section.id === "orders");
    const visibleItems =
      ordersSection?.items?.filter((item) => item.hidden !== true) || [];

    expect(ordersSection?.hidden).toBe(false);
    expect(visibleItems.some((item) => item.to === "/settings/orders")).toBe(true);
    expect(
      visibleItems.some(
        (item) => item.to === "/settings/customer-blocks",
      ),
    ).toBe(false);
  });

  it("shows customer blocklist when customer-blocks app is active", () => {
    const config = createOwnerSidebar(["store", "customer-blocks"]);
    const ordersSection = config.find((section) => section.id === "orders");
    const visibleItems =
      ordersSection?.items?.filter((item) => item.hidden !== true) || [];

    expect(ordersSection?.hidden).toBe(false);
    expect(
      visibleItems.some(
        (item) => item.to === "/settings/customer-blocks",
      ),
    ).toBe(true);
  });
});
