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
  it("includes Meta Ads connection in the facebook section when facebook tools are active", () => {
    const config = createOwnerSidebar(["facebook-pages-connect"]);
    const fbSection = config.find((section) => section.id === "facebook");
    const visibleItems = fbSection?.items?.filter((item) => !item.hidden) || [];
    const metaAdsLink = visibleItems.find(
      (item) => item.to === "/advertising/facebook-ads/connection",
    );

    expect(fbSection?.hidden).toBe(false);
    expect(metaAdsLink).toBeDefined();
    expect(metaAdsLink?.to).toBe("/advertising/facebook-ads/connection");
  });

  it("includes Meta Ads connection as a standalone item in marketing section", () => {
    const config = createOwnerSidebar(["facebook-ads-pro"]);
    const marketingSection = config.find((section) => section.id === "marketing");
    const standaloneLink = marketingSection?.items?.find(
      (item) => item.to === "/advertising/facebook-ads/connection",
    );

    expect(marketingSection?.hidden).toBe(false);
    expect(standaloneLink).toBeDefined();
    expect(standaloneLink?.to).toBe("/advertising/facebook-ads/connection");
  });

  it("places Meta Ads connection near the top in facebook-ads children", () => {
    const config = createOwnerSidebar(["facebook-ads-pro"]);
    const marketingSection = config.find((section) => section.id === "marketing");
    const fbAdsItem = marketingSection?.items?.find(
      (item) => item.to === "/advertising/facebook-ads",
    );

    expect(fbAdsItem?.children).toBeDefined();
    const children = fbAdsItem?.children || [];
    expect(children[0].to).toBe("/advertising/facebook-ads");
    expect(children[1].to).toBe("/advertising/facebook-ads/connection");
  });
});
