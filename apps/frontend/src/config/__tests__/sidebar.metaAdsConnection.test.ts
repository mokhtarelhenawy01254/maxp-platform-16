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

describe("Meta Ads connection sidebar links", () => {
  it("keeps facebook section focused on pages/messages without ads connection duplicate", () => {
    const config = createOwnerSidebar(["facebook-pages-connect"]);
    const fbSection = config.find((section) => section.id === "facebook");
    const visibleItems = fbSection?.items?.filter((item) => !item.hidden) || [];
    const metaAdsLink = visibleItems.find(
      (item) => item.to === "/advertising/facebook-ads/connection",
    );

    expect(fbSection?.hidden).toBe(false);
    expect(metaAdsLink).toBeUndefined();
  });

  it("includes Meta Ads connection as an independent standalone item in marketing section", () => {
    const config = createOwnerSidebar(["facebook-ads-pro"]);
    const marketingSection = config.find((section) => section.id === "marketing");
    const standaloneLink = marketingSection?.items?.find(
      (item) => item.to === "/advertising/facebook-ads/connection",
    );

    expect(marketingSection?.hidden).toBe(false);
    expect(standaloneLink).toBeDefined();
    expect(standaloneLink?.to).toBe("/advertising/facebook-ads/connection");
  });

  it("keeps all marketing items independent without nested children", () => {
    const config = createOwnerSidebar(["facebook-ads-pro"]);
    const marketingSection = config.find((section) => section.id === "marketing");
    const fbAdsItem = marketingSection?.items?.find(
      (item) => item.to === "/advertising/facebook-ads",
    );

    expect(fbAdsItem).toBeDefined();
    expect(fbAdsItem?.children).toBeUndefined();
  });
});
