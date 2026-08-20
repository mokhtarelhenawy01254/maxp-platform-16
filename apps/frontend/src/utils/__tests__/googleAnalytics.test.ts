import {
  loadGoogleAnalytics,
  pushGoogleEvent,
  trackGooglePageView,
  trackGooglePurchase,
  isGoogleAnalyticsInitialized,
  getGoogleMeasurementId,
  getGoogleAdsConversionId,
} from "../googleAnalytics";

describe("googleAnalytics utility", () => {
  let gtagCalls: unknown[][];
  let injectedScripts: string[];

  beforeEach(() => {
    gtagCalls = [];
    injectedScripts = [];
    (window as any).dataLayer = [];
    (window as any).gtag = (...args: unknown[]) => {
      gtagCalls.push(args);
    };
    (document as any).querySelector = () => null;
    (document as any).getElementsByTagName = () => [
      { parentNode: { insertBefore: () => {} } },
    ];
    (document as any).createElement = (tag: string) => {
      const el: any = {};
      Object.defineProperty(el, "src", {
        set(v: string) {
          injectedScripts.push(v);
        },
        get() {
          return "";
        },
      });
      el.async = false;
      return el;
    };
  });

  it("loads GA4 and configures the measurement id", () => {
    loadGoogleAnalytics("G-ABC123", "");
    expect(injectedScripts.some((s) => s.includes("id=G-ABC123"))).toBe(true);
    expect(gtagCalls).toEqual(
      expect.arrayContaining([
        ["js", expect.any(Date)],
        ["config", "G-ABC123"],
      ]),
    );
    expect(getGoogleMeasurementId()).toBe("G-ABC123");
    expect(isGoogleAnalyticsInitialized()).toBe(true);
  });

  it("configures Google Ads conversion id alongside GA4", () => {
    loadGoogleAnalytics("G-ABC123", "AW-999999");
    expect(gtagCalls).toEqual(
      expect.arrayContaining([["config", "AW-999999"]]),
    );
    expect(getGoogleAdsConversionId()).toBe("AW-999999");
  });

  it("is a no-op without any id", () => {
    loadGoogleAnalytics("", "");
    expect(injectedScripts.length).toBe(0);
    expect(gtagCalls.length).toBe(0);
  });

  it("pushes standard events", () => {
    loadGoogleAnalytics("G-ABC123", "");
    gtagCalls = [];
    trackGooglePageView("/shop", "Shop");
    expect(gtagCalls[0][0]).toBe("event");
    expect(gtagCalls[0][1]).toBe("page_view");
    expect(gtagCalls[0][2]).toMatchObject({ page_path: "/shop", page_title: "Shop" });

    gtagCalls = [];
    trackGooglePurchase("ORD-1", [{ item_id: "p1", price: 100, quantity: 1 }], 100, "EGP");
    expect(gtagCalls[0][1]).toBe("purchase");
    expect(gtagCalls[0][2]).toMatchObject({
      transaction_id: "ORD-1",
      value: 100,
      currency: "EGP",
    });
  });
});
