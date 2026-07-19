import { describe, expect, it } from "vitest";
import { getSidebarConfig } from "../sidebar";

const createOwnerSidebar = (activeApps: string[]) =>
  getSidebarConfig((key) => key, {
    role: "OWNER",
    company: {
      isCurrent: true,
      activeApps,
    },
  });

describe("cancellation analytics sidebar link", () => {
  it("shows cancellation analytics in reports after COD and before delivery rate", () => {
    const config = createOwnerSidebar(["analytics-advanced"]);
    const reportsSection = config.find((section) => section.id === "orders-analytics");
    const visibleItems =
      reportsSection?.items?.filter((item) => item.hidden !== true) || [];

    const codIndex = visibleItems.findIndex(
      (item) => item.to === "/analytics/orders/cod-performance",
    );
    const cancellationIndex = visibleItems.findIndex(
      (item) => item.to === "/analytics/orders/cancellations",
    );
    const deliveryIndex = visibleItems.findIndex(
      (item) => item.to === "/analytics/orders/delivery-rate",
    );
    const cancellationLink = visibleItems[cancellationIndex];

    expect(reportsSection?.hidden).toBe(false);
    expect(codIndex).toBeGreaterThan(-1);
    expect(cancellationIndex).toBeGreaterThan(-1);
    expect(deliveryIndex).toBeGreaterThan(-1);
    expect(cancellationIndex).toBe(codIndex + 1);
    expect(deliveryIndex).toBe(cancellationIndex + 1);
    expect(cancellationLink?.label).toBe("sidebar.cancellationAnalytics");
  });
});
